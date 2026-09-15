-- Self-service account deletion for the authenticated caller only.
-- The target account is resolved from auth.uid() inside the function; the function
-- deliberately accepts no arguments so no caller can ever target another account.
--
-- Records that already cascade from public.profiles(user_id) are intentionally left to
-- their existing foreign keys:
--   employer_saved_talent, employer_shortlists, employer_shortlist_members,
--   employer_introduction_requests, employer_talent_connections,
--   talent_private_access_requests, notifications.recipient_user_id
-- notifications.actor_user_id is ON DELETE SET NULL, so notifications already delivered to
-- the counterparty survive with the actor reference anonymised.
--
-- talent_pro_analytics_events and system_admins reference auth.users rather than profiles,
-- so they would only cascade when the auth user is removed. They are deleted explicitly here
-- so the database is fully consistent before the auth user deletion is attempted.

begin;

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  delete from public.talent_pro_analytics_events
  where talent_user_id = v_uid
     or viewer_user_id = v_uid;

  delete from public.system_admins
  where user_id = v_uid;

  delete from public.profiles
  where user_id = v_uid;
end;
$$;

revoke all on function public.delete_own_account() from public;
revoke all on function public.delete_own_account() from anon;
revoke all on function public.delete_own_account() from authenticated;
revoke all on function public.delete_own_account() from service_role;
grant execute on function public.delete_own_account() to authenticated;

commit;
