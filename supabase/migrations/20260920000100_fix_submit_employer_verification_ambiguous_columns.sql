begin;

-- RETURNS TABLE exposes output variables with the same names as profiles columns.
-- The scalar subselect `verification_requested_at` is therefore 42702-ambiguous.
-- Restore the established RETURNING-into-local-variable pattern from
-- 20260811035355 without changing verification behaviour.

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
  where p.user_id = v_uid
  returning p.verification_requested_at into v_requested_at;

  return query
  select
    true,
    'pending'::text,
    v_requested_at,
    v_normalized_identifier,
    'verification_submitted'::text;
end
$$;

revoke all on function public.submit_employer_verification() from public;
revoke all on function public.submit_employer_verification() from anon;
revoke all on function public.submit_employer_verification() from authenticated;
revoke all on function public.submit_employer_verification() from service_role;
grant execute on function public.submit_employer_verification() to authenticated;

commit;
