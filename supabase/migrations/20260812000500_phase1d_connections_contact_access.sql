begin;

create table if not exists public.employer_talent_connections (
  id uuid primary key default gen_random_uuid(),
  employer_user_id uuid not null references public.profiles(user_id) on delete cascade,
  talent_user_id uuid not null references public.profiles(user_id) on delete cascade,
  introduction_request_id uuid references public.employer_introduction_requests(id) on delete set null,
  connected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint employer_talent_connections_actor_pair_check check (employer_user_id <> talent_user_id)
);

create unique index if not exists employer_talent_connections_pair_uq
  on public.employer_talent_connections (employer_user_id, talent_user_id);

create index if not exists employer_talent_connections_employer_connected_idx
  on public.employer_talent_connections (employer_user_id, connected_at desc);

create index if not exists employer_talent_connections_talent_connected_idx
  on public.employer_talent_connections (talent_user_id, connected_at desc);

alter table public.employer_talent_connections enable row level security;
revoke all privileges on table public.employer_talent_connections from public, anon, authenticated;
grant select, insert, update, delete on table public.employer_talent_connections to service_role;

insert into public.employer_talent_connections (
  employer_user_id,
  talent_user_id,
  introduction_request_id,
  connected_at,
  created_at
)
select
  r.employer_user_id,
  r.talent_user_id,
  r.id,
  coalesce(r.responded_at, r.updated_at, r.created_at),
  now()
from public.employer_introduction_requests r
where r.status = 'accepted'
on conflict (employer_user_id, talent_user_id)
do update
set introduction_request_id = coalesce(public.employer_talent_connections.introduction_request_id, excluded.introduction_request_id);

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
      created_at
    )
    values (
      v_request.employer_user_id,
      v_talent_uid,
      p_request_id,
      coalesce(v_responded_at, now()),
      now()
    )
    on conflict (employer_user_id, talent_user_id)
    do update
    set introduction_request_id = coalesce(public.employer_talent_connections.introduction_request_id, excluded.introduction_request_id);
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

revoke all on function public.talent_contact_for_connected_employer(text) from public, anon;
grant execute on function public.talent_contact_for_connected_employer(text) to authenticated;

commit;
