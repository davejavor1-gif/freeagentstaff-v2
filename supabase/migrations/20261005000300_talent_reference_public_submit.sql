begin;

-- Stage 3: unauthenticated referee lookup/submit. Raw tokens never stored.
-- Execute is service_role only. Authenticated browsers and anon cannot call these.

create or replace function public.service_lookup_talent_reference_invitation(p_token_hash text)
returns table (
  invitation_state text,
  talent_display_name text,
  invitation_expires_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_hash text := lower(btrim(coalesce(p_token_hash, '')));
  v_row public.talent_references;
begin
  if v_hash !~ '^[0-9a-f]{64}$' then
    return query select 'invalid'::text, null::text, null::timestamptz;
    return;
  end if;

  select r.*
  into v_row
  from public.talent_references r
  where r.invitation_token_hash = v_hash
  limit 1;

  if not found then
    return query select 'invalid'::text, null::text, null::timestamptz;
    return;
  end if;

  if v_row.status is distinct from 'pending'
    or v_row.invitation_sent_at is null
    or v_row.invitation_revoked_at is not null then
    return query select 'invalid'::text, null::text, null::timestamptz;
    return;
  end if;

  if v_row.invitation_expires_at is null or v_row.invitation_expires_at <= now() then
    return query
    select
      'expired'::text,
      v_row.talent_display_name,
      v_row.invitation_expires_at;
    return;
  end if;

  return query
  select
    'valid'::text,
    v_row.talent_display_name,
    v_row.invitation_expires_at;
end
$$;

create or replace function public.service_submit_talent_reference(
  p_token_hash text,
  p_answers jsonb
)
returns table (
  success boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_hash text := lower(btrim(coalesce(p_token_hash, '')));
  v_id uuid;
begin
  if v_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invitation_unavailable' using errcode = 'P0002';
  end if;

  if p_answers is null or jsonb_typeof(p_answers) is distinct from 'object' then
    raise exception 'invalid_answers' using errcode = '23514';
  end if;

  if (p_answers->>'confirmation') is distinct from 'true' then
    raise exception 'invalid_answers' using errcode = '23514';
  end if;

  update public.talent_references r
  set
    answers = p_answers,
    submitted_at = now(),
    status = 'submitted',
    invitation_token_hash = null,
    invitation_revoked_at = now(),
    share_with_connected_employers = false
  where r.invitation_token_hash = v_hash
    and r.status = 'pending'
    and r.invitation_sent_at is not null
    and r.invitation_revoked_at is null
    and r.invitation_expires_at > now()
  returning r.id
  into v_id;

  if v_id is null then
    raise exception 'invitation_unavailable' using errcode = 'P0002';
  end if;

  return query
  select true;
end
$$;

revoke all on function public.service_lookup_talent_reference_invitation(text) from public, anon, authenticated;
revoke all on function public.service_submit_talent_reference(text, jsonb) from public, anon, authenticated;

grant execute on function public.service_lookup_talent_reference_invitation(text) to service_role;
grant execute on function public.service_submit_talent_reference(text, jsonb) to service_role;

commit;
