-- Phase 1 employer verification/payment flow.
-- Adds a manual-review "more_info_required" state and removes company size from verification requirements.

begin;

alter table public.profiles
  drop constraint if exists profiles_employer_verification_status_check;

alter table public.profiles
  add constraint profiles_employer_verification_status_check
  check (employer_verification_status in ('unverified', 'pending', 'more_info_required', 'verified', 'rejected'));

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
  v_website text;
  v_industry text;
  v_normalized_abn text;
  v_requested_at timestamptz;
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
    p.employer_website,
    p.employer_industry
  into
    v_account_type,
    v_status,
    v_contact_name,
    v_contact_role,
    v_company_name,
    v_abn,
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

  if
    btrim(coalesce(v_contact_name, '')) = '' or
    btrim(coalesce(v_contact_role, '')) = '' or
    btrim(coalesce(v_company_name, '')) = '' or
    btrim(coalesce(v_abn, '')) = '' or
    btrim(coalesce(v_website, '')) = '' or
    btrim(coalesce(v_industry, '')) = ''
  then
    raise exception 'missing_required_fields' using errcode = '23514';
  end if;

  v_normalized_abn := public.normalized_abn(v_abn);

  if v_normalized_abn is null then
    raise exception 'invalid_abn' using errcode = '23514';
  end if;

  perform set_config('freeagent.transition', 'submit_employer_verification', true);
  perform set_config('freeagent.transition_uid', v_uid::text, true);

  update public.profiles p
  set
    employer_abn = v_normalized_abn,
    employer_verification_status = 'pending',
    verification_requested_at = now(),
    verification_reviewed_at = null,
    verification_reviewed_by = null,
    verification_rejection_reason = null,
    updated_at = now()
  where p.user_id = v_uid
  returning p.verification_requested_at into v_requested_at;

  return query
  select true, 'pending'::text, v_requested_at, v_normalized_abn, 'verification_submitted'::text;
end
$$;

create or replace function public.admin_review_employer_verification(
  p_user_id uuid,
  p_decision text,
  p_reason text default null,
  p_reviewer text default null
)
returns table (
  success boolean,
  employer_verification_status text,
  verification_reviewed_at timestamptz,
  verification_reviewed_by text,
  verification_rejection_reason text,
  message text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_account_type text;
  v_status text;
  v_reviewer text;
  v_requested_at timestamptz;
  v_result_status text;
  v_result_reviewed_at timestamptz;
  v_result_reviewed_by text;
  v_result_rejection_reason text;
  v_event_key text;
begin
  if p_user_id is null then
    raise exception 'missing_user_id' using errcode = '23502';
  end if;

  if p_decision not in ('verified', 'more_info_required', 'rejected') then
    raise exception 'invalid_decision' using errcode = '23514';
  end if;

  if p_decision in ('more_info_required', 'rejected') and btrim(coalesce(p_reason, '')) = '' then
    raise exception 'missing_review_message' using errcode = '23514';
  end if;

  select p.account_type, p.employer_verification_status, p.verification_requested_at
  into v_account_type, v_status, v_requested_at
  from public.profiles p
  where p.user_id = p_user_id
  for update;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  if v_account_type <> 'employer' then
    raise exception 'wrong_account_type' using errcode = '42501';
  end if;

  if v_status <> 'pending' then
    raise exception 'invalid_state' using errcode = 'P0001';
  end if;

  v_reviewer := coalesce(
    nullif(btrim(coalesce(p_reviewer, '')), ''),
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    current_user
  );

  perform set_config('freeagent.transition', 'admin_review_employer_verification', true);
  perform set_config('freeagent.transition_uid', p_user_id::text, true);

  update public.profiles p
  set
    employer_verification_status = p_decision,
    verification_reviewed_at = now(),
    verification_reviewed_by = v_reviewer,
    verification_rejection_reason = case when p_decision in ('more_info_required', 'rejected') then btrim(p_reason) else null end,
    updated_at = now()
  where p.user_id = p_user_id
  returning
    p.employer_verification_status,
    p.verification_reviewed_at,
    p.verification_reviewed_by,
    p.verification_rejection_reason
  into
    v_result_status,
    v_result_reviewed_at,
    v_result_reviewed_by,
    v_result_rejection_reason;

  v_event_key := format(
    'employer_verification:%s:%s:%s',
    p_user_id::text,
    coalesce(extract(epoch from v_requested_at)::bigint::text, 'none'),
    p_decision
  );

  perform public.create_notification_event(
    p_user_id,
    null,
    case when p_decision = 'verified' then 'verification_approved' else 'verification_rejected' end,
    case when p_decision = 'verified' then 'Employer verification approved.' when p_decision = 'more_info_required' then 'More information required for employer verification.' else 'Employer verification requires action.' end,
    case when p_decision = 'verified'
      then 'Your employer account can now access verified employer workflows.'
      when p_decision = 'more_info_required' then 'Review the requested information and submit verification again.'
      else 'Contact support if you believe this decision needs review.'
    end,
    'profile',
    p_user_id,
    v_event_key
  );

  return query
  select
    true,
    v_result_status,
    v_result_reviewed_at,
    v_result_reviewed_by,
    v_result_rejection_reason,
    case when p_decision = 'verified' then 'verification_approved' when p_decision = 'more_info_required' then 'verification_more_info_required' else 'verification_rejected' end;
end
$$;

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

  if coalesce(new.account_type, '') <> coalesce(old.account_type, '') then
    raise exception 'account_type_immutable' using errcode = '42501';
  end if;

  if old.account_type = 'employer' then
    v_identity_changed :=
      coalesce(new.employer_company_name, '') <> coalesce(old.employer_company_name, '')
      or coalesce(v_new_norm_abn, '') <> coalesce(v_old_norm_abn, '')
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

  if coalesce(new.employer_verification_status, '') <> coalesce(old.employer_verification_status, '') then
    if v_auto_reset_applied
       and old.employer_verification_status in ('pending', 'more_info_required', 'verified')
       and new.employer_verification_status = 'unverified' then
      return new;
    end if;

    if old.employer_verification_status in ('unverified', 'more_info_required', 'rejected')
       and new.employer_verification_status = 'pending'
       and v_transition = 'submit_employer_verification'
       and v_transition_uid is not null
       and v_transition_uid = new.user_id then
      return new;
    end if;

    if old.employer_verification_status = 'pending'
       and new.employer_verification_status in ('more_info_required', 'verified', 'rejected')
       and v_transition = 'admin_review_employer_verification'
       and v_transition_uid is not null
       and v_transition_uid = new.user_id then
      return new;
    end if;

    raise exception 'employer_verification_status_protected' using errcode = '42501';
  end if;

  return new;
end
$$;

commit;