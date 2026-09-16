-- Allow system-admin Employer accounts to use paid Employer features without Stripe entitlement.
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
  v_is_system_admin boolean;
begin
  select
    p.employer_verification_status,
    p.employer_abn,
    p.employer_subscription_status,
    p.employer_subscription_current_period_ends_at,
    exists (
      select 1
      from public.system_admins sa
      where sa.user_id = p.user_id
    )
  into v_status, v_abn, v_subscription_status, v_period_end, v_is_system_admin
  from public.profiles p
  where p.user_id = v_uid;

  if v_status <> 'verified' then
    raise exception 'unverified_employer' using errcode = '42501';
  end if;
  if public.normalized_abn(v_abn) is null then
    raise exception 'invalid_abn' using errcode = '23514';
  end if;
  if not v_is_system_admin
    and (v_subscription_status not in ('active', 'trialing')
      or (v_period_end is not null and v_period_end < now())) then
    raise exception 'inactive_employer_subscription' using errcode = '42501';
  end if;
  return v_uid;
end;
$$;

revoke all on function public.require_verified_employer_actor() from public, anon, authenticated, service_role;
grant execute on function public.require_verified_employer_actor() to authenticated;
