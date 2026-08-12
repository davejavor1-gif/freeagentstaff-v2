begin;

alter table public.employer_talent_connections
  add column if not exists status text,
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by text;

update public.employer_talent_connections
set status = 'active'
where status is null;

alter table public.employer_talent_connections
  alter column status set default 'active',
  alter column status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.employer_talent_connections'::regclass
      and conname = 'employer_talent_connections_status_check'
  ) then
    alter table public.employer_talent_connections
      add constraint employer_talent_connections_status_check
      check (status in ('active', 'revoked'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.employer_talent_connections'::regclass
      and conname = 'employer_talent_connections_revoked_by_check'
  ) then
    alter table public.employer_talent_connections
      add constraint employer_talent_connections_revoked_by_check
      check (revoked_by is null or revoked_by in ('talent'));
  end if;
end
$$;

create or replace function public.talent_set_introduction_request_status(
  p_request_id uuid,
  p_status text
)
returns table (
  success boolean,
  status text,
  responded_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_talent_uid uuid := public.require_talent_actor();
  v_request record;
  v_slug text;
  v_status text;
  v_responded_at timestamptz;
begin
  if p_status not in ('accepted', 'declined') then
    raise exception 'invalid_status' using errcode = '23514';
  end if;

  select r.*
  into v_request
  from public.employer_introduction_requests r
  where r.id = p_request_id
    and r.talent_user_id = v_talent_uid
  for update;

  if not found then
    raise exception 'request_not_found' using errcode = 'P0002';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'invalid_state' using errcode = 'P0001';
  end if;

  select p.slug
  into v_slug
  from public.profiles p
  where p.user_id = v_talent_uid
    and p.account_type = 'talent'
  limit 1;

  if v_slug is null or not public.employer_can_access_talent(v_request.employer_user_id, v_slug) then
    raise exception 'relationship_no_longer_eligible' using errcode = '42501';
  end if;

  update public.employer_introduction_requests r
  set
    status = p_status,
    responded_at = now(),
    withdrawn_at = null,
    updated_at = now()
  where r.id = p_request_id
    and r.talent_user_id = v_talent_uid
    and r.status = 'pending'
  returning r.status, r.responded_at
  into v_status, v_responded_at;

  if v_status is null then
    raise exception 'invalid_state' using errcode = 'P0001';
  end if;

  if p_status = 'accepted' then
    insert into public.employer_talent_connections (
      employer_user_id,
      talent_user_id,
      introduction_request_id,
      connected_at,
      created_at,
      status,
      revoked_at,
      revoked_by
    )
    values (
      v_request.employer_user_id,
      v_talent_uid,
      p_request_id,
      coalesce(v_responded_at, now()),
      now(),
      'active',
      null,
      null
    )
    on conflict (employer_user_id, talent_user_id)
    do update
    set
      introduction_request_id = coalesce(public.employer_talent_connections.introduction_request_id, excluded.introduction_request_id),
      connected_at = excluded.connected_at,
      status = 'active',
      revoked_at = null,
      revoked_by = null;
  end if;

  return query
  select true, v_status, v_responded_at;
end
$$;

create or replace function public.talent_contact_for_connected_employer(
  p_talent_slug text
)
returns table (
  talent_slug text,
  email text
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_employer_uid uuid := public.require_verified_employer_actor();
  v_slug text := btrim(coalesce(p_talent_slug, ''));
  v_talent_user_id uuid;
  v_email text;
begin
  if v_slug = '' then
    raise exception 'missing_slug' using errcode = '23502';
  end if;

  select p.user_id, p.email
  into v_talent_user_id, v_email
  from public.profiles p
  where p.account_type = 'talent'
    and p.slug = v_slug
  limit 1;

  if v_talent_user_id is null then
    raise exception 'contact_unavailable' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.employer_talent_connections c
    where c.employer_user_id = v_employer_uid
      and c.talent_user_id = v_talent_user_id
      and c.status = 'active'
  ) then
    raise exception 'contact_unavailable' using errcode = '42501';
  end if;

  if not public.employer_can_access_talent(v_employer_uid, v_slug) then
    raise exception 'contact_unavailable' using errcode = '42501';
  end if;

  if nullif(btrim(coalesce(v_email, '')), '') is null then
    raise exception 'contact_unavailable' using errcode = '42501';
  end if;

  return query
  select v_slug, v_email;
end
$$;

create or replace function public.talent_revoke_connection(
  p_connection_id uuid
)
returns table (
  connection_id uuid,
  status text,
  revoked_at timestamptz,
  revoked_by text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_talent_uid uuid := public.require_talent_actor();
  v_connection_id uuid;
  v_talent_user_id uuid;
  v_status text;
  v_revoked_at timestamptz;
  v_revoked_by text;
begin
  if p_connection_id is null then
    raise exception 'missing_connection_id' using errcode = '23502';
  end if;

  select c.id, c.talent_user_id, c.status, c.revoked_at, c.revoked_by
  into v_connection_id, v_talent_user_id, v_status, v_revoked_at, v_revoked_by
  from public.employer_talent_connections c
  where c.id = p_connection_id
  for update;

  if v_connection_id is null then
    raise exception 'connection_not_found' using errcode = 'P0002';
  end if;

  if v_talent_user_id <> v_talent_uid then
    raise exception 'not_authorized_connection' using errcode = '42501';
  end if;

  if v_status = 'revoked' then
    return query
    select v_connection_id, v_status, v_revoked_at, v_revoked_by;
    return;
  end if;

  if v_status <> 'active' then
    raise exception 'invalid_state' using errcode = 'P0001';
  end if;

  update public.employer_talent_connections c
  set
    status = 'revoked',
    revoked_at = now(),
    revoked_by = 'talent'
  where c.id = p_connection_id
  returning c.id, c.status, c.revoked_at, c.revoked_by
  into v_connection_id, v_status, v_revoked_at, v_revoked_by;

  return query
  select v_connection_id, v_status, v_revoked_at, v_revoked_by;
end
$$;

create or replace function public.list_employer_connections()
returns table (
  connection_id uuid,
  status text,
  connected_at timestamptz,
  revoked_at timestamptz,
  is_currently_eligible boolean,
  talent_slug text,
  access_scope text,
  visibility text,
  verification_status text,
  availability text,
  opportunity_status text,
  experience_years integer,
  focus_area text,
  top_strength text,
  skills text[],
  location text,
  name text,
  title text,
  summary text,
  current_employer text
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  with actor as (
    select public.require_verified_employer_actor() as employer_user_id
  ),
  base as (
    select
      c.id as connection_id,
      c.employer_user_id,
      c.status,
      c.connected_at,
      c.revoked_at,
      t.slug as talent_slug
    from public.employer_talent_connections c
    join actor a
      on a.employer_user_id = c.employer_user_id
    join public.profiles t
      on t.user_id = c.talent_user_id
     and t.account_type = 'talent'
  )
  select
    b.connection_id,
    b.status,
    b.connected_at,
    b.revoked_at,
    (
      b.status = 'active'
      and b.talent_slug is not null
      and public.employer_can_access_talent(b.employer_user_id, b.talent_slug)
    ) as is_currently_eligible,
    p.slug as talent_slug,
    p.access_scope,
    p.visibility,
    p.verification_status,
    p.availability,
    p.opportunity_status,
    p.experience_years,
    p.focus_area,
    p.top_strength,
    p.skills,
    p.location,
    p.name,
    p.title,
    p.summary,
    p.current_employer
  from base b
  left join lateral public.talent_passport_for_viewer(b.talent_slug) p
    on b.talent_slug is not null
  order by b.connected_at desc;
$$;

create or replace function public.list_talent_connections()
returns table (
  connection_id uuid,
  status text,
  connected_at timestamptz,
  revoked_at timestamptz,
  employer_company_name text,
  employer_contact_name text,
  employer_contact_role text
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  with actor as (
    select public.require_talent_actor() as talent_user_id
  )
  select
    c.id as connection_id,
    c.status,
    c.connected_at,
    c.revoked_at,
    p.employer_company_name,
    p.employer_contact_name,
    p.employer_contact_role
  from public.employer_talent_connections c
  join actor a
    on a.talent_user_id = c.talent_user_id
  join public.profiles p
    on p.user_id = c.employer_user_id
   and p.account_type = 'employer'
  order by c.connected_at desc;
$$;

revoke all on function public.talent_contact_for_connected_employer(text) from public, anon;
revoke all on function public.talent_revoke_connection(uuid) from public, anon;
revoke all on function public.list_employer_connections() from public, anon;
revoke all on function public.list_talent_connections() from public, anon;

grant execute on function public.talent_contact_for_connected_employer(text) to authenticated;
grant execute on function public.talent_revoke_connection(uuid) to authenticated;
grant execute on function public.list_employer_connections() to authenticated;
grant execute on function public.list_talent_connections() to authenticated;

commit;
