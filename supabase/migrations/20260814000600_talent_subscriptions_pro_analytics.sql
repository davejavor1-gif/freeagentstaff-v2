-- Phase 1M: Talent subscription state + Pro analytics event stream.
-- Discovery ranking remains unchanged by subscription and this migration does not alter ranking SQL.

alter table if exists public.profiles
  add column if not exists talent_plan text not null default 'free_agent'
    check (talent_plan in ('free_agent', 'free_agent_pro'));

alter table if exists public.profiles
  add column if not exists talent_subscription_status text not null default 'inactive'
    check (talent_subscription_status in ('inactive', 'active', 'trialing', 'past_due', 'canceled'));

alter table if exists public.profiles
  add column if not exists talent_subscription_current_period_ends_at timestamptz;

update public.profiles
set
  talent_plan = coalesce(talent_plan, 'free_agent'),
  talent_subscription_status = coalesce(talent_subscription_status, 'inactive')
where account_type = 'talent';

create or replace function public.protect_talent_subscription_state()
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
    else
      new.talent_plan := old.talent_plan;
      new.talent_subscription_status := old.talent_subscription_status;
      new.talent_subscription_current_period_ends_at := old.talent_subscription_current_period_ends_at;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_talent_subscription_state on public.profiles;
create trigger protect_talent_subscription_state
  before insert or update on public.profiles
  for each row execute function public.protect_talent_subscription_state();

create table if not exists public.talent_pro_analytics_events (
  id uuid primary key default gen_random_uuid(),
  talent_user_id uuid not null references auth.users (id) on delete cascade,
  viewer_user_id uuid not null references auth.users (id) on delete cascade,
  employer_company_name text,
  event_type text not null check (event_type in ('search_impression', 'passport_view')),
  event_day date not null default ((now() at time zone 'utc')::date),
  event_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (talent_user_id, viewer_user_id, event_type, event_day)
);

alter table if exists public.talent_pro_analytics_events enable row level security;

drop policy if exists "Talent can view own pro analytics events" on public.talent_pro_analytics_events;
create policy "Talent can view own pro analytics events"
  on public.talent_pro_analytics_events
  for select
  to authenticated
  using (
    auth.uid() = talent_user_id
    and exists (
      select 1
      from public.profiles
      where user_id = auth.uid()
        and account_type = 'talent'
        and talent_plan = 'free_agent_pro'
        and talent_subscription_status in ('active', 'trialing')
        and (talent_subscription_current_period_ends_at is null or talent_subscription_current_period_ends_at >= now())
    )
  );

create index if not exists talent_pro_analytics_events_talent_day_idx
  on public.talent_pro_analytics_events (talent_user_id, event_day desc);

create index if not exists talent_pro_analytics_events_viewer_idx
  on public.talent_pro_analytics_events (viewer_user_id, event_day desc);

drop policy if exists "Users can upload their own intro videos" on storage.objects;
drop policy if exists "Users can update their own intro videos" on storage.objects;

create policy "Users can upload their own intro videos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'intro-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1
      from public.profiles
      where user_id = auth.uid()
        and account_type = 'talent'
        and talent_plan = 'free_agent_pro'
        and talent_subscription_status in ('active', 'trialing')
        and (talent_subscription_current_period_ends_at is null or talent_subscription_current_period_ends_at >= now())
    )
  );

create policy "Users can update their own intro videos"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'intro-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1
      from public.profiles
      where user_id = auth.uid()
        and account_type = 'talent'
        and talent_plan = 'free_agent_pro'
        and talent_subscription_status in ('active', 'trialing')
        and (talent_subscription_current_period_ends_at is null or talent_subscription_current_period_ends_at >= now())
    )
  )
  with check (
    bucket_id = 'intro-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
