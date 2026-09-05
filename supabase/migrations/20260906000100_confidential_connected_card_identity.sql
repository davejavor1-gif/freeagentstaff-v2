begin;

-- An active employer_talent_connection is the scoped consent to identify a Confidential
-- Talent Card, matching the reveal rule already applied to the Talent Passport.
create or replace function public.discovery_profiles_for_verified_employer()
returns table (
  slug text,
  visibility text,
  verification_status text,
  availability text,
  opportunity_status text,
  experience_years integer,
  focus_area text,
  top_strength text,
  skills text[],
  languages text[],
  passions text[],
  location text,
  name text,
  title text,
  summary text,
  current_employer text,
  photo_storage_path text,
  intro_video_storage_path text,
  can_view_identifying_info boolean,
  can_view_media boolean
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  with viewer as (
    select *
    from public.current_viewer_profile_context() as v
    where v.viewer_account_type = 'employer'
      and v.viewer_employer_verification_status = 'verified'
      and v.viewer_abn is not null
  ),
  connected as (
    select c.talent_user_id
    from public.employer_talent_connections c
    where c.employer_user_id = auth.uid()
      and c.status = 'active'
  )
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
    case
      when public.normalize_profile_visibility(talent.visibility) = 'confidential' and connected.talent_user_id is null then 'General location available'
      else talent.location
    end as location,
    case
      when public.normalize_profile_visibility(talent.visibility) = 'confidential' and connected.talent_user_id is null then null
      else talent.name
    end as name,
    case
      when public.normalize_profile_visibility(talent.visibility) = 'confidential' and connected.talent_user_id is null then null
      else talent.title
    end as title,
    case
      when public.normalize_profile_visibility(talent.visibility) = 'confidential' and connected.talent_user_id is null then null
      else talent.summary
    end as summary,
    case
      when public.normalize_profile_visibility(talent.visibility) = 'confidential' and connected.talent_user_id is null then null
      else talent.current_employer
    end as current_employer,
    case
      when public.normalize_profile_visibility(talent.visibility) = 'confidential' and connected.talent_user_id is null then null
      else talent.photo_storage_path
    end as photo_storage_path,
    case
      when public.normalize_profile_visibility(talent.visibility) = 'confidential' and connected.talent_user_id is null then null
      else talent.intro_video_storage_path
    end as intro_video_storage_path,
    (public.normalize_profile_visibility(talent.visibility) <> 'confidential' or connected.talent_user_id is not null) as can_view_identifying_info,
    (public.normalize_profile_visibility(talent.visibility) <> 'confidential' or connected.talent_user_id is not null) as can_view_media
  from public.profiles as talent
  join viewer on true
  left join connected on connected.talent_user_id = talent.user_id
  where talent.account_type = 'talent'
    and talent.slug is not null
    and talent.is_published = true
    and public.normalize_profile_visibility(talent.visibility) in (
      'public',
      'verified_employer_network',
      'confidential'
    )
    and not (
      coalesce(talent.blocked_companies, '{}'::text[])
      &&
      coalesce(viewer.viewer_company_keys, '{}'::text[])
    );
$$;

revoke all on function public.discovery_profiles_for_verified_employer() from public, anon, authenticated, service_role;
grant execute on function public.discovery_profiles_for_verified_employer() to authenticated;

commit;
