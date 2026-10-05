begin;

-- Stage 2: invitation activation without granting token writes to authenticated clients.
-- A token is usable only when status=pending, hash is present, sent_at is set,
-- revoked_at is null, and expires_at is in the future. Hash is written only after
-- a successful Resend response (application layer). Prepare clears any previous hash
-- before send so a failed email cannot leave a live token.

alter table public.talent_references
  add column if not exists invitation_last_attempt_at timestamptz;

comment on column public.talent_references.invitation_last_attempt_at is
  'Set when an invitation send is attempted. Used for 60-second resend cooldown. Does not make a token live.';

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
    (
      r.status = 'pending'
      and r.invitation_token_hash is not null
      and r.invitation_sent_at is not null
      and r.invitation_revoked_at is null
    ) as invitation_pending,
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

revoke all on function public.list_talent_references() from public, anon;
grant execute on function public.list_talent_references() to authenticated;

create or replace function public.service_prepare_talent_reference_invitation(
  p_reference_id uuid,
  p_talent_user_id uuid
)
returns table (
  success boolean,
  reference_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.talent_references;
begin
  if p_reference_id is null or p_talent_user_id is null then
    raise exception 'missing_reference_identity' using errcode = '23502';
  end if;

  select r.*
  into v_row
  from public.talent_references r
  where r.id = p_reference_id
    and r.talent_user_id = p_talent_user_id
  for update;

  if not found then
    raise exception 'reference_not_found' using errcode = 'P0002';
  end if;

  if v_row.status is distinct from 'pending' then
    raise exception 'invalid_state' using errcode = 'P0001';
  end if;

  if v_row.invitation_last_attempt_at is not null
    and v_row.invitation_last_attempt_at > now() - interval '60 seconds' then
    raise exception 'invitation_cooldown' using errcode = 'P0001';
  end if;

  update public.talent_references r
  set
    invitation_token_hash = null,
    invitation_revoked_at = case
      when r.invitation_token_hash is not null then now()
      else r.invitation_revoked_at
    end,
    invitation_last_attempt_at = now()
  where r.id = v_row.id
    and r.talent_user_id = p_talent_user_id
    and r.status = 'pending';

  return query
  select true, v_row.id;
end
$$;

create or replace function public.service_activate_talent_reference_invitation(
  p_reference_id uuid,
  p_talent_user_id uuid,
  p_token_hash text,
  p_expires_at timestamptz
)
returns table (
  success boolean,
  reference_id uuid,
  invitation_sent_at timestamptz,
  invitation_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_hash text := lower(btrim(coalesce(p_token_hash, '')));
  v_sent_at timestamptz;
  v_expires_at timestamptz;
begin
  if p_reference_id is null or p_talent_user_id is null then
    raise exception 'missing_reference_identity' using errcode = '23502';
  end if;

  if v_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_invitation_token_hash' using errcode = '23514';
  end if;

  if p_expires_at is null or p_expires_at <= now() then
    raise exception 'invalid_invitation_expiry' using errcode = '23514';
  end if;

  update public.talent_references r
  set
    invitation_token_hash = v_hash,
    invitation_expires_at = p_expires_at,
    invitation_sent_at = now(),
    invitation_revoked_at = null
  where r.id = p_reference_id
    and r.talent_user_id = p_talent_user_id
    and r.status = 'pending'
  returning r.invitation_sent_at, r.invitation_expires_at
  into v_sent_at, v_expires_at;

  if v_sent_at is null then
    raise exception 'reference_not_found' using errcode = 'P0002';
  end if;

  return query
  select true, p_reference_id, v_sent_at, v_expires_at;
end
$$;

revoke all on function public.service_prepare_talent_reference_invitation(uuid, uuid) from public, anon, authenticated;
revoke all on function public.service_activate_talent_reference_invitation(uuid, uuid, text, timestamptz) from public, anon, authenticated;

grant execute on function public.service_prepare_talent_reference_invitation(uuid, uuid) to service_role;
grant execute on function public.service_activate_talent_reference_invitation(uuid, uuid, text, timestamptz) to service_role;

commit;
