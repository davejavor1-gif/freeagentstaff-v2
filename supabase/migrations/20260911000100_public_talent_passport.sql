create or replace function public.talent_passport_public(p_slug text)
returns table (
  slug text,
  availability text,
  opportunity_status text,
  experience_years integer,
  focus_area text,
  top_strength text,
  skills text[],
  passions text[],
  languages text[],
  location text,
  name text,
  title text,
  summary text,
  bio text,
  career_journey jsonb,
  education text,
  education_entries jsonb,
  salary_expectation text
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select
    p.slug,
    p.availability,
    p.opportunity_status,
    p.experience_years,
    p.focus_area,
    p.top_strength,
    p.skills,
    p.passions,
    p.languages,
    p.location,
    p.name,
    p.title,
    p.summary,
    p.bio,
    p.career_journey,
    p.education,
    p.education_entries,
    p.salary_expectation
  from public.profiles p
  where p.account_type = 'talent'
    and p.slug = nullif(btrim(p_slug), '')
    and p.is_published = true
    and public.normalize_profile_visibility(p.visibility) = 'public'
  limit 1;
$$;

revoke all on function public.talent_passport_public(text) from public, anon, authenticated, service_role;
grant execute on function public.talent_passport_public(text) to anon, authenticated, service_role;
