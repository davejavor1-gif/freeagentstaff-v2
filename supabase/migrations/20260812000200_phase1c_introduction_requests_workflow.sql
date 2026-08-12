begin;

create table if not exists public.employer_introduction_requests (
  id uuid primary key default gen_random_uuid(),
  employer_user_id uuid not null references public.profiles(user_id) on delete cascade,
  talent_user_id uuid not null references public.profiles(user_id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz,
  withdrawn_at timestamptz,
  constraint employer_introduction_requests_actor_pair_check check (employer_user_id <> talent_user_id),
  constraint employer_introduction_requests_message_length_check check (char_length(coalesce(message, '')) <= 2000)
);

create unique index if not exists employer_intro_requests_pending_uq
  on public.employer_introduction_requests (employer_user_id, talent_user_id)
  where status = 'pending';

create index if not exists employer_intro_requests_employer_created_idx
  on public.employer_introduction_requests (employer_user_id, created_at desc);

create index if not exists employer_intro_requests_talent_created_idx
  on public.employer_introduction_requests (talent_user_id, created_at desc);

create index if not exists employer_intro_requests_status_idx
  on public.employer_introduction_requests (status);

drop trigger if exists trg_employer_intro_requests_set_updated_at on public.employer_introduction_requests;
create trigger trg_employer_intro_requests_set_updated_at
before update on public.employer_introduction_requests
for each row
execute function public.set_updated_at();

create or replace function public.require_talent_actor()
returns uuid
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_account_type text;
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;

  select p.account_type
  into v_account_type
  from public.profiles p
  where p.user_id = v_uid;

  if v_account_type <> 'talent' then
    raise exception 'wrong_account_type' using errcode = '42501';
  end if;

  return v_uid;
end
$$;

create or replace function public.validate_introduction_request_roles()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_employer_role text;
  v_talent_role text;
begin
  select p.account_type into v_employer_role
  from public.profiles p
  where p.user_id = new.employer_user_id;

  if v_employer_role <> 'employer' then
    raise exception 'invalid_employer_reference' using errcode = '23514';
  end if;

  select p.account_type into v_talent_role
  from public.profiles p
  where p.user_id = new.talent_user_id;

  if v_talent_role <> 'talent' then
    raise exception 'invalid_talent_reference' using errcode = '23514';
  end if;

  return new;
end
$$;

drop trigger if exists trg_validate_employer_intro_request_roles on public.employer_introduction_requests;
create trigger trg_validate_employer_intro_request_roles
before insert or update on public.employer_introduction_requests
for each row execute function public.validate_introduction_request_roles();

alter table public.employer_introduction_requests enable row level security;
revoke all privileges on table public.employer_introduction_requests from public, anon, authenticated;
grant select, insert, update, delete on table public.employer_introduction_requests to service_role;

create or replace function public.employer_can_access_talent(
  p_employer_user_id uuid,
  p_talent_slug text
)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  with employer as (
    select
      p.user_id,
      p.account_type,
      p.employer_verification_status,
      public.normalized_abn(p.employer_abn) as normalized_abn,
      public.company_identity_keys(
        p.employer_abn,
        p.employer_website,
        p.employer_company_name
      ) as company_keys
    from public.profiles p
    where p.user_id = p_employer_user_id
    limit 1
  ),
  talent as (
    select
      t.user_id,
      t.slug,
      t.is_published,
      public.normalize_profile_visibility(t.visibility) as visibility,
      t.blocked_companies
    from public.profiles t
    where t.account_type = 'talent'
      and t.slug = p_talent_slug
    limit 1
  )
  select exists (
    select 1
    from employer e
    join talent t on true
    where e.account_type = 'employer'
      and e.employer_verification_status = 'verified'
      and e.normalized_abn is not null
      and t.is_published = true
      and t.visibility in ('public', 'verified_employer_network', 'confidential')
      and not (
        coalesce(t.blocked_companies, '{}'::text[])
        &&
        coalesce(e.company_keys, '{}'::text[])
      )
  );
$$;

create or replace function public.create_employer_introduction_request(
  p_slug text,
  p_message text default null
)
returns table (
  success boolean,
  already_exists boolean,
  request_id uuid,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := public.require_verified_employer_actor();
  v_slug text := btrim(coalesce(p_slug, ''));
  v_message text := nullif(btrim(coalesce(p_message, '')), '');
  v_talent_user_id uuid;
  v_passport record;
  v_request_id uuid;
  v_status text;
  v_created_at timestamptz;
  v_already_exists boolean := false;
begin
  if v_slug = '' then
    raise exception 'missing_slug' using errcode = '23502';
  end if;

  select * into v_passport
  from public.talent_passport_for_viewer(v_slug)
  limit 1;

  if not found or v_passport.access_scope not in ('employer_full', 'employer_confidential') then
    raise exception 'not_authorized_for_candidate' using errcode = '42501';
  end if;

  if v_passport.is_owner is true then
    raise exception 'cannot_request_self' using errcode = '42501';
  end if;

  select p.user_id into v_talent_user_id
  from public.profiles p
  where p.account_type = 'talent'
    and p.slug = v_slug
  limit 1;

  if v_talent_user_id is null then
    raise exception 'candidate_not_found' using errcode = 'P0002';
  end if;

  perform * from public.save_talent_for_employer(v_slug, null);

  with ins as (
    insert into public.employer_introduction_requests (
      employer_user_id,
      talent_user_id,
      status,
      message
    )
    values (
      v_uid,
      v_talent_user_id,
      'pending',
      v_message
    )
    on conflict (employer_user_id, talent_user_id) where (status = 'pending') do nothing
    returning id, status, created_at
  )
  select i.id, i.status, i.created_at
  into v_request_id, v_status, v_created_at
  from ins i;

  if v_request_id is null then
    select r.id, r.status, r.created_at
    into v_request_id, v_status, v_created_at
    from public.employer_introduction_requests r
    where r.employer_user_id = v_uid
      and r.talent_user_id = v_talent_user_id
      and r.status = 'pending'
    order by r.created_at desc
    limit 1;

    if v_request_id is null then
      raise exception 'request_insert_failed' using errcode = 'P0001';
    end if;

    v_already_exists := true;
  end if;

  return query
  select true, v_already_exists, v_request_id, v_status, v_created_at;
end
$$;

create or replace function public.list_employer_introduction_requests()
returns table (
  request_id uuid,
  talent_user_id uuid,
  talent_slug text,
  talent_name text,
  status text,
  message text,
  created_at timestamptz,
  updated_at timestamptz,
  responded_at timestamptz,
  withdrawn_at timestamptz,
  access_scope text,
  is_currently_eligible boolean
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  with actor as (
    select public.require_employer_actor() as employer_user_id
  ),
  base as (
    select
      r.id as request_id,
      r.talent_user_id,
      t.slug as talent_slug,
      r.status,
      r.message,
      r.created_at,
      r.updated_at,
      r.responded_at,
      r.withdrawn_at
    from public.employer_introduction_requests r
    join actor a
      on a.employer_user_id = r.employer_user_id
    join public.profiles t
      on t.user_id = r.talent_user_id
     and t.account_type = 'talent'
  )
  select
    b.request_id,
    b.talent_user_id,
    b.talent_slug,
    case
      when p.slug is null then 'Profile unavailable'
      else coalesce(p.name, 'Confidential candidate')
    end as talent_name,
    b.status,
    b.message,
    b.created_at,
    b.updated_at,
    b.responded_at,
    b.withdrawn_at,
    p.access_scope,
    (p.slug is not null and p.access_scope in ('employer_full', 'employer_confidential')) as is_currently_eligible
  from base b
  left join lateral public.talent_passport_for_viewer(b.talent_slug) p on true
  order by b.created_at desc;
$$;

create or replace function public.employer_withdraw_introduction_request(
  p_request_id uuid
)
returns table (
  success boolean,
  status text,
  withdrawn_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := public.require_employer_actor();
  v_status text;
  v_withdrawn_at timestamptz;
begin
  update public.employer_introduction_requests r
  set
    status = 'withdrawn',
    withdrawn_at = now(),
    updated_at = now()
  where r.id = p_request_id
    and r.employer_user_id = v_uid
    and r.status = 'pending'
  returning r.status, r.withdrawn_at
  into v_status, v_withdrawn_at;

  if v_status is null then
    if exists (
      select 1
      from public.employer_introduction_requests r
      where r.id = p_request_id
        and r.employer_user_id = v_uid
    ) then
      raise exception 'invalid_state' using errcode = 'P0001';
    end if;

    raise exception 'request_not_found' using errcode = 'P0002';
  end if;

  return query
  select true, v_status, v_withdrawn_at;
end
$$;

create or replace function public.list_talent_introduction_requests()
returns table (
  request_id uuid,
  employer_user_id uuid,
  employer_company_name text,
  employer_contact_name text,
  employer_contact_role text,
  status text,
  message text,
  created_at timestamptz,
  updated_at timestamptz,
  responded_at timestamptz,
  withdrawn_at timestamptz,
  can_talent_respond boolean
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  with actor as (
    select public.require_talent_actor() as talent_user_id
  ),
  base as (
    select
      r.id as request_id,
      r.employer_user_id,
      r.talent_user_id,
      r.status,
      r.message,
      r.created_at,
      r.updated_at,
      r.responded_at,
      r.withdrawn_at
    from public.employer_introduction_requests r
    join actor a
      on a.talent_user_id = r.talent_user_id
  )
  select
    b.request_id,
    b.employer_user_id,
    ep.employer_company_name,
    ep.employer_contact_name,
    ep.employer_contact_role,
    b.status,
    b.message,
    b.created_at,
    b.updated_at,
    b.responded_at,
    b.withdrawn_at,
    (
      b.status = 'pending'
      and tp.slug is not null
      and public.employer_can_access_talent(b.employer_user_id, tp.slug)
    ) as can_talent_respond
  from base b
  join public.profiles ep
    on ep.user_id = b.employer_user_id
   and ep.account_type = 'employer'
  join public.profiles tp
    on tp.user_id = b.talent_user_id
   and tp.account_type = 'talent'
  order by b.created_at desc;
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

  return query
  select true, v_status, v_responded_at;
end
$$;

create or replace function public.talent_accept_introduction_request(
  p_request_id uuid
)
returns table (
  success boolean,
  status text,
  responded_at timestamptz
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select *
  from public.talent_set_introduction_request_status(p_request_id, 'accepted');
$$;

create or replace function public.talent_decline_introduction_request(
  p_request_id uuid
)
returns table (
  success boolean,
  status text,
  responded_at timestamptz
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select *
  from public.talent_set_introduction_request_status(p_request_id, 'declined');
$$;

revoke all on function public.require_talent_actor() from public, anon, authenticated, service_role;
revoke all on function public.validate_introduction_request_roles() from public, anon, authenticated, service_role;
revoke all on function public.employer_can_access_talent(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.talent_set_introduction_request_status(uuid, text) from public, anon, authenticated, service_role;

revoke all on function public.create_employer_introduction_request(text, text) from public, anon;
revoke all on function public.list_employer_introduction_requests() from public, anon;
revoke all on function public.employer_withdraw_introduction_request(uuid) from public, anon;
revoke all on function public.list_talent_introduction_requests() from public, anon;
revoke all on function public.talent_accept_introduction_request(uuid) from public, anon;
revoke all on function public.talent_decline_introduction_request(uuid) from public, anon;

grant execute on function public.create_employer_introduction_request(text, text) to authenticated;
grant execute on function public.list_employer_introduction_requests() to authenticated;
grant execute on function public.employer_withdraw_introduction_request(uuid) to authenticated;
grant execute on function public.list_talent_introduction_requests() to authenticated;
grant execute on function public.talent_accept_introduction_request(uuid) to authenticated;
grant execute on function public.talent_decline_introduction_request(uuid) to authenticated;

commit;
