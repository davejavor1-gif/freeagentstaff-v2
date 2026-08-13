begin;

create table if not exists public.system_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users (id) on delete set null
);

alter table public.system_admins enable row level security;
revoke all privileges on table public.system_admins from public, anon, authenticated;
grant select, insert, update, delete on table public.system_admins to service_role;

create or replace function public.require_system_admin_actor()
returns uuid
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_admin_user_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select sa.user_id
  into v_admin_user_id
  from public.system_admins sa
  where sa.user_id = v_uid;

  if v_admin_user_id is null then
    raise exception 'system_admin_required' using errcode = '42501';
  end if;

  return v_admin_user_id;
end
$$;

create or replace function public.admin_dashboard_summary()
returns table (
  total_talent_accounts integer,
  published_talent integer,
  unpublished_talent integer,
  total_employer_accounts integer,
  verified_employers integer,
  pending_employers integer,
  rejected_employers integer
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  perform public.require_system_admin_actor();

  return query
  select
    coalesce(count(*) filter (where p.account_type = 'talent'), 0)::integer as total_talent_accounts,
    coalesce(count(*) filter (where p.account_type = 'talent' and p.is_published), 0)::integer as published_talent,
    coalesce(count(*) filter (where p.account_type = 'talent' and not p.is_published), 0)::integer as unpublished_talent,
    coalesce(count(*) filter (where p.account_type = 'employer'), 0)::integer as total_employer_accounts,
    coalesce(count(*) filter (where p.account_type = 'employer' and p.employer_verification_status = 'verified'), 0)::integer as verified_employers,
    coalesce(count(*) filter (where p.account_type = 'employer' and p.employer_verification_status = 'pending'), 0)::integer as pending_employers,
    coalesce(count(*) filter (where p.account_type = 'employer' and p.employer_verification_status = 'rejected'), 0)::integer as rejected_employers
  from public.profiles p;
end
$$;

create or replace function public.admin_list_accounts(
  p_query text default null,
  p_account_type text default null,
  p_limit integer default 25,
  p_after_created_at timestamptz default null,
  p_after_user_id uuid default null
)
returns table (
  user_id uuid,
  account_type text,
  display_name text,
  secondary_label text,
  email text,
  slug text,
  is_published boolean,
  visibility text,
  opportunity_status text,
  employer_verification_status text,
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
  v_query text := nullif(lower(btrim(coalesce(p_query, ''))), '');
  v_account_type text := nullif(btrim(coalesce(p_account_type, '')), '');
  v_limit integer := greatest(1, least(coalesce(p_limit, 25), 50));
begin
  v_actor := public.require_system_admin_actor();

  if (p_after_created_at is null) <> (p_after_user_id is null) then
    raise exception 'invalid_cursor' using errcode = '23514';
  end if;

  if v_account_type is not null and v_account_type not in ('talent', 'employer') then
    raise exception 'invalid_account_type_filter' using errcode = '23514';
  end if;

  return query
  with base as (
    select
      p.user_id,
      p.account_type,
      case
        when p.account_type = 'employer' then nullif(btrim(coalesce(p.employer_company_name, p.employer_contact_name, p.email, '')), '')
        else nullif(btrim(coalesce(p.name, p.email, '')), '')
      end as display_name,
      case
        when p.account_type = 'employer' then nullif(btrim(coalesce(p.employer_contact_name, p.employer_contact_role, '')), '')
        else nullif(btrim(coalesce(p.title, p.location, p.opportunity_status, '')), '')
      end as secondary_label,
      p.email,
      p.slug,
      p.is_published,
      p.visibility,
      p.opportunity_status,
      p.employer_verification_status,
      p.created_at,
      p.updated_at
    from public.profiles p
    where (v_account_type is null or p.account_type = v_account_type)
      and (
        v_query is null or (
          lower(coalesce(p.name, '')) like '%' || v_query || '%'
          or lower(coalesce(p.email, '')) like '%' || v_query || '%'
          or lower(coalesce(p.slug, '')) like '%' || v_query || '%'
          or lower(coalesce(p.employer_company_name, '')) like '%' || v_query || '%'
          or lower(coalesce(p.employer_contact_name, '')) like '%' || v_query || '%'
        )
      )
      and (
        p_after_created_at is null
        or (p.created_at, p.user_id) < (p_after_created_at, p_after_user_id)
      )
    order by p.created_at desc, p.user_id desc
    limit v_limit
  )
  select
    b.user_id,
    b.account_type,
    b.display_name,
    b.secondary_label,
    b.email,
    b.slug,
    b.is_published,
    b.visibility,
    b.opportunity_status,
    b.employer_verification_status,
    b.created_at,
    b.updated_at
  from base b;
end
$$;

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

revoke all on function public.require_system_admin_actor() from public;
revoke all on function public.require_system_admin_actor() from anon;
revoke all on function public.require_system_admin_actor() from authenticated;
revoke all on function public.require_system_admin_actor() from service_role;
grant execute on function public.require_system_admin_actor() to authenticated;

revoke all on function public.admin_dashboard_summary() from public;
revoke all on function public.admin_dashboard_summary() from anon;
revoke all on function public.admin_dashboard_summary() from authenticated;
revoke all on function public.admin_dashboard_summary() from service_role;
grant execute on function public.admin_dashboard_summary() to authenticated;

revoke all on function public.admin_list_accounts(text, text, integer, timestamptz, uuid) from public;
revoke all on function public.admin_list_accounts(text, text, integer, timestamptz, uuid) from anon;
revoke all on function public.admin_list_accounts(text, text, integer, timestamptz, uuid) from authenticated;
revoke all on function public.admin_list_accounts(text, text, integer, timestamptz, uuid) from service_role;
grant execute on function public.admin_list_accounts(text, text, integer, timestamptz, uuid) to authenticated;

revoke all on function public.admin_get_account(uuid) from public;
revoke all on function public.admin_get_account(uuid) from anon;
revoke all on function public.admin_get_account(uuid) from authenticated;
revoke all on function public.admin_get_account(uuid) from service_role;
grant execute on function public.admin_get_account(uuid) to authenticated;

commit;