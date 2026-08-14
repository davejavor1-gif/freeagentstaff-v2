alter table public.profiles
  add column if not exists education text,
  add column if not exists salary_expectation text,
  add column if not exists contact_email text,
  add column if not exists resume_storage_path text,
  add column if not exists resume_original_filename text,
  add column if not exists resume_uploaded_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_salary_expectation_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_salary_expectation_check
      check (salary_expectation in ('under_60k', '60k_80k', '80k_100k', '100k_120k', '120k_150k', '150k_200k', '200k_plus', 'prefer_not_to_say'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_contact_email_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_contact_email_check
      check (contact_email is null or contact_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$');
  end if;
end
$$;

create or replace function public.generate_profile_slug()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  base_slug text;
  candidate text;
  suffix text;
  attempt integer := 0;
begin
  if new.slug is not null and btrim(new.slug) <> '' then
    return new;
  end if;

  base_slug := regexp_replace(lower(coalesce(nullif(btrim(new.name), ''), 'talent')), '[^a-z0-9]+', '-', 'g');
  base_slug := regexp_replace(base_slug, '(^-+|-+$)', '', 'g');
  base_slug := left(coalesce(nullif(base_slug, ''), 'talent'), 48);
  candidate := base_slug;

  while exists (select 1 from public.profiles p where p.slug = candidate and p.user_id <> new.user_id) loop
    attempt := attempt + 1;
    suffix := substr(md5(new.user_id::text || ':' || attempt::text), 1, 5);
    candidate := left(base_slug, 42) || '-' || suffix;
  end loop;

  new.slug := candidate;
  return new;
end
$$;

drop trigger if exists profiles_generate_slug on public.profiles;
create trigger profiles_generate_slug
before insert or update of slug, name on public.profiles
for each row execute function public.generate_profile_slug();

update public.profiles
set slug = null
where slug is null or btrim(slug) = '';

create unique index if not exists profiles_slug_unique_idx on public.profiles(slug) where slug is not null;

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
  location text,
  name text,
  title text,
  summary text,
  current_employer text,
  photo_storage_path text,
  intro_video_storage_path text,
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
    base.location,
    base.name,
    base.title,
    base.summary,
    base.current_employer,
    base.photo_storage_path,
    base.intro_video_storage_path,
    base.can_view_identifying_info,
    base.can_view_media,
    case when base.can_view_identifying_info then profile.education else null end,
    case when base.can_view_identifying_info then profile.salary_expectation else null end
  from public.discovery_profiles_for_verified_employer() as base
  join public.profiles as profile on profile.slug = base.slug;
$$;

create or replace function public.talent_passport_for_viewer_v2(p_slug text)
returns table (
  slug text,
  visibility text,
  is_owner boolean,
  access_scope text,
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
  current_employer text,
  email text,
  career_journey jsonb,
  photo_storage_path text,
  intro_video_storage_path text,
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
    base.is_owner,
    base.access_scope,
    base.verification_status,
    base.availability,
    base.opportunity_status,
    base.experience_years,
    base.focus_area,
    base.top_strength,
    base.skills,
    base.location,
    base.name,
    base.title,
    base.summary,
    base.current_employer,
    null::text as email,
    base.career_journey,
    base.photo_storage_path,
    base.intro_video_storage_path,
    case when base.access_scope <> 'employer_confidential' then profile.education else null end,
    case when base.access_scope in ('owner_full', 'employer_full') then profile.salary_expectation else null end
  from public.talent_passport_for_viewer(p_slug) as base
  join public.profiles as profile on profile.slug = base.slug;
$$;

revoke all on function public.discovery_profiles_for_verified_employer_v2() from public, anon;
revoke all on function public.talent_passport_for_viewer_v2(text) from public, anon;
grant execute on function public.discovery_profiles_for_verified_employer_v2() to authenticated;
grant execute on function public.talent_passport_for_viewer_v2(text) to authenticated;

create or replace function public.talent_contact_for_connected_employer(
  p_talent_slug text
)
returns table (talent_slug text, email text)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_employer_uid uuid := public.require_verified_employer_actor();
  v_slug text := btrim(coalesce(p_talent_slug, ''));
  v_talent_user_id uuid;
  v_email text;
begin
  if v_slug = '' then
    raise exception 'missing_slug' using errcode = '23502';
  end if;

  select p.user_id, coalesce(nullif(btrim(p.contact_email), ''), nullif(btrim(p.email), ''))
  into v_talent_user_id, v_email
  from public.profiles p
  where p.account_type = 'talent' and p.slug = v_slug
  limit 1;

  if v_talent_user_id is null then
    raise exception 'contact_unavailable' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.employer_talent_connections c
    where c.employer_user_id = v_employer_uid
      and c.talent_user_id = v_talent_user_id
      and c.status = 'active'
  ) or not public.employer_can_access_talent(v_employer_uid, v_slug) then
    raise exception 'contact_unavailable' using errcode = '42501';
  end if;

  if v_email is null or v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'contact_unavailable' using errcode = '42501';
  end if;

  return query select v_slug, v_email;
end
$$;

insert into storage.buckets (id, name, public)
values ('talent-resumes', 'talent-resumes', false)
on conflict (id) do nothing;

drop policy if exists "Talent can upload own resumes" on storage.objects;
create policy "Talent can upload own resumes"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'talent-resumes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Talent can update own resumes" on storage.objects;
create policy "Talent can update own resumes"
  on storage.objects for update to authenticated
  using (bucket_id = 'talent-resumes' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'talent-resumes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Talent can delete own resumes" on storage.objects;
create policy "Talent can delete own resumes"
  on storage.objects for delete to authenticated
  using (bucket_id = 'talent-resumes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Talent can select own resumes" on storage.objects;
create policy "Talent can select own resumes"
  on storage.objects for select to authenticated
  using (bucket_id = 'talent-resumes' and (storage.foldername(name))[1] = auth.uid()::text);