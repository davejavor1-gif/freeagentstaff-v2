begin;

create table if not exists public.talent_private_access_requests (
  id uuid primary key default gen_random_uuid(),
  talent_user_id uuid not null references public.profiles(user_id) on delete cascade,
  employer_user_id uuid not null references public.profiles(user_id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'revoked')),
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint talent_private_access_requests_pair_unique unique (talent_user_id, employer_user_id),
  constraint talent_private_access_requests_distinct_users check (talent_user_id <> employer_user_id)
);

create index if not exists talent_private_access_talent_status_idx
  on public.talent_private_access_requests (talent_user_id, status, updated_at desc);
create index if not exists talent_private_access_employer_status_idx
  on public.talent_private_access_requests (employer_user_id, status, updated_at desc);

alter table public.talent_private_access_requests enable row level security;
revoke all privileges on table public.talent_private_access_requests from public, anon, authenticated;
grant select, insert, update, delete on table public.talent_private_access_requests to service_role;

create or replace function public.employer_request_talent_private_access(p_talent_slug text)
returns table (request_id uuid, request_status text, requested_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_employer uuid := public.require_verified_employer_actor();
  v_slug text := nullif(btrim(coalesce(p_talent_slug, '')), '');
  v_talent uuid;
  v_request public.talent_private_access_requests;
begin
  if v_slug is null then raise exception 'missing_slug' using errcode = '23502'; end if;

  select user_id into v_talent
  from public.profiles
  where account_type = 'talent' and slug = v_slug;

  if v_talent is null or not public.employer_can_access_talent(v_employer, v_slug) then
    raise exception 'private_access_unavailable' using errcode = '42501';
  end if;

  insert into public.talent_private_access_requests (talent_user_id, employer_user_id, status, requested_at, responded_at, revoked_at, updated_at)
  values (v_talent, v_employer, 'pending', now(), null, null, now())
  on conflict (talent_user_id, employer_user_id) do update
    set status = case when public.talent_private_access_requests.status in ('declined', 'revoked') then 'pending' else public.talent_private_access_requests.status end,
        requested_at = case when public.talent_private_access_requests.status in ('declined', 'revoked') then now() else public.talent_private_access_requests.requested_at end,
        responded_at = case when public.talent_private_access_requests.status in ('declined', 'revoked') then null else public.talent_private_access_requests.responded_at end,
        revoked_at = case when public.talent_private_access_requests.status in ('declined', 'revoked') then null else public.talent_private_access_requests.revoked_at end,
        updated_at = now()
  returning * into v_request;

  if v_request.status = 'pending' and v_request.requested_at >= now() - interval '5 seconds' then
    perform public.create_notification_event(
      v_talent, v_employer, 'private_access_request_received', 'Private access request',
      'A verified employer requested access to your private resume and contact details.',
      'talent_private_access_request', v_request.id,
      'private-access-request:' || v_request.id::text || ':' || to_char(v_request.requested_at, 'YYYYMMDDHH24MISSMS')
    );
  end if;

  return query select v_request.id, v_request.status, v_request.requested_at;
end
$$;

create or replace function public.list_talent_private_access_requests()
returns table (
  request_id uuid, employer_user_id uuid, employer_company_name text, employer_contact_name text,
  employer_contact_role text, request_status text, requested_at timestamptz, responded_at timestamptz, revoked_at timestamptz
)
language plpgsql security definer stable set search_path = public, pg_temp
as $$
declare v_talent uuid := public.require_talent_actor();
begin
  return query
  select r.id, r.employer_user_id, p.employer_company_name, p.employer_contact_name,
    p.employer_contact_role, r.status, r.requested_at, r.responded_at, r.revoked_at
  from public.talent_private_access_requests r
  join public.profiles p on p.user_id = r.employer_user_id
  where r.talent_user_id = v_talent
  order by r.updated_at desc;
end
$$;

create or replace function public.talent_set_private_access_request_status(p_request_id uuid, p_status text)
returns table (request_id uuid, request_status text, responded_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_talent uuid := public.require_talent_actor(); v_request public.talent_private_access_requests;
begin
  if p_status not in ('accepted', 'declined') then raise exception 'invalid_private_access_status' using errcode = '22023'; end if;
  update public.talent_private_access_requests
  set status = p_status, responded_at = now(), revoked_at = null, updated_at = now()
  where id = p_request_id and talent_user_id = v_talent and status = 'pending'
  returning * into v_request;
  if v_request.id is null then
    select * into v_request from public.talent_private_access_requests where id = p_request_id and talent_user_id = v_talent;
    if v_request.id is null then raise exception 'private_access_request_not_found' using errcode = '42501'; end if;
  else
    perform public.create_notification_event(
      v_request.employer_user_id, v_talent,
      case when p_status = 'accepted' then 'private_access_request_accepted' else 'private_access_request_declined' end,
      case when p_status = 'accepted' then 'Private access approved' else 'Private access declined' end,
      case when p_status = 'accepted' then 'The talent approved access to their private resume and contact details.' else 'The talent declined access to their private resume and contact details.' end,
      'talent_private_access_request', v_request.id,
      'private-access-response:' || v_request.id::text || ':' || p_status || ':' || to_char(v_request.responded_at, 'YYYYMMDDHH24MISSMS')
    );
  end if;
  return query select v_request.id, v_request.status, v_request.responded_at;
end
$$;

create or replace function public.talent_revoke_private_access(p_request_id uuid)
returns table (request_id uuid, request_status text, revoked_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_talent uuid := public.require_talent_actor(); v_request public.talent_private_access_requests;
begin
  update public.talent_private_access_requests
  set status = 'revoked', revoked_at = now(), updated_at = now()
  where id = p_request_id and talent_user_id = v_talent and status = 'accepted'
  returning * into v_request;
  if v_request.id is null then raise exception 'private_access_request_not_found' using errcode = '42501'; end if;
  perform public.create_notification_event(
    v_request.employer_user_id, v_talent, 'private_access_request_revoked', 'Private access revoked',
    'The talent revoked access to their private resume and contact details.',
    'talent_private_access_request', v_request.id,
    'private-access-revoked:' || v_request.id::text || ':' || to_char(v_request.revoked_at, 'YYYYMMDDHH24MISSMS')
  );
  return query select v_request.id, v_request.status, v_request.revoked_at;
end
$$;

create or replace function public.talent_private_access_for_viewer(p_talent_slug text)
returns table (
  request_id uuid, is_owner boolean, request_status text, requested_at timestamptz,
  contact_email text, resume_original_filename text, resume_uploaded_at timestamptz, resume_available boolean
)
language plpgsql security definer stable set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid(); v_talent uuid; v_owner boolean; v_request public.talent_private_access_requests;
begin
  if v_uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  select user_id into v_talent from public.profiles where account_type = 'talent' and slug = p_talent_slug;
  if v_talent is null then raise exception 'private_access_unavailable' using errcode = '42501'; end if;
  v_owner := v_uid = v_talent;

  if v_owner then
    return query
    select null::uuid, true, 'owner_full'::text, now(), p.contact_email, p.resume_original_filename,
      p.resume_uploaded_at, p.resume_storage_path is not null
    from public.profiles p where p.user_id = v_talent;
    return;
  end if;

  if not public.employer_can_access_talent(v_uid, p_talent_slug) then
    raise exception 'private_access_unavailable' using errcode = '42501';
  end if;

  select * into v_request from public.talent_private_access_requests
  where talent_user_id = v_talent and employer_user_id = v_uid;

  return query
  select v_request.id, false, coalesce(v_request.status, 'none'), v_request.requested_at,
    case when v_request.status = 'accepted' then p.contact_email else null end,
    case when v_request.status = 'accepted' then p.resume_original_filename else null end,
    case when v_request.status = 'accepted' then p.resume_uploaded_at else null end,
    case when v_request.status = 'accepted' then p.resume_storage_path is not null else false end
  from public.profiles p where p.user_id = v_talent;
end
$$;

create or replace function public.talent_private_details_for_authorized_employer(p_talent_slug text)
returns table (contact_email text, resume_original_filename text, resume_uploaded_at timestamptz, resume_storage_path text)
language plpgsql security definer stable set search_path = public, pg_temp
as $$
declare v_uid uuid := public.require_verified_employer_actor(); v_talent uuid;
begin
  select user_id into v_talent from public.profiles where account_type = 'talent' and slug = p_talent_slug;
  if v_talent is null or not public.employer_can_access_talent(v_uid, p_talent_slug) or not exists (
    select 1 from public.talent_private_access_requests r where r.talent_user_id = v_talent and r.employer_user_id = v_uid and r.status = 'accepted'
  ) then raise exception 'private_access_unavailable' using errcode = '42501'; end if;
  return query select p.contact_email, p.resume_original_filename, p.resume_uploaded_at, p.resume_storage_path from public.profiles p where p.user_id = v_talent;
end
$$;

create or replace function public.talent_contact_for_connected_employer(p_talent_slug text)
returns table (talent_slug text, email text)
language plpgsql security definer stable set search_path = public, pg_temp
as $$
declare v_uid uuid := public.require_verified_employer_actor(); v_talent uuid; v_email text;
begin
  select user_id, coalesce(nullif(btrim(contact_email), ''), nullif(btrim(email), '')) into v_talent, v_email from public.profiles where account_type = 'talent' and slug = p_talent_slug;
  if v_talent is null or not exists (select 1 from public.employer_talent_connections c where c.employer_user_id = v_uid and c.talent_user_id = v_talent and c.status = 'active') or not public.employer_can_access_talent(v_uid, p_talent_slug) or not exists (select 1 from public.talent_private_access_requests r where r.talent_user_id = v_talent and r.employer_user_id = v_uid and r.status = 'accepted') then
    raise exception 'contact_unavailable' using errcode = '42501';
  end if;
  return query select p_talent_slug, v_email;
end
$$;

revoke all on function public.employer_request_talent_private_access(text) from public, anon;
revoke all on function public.list_talent_private_access_requests() from public, anon;
revoke all on function public.talent_set_private_access_request_status(uuid, text) from public, anon;
revoke all on function public.talent_revoke_private_access(uuid) from public, anon;
revoke all on function public.talent_private_access_for_viewer(text) from public, anon;
revoke all on function public.talent_private_details_for_authorized_employer(text) from public, anon;
grant execute on function public.employer_request_talent_private_access(text) to authenticated;
grant execute on function public.list_talent_private_access_requests() to authenticated;
grant execute on function public.talent_set_private_access_request_status(uuid, text) to authenticated;
grant execute on function public.talent_revoke_private_access(uuid) to authenticated;
grant execute on function public.talent_private_access_for_viewer(text) to authenticated;
grant execute on function public.talent_private_details_for_authorized_employer(text) to authenticated;

commit;