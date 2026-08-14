alter table public.profiles
  add column if not exists bio text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_bio_length_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_bio_length_check check (bio is null or char_length(bio) <= 750);
  end if;
end
$$;

create or replace function public.talent_passport_for_viewer_v3(p_slug text)
returns table (
  slug text, visibility text, is_owner boolean, access_scope text, verification_status text,
  availability text, opportunity_status text, experience_years integer, focus_area text,
  top_strength text, skills text[], location text, name text, title text, summary text,
  bio text, current_employer text, email text, career_journey jsonb,
  photo_storage_path text, intro_video_storage_path text, education text, salary_expectation text
)
language sql security definer stable set search_path = public, pg_temp
as $$
  select base.slug, base.visibility, base.is_owner, base.access_scope, base.verification_status,
    base.availability, base.opportunity_status, base.experience_years, base.focus_area,
    base.top_strength, base.skills, base.location, base.name, base.title, base.summary,
    profile.bio, base.current_employer, base.email, base.career_journey,
    base.photo_storage_path, base.intro_video_storage_path,
    case when base.access_scope <> 'employer_confidential' then profile.education else null end,
    case when base.access_scope in ('owner_full', 'employer_full') then profile.salary_expectation else null end
  from public.talent_passport_for_viewer_v2(p_slug) base
  join public.profiles profile on profile.slug = base.slug;
$$;

revoke all on function public.talent_passport_for_viewer_v3(text) from public, anon;
grant execute on function public.talent_passport_for_viewer_v3(text) to authenticated;