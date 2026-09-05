begin;

-- Additive support for Employer verification via ABN OR ACN.
-- Existing employer_abn column and all historical ABN data are preserved untouched.
alter table public.profiles
  add column if not exists employer_acn text,
  add column if not exists employer_identifier_type text
    check (employer_identifier_type in ('abn', 'acn'));

-- Backfill: every existing employer with a stored ABN is explicitly typed as 'abn'
-- so the verification flow keeps working exactly as before with no regressions.
update public.profiles
set employer_identifier_type = 'abn'
where account_type = 'employer'
  and employer_identifier_type is null
  and employer_abn is not null
  and btrim(employer_abn) <> '';

-- Australian Company Number (ACN) modulus-10 checksum validation.
create or replace function public.normalized_acn(p_acn text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  with digits as (
    select regexp_replace(coalesce(p_acn, ''), '[^0-9]', '', 'g') as acn
  ), weighted as (
    select
      acn,
      (
        (substring(acn, 1, 1)::int * 8) +
        (substring(acn, 2, 1)::int * 7) +
        (substring(acn, 3, 1)::int * 6) +
        (substring(acn, 4, 1)::int * 5) +
        (substring(acn, 5, 1)::int * 4) +
        (substring(acn, 6, 1)::int * 3) +
        (substring(acn, 7, 1)::int * 2) +
        (substring(acn, 8, 1)::int * 1)
      ) as weighted_sum,
      substring(acn, 9, 1)::int as check_digit
    from digits
    where length(acn) = 9
  )
  select case
    when ((10 - (weighted_sum % 10)) % 10) = check_digit then acn
    else null
  end
  from weighted;
$$;

revoke all on function public.normalized_acn(text) from public;

-- Recreate with an additive optional ACN parameter (default null keeps all
-- existing 3-argument call sites working unchanged).
drop function if exists public.company_identity_keys(text, text, text);

create or replace function public.company_identity_keys(
  p_abn text,
  p_website text,
  p_company_name text,
  p_acn text default null
)
returns text[]
language sql
immutable
set search_path = public, pg_temp
as $$
  with cleaned as (
    select
      public.normalized_abn(p_abn) as abn_digits,
      public.normalized_acn(p_acn) as acn_digits,
      nullif(
        lower(
          regexp_replace(
            regexp_replace(coalesce(p_website, ''), '^https?://', ''),
            '/.*$',
            ''
          )
        ),
        ''
      ) as host_name,
      nullif(
        lower(
          regexp_replace(trim(coalesce(p_company_name, '')), '\s+', ' ', 'g')
        ),
        ''
      ) as company_name
  )
  select array_remove(array[
    case when abn_digits is not null then 'abn:' || abn_digits end,
    case when acn_digits is not null then 'acn:' || acn_digits end,
    case when host_name is not null then 'domain:' || host_name end,
    case when company_name is not null then 'name:' || company_name end
  ], null)
  from cleaned;
$$;

revoke all on function public.company_identity_keys(text, text, text, text) from public;

-- Viewer context now recognizes either a valid ABN or a valid ACN as the employer's
-- verified business identifier, and includes both in the blocked-company key set.
create or replace function public.current_viewer_profile_context()
returns table (
  viewer_user_id uuid,
  viewer_account_type text,
  viewer_employer_verification_status text,
  viewer_abn text,
  viewer_company_keys text[]
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_account_type text;
  v_verification_status text;
  v_abn text;
  v_acn text;
  v_company_keys text[];
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;

  select
    p.account_type,
    p.employer_verification_status,
    public.normalized_abn(p.employer_abn),
    public.normalized_acn(p.employer_acn),
    public.company_identity_keys(p.employer_abn, p.employer_website, p.employer_company_name, p.employer_acn)
  into v_account_type, v_verification_status, v_abn, v_acn, v_company_keys
  from public.profiles p
  where p.user_id = v_uid;

  if v_account_type = 'employer' then
    perform public.require_verified_employer_actor();
  elsif v_account_type <> 'talent' then
    raise exception 'wrong_account_type' using errcode = '42501';
  end if;

  -- viewer_abn is retained as the "has a valid registered business identifier" gate;
  -- it is populated from whichever identifier (ABN or ACN) the employer verified with.
  return query select v_uid, v_account_type, v_verification_status, coalesce(v_abn, v_acn), coalesce(v_company_keys, '{}'::text[]);
end
$$;

-- Verification submission now accepts either identifier type, chosen explicitly by
-- the employer_identifier_type field (defaulting to 'abn' for legacy rows).
create or replace function public.submit_employer_verification()
returns table (
  success boolean,
  employer_verification_status text,
  verification_requested_at timestamptz,
  normalized_abn text,
  message text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid;
  v_account_type text;
  v_status text;
  v_contact_name text;
  v_contact_role text;
  v_company_name text;
  v_abn text;
  v_acn text;
  v_identifier_type text;
  v_website text;
  v_industry text;
  v_normalized_identifier text;
begin
  v_uid := auth.uid();

  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;

  select
    p.account_type,
    p.employer_verification_status,
    p.employer_contact_name,
    p.employer_contact_role,
    p.employer_company_name,
    p.employer_abn,
    p.employer_acn,
    coalesce(p.employer_identifier_type, case when p.employer_abn is not null and btrim(p.employer_abn) <> '' then 'abn' end),
    p.employer_website,
    p.employer_industry
  into
    v_account_type,
    v_status,
    v_contact_name,
    v_contact_role,
    v_company_name,
    v_abn,
    v_acn,
    v_identifier_type,
    v_website,
    v_industry
  from public.profiles p
  where p.user_id = v_uid
  for update;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  if v_account_type <> 'employer' then
    raise exception 'wrong_account_type' using errcode = '42501';
  end if;

  if v_status not in ('unverified', 'more_info_required', 'rejected') then
    raise exception 'invalid_state' using errcode = 'P0001';
  end if;

  if v_identifier_type not in ('abn', 'acn') then
    raise exception 'missing_required_fields' using errcode = '23514';
  end if;

  if
    btrim(coalesce(v_contact_name, '')) = '' or
    btrim(coalesce(v_contact_role, '')) = '' or
    btrim(coalesce(v_company_name, '')) = '' or
    btrim(coalesce(v_website, '')) = '' or
    btrim(coalesce(v_industry, '')) = '' or
    (v_identifier_type = 'abn' and btrim(coalesce(v_abn, '')) = '') or
    (v_identifier_type = 'acn' and btrim(coalesce(v_acn, '')) = '')
  then
    raise exception 'missing_required_fields' using errcode = '23514';
  end if;

  if v_identifier_type = 'abn' then
    v_normalized_identifier := public.normalized_abn(v_abn);

    if v_normalized_identifier is null then
      raise exception 'invalid_abn' using errcode = '23514';
    end if;
  else
    v_normalized_identifier := public.normalized_acn(v_acn);

    if v_normalized_identifier is null then
      raise exception 'invalid_acn' using errcode = '23514';
    end if;
  end if;

  perform set_config('freeagent.transition', 'submit_employer_verification', true);
  perform set_config('freeagent.transition_uid', v_uid::text, true);

  update public.profiles p
  set
    employer_abn = case when v_identifier_type = 'abn' then v_normalized_identifier else p.employer_abn end,
    employer_acn = case when v_identifier_type = 'acn' then v_normalized_identifier else p.employer_acn end,
    employer_identifier_type = v_identifier_type,
    employer_verification_status = 'pending',
    verification_requested_at = now(),
    verification_reviewed_at = null,
    verification_reviewed_by = null,
    verification_rejection_reason = null,
    updated_at = now()
  where p.user_id = v_uid;

  return query
  select
    true,
    'pending'::text,
    (select verification_requested_at from public.profiles where user_id = v_uid),
    v_normalized_identifier,
    'verification_submitted'::text;
end
$$;

revoke all on function public.submit_employer_verification() from public;
revoke all on function public.submit_employer_verification() from anon;
revoke all on function public.submit_employer_verification() from authenticated;
revoke all on function public.submit_employer_verification() from service_role;
grant execute on function public.submit_employer_verification() to authenticated;

-- Identity-change detection (which resets a verified/pending employer back to
-- 'unverified') now also covers ACN and identifier-type changes.
create or replace function public.profiles_guard_protected_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_transition text := current_setting('freeagent.transition', true);
  v_transition_uid_text text := nullif(current_setting('freeagent.transition_uid', true), '');
  v_transition_uid uuid := case
    when v_transition_uid_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then v_transition_uid_text::uuid
    else null
  end;
  v_old_norm_abn text := public.normalized_abn(old.employer_abn);
  v_new_norm_abn text := public.normalized_abn(new.employer_abn);
  v_old_norm_acn text := public.normalized_acn(old.employer_acn);
  v_new_norm_acn text := public.normalized_acn(new.employer_acn);
  v_old_website_key text := public.normalize_blocked_company_identifier(old.employer_website);
  v_new_website_key text := public.normalize_blocked_company_identifier(new.employer_website);
  v_identity_changed boolean := false;
  v_auto_reset_applied boolean := false;
  v_talent_privacy_changed boolean := false;
  v_verification_metadata_changed boolean := false;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if old.terms_accepted_at is not null and new.terms_accepted_at is distinct from old.terms_accepted_at then
    raise exception 'terms_accepted_at_immutable' using errcode = '42501';
  end if;

  if old.terms_version is not null and new.terms_version is distinct from old.terms_version then
    raise exception 'terms_version_immutable' using errcode = '42501';
  end if;

  if old.privacy_acknowledged_at is not null and new.privacy_acknowledged_at is distinct from old.privacy_acknowledged_at then
    raise exception 'privacy_acknowledged_at_immutable' using errcode = '42501';
  end if;

  if old.privacy_version is not null and new.privacy_version is distinct from old.privacy_version then
    raise exception 'privacy_version_immutable' using errcode = '42501';
  end if;

  if coalesce(new.account_type, '') <> coalesce(old.account_type, '') then
    raise exception 'account_type_immutable' using errcode = '42501';
  end if;

  if old.account_type = 'employer' then
    v_identity_changed :=
      coalesce(new.employer_company_name, '') <> coalesce(old.employer_company_name, '')
      or coalesce(v_new_norm_abn, '') <> coalesce(v_old_norm_abn, '')
      or coalesce(v_new_norm_acn, '') <> coalesce(v_old_norm_acn, '')
      or coalesce(new.employer_identifier_type, '') <> coalesce(old.employer_identifier_type, '')
      or coalesce(lower(btrim(new.employer_website)), '') <> coalesce(lower(btrim(old.employer_website)), '')
      or coalesce(v_new_website_key, '') <> coalesce(v_old_website_key, '');

    if v_identity_changed and old.employer_verification_status in ('pending', 'more_info_required', 'verified') then
      new.employer_verification_status := 'unverified';
      new.verification_requested_at := null;
      new.verification_reviewed_at := null;
      new.verification_reviewed_by := null;
      new.verification_rejection_reason := null;
      v_auto_reset_applied := true;
    end if;
  end if;

  v_verification_metadata_changed :=
    new.verification_requested_at is distinct from old.verification_requested_at
    or new.verification_reviewed_at is distinct from old.verification_reviewed_at
    or new.verification_reviewed_by is distinct from old.verification_reviewed_by
    or new.verification_rejection_reason is distinct from old.verification_rejection_reason;

  if v_verification_metadata_changed and not v_auto_reset_applied then
    if not (
      old.employer_verification_status in ('unverified', 'more_info_required', 'rejected')
      and new.employer_verification_status = 'pending'
      and v_transition = 'submit_employer_verification'
      and v_transition_uid is not null
      and v_transition_uid = new.user_id
    ) and not (
      old.employer_verification_status = 'pending'
      and new.employer_verification_status in ('more_info_required', 'verified', 'rejected')
      and v_transition = 'admin_review_employer_verification'
      and v_transition_uid is not null
      and v_transition_uid = new.user_id
    ) then
      raise exception 'verification_metadata_protected' using errcode = '42501';
    end if;
  end if;

  if old.account_type = 'talent' then
    v_talent_privacy_changed :=
      coalesce(new.visibility, '') <> coalesce(old.visibility, '')
      or coalesce(new.opportunity_status, '') <> coalesce(old.opportunity_status, '')
      or coalesce(new.is_published, false) <> coalesce(old.is_published, false)
      or coalesce(new.blocked_companies, '{}'::text[]) <> coalesce(old.blocked_companies, '{}'::text[]);

    if v_talent_privacy_changed then
      if v_transition in ('update_talent_privacy_settings', 'add_talent_blocked_company', 'remove_talent_blocked_company')
         and v_transition_uid is not null
         and v_transition_uid = new.user_id then
        return new;
      end if;

      raise exception 'talent_privacy_fields_protected' using errcode = '42501';
    end if;
  end if;

  return new;
end
$$;

commit;
