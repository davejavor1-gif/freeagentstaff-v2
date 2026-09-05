begin;

-- admin_get_account() adds employer_acn and employer_identifier_type to the existing
-- return shape so admins can review companies verified by either identifier type.
-- The return column list changes, so the function must be dropped and recreated;
-- all existing columns are preserved unchanged and no data is rewritten.
drop function if exists public.admin_get_account(uuid);

create or replace function public.admin_get_account(p_user_id uuid)
returns table (
  user_id uuid,
  account_type text,
  email text,
  slug text,
  display_name text,
  secondary_label text,
  is_published boolean,
  visibility text,
  opportunity_status text,
  employer_verification_status text,
  name text,
  title text,
  location text,
  availability text,
  top_strength text,
  focus_area text,
  summary text,
  current_employer text,
  experience_years integer,
  employer_contact_name text,
  employer_contact_role text,
  employer_company_name text,
  employer_abn text,
  employer_acn text,
  employer_identifier_type text,
  employer_website text,
  employer_industry text,
  employer_company_size text,
  verification_requested_at timestamptz,
  verification_reviewed_at timestamptz,
  verification_reviewed_by text,
  verification_rejection_reason text,
  blocked_company_count integer,
  pending_introduction_requests integer,
  active_connections integer,
  saved_talent_count integer,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_actor uuid;
begin
  v_actor := public.require_system_admin_actor();

  if p_user_id is null then
    raise exception 'missing_user_id' using errcode = '23502';
  end if;

  return query
  with profile_row as (
    select p.*
    from public.profiles p
    where p.user_id = p_user_id
    limit 1
  )
  select
    p.user_id,
    p.account_type,
    p.email,
    p.slug,
    case
      when p.account_type = 'employer' then nullif(btrim(coalesce(p.employer_company_name, p.employer_contact_name, p.email, '')), '')
      else nullif(btrim(coalesce(p.name, p.email, '')), '')
    end as display_name,
    case
      when p.account_type = 'employer' then nullif(btrim(coalesce(p.employer_contact_name, p.employer_contact_role, '')), '')
      else nullif(btrim(coalesce(p.title, p.location, p.opportunity_status, '')), '')
    end as secondary_label,
    p.is_published,
    p.visibility,
    p.opportunity_status,
    p.employer_verification_status,
    p.name,
    p.title,
    p.location,
    p.availability,
    p.top_strength,
    p.focus_area,
    p.summary,
    p.current_employer,
    p.experience_years,
    p.employer_contact_name,
    p.employer_contact_role,
    p.employer_company_name,
    p.employer_abn,
    p.employer_acn,
    coalesce(p.employer_identifier_type, case when p.employer_abn is not null and btrim(p.employer_abn) <> '' then 'abn' end),
    p.employer_website,
    p.employer_industry,
    p.employer_company_size,
    p.verification_requested_at,
    p.verification_reviewed_at,
    p.verification_reviewed_by,
    p.verification_rejection_reason,
    case
      when p.account_type = 'talent' then coalesce(cardinality(p.blocked_companies), 0)
      else 0
    end as blocked_company_count,
    coalesce((
      select count(*)::integer
      from public.employer_introduction_requests r
      where r.talent_user_id = p.user_id
        and r.status = 'pending'
    ), 0) as pending_introduction_requests,
    coalesce((
      select count(*)::integer
      from public.employer_talent_connections c
      where c.talent_user_id = p.user_id
        and c.status = 'active'
    ), 0) as active_connections,
    coalesce((
      select count(*)::integer
      from public.employer_saved_talent s
      where s.employer_user_id = p.user_id
    ), 0) as saved_talent_count,
    p.created_at,
    p.updated_at
  from profile_row p;

  if not found then
    raise exception 'account_not_found' using errcode = 'P0002';
  end if;
end
$$;

revoke all on function public.admin_get_account(uuid) from public;
revoke all on function public.admin_get_account(uuid) from anon;
revoke all on function public.admin_get_account(uuid) from authenticated;
revoke all on function public.admin_get_account(uuid) from service_role;
grant execute on function public.admin_get_account(uuid) to authenticated;

commit;
