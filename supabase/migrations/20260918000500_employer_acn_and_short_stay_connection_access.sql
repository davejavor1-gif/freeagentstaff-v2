-- HIGH A: verified Employers may use a valid ABN OR a valid ACN.
-- HIGH B: post-connection RPCs must use verified identity, not a current full subscription.
-- Discovery/new-intro remains gated by employer_discovery_scope().

create or replace function public.employer_has_valid_identifier(p_abn text, p_acn text)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select public.normalized_abn(p_abn) is not null
      or public.normalized_acn(p_acn) is not null;
$$;

revoke all on function public.employer_has_valid_identifier(text, text) from public, anon, authenticated, service_role;
grant execute on function public.employer_has_valid_identifier(text, text) to authenticated, service_role;

-- Verified Employer with ABN or ACN. No subscription / Short Stay requirement.
create or replace function public.require_verified_employer_identity()
returns uuid
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := public.require_employer_actor();
  v_status text;
  v_abn text;
  v_acn text;
begin
  select p.employer_verification_status, p.employer_abn, p.employer_acn
  into v_status, v_abn, v_acn
  from public.profiles p
  where p.user_id = v_uid;

  if v_status <> 'verified' then
    raise exception 'unverified_employer' using errcode = '42501';
  end if;

  if not public.employer_has_valid_identifier(v_abn, v_acn) then
    raise exception 'invalid_employer_identifier' using errcode = '23514';
  end if;

  return v_uid;
end;
$$;

revoke all on function public.require_verified_employer_identity() from public, anon, authenticated, service_role;
grant execute on function public.require_verified_employer_identity() to authenticated;

-- Full Employer subscription (or system-admin bypass). Discovery/new Talent access.
create or replace function public.require_verified_employer_actor()
returns uuid
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := public.require_verified_employer_identity();
  v_subscription_status text;
  v_period_end timestamptz;
  v_is_system_admin boolean;
begin
  select
    p.employer_subscription_status,
    p.employer_subscription_current_period_ends_at,
    exists (select 1 from public.system_admins sa where sa.user_id = p.user_id)
  into v_subscription_status, v_period_end, v_is_system_admin
  from public.profiles p
  where p.user_id = v_uid;

  if not v_is_system_admin
    and (v_subscription_status not in ('active', 'trialing')
      or (v_period_end is not null and v_period_end < now())) then
    raise exception 'inactive_employer_subscription' using errcode = '42501';
  end if;

  return v_uid;
end;
$$;

revoke all on function public.require_verified_employer_actor() from public, anon, authenticated, service_role;
grant execute on function public.require_verified_employer_actor() to authenticated;

create or replace function public.employer_discovery_scope()
returns text
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := public.require_verified_employer_identity();
  v_subscription_status text;
  v_period_end timestamptz;
  v_short_stay_expires_at timestamptz;
  v_is_system_admin boolean;
begin
  select
    p.employer_subscription_status,
    p.employer_subscription_current_period_ends_at,
    p.short_stay_access_expires_at,
    exists (select 1 from public.system_admins sa where sa.user_id = p.user_id)
  into v_subscription_status, v_period_end, v_short_stay_expires_at, v_is_system_admin
  from public.profiles p
  where p.user_id = v_uid;

  if v_is_system_admin then
    return 'full';
  end if;

  if v_subscription_status in ('active', 'trialing') and (v_period_end is null or v_period_end >= now()) then
    return 'full';
  end if;

  if v_short_stay_expires_at is not null and v_short_stay_expires_at > now() then
    return 'rockstar_only';
  end if;

  return 'none';
end;
$$;

revoke all on function public.employer_discovery_scope() from public, anon, authenticated, service_role;
grant execute on function public.employer_discovery_scope() to authenticated;

create or replace function public.employer_can_access_talent(
  p_employer_user_id uuid,
  p_talent_slug text
)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  with employer as (
    select
      p.user_id,
      p.account_type,
      p.employer_verification_status,
      public.employer_has_valid_identifier(p.employer_abn, p.employer_acn) as has_identifier,
      public.company_identity_keys(
        p.employer_abn,
        p.employer_website,
        p.employer_company_name,
        p.employer_acn
      ) as company_keys
    from public.profiles p
    where p.user_id = p_employer_user_id
    limit 1
  ),
  talent as (
    select
      t.user_id,
      t.slug,
      t.is_published,
      public.normalize_profile_visibility(t.visibility) as visibility,
      t.blocked_companies
    from public.profiles t
    where t.account_type = 'talent'
      and t.slug = p_talent_slug
    limit 1
  )
  select exists (
    select 1
    from employer e
    join talent t on true
    where e.account_type = 'employer'
      and e.employer_verification_status = 'verified'
      and e.has_identifier
      and t.is_published = true
      and t.visibility in ('public', 'verified_employer_network', 'confidential')
      and not (
        coalesce(t.blocked_companies, '{}'::text[])
        &&
        coalesce(e.company_keys, '{}'::text[])
      )
  );
$$;

revoke all on function public.employer_can_access_talent(uuid, text) from public, anon;
grant execute on function public.employer_can_access_talent(uuid, text) to authenticated, service_role;

create or replace function public.list_employer_connections()
returns table (
  connection_id uuid,
  status text,
  connected_at timestamptz,
  revoked_at timestamptz,
  is_currently_eligible boolean,
  talent_slug text,
  access_scope text,
  visibility text,
  verification_status text,
  availability text,
  opportunity_status text,
  experience_years integer,
  focus_area text,
  top_strength text,
  skills text[],
  location text,
  name text,
  title text,
  summary text,
  current_employer text
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  with actor as (
    select public.require_verified_employer_identity() as employer_user_id
  ),
  base as (
    select
      c.id as connection_id,
      c.employer_user_id,
      c.status,
      c.connected_at,
      c.revoked_at,
      t.slug as talent_slug,
      public.normalize_profile_visibility(t.visibility) as normalized_visibility,
      t.verification_status,
      t.availability,
      t.opportunity_status,
      t.experience_years,
      t.focus_area,
      t.top_strength,
      t.skills,
      t.location,
      t.name,
      t.title,
      t.summary,
      t.current_employer
    from public.employer_talent_connections c
    join actor a
      on a.employer_user_id = c.employer_user_id
    join public.profiles t
      on t.user_id = c.talent_user_id
     and t.account_type = 'talent'
  )
  select
    b.connection_id,
    b.status,
    b.connected_at,
    b.revoked_at,
    (
      b.status = 'active'
      and b.talent_slug is not null
      and public.employer_can_access_talent(b.employer_user_id, b.talent_slug)
    ) as is_currently_eligible,
    b.talent_slug,
    case
      when b.normalized_visibility = 'confidential' and b.status is distinct from 'active' then 'employer_confidential'
      else 'employer_full'
    end as access_scope,
    b.normalized_visibility as visibility,
    b.verification_status,
    b.availability,
    b.opportunity_status,
    b.experience_years,
    b.focus_area,
    b.top_strength,
    b.skills,
    case
      when b.normalized_visibility = 'confidential' and b.status is distinct from 'active' then 'General location available'
      else b.location
    end as location,
    case
      when b.normalized_visibility = 'confidential' and b.status is distinct from 'active' then null
      else b.name
    end as name,
    case
      when b.normalized_visibility = 'confidential' and b.status is distinct from 'active' then null
      else b.title
    end as title,
    case
      when b.normalized_visibility = 'confidential' and b.status is distinct from 'active' then null
      else b.summary
    end as summary,
    case
      when b.normalized_visibility = 'confidential' and b.status is distinct from 'active' then null
      else b.current_employer
    end as current_employer
  from base b
  order by b.connected_at desc;
$$;

revoke all on function public.list_employer_connections() from public, anon;
grant execute on function public.list_employer_connections() to authenticated;

create or replace function public.list_employer_introduction_requests()
returns table (
  request_id uuid,
  talent_user_id uuid,
  talent_slug text,
  talent_name text,
  status text,
  message text,
  created_at timestamptz,
  updated_at timestamptz,
  responded_at timestamptz,
  withdrawn_at timestamptz,
  access_scope text,
  is_currently_eligible boolean
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  with actor as (
    select public.require_verified_employer_identity() as employer_user_id
  ),
  base as (
    select
      r.id as request_id,
      r.talent_user_id,
      t.slug as talent_slug,
      public.normalize_profile_visibility(t.visibility) as normalized_visibility,
      t.name as talent_name,
      r.status,
      r.message,
      r.created_at,
      r.updated_at,
      r.responded_at,
      r.withdrawn_at,
      r.employer_user_id,
      c.status as connection_status
    from public.employer_introduction_requests r
    join actor a on a.employer_user_id = r.employer_user_id
    join public.profiles t on t.user_id = r.talent_user_id and t.account_type = 'talent'
    left join public.employer_talent_connections c
      on c.employer_user_id = r.employer_user_id
     and c.talent_user_id = r.talent_user_id
  )
  select
    b.request_id,
    b.talent_user_id,
    b.talent_slug,
    case
      when b.normalized_visibility = 'confidential' and b.connection_status is distinct from 'active'
        then 'Confidential candidate'
      else coalesce(b.talent_name, 'Confidential candidate')
    end as talent_name,
    b.status,
    b.message,
    b.created_at,
    b.updated_at,
    b.responded_at,
    b.withdrawn_at,
    case
      when b.normalized_visibility = 'confidential' and b.connection_status is distinct from 'active'
        then 'employer_confidential'
      else 'employer_full'
    end as access_scope,
    public.employer_can_access_talent(b.employer_user_id, b.talent_slug) as is_currently_eligible
  from base b
  order by b.created_at desc;
$$;

revoke all on function public.list_employer_introduction_requests() from public, anon;
grant execute on function public.list_employer_introduction_requests() to authenticated;

create or replace function public.talent_contact_for_connected_employer(p_talent_slug text)
returns table (talent_slug text, email text)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := public.require_verified_employer_identity();
  v_talent uuid;
  v_email text;
begin
  select user_id, coalesce(nullif(btrim(contact_email), ''), nullif(btrim(email), ''))
  into v_talent, v_email
  from public.profiles
  where account_type = 'talent' and slug = p_talent_slug;

  if v_talent is null
    or not exists (
      select 1 from public.employer_talent_connections c
      where c.employer_user_id = v_uid
        and c.talent_user_id = v_talent
        and c.status = 'active'
    )
    or not public.employer_can_access_talent(v_uid, p_talent_slug) then
    raise exception 'contact_unavailable' using errcode = '42501';
  end if;

  return query select p_talent_slug, v_email;
end
$$;

revoke all on function public.talent_contact_for_connected_employer(text) from public, anon;
grant execute on function public.talent_contact_for_connected_employer(text) to authenticated;

create or replace function public.talent_private_access_for_viewer(p_talent_slug text)
returns table (
  request_id uuid,
  is_owner boolean,
  request_status text,
  requested_at timestamptz,
  contact_email text,
  mobile_number text,
  resume_original_filename text,
  resume_uploaded_at timestamptz,
  resume_available boolean
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_talent uuid;
  v_intro public.employer_introduction_requests;
  v_connection public.employer_talent_connections;
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;

  select user_id into v_talent
  from public.profiles
  where account_type = 'talent' and slug = p_talent_slug;

  if v_talent is null then
    raise exception 'private_access_unavailable' using errcode = '42501';
  end if;

  if v_uid = v_talent then
    return query
    select null::uuid, true, 'owner_full'::text, now(), p.contact_email, p.mobile_number,
      p.resume_original_filename, p.resume_uploaded_at, p.resume_storage_path is not null
    from public.profiles p
    where p.user_id = v_talent;
    return;
  end if;

  perform public.require_verified_employer_identity();
  if not public.employer_can_access_talent(v_uid, p_talent_slug) then
    raise exception 'private_access_unavailable' using errcode = '42501';
  end if;

  select * into v_intro
  from public.employer_introduction_requests
  where talent_user_id = v_talent and employer_user_id = v_uid
  order by created_at desc
  limit 1;

  select * into v_connection
  from public.employer_talent_connections
  where talent_user_id = v_talent and employer_user_id = v_uid;

  return query
  select v_intro.id, false,
    case
      when v_intro.status = 'pending' then 'pending'
      when v_connection.status = 'active' then 'accepted'
      when v_connection.status = 'revoked' then 'revoked'
      else coalesce(v_intro.status, 'none')
    end,
    v_intro.created_at,
    case when v_connection.status = 'active' and v_intro.status = 'accepted' then p.contact_email else null end,
    case when v_connection.status = 'active' and v_intro.status = 'accepted' then p.mobile_number else null end,
    case when v_connection.status = 'active' and v_intro.status = 'accepted' then p.resume_original_filename else null end,
    case when v_connection.status = 'active' and v_intro.status = 'accepted' then p.resume_uploaded_at else null end,
    case when v_connection.status = 'active' and v_intro.status = 'accepted' then p.resume_storage_path is not null else false end
  from public.profiles p
  where p.user_id = v_talent;
end
$$;

revoke all on function public.talent_private_access_for_viewer(text) from public, anon;
grant execute on function public.talent_private_access_for_viewer(text) to authenticated;

create or replace function public.talent_private_details_for_authorized_employer(p_talent_slug text)
returns table (
  contact_email text,
  mobile_number text,
  resume_original_filename text,
  resume_uploaded_at timestamptz,
  resume_storage_path text
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := public.require_verified_employer_identity();
  v_talent uuid;
  v_intro public.employer_introduction_requests;
  v_connection public.employer_talent_connections;
begin
  select user_id into v_talent
  from public.profiles
  where account_type = 'talent' and slug = p_talent_slug;

  if v_talent is null or not public.employer_can_access_talent(v_uid, p_talent_slug) then
    raise exception 'private_access_unavailable' using errcode = '42501';
  end if;

  select * into v_intro
  from public.employer_introduction_requests
  where talent_user_id = v_talent and employer_user_id = v_uid
  order by created_at desc
  limit 1;

  select * into v_connection
  from public.employer_talent_connections
  where talent_user_id = v_talent and employer_user_id = v_uid;

  if v_connection.status is distinct from 'active' or v_intro.status is distinct from 'accepted' then
    raise exception 'private_access_unavailable' using errcode = '42501';
  end if;

  return query
  select p.contact_email, p.mobile_number, p.resume_original_filename,
    p.resume_uploaded_at, p.resume_storage_path
  from public.profiles p
  where p.user_id = v_talent;
end
$$;

revoke all on function public.talent_private_details_for_authorized_employer(text) from public, anon;
grant execute on function public.talent_private_details_for_authorized_employer(text) to authenticated;

-- Existing active connection passport after Short Stay expiry (or without current discovery).
-- Does not grant discovery of Talent the employer is not already connected to.
create or replace function public.talent_passport_for_connected_employer(p_slug text)
returns table (
  slug text, visibility text, is_owner boolean, access_scope text, verification_status text,
  availability text, opportunity_status text, experience_years integer, focus_area text, top_strength text,
  skills text[], languages text[], passions text[], location text, name text, title text, summary text,
  bio text, current_employer text, email text, career_journey jsonb, photo_storage_path text,
  intro_video_storage_path text, education text, salary_expectation text
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := public.require_verified_employer_identity();
begin
  return query
  with target as (
    select t.user_id, t.slug, t.visibility, t.is_published, t.blocked_companies, t.verification_status,
      t.availability, t.opportunity_status, t.experience_years, t.focus_area, t.top_strength, t.skills,
      t.languages, t.passions, t.location, t.name, t.title, t.summary, t.current_employer, t.career_journey,
      t.photo_storage_path, t.intro_video_storage_path
    from public.profiles t
    where t.account_type = 'talent'
      and t.slug = p_slug
    limit 1
  ),
  viewer as (
    select public.company_identity_keys(p.employer_abn, p.employer_website, p.employer_company_name, p.employer_acn) as viewer_company_keys
    from public.profiles p
    where p.user_id = v_uid
  ),
  connected as (
    select c.talent_user_id
    from public.employer_talent_connections c
    where c.employer_user_id = v_uid
      and c.status = 'active'
  ),
  decision as (
    select target.*, public.normalize_profile_visibility(target.visibility) as normalized_visibility,
      connected.talent_user_id is not null as viewer_has_active_connection
    from target
    join connected on connected.talent_user_id = target.user_id
  )
  select
    d.slug, d.normalized_visibility as visibility, false as is_owner,
    'employer_full'::text as access_scope,
    d.verification_status, d.availability, d.opportunity_status, d.experience_years, d.focus_area, d.top_strength,
    d.skills, d.languages, d.passions,
    d.location,
    d.name,
    d.title,
    d.summary,
    null::text as bio,
    d.current_employer,
    null::text as email,
    d.career_journey,
    d.photo_storage_path,
    d.intro_video_storage_path,
    profile.education as education,
    profile.salary_expectation as salary_expectation
  from decision d
  join viewer on true
  join public.profiles profile on profile.slug = d.slug
  where d.normalized_visibility is not null
    and d.is_published = true
    and d.normalized_visibility in ('public', 'verified_employer_network', 'confidential')
    and not (
      coalesce(d.blocked_companies, '{}'::text[])
      && coalesce(viewer.viewer_company_keys, '{}'::text[])
    );
end
$$;

revoke all on function public.talent_passport_for_connected_employer(text) from public, anon, authenticated, service_role;
grant execute on function public.talent_passport_for_connected_employer(text) to authenticated;
