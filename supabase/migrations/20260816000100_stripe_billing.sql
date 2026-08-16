-- Phase 3: Stripe billing state. Webhooks are the only trusted entitlement writer.

alter table public.profiles
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_talent_subscription_id text unique,
  add column if not exists stripe_talent_price_id text,
  add column if not exists employer_subscription_status text not null default 'inactive'
    check (employer_subscription_status in ('inactive', 'active', 'trialing', 'past_due', 'canceled')),
  add column if not exists employer_subscription_current_period_ends_at timestamptz,
  add column if not exists employer_subscription_cancel_at_period_end boolean not null default false,
  add column if not exists stripe_employer_subscription_id text unique,
  add column if not exists stripe_employer_price_id text;

create or replace function public.protect_billing_state()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if current_user not in ('service_role', 'postgres') then
    if tg_op = 'INSERT' then
      new.talent_plan := 'free_agent';
      new.talent_subscription_status := 'inactive';
      new.talent_subscription_current_period_ends_at := null;
      new.stripe_customer_id := null;
      new.stripe_talent_subscription_id := null;
      new.stripe_talent_price_id := null;
      new.employer_subscription_status := 'inactive';
      new.employer_subscription_current_period_ends_at := null;
      new.employer_subscription_cancel_at_period_end := false;
      new.stripe_employer_subscription_id := null;
      new.stripe_employer_price_id := null;
    else
      new.talent_plan := old.talent_plan;
      new.talent_subscription_status := old.talent_subscription_status;
      new.talent_subscription_current_period_ends_at := old.talent_subscription_current_period_ends_at;
      new.stripe_customer_id := old.stripe_customer_id;
      new.stripe_talent_subscription_id := old.stripe_talent_subscription_id;
      new.stripe_talent_price_id := old.stripe_talent_price_id;
      new.employer_subscription_status := old.employer_subscription_status;
      new.employer_subscription_current_period_ends_at := old.employer_subscription_current_period_ends_at;
      new.employer_subscription_cancel_at_period_end := old.employer_subscription_cancel_at_period_end;
      new.stripe_employer_subscription_id := old.stripe_employer_subscription_id;
      new.stripe_employer_price_id := old.stripe_employer_price_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_billing_state on public.profiles;
create trigger protect_billing_state
before insert or update on public.profiles
for each row execute function public.protect_billing_state();

create or replace function public.require_verified_employer_actor()
returns uuid
language plpgsql
security definer stable
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := public.require_employer_actor();
  v_status text;
  v_abn text;
  v_subscription_status text;
  v_period_end timestamptz;
begin
  select employer_verification_status, employer_abn, employer_subscription_status, employer_subscription_current_period_ends_at
  into v_status, v_abn, v_subscription_status, v_period_end
  from public.profiles
  where user_id = v_uid;

  if v_status <> 'verified' then
    raise exception 'unverified_employer' using errcode = '42501';
  end if;
  if public.normalized_abn(v_abn) is null then
    raise exception 'invalid_abn' using errcode = '23514';
  end if;
  if v_subscription_status not in ('active', 'trialing') or (v_period_end is not null and v_period_end < now()) then
    raise exception 'inactive_employer_subscription' using errcode = '42501';
  end if;
  return v_uid;
end;
$$;

revoke all on function public.require_verified_employer_actor() from public, anon;
grant execute on function public.require_verified_employer_actor() to authenticated;

create table if not exists public.stripe_processed_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.stripe_processed_events enable row level security;
revoke all on table public.stripe_processed_events from public, anon, authenticated;
grant select, insert on table public.stripe_processed_events to service_role;