begin;

-- Introduction acceptance creates the connection; an active connection is the private-access entitlement.
revoke execute on function public.employer_request_talent_private_access(text) from authenticated;

create or replace function public.talent_private_access_for_viewer(p_talent_slug text)
returns table (
  request_id uuid, is_owner boolean, request_status text, requested_at timestamptz,
  contact_email text, resume_original_filename text, resume_uploaded_at timestamptz, resume_available boolean
)
language plpgsql security definer stable set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_talent uuid;
  v_intro public.employer_introduction_requests;
  v_connection public.employer_talent_connections;
begin
  if v_uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;

  select user_id into v_talent
  from public.profiles
  where account_type = 'talent' and slug = p_talent_slug;
  if v_talent is null then raise exception 'private_access_unavailable' using errcode = '42501'; end if;

  if v_uid = v_talent then
    return query
    select null::uuid, true, 'owner_full'::text, now(), p.contact_email,
      p.resume_original_filename, p.resume_uploaded_at, p.resume_storage_path is not null
    from public.profiles p where p.user_id = v_talent;
    return;
  end if;

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
  select
    v_intro.id,
    false,
    case
      when v_connection.status = 'active' then 'accepted'
      when v_connection.status = 'revoked' then 'revoked'
      else coalesce(v_intro.status, 'none')
    end,
    v_intro.created_at,
    case when v_connection.status = 'active' then p.contact_email else null end,
    case when v_connection.status = 'active' then p.resume_original_filename else null end,
    case when v_connection.status = 'active' then p.resume_uploaded_at else null end,
    case when v_connection.status = 'active' then p.resume_storage_path is not null else false end
  from public.profiles p where p.user_id = v_talent;
end
$$;

create or replace function public.talent_private_details_for_authorized_employer(p_talent_slug text)
returns table (contact_email text, resume_original_filename text, resume_uploaded_at timestamptz, resume_storage_path text)
language plpgsql security definer stable set search_path = public, pg_temp
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
      select 1 from public.employer_talent_connections c
      where c.talent_user_id = v_talent
        and c.employer_user_id = v_uid
        and c.status = 'active'
    ) then
    raise exception 'private_access_unavailable' using errcode = '42501';
  end if;

  return query
  select p.contact_email, p.resume_original_filename, p.resume_uploaded_at, p.resume_storage_path
  from public.profiles p where p.user_id = v_talent;
end
$$;

create or replace function public.talent_contact_for_connected_employer(p_talent_slug text)
returns table (talent_slug text, email text)
language plpgsql security definer stable set search_path = public, pg_temp
as $$
declare
  v_uid uuid := public.require_verified_employer_actor();
  v_talent uuid;
  v_email text;
begin
  select user_id, coalesce(nullif(btrim(contact_email), ''), nullif(btrim(email), ''))
  into v_talent, v_email
  from public.profiles
  where account_type = 'talent' and slug = p_talent_slug;

  if v_talent is null
    or not exists (
      select 1 from public.employer_talent_connections c
      where c.employer_user_id = v_uid
        and c.talent_user_id = v_talent
        and c.status = 'active'
    )
    or not public.employer_can_access_talent(v_uid, p_talent_slug) then
    raise exception 'contact_unavailable' using errcode = '42501';
  end if;

  return query select p_talent_slug, v_email;
end
$$;

commit;
