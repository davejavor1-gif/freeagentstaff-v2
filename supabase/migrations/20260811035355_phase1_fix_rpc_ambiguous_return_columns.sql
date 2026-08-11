begin;

-- Corrective patch: avoid ambiguity between RETURNS TABLE output variables
-- and unqualified column names in scalar subselects.

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
	v_company_size text;
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
		p.employer_industry,
		p.employer_company_size
	into
		v_account_type,
		v_status,
		v_contact_name,
		v_contact_role,
		v_company_name,
		v_abn,
		v_website,
		v_industry,
		v_company_size
	from public.profiles p
	where p.user_id = v_uid
	for update;

	if not found then
		raise exception 'profile_not_found' using errcode = 'P0002';
	end if;

	if v_account_type <> 'employer' then
		raise exception 'wrong_account_type' using errcode = '42501';
	end if;

	if v_status not in ('unverified', 'rejected') then
		raise exception 'invalid_state' using errcode = 'P0001';
	end if;

	if
		btrim(coalesce(v_contact_name, '')) = '' or
		btrim(coalesce(v_contact_role, '')) = '' or
		btrim(coalesce(v_company_name, '')) = '' or
		btrim(coalesce(v_abn, '')) = '' or
		btrim(coalesce(v_website, '')) = '' or
		btrim(coalesce(v_industry, '')) = '' or
		btrim(coalesce(v_company_size, '')) = ''
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
	select
		true,
		'pending'::text,
		v_requested_at,
		v_normalized_abn,
		'verification_submitted'::text;
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
	v_result_status text;
	v_result_reviewed_at timestamptz;
	v_result_reviewed_by text;
	v_result_rejection_reason text;
begin
	if p_user_id is null then
		raise exception 'missing_user_id' using errcode = '23502';
	end if;

	if p_decision not in ('verified', 'rejected') then
		raise exception 'invalid_decision' using errcode = '23514';
	end if;

	if p_decision = 'rejected' and btrim(coalesce(p_reason, '')) = '' then
		raise exception 'missing_rejection_reason' using errcode = '23514';
	end if;

	select p.account_type, p.employer_verification_status
	into v_account_type, v_status
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
		verification_rejection_reason = case when p_decision = 'rejected' then btrim(p_reason) else null end,
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

	return query
	select
		true,
		v_result_status,
		v_result_reviewed_at,
		v_result_reviewed_by,
		v_result_rejection_reason,
		case when p_decision = 'verified' then 'verification_approved' else 'verification_rejected' end;
end
$$;

commit;
