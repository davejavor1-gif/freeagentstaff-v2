-- Align resume/private-details authorization with the connection-based viewer:
-- accepted introduction AND active connection. Legacy talent_private_access_requests
-- rows must not independently authorize resume access.

create or replace function public.talent_private_details_for_authorized_employer(p_talent_slug text)
returns table (
  contact_email text,
  mobile_number text,
  resume_original_filename text,
  resume_uploaded_at timestamptz,
  resume_storage_path text
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := public.require_verified_employer_actor();
  v_talent uuid;
  v_intro public.employer_introduction_requests;
  v_connection public.employer_talent_connections;
begin
  select user_id into v_talent
  from public.profiles
  where account_type = 'talent' and slug = p_talent_slug;

  if v_talent is null or not public.employer_can_access_talent(v_uid, p_talent_slug) then
    raise exception 'private_access_unavailable' using errcode = '42501';
  end if;

  select * into v_intro
  from public.employer_introduction_requests
  where talent_user_id = v_talent and employer_user_id = v_uid
  order by created_at desc
  limit 1;

  select * into v_connection
  from public.employer_talent_connections
  where talent_user_id = v_talent and employer_user_id = v_uid;

  if v_connection.status is distinct from 'active' or v_intro.status is distinct from 'accepted' then
    raise exception 'private_access_unavailable' using errcode = '42501';
  end if;

  return query
  select p.contact_email, p.mobile_number, p.resume_original_filename,
    p.resume_uploaded_at, p.resume_storage_path
  from public.profiles p
  where p.user_id = v_talent;
end
$$;

revoke all on function public.talent_private_details_for_authorized_employer(text) from public, anon;
grant execute on function public.talent_private_details_for_authorized_employer(text) to authenticated;
