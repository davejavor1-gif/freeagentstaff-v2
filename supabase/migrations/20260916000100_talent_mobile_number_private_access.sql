-- Add optional Talent mobile numbers and expose them only through existing private Passport access.
alter table public.profiles
  add column if not exists mobile_number text;

drop function if exists public.talent_private_access_for_viewer(text);
drop function if exists public.talent_private_details_for_authorized_employer(text);

create or replace function public.talent_private_access_for_viewer(p_talent_slug text)
returns table (
  request_id uuid,
  is_owner boolean,
  request_status text,
  requested_at timestamptz,
  contact_email text,
  mobile_number text,
  resume_original_filename text,
  resume_uploaded_at timestamptz,
  resume_available boolean
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_talent uuid;
  v_intro public.employer_introduction_requests;
  v_connection public.employer_talent_connections;
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;

  select user_id into v_talent
  from public.profiles
  where account_type = 'talent' and slug = p_talent_slug;

  if v_talent is null then
    raise exception 'private_access_unavailable' using errcode = '42501';
  end if;

  if v_uid = v_talent then
    return query
    select null::uuid, true, 'owner_full'::text, now(), p.contact_email, p.mobile_number,
      p.resume_original_filename, p.resume_uploaded_at, p.resume_storage_path is not null
    from public.profiles p
    where p.user_id = v_talent;
    return;
  end if;

  perform public.require_verified_employer_actor();
  if not public.employer_can_access_talent(v_uid, p_talent_slug) then
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

  return query
  select v_intro.id, false,
    case
      when v_intro.status = 'pending' then 'pending'
      when v_connection.status = 'active' then 'accepted'
      when v_connection.status = 'revoked' then 'revoked'
      else coalesce(v_intro.status, 'none')
    end,
    v_intro.created_at,
    case when v_connection.status = 'active' and v_intro.status = 'accepted' then p.contact_email else null end,
    case when v_connection.status = 'active' and v_intro.status = 'accepted' then p.mobile_number else null end,
    case when v_connection.status = 'active' and v_intro.status = 'accepted' then p.resume_original_filename else null end,
    case when v_connection.status = 'active' and v_intro.status = 'accepted' then p.resume_uploaded_at else null end,
    case when v_connection.status = 'active' and v_intro.status = 'accepted' then p.resume_storage_path is not null else false end
  from public.profiles p
  where p.user_id = v_talent;
end
$$;

revoke all on function public.talent_private_access_for_viewer(text) from public, anon;
grant execute on function public.talent_private_access_for_viewer(text) to authenticated;

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
begin
  select user_id into v_talent
  from public.profiles
  where account_type = 'talent' and slug = p_talent_slug;

  if v_talent is null
    or not public.employer_can_access_talent(v_uid, p_talent_slug)
    or not exists (
      select 1
      from public.talent_private_access_requests r
      where r.talent_user_id = v_talent
        and r.employer_user_id = v_uid
        and r.status = 'accepted'
    ) then
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
