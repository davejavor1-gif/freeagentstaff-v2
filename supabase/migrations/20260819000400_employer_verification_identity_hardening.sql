-- Treat website/domain changes as material employer identity changes and protect verification review metadata.

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

    if v_identity_changed and old.employer_verification_status in ('pending', 'verified') then
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
      old.employer_verification_status in ('unverified', 'rejected')
      and new.employer_verification_status = 'pending'
      and v_transition = 'submit_employer_verification'
      and v_transition_uid is not null
      and v_transition_uid = new.user_id
    ) and not (
      old.employer_verification_status = 'pending'
      and new.employer_verification_status in ('verified', 'rejected')
      and v_transition = 'admin_review_employer_verification'
      and v_transition_uid is not null
      and v_transition_uid = new.user_id
    ) then
      raise exception 'verification_metadata_protected' using errcode = '42501';
    end if;
  end if;

  if coalesce(new.employer_verification_status, '') <> coalesce(old.employer_verification_status, '') then
    if v_auto_reset_applied
       and old.employer_verification_status in ('pending', 'verified')
       and new.employer_verification_status = 'unverified' then
      return new;
    end if;

    if old.employer_verification_status in ('unverified', 'rejected')
       and new.employer_verification_status = 'pending'
       and v_transition = 'submit_employer_verification'
       and v_transition_uid is not null
       and v_transition_uid = new.user_id then
      return new;
    end if;

    if old.employer_verification_status = 'pending'
       and new.employer_verification_status in ('verified', 'rejected')
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
