-- Short Stay Employer: a temporary, one-time-payment discovery entitlement scoped to Rockstar Talent only.
-- Does not modify the regular employer subscription columns or require_verified_employer_actor().
alter table public.profiles
  add column if not exists short_stay_access_expires_at timestamptz,
  add column if not exists stripe_short_stay_payment_intent_id text,
  add column if not exists stripe_short_stay_checkout_session_id text;

-- Discovery entitlement scope for the current employer actor: 'full' | 'rockstar_only' | 'none'.
-- Mirrors require_verified_employer_actor()'s verification/ABN checks and system-admin bypass,
-- but additionally recognises an unexpired Short Stay pass as a narrower ('rockstar_only') scope.
create or replace function public.employer_discovery_scope()
returns text
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := public.require_employer_actor();
  v_status text;
  v_abn text;
  v_subscription_status text;
  v_period_end timestamptz;
  v_short_stay_expires_at timestamptz;
  v_is_system_admin boolean;
begin
  select p.employer_verification_status, p.employer_abn, p.employer_subscription_status,
    p.employer_subscription_current_period_ends_at, p.short_stay_access_expires_at,
    exists (select 1 from public.system_admins sa where sa.user_id = p.user_id)
  into v_status, v_abn, v_subscription_status, v_period_end, v_short_stay_expires_at, v_is_system_admin
  from public.profiles p
  where p.user_id = v_uid;

  if v_status <> 'verified' then
    raise exception 'unverified_employer' using errcode = '42501';
  end if;

  if public.normalized_abn(v_abn) is null then
    raise exception 'invalid_abn' using errcode = '23514';
  end if;

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
end
$$;

revoke all on function public.employer_discovery_scope() from public, anon, authenticated, service_role;
grant execute on function public.employer_discovery_scope() to authenticated;

-- Rockstar-only Talent Search for Short Stay employers. Self-contained (does not call
-- current_viewer_profile_context()/require_verified_employer_actor(), which require a full
-- subscription) but reproduces the same confidential/connection redaction rules and blocked
-- company filtering as discovery_profiles_for_verified_employer()/_v2(), scoped server-side to
-- talent.rockstar_available = true so the restriction cannot be bypassed by any caller.
create or replace function public.discovery_profiles_for_rockstar_employer()
returns table (
  slug text, visibility text, verification_status text, availability text, opportunity_status text,
  experience_years integer, focus_area text, top_strength text, skills text[], languages text[], passions text[],
  location text, name text, title text, summary text, current_employer text, photo_storage_path text,
  intro_video_storage_path text, career_journey jsonb, can_view_identifying_info boolean, can_view_media boolean,
  education text, salary_expectation text
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_scope text := public.employer_discovery_scope();
begin
  if v_scope = 'none' then
    raise exception 'inactive_employer_subscription' using errcode = '42501';
  end if;

  return query
  with viewer as (
    select public.company_identity_keys(p.employer_abn, p.employer_website, p.employer_company_name) as viewer_company_keys
    from public.profiles p
    where p.user_id = auth.uid()
  ),
  connected as (
    select c.talent_user_id
    from public.employer_talent_connections c
    where c.employer_user_id = auth.uid()
      and c.status = 'active'
  ),
  base as (
    select
      talent.slug,
      public.normalize_profile_visibility(talent.visibility) as visibility,
      talent.verification_status,
      talent.availability,
      talent.opportunity_status,
      talent.experience_years,
      talent.focus_area,
      talent.top_strength,
      talent.skills,
      talent.languages,
      talent.passions,
      case when public.normalize_profile_visibility(talent.visibility) = 'confidential' and connected.talent_user_id is null then 'General location available' else talent.location end as location,
      case when public.normalize_profile_visibility(talent.visibility) = 'confidential' and connected.talent_user_id is null then null else talent.name end as name,
      case when public.normalize_profile_visibility(talent.visibility) = 'confidential' and connected.talent_user_id is null then null else talent.title end as title,
      case when public.normalize_profile_visibility(talent.visibility) = 'confidential' and connected.talent_user_id is null then null else talent.summary end as summary,
      case when public.normalize_profile_visibility(talent.visibility) = 'confidential' and connected.talent_user_id is null then null else talent.current_employer end as current_employer,
      case when public.normalize_profile_visibility(talent.visibility) = 'confidential' and connected.talent_user_id is null then null else talent.photo_storage_path end as photo_storage_path,
      case when public.normalize_profile_visibility(talent.visibility) = 'confidential' and connected.talent_user_id is null then null else talent.intro_video_storage_path end as intro_video_storage_path,
      (public.normalize_profile_visibility(talent.visibility) <> 'confidential' or connected.talent_user_id is not null) as can_view_identifying_info,
      (public.normalize_profile_visibility(talent.visibility) <> 'confidential' or connected.talent_user_id is not null) as can_view_media
    from public.profiles talent
    join viewer on true
    left join connected on connected.talent_user_id = talent.user_id
    where talent.account_type = 'talent'
      and talent.slug is not null
      and talent.is_published = true
      and talent.rockstar_available = true
      and public.normalize_profile_visibility(talent.visibility) in ('public', 'verified_employer_network', 'confidential')
      and not (
        coalesce(talent.blocked_companies, '{}'::text[])
        && coalesce(viewer.viewer_company_keys, '{}'::text[])
      )
  )
  select
    base.slug, base.visibility, base.verification_status, base.availability, base.opportunity_status,
    base.experience_years, base.focus_area, base.top_strength, base.skills, base.languages, base.passions,
    base.location, base.name, base.title, base.summary, base.current_employer, base.photo_storage_path,
    base.intro_video_storage_path,
    case when base.can_view_identifying_info then profile.career_journey else '[]'::jsonb end,
    base.can_view_identifying_info, base.can_view_media,
    case when base.can_view_identifying_info then profile.education else null end,
    case when base.can_view_identifying_info then profile.salary_expectation else null end
  from base
  join public.profiles profile on profile.slug = base.slug;
end
$$;

revoke all on function public.discovery_profiles_for_rockstar_employer() from public, anon, authenticated, service_role;
grant execute on function public.discovery_profiles_for_rockstar_employer() to authenticated;

-- Single-talent passport lookup for Short Stay employers, mirroring talent_passport_for_viewer_v3's
-- shape and redaction rules but restricted server-side to rockstar_available talent. Returns no rows
-- (not-found) for any non-Rockstar slug, closing the direct-URL/API bypass path.
create or replace function public.talent_passport_for_rockstar_employer(p_slug text)
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
  v_scope text := public.employer_discovery_scope();
begin
  if v_scope = 'none' then
    raise exception 'inactive_employer_subscription' using errcode = '42501';
  end if;

  return query
  with target as (
    select t.user_id, t.slug, t.visibility, t.is_published, t.blocked_companies, t.verification_status,
      t.availability, t.opportunity_status, t.experience_years, t.focus_area, t.top_strength, t.skills,
      t.languages, t.passions, t.location, t.name, t.title, t.summary, t.current_employer, t.career_journey,
      t.photo_storage_path, t.intro_video_storage_path
    from public.profiles t
    where t.account_type = 'talent'
      and t.slug = p_slug
      and t.rockstar_available = true
    limit 1
  ),
  viewer as (
    select public.company_identity_keys(p.employer_abn, p.employer_website, p.employer_company_name) as viewer_company_keys
    from public.profiles p
    where p.user_id = auth.uid()
  ),
  connected as (
    select c.talent_user_id
    from public.employer_talent_connections c
    where c.employer_user_id = auth.uid()
      and c.status = 'active'
  ),
  decision as (
    select target.*, public.normalize_profile_visibility(target.visibility) as normalized_visibility,
      connected.talent_user_id is not null as viewer_has_active_connection
    from target
    left join connected on connected.talent_user_id = target.user_id
  )
  select
    d.slug, d.normalized_visibility as visibility, false as is_owner,
    case when d.normalized_visibility = 'confidential' and d.viewer_has_active_connection then 'employer_full'
      when d.normalized_visibility = 'confidential' then 'employer_confidential'
      else 'employer_full' end as access_scope,
    d.verification_status, d.availability, d.opportunity_status, d.experience_years, d.focus_area, d.top_strength,
    d.skills, d.languages, d.passions,
    case when d.normalized_visibility <> 'confidential' or d.viewer_has_active_connection then d.location else 'General location available' end as location,
    case when d.normalized_visibility <> 'confidential' or d.viewer_has_active_connection then d.name else null end as name,
    case when d.normalized_visibility <> 'confidential' or d.viewer_has_active_connection then d.title else null end as title,
    case when d.normalized_visibility <> 'confidential' or d.viewer_has_active_connection then d.summary else null end as summary,
    null::text as bio,
    case when d.normalized_visibility <> 'confidential' or d.viewer_has_active_connection then d.current_employer else null end as current_employer,
    null::text as email,
    case when d.normalized_visibility <> 'confidential' or d.viewer_has_active_connection then d.career_journey else '[]'::jsonb end as career_journey,
    case when d.normalized_visibility <> 'confidential' or d.viewer_has_active_connection then d.photo_storage_path else null end as photo_storage_path,
    case when d.normalized_visibility <> 'confidential' or d.viewer_has_active_connection then d.intro_video_storage_path else null end as intro_video_storage_path,
    case when d.normalized_visibility <> 'confidential' then profile.education else null end as education,
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

revoke all on function public.talent_passport_for_rockstar_employer(text) from public, anon, authenticated, service_role;
grant execute on function public.talent_passport_for_rockstar_employer(text) to authenticated;

-- Introduction request creation for Short Stay employers. Reuses the SAME
-- employer_introduction_requests table and accept/decline/connection machinery as
-- create_employer_introduction_request() (no parallel introduction system) but is gated by
-- employer_discovery_scope() instead of require_verified_employer_actor(), and is restricted
-- to rockstar_available talent (checked directly, since it cannot rely on
-- talent_passport_for_viewer(), which itself requires a full subscription).
create or replace function public.create_rockstar_employer_introduction_request(
  p_slug text,
  p_message text default null
)
returns table (
  success boolean,
  already_exists boolean,
  request_id uuid,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_scope text := public.employer_discovery_scope();
  v_uid uuid := auth.uid();
  v_slug text := btrim(coalesce(p_slug, ''));
  v_message text := nullif(btrim(coalesce(p_message, '')), '');
  v_talent record;
  v_viewer_company_keys text[];
  v_talent_user_id uuid;
  v_request_id uuid;
  v_status text;
  v_created_at timestamptz;
  v_already_exists boolean := false;
begin
  if v_scope = 'none' then
    raise exception 'inactive_employer_subscription' using errcode = '42501';
  end if;

  if v_slug = '' then
    raise exception 'missing_slug' using errcode = '23502';
  end if;

  select p.user_id, p.visibility, p.is_published, p.blocked_companies, p.rockstar_available
  into v_talent
  from public.profiles p
  where p.account_type = 'talent'
    and p.slug = v_slug
  limit 1;

  if v_talent.user_id is null or v_talent.is_published is not true
    or public.normalize_profile_visibility(v_talent.visibility) not in ('public', 'verified_employer_network', 'confidential')
    or coalesce(v_talent.rockstar_available, false) is not true
  then
    raise exception 'not_authorized_for_candidate' using errcode = '42501';
  end if;

  select public.company_identity_keys(p.employer_abn, p.employer_website, p.employer_company_name)
  into v_viewer_company_keys
  from public.profiles p
  where p.user_id = v_uid;

  if coalesce(v_talent.blocked_companies, '{}'::text[]) && coalesce(v_viewer_company_keys, '{}'::text[]) then
    raise exception 'not_authorized_for_candidate' using errcode = '42501';
  end if;

  v_talent_user_id := v_talent.user_id;

  with ins as (
    insert into public.employer_introduction_requests (employer_user_id, talent_user_id, status, message)
    values (v_uid, v_talent_user_id, 'pending', v_message)
    on conflict (employer_user_id, talent_user_id)
      where (public.employer_introduction_requests.status = 'pending')
      do nothing
    returning id, public.employer_introduction_requests.status, public.employer_introduction_requests.created_at
  )
  select i.id, i.status, i.created_at
  into v_request_id, v_status, v_created_at
  from ins i;

  if v_request_id is null then
    select r.id, r.status, r.created_at
    into v_request_id, v_status, v_created_at
    from public.employer_introduction_requests r
    where r.employer_user_id = v_uid
      and r.talent_user_id = v_talent_user_id
      and r.status = 'pending'
    order by r.created_at desc
    limit 1;

    if v_request_id is null then
      raise exception 'request_insert_failed' using errcode = 'P0001';
    end if;

    v_already_exists := true;
  else
    perform public.create_notification_event(
      v_talent_user_id,
      v_uid,
      'intro_request_received',
      'You received an introduction request.',
      'Review and respond from your dashboard.',
      'introduction_request',
      v_request_id,
      format('intro_request:%s:created', v_request_id::text)
    );
  end if;

  return query
  select true, v_already_exists, v_request_id, v_status, v_created_at;
end
$$;

revoke all on function public.create_rockstar_employer_introduction_request(text, text) from public, anon, authenticated, service_role;
grant execute on function public.create_rockstar_employer_introduction_request(text, text) to authenticated;
