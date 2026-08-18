-- Return structured Talent experience to verified employers only when discovery already permits identifying details.

drop function if exists public.discovery_profiles_for_verified_employer_v2();

create or replace function public.discovery_profiles_for_verified_employer_v2()
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
  career_journey jsonb,
  can_view_identifying_info boolean,
  can_view_media boolean,
  education text,
  salary_expectation text
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select
    base.slug,
    base.visibility,
    base.verification_status,
    base.availability,
    base.opportunity_status,
    base.experience_years,
    base.focus_area,
    base.top_strength,
    base.skills,
    base.languages,
    base.passions,
    base.location,
    base.name,
    base.title,
    base.summary,
    base.current_employer,
    base.photo_storage_path,
    base.intro_video_storage_path,
    case when base.can_view_identifying_info then profile.career_journey else '[]'::jsonb end,
    base.can_view_identifying_info,
    base.can_view_media,
    case when base.can_view_identifying_info then profile.education else null end,
    case when base.can_view_identifying_info then profile.salary_expectation else null end
  from public.discovery_profiles_for_verified_employer() as base
  join public.profiles as profile on profile.slug = base.slug;
$$;

revoke all on function public.discovery_profiles_for_verified_employer_v2() from public, anon, authenticated, service_role;
grant execute on function public.discovery_profiles_for_verified_employer_v2() to authenticated;