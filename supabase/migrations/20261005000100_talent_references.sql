begin;

-- Talent references are private data. Direct table access is revoked from
-- anon/authenticated. All access is via security-definer RPCs.
--
-- Expected v1 referee `answers` jsonb (written later by the unauthenticated
-- token submit path; owner RPCs in this migration cannot write answers):
-- {
--   "professionalRelationship": string,
--   "workedTogetherDuration": string,
--   "keyStrengths": string,
--   "reliabilityRating": 1-5,
--   "teamworkRating": 1-5,
--   "wouldWorkAgain": "yes" | "no" | "prefer_not_to_say",
--   "additionalComments": string | null,
--   "confirmation": true
-- }
--
-- Invitation tokens: store SHA-256 hex of a 32-byte random token only.
-- Raw tokens must never be persisted. Default expiry for later send/resend
-- is 14 days. One-use: submitted rows must clear invitation_token_hash.
-- Resend (later) must null the previous hash before inserting a new one.

create table if not exists public.talent_references (
  id uuid primary key default gen_random_uuid(),
  talent_user_id uuid not null references public.profiles(user_id) on delete cascade,
  referee_name text not null,
  job_title text,
  company text,
  relationship text,
  referee_email text not null,
  invitation_token_hash text,
  invitation_expires_at timestamptz,
  invitation_sent_at timestamptz,
  invitation_revoked_at timestamptz,
  status text not null default 'pending',
  submitted_at timestamptz,
  answers jsonb,
  share_with_connected_employers boolean not null default false,
  talent_display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint talent_references_status_check
    check (status in ('pending', 'submitted', 'cancelled')),
  constraint talent_references_referee_name_check
    check (char_length(btrim(referee_name)) between 1 and 200),
  constraint talent_references_referee_email_check
    check (
      char_length(btrim(referee_email)) between 3 and 320
      and position('@' in btrim(referee_email)) > 1
    ),
  constraint talent_references_talent_display_name_check
    check (char_length(btrim(talent_display_name)) between 1 and 200),
  constraint talent_references_job_title_length_check
    check (job_title is null or char_length(job_title) <= 200),
  constraint talent_references_company_length_check
    check (company is null or char_length(company) <= 200),
  constraint talent_references_relationship_length_check
    check (relationship is null or char_length(relationship) <= 200),
  constraint talent_references_pending_state_check
    check (
      status <> 'pending'
      or (
        submitted_at is null
        and answers is null
        and share_with_connected_employers = false
      )
    ),
  constraint talent_references_submitted_state_check
    check (
      status <> 'submitted'
      or (
        submitted_at is not null
        and answers is not null
        and invitation_token_hash is null
      )
    ),
  constraint talent_references_cancelled_state_check
    check (
      status <> 'cancelled'
      or (
        share_with_connected_employers = false
        and invitation_token_hash is null
        and invitation_revoked_at is not null
        and submitted_at is null
        and answers is null
      )
    ),
  constraint talent_references_share_submitted_only_check
    check (
      share_with_connected_employers = false
      or status = 'submitted'
    ),
  constraint talent_references_token_expiry_check
    check (
      invitation_token_hash is null
      or invitation_expires_at is not null
    )
);

comment on table public.talent_references is
  'Private Talent referee records. Not public. Employer read is connection-gated and share-flagged. Invitation authorization is the SHA-256 hash of a one-use 32-byte token; raw tokens are never stored.';

comment on column public.talent_references.answers is
  'v1 jsonb: professionalRelationship, workedTogetherDuration, keyStrengths, reliabilityRating (1-5), teamworkRating (1-5), wouldWorkAgain (yes|no|prefer_not_to_say), additionalComments (string|null), confirmation (true). Written only by the future public token submit RPC.';

comment on column public.talent_references.invitation_token_hash is
  'SHA-256 hex digest of the raw invitation token. Null when unused, consumed, or revoked.';

comment on column public.talent_references.share_with_connected_employers is
  'Talent opt-in. Defaults false. May be true only when status = submitted.';

create index if not exists talent_references_owner_created_idx
  on public.talent_references (talent_user_id, created_at desc);

create index if not exists talent_references_owner_pending_idx
  on public.talent_references (talent_user_id)
  where status = 'pending';

create unique index if not exists talent_references_invitation_token_hash_uq
  on public.talent_references (invitation_token_hash)
  where invitation_token_hash is not null;

create index if not exists talent_references_employer_shared_idx
  on public.talent_references (talent_user_id, submitted_at desc)
  where status = 'submitted' and share_with_connected_employers = true;

drop trigger if exists trg_talent_references_set_updated_at on public.talent_references;
create trigger trg_talent_references_set_updated_at
before update on public.talent_references
for each row
execute function public.set_updated_at();

create or replace function public.validate_talent_reference_owner_role()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_account_type text;
begin
  select p.account_type
  into v_account_type
  from public.profiles p
  where p.user_id = new.talent_user_id;

  if v_account_type is distinct from 'talent' then
    raise exception 'invalid_talent_reference' using errcode = '23514';
  end if;

  return new;
end
$$;

drop trigger if exists trg_validate_talent_reference_owner_role on public.talent_references;
create trigger trg_validate_talent_reference_owner_role
before insert or update of talent_user_id on public.talent_references
for each row execute function public.validate_talent_reference_owner_role();

alter table public.talent_references enable row level security;
revoke all privileges on table public.talent_references from public, anon, authenticated;
grant select, insert, update, delete on table public.talent_references to service_role;

revoke all on function public.validate_talent_reference_owner_role() from public, anon, authenticated, service_role;

create or replace function public.list_talent_references()
returns table (
  reference_id uuid,
  referee_name text,
  job_title text,
  company text,
  relationship text,
  referee_email text,
  status text,
  invitation_expires_at timestamptz,
  invitation_sent_at timestamptz,
  invitation_revoked_at timestamptz,
  invitation_pending boolean,
  submitted_at timestamptz,
  answers jsonb,
  share_with_connected_employers boolean,
  talent_display_name text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select
    r.id,
    r.referee_name,
    r.job_title,
    r.company,
    r.relationship,
    r.referee_email,
    r.status,
    r.invitation_expires_at,
    r.invitation_sent_at,
    r.invitation_revoked_at,
    (r.status = 'pending' and r.invitation_token_hash is not null) as invitation_pending,
    r.submitted_at,
    r.answers,
    r.share_with_connected_employers,
    r.talent_display_name,
    r.created_at,
    r.updated_at
  from public.talent_references r
  where r.talent_user_id = public.require_talent_actor()
  order by r.created_at desc;
$$;

create or replace function public.create_talent_reference(
  p_referee_name text,
  p_job_title text default null,
  p_company text default null,
  p_relationship text default null,
  p_referee_email text default null
)
returns table (
  reference_id uuid,
  referee_name text,
  job_title text,
  company text,
  relationship text,
  referee_email text,
  status text,
  invitation_expires_at timestamptz,
  invitation_sent_at timestamptz,
  invitation_revoked_at timestamptz,
  invitation_pending boolean,
  submitted_at timestamptz,
  answers jsonb,
  share_with_connected_employers boolean,
  talent_display_name text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := public.require_talent_actor();
  v_display_name text;
  v_pending_count integer;
  v_created public.talent_references;
  v_name text := nullif(btrim(coalesce(p_referee_name, '')), '');
  v_email text := nullif(btrim(coalesce(p_referee_email, '')), '');
  v_job_title text := nullif(btrim(coalesce(p_job_title, '')), '');
  v_company text := nullif(btrim(coalesce(p_company, '')), '');
  v_relationship text := nullif(btrim(coalesce(p_relationship, '')), '');
begin
  if v_name is null then
    raise exception 'missing_referee_name' using errcode = '23502';
  end if;

  if v_email is null then
    raise exception 'missing_referee_email' using errcode = '23502';
  end if;

  select p.name
  into v_display_name
  from public.profiles p
  where p.user_id = v_uid
  for update;

  v_display_name := nullif(btrim(coalesce(v_display_name, '')), '');
  if v_display_name is null then
    raise exception 'missing_talent_display_name' using errcode = '23502';
  end if;

  select count(*)::integer
  into v_pending_count
  from public.talent_references r
  where r.talent_user_id = v_uid
    and r.status = 'pending';

  if v_pending_count >= 10 then
    raise exception 'pending_reference_limit' using errcode = 'P0001';
  end if;

  insert into public.talent_references (
    talent_user_id,
    referee_name,
    job_title,
    company,
    relationship,
    referee_email,
    status,
    share_with_connected_employers,
    talent_display_name
  )
  values (
    v_uid,
    v_name,
    v_job_title,
    v_company,
    v_relationship,
    v_email,
    'pending',
    false,
    v_display_name
  )
  returning *
  into v_created;

  return query
  select
    v_created.id,
    v_created.referee_name,
    v_created.job_title,
    v_created.company,
    v_created.relationship,
    v_created.referee_email,
    v_created.status,
    v_created.invitation_expires_at,
    v_created.invitation_sent_at,
    v_created.invitation_revoked_at,
    false,
    v_created.submitted_at,
    v_created.answers,
    v_created.share_with_connected_employers,
    v_created.talent_display_name,
    v_created.created_at,
    v_created.updated_at;
end
$$;

create or replace function public.talent_delete_reference(p_reference_id uuid)
returns table (
  success boolean,
  action text,
  reference_id uuid,
  status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := public.require_talent_actor();
  v_row public.talent_references;
  v_status text;
begin
  if p_reference_id is null then
    raise exception 'missing_reference_id' using errcode = '23502';
  end if;

  select r.*
  into v_row
  from public.talent_references r
  where r.id = p_reference_id
    and r.talent_user_id = v_uid
  for update;

  if not found then
    raise exception 'reference_not_found' using errcode = 'P0002';
  end if;

  if v_row.status = 'pending' then
    update public.talent_references r
    set
      status = 'cancelled',
      invitation_token_hash = null,
      invitation_revoked_at = now(),
      share_with_connected_employers = false
    where r.id = v_row.id
      and r.talent_user_id = v_uid
    returning r.status
    into v_status;

    return query
    select true, 'cancelled'::text, v_row.id, v_status;
    return;
  end if;

  delete from public.talent_references r
  where r.id = v_row.id
    and r.talent_user_id = v_uid;

  return query
  select true, 'deleted'::text, v_row.id, v_row.status;
end
$$;

create or replace function public.talent_set_reference_sharing(
  p_reference_id uuid,
  p_share boolean
)
returns table (
  success boolean,
  reference_id uuid,
  status text,
  share_with_connected_employers boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := public.require_talent_actor();
  v_row public.talent_references;
  v_status text;
  v_share boolean;
begin
  if p_reference_id is null then
    raise exception 'missing_reference_id' using errcode = '23502';
  end if;

  if p_share is null then
    raise exception 'missing_share_flag' using errcode = '23502';
  end if;

  select r.*
  into v_row
  from public.talent_references r
  where r.id = p_reference_id
    and r.talent_user_id = v_uid
  for update;

  if not found then
    raise exception 'reference_not_found' using errcode = 'P0002';
  end if;

  if p_share is true and v_row.status is distinct from 'submitted' then
    raise exception 'reference_not_shareable' using errcode = 'P0001';
  end if;

  update public.talent_references r
  set share_with_connected_employers = p_share
  where r.id = v_row.id
    and r.talent_user_id = v_uid
  returning
    r.status,
    r.share_with_connected_employers
  into v_status, v_share;

  return query
  select true, v_row.id, v_status, v_share;
end
$$;

create or replace function public.list_connected_talent_references(p_talent_slug text)
returns table (
  reference_id uuid,
  referee_name text,
  job_title text,
  company text,
  relationship text,
  talent_display_name text,
  submitted_at timestamptz,
  answers jsonb
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := public.require_verified_employer_identity();
  v_slug text := btrim(coalesce(p_talent_slug, ''));
  v_talent uuid;
  v_intro public.employer_introduction_requests;
  v_connection public.employer_talent_connections;
begin
  if v_slug = '' then
    raise exception 'private_access_unavailable' using errcode = '42501';
  end if;

  select p.user_id
  into v_talent
  from public.profiles p
  where p.account_type = 'talent'
    and p.slug = v_slug;

  if v_talent is null or not public.employer_can_access_talent(v_uid, v_slug) then
    raise exception 'private_access_unavailable' using errcode = '42501';
  end if;

  select i.*
  into v_intro
  from public.employer_introduction_requests i
  where i.talent_user_id = v_talent
    and i.employer_user_id = v_uid
  order by i.created_at desc
  limit 1;

  select c.*
  into v_connection
  from public.employer_talent_connections c
  where c.talent_user_id = v_talent
    and c.employer_user_id = v_uid;

  if v_connection.status is distinct from 'active' or v_intro.status is distinct from 'accepted' then
    raise exception 'private_access_unavailable' using errcode = '42501';
  end if;

  return query
  select
    r.id,
    r.referee_name,
    r.job_title,
    r.company,
    r.relationship,
    r.talent_display_name,
    r.submitted_at,
    r.answers
  from public.talent_references r
  where r.talent_user_id = v_talent
    and r.status = 'submitted'
    and r.share_with_connected_employers = true
  order by r.submitted_at desc;
end
$$;

revoke all on function public.list_talent_references() from public, anon;
revoke all on function public.create_talent_reference(text, text, text, text, text) from public, anon;
revoke all on function public.talent_delete_reference(uuid) from public, anon;
revoke all on function public.talent_set_reference_sharing(uuid, boolean) from public, anon;
revoke all on function public.list_connected_talent_references(text) from public, anon;

grant execute on function public.list_talent_references() to authenticated;
grant execute on function public.create_talent_reference(text, text, text, text, text) to authenticated;
grant execute on function public.talent_delete_reference(uuid) to authenticated;
grant execute on function public.talent_set_reference_sharing(uuid, boolean) to authenticated;
grant execute on function public.list_connected_talent_references(text) to authenticated;

commit;
