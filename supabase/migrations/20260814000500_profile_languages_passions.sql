alter table public.profiles
  add column if not exists languages text[] not null default '{}',
  add column if not exists passions text[] not null default '{}';

with normalized as (
  select
    p.user_id,
    case
      when jsonb_typeof(p.profile -> 'languages') = 'array' then (
        select coalesce(array_agg(item.value order by item.position), '{}'::text[])
        from (
          select value, min(position) as position
          from (
            select
              btrim(raw.value) as value,
              raw.position
            from jsonb_array_elements_text(p.profile -> 'languages') with ordinality as raw(value, position)
            where btrim(raw.value) <> ''
          ) cleaned
          group by lower(value), value
          order by min(position)
          limit 10
        ) item
      )
      else null
    end as json_languages,
    case
      when jsonb_typeof(p.profile -> 'passions') = 'array' then (
        select coalesce(array_agg(item.value order by item.position), '{}'::text[])
        from (
          select value, min(position) as position
          from (
            select
              btrim(raw.value) as value,
              raw.position
            from jsonb_array_elements_text(p.profile -> 'passions') with ordinality as raw(value, position)
            where btrim(raw.value) <> ''
          ) cleaned
          group by lower(value), value
          order by min(position)
          limit 8
        ) item
      )
      else null
    end as json_passions
  from public.profiles p
  where p.account_type = 'talent'
)
update public.profiles p
set
  languages = case
    when coalesce(array_length(p.languages, 1), 0) = 0 and n.json_languages is not null then n.json_languages
    else p.languages
  end,
  passions = case
    when coalesce(array_length(p.passions, 1), 0) = 0 and n.json_passions is not null then n.json_passions
    else p.passions
  end
from normalized n
where p.user_id = n.user_id
  and (
    (coalesce(array_length(p.languages, 1), 0) = 0 and n.json_languages is not null)
    or (coalesce(array_length(p.passions, 1), 0) = 0 and n.json_passions is not null)
  );

drop function if exists public.discovery_profiles_for_verified_employer() cascade;
drop function if exists public.talent_passport_for_viewer(text) cascade;
drop function if exists public.discovery_profiles_for_verified_employer_v2() cascade;
drop function if exists public.talent_passport_for_viewer_v2(text) cascade;
drop function if exists public.talent_passport_for_viewer_v3(text) cascade;
drop function if exists public.list_saved_talent_for_employer(uuid) cascade;

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
      when public.normalize_profile_visibility(talent.visibility) = 'confidential' then 'General location available'
      else talent.location
    end as location,
    case
      when public.normalize_profile_visibility(talent.visibility) = 'confidential' then null
      else talent.name
    end as name,
    case
      when public.normalize_profile_visibility(talent.visibility) = 'confidential' then null
      else talent.title
    end as title,
    case
      when public.normalize_profile_visibility(talent.visibility) = 'confidential' then null
      else talent.summary
    end as summary,
    case
      when public.normalize_profile_visibility(talent.visibility) = 'confidential' then null
      else talent.current_employer
    end as current_employer,
    case
      when public.normalize_profile_visibility(talent.visibility) = 'confidential' then null
      else talent.photo_storage_path
    end as photo_storage_path,
    case
      when public.normalize_profile_visibility(talent.visibility) = 'confidential' then null
      else talent.intro_video_storage_path
    end as intro_video_storage_path,
    public.normalize_profile_visibility(talent.visibility) <> 'confidential' as can_view_identifying_info,
    public.normalize_profile_visibility(talent.visibility) <> 'confidential' as can_view_media
  from public.profiles as talent
  join viewer on true
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

create or replace function public.talent_passport_for_viewer(p_slug text)
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
  languages text[],
  passions text[],
  location text,
  name text,
  title text,
  summary text,
  current_employer text,
  email text,
  career_journey jsonb,
  photo_storage_path text,
  intro_video_storage_path text
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  with target as (
    select
      t.user_id,
      t.slug,
      t.visibility,
      t.is_published,
      t.blocked_companies,
      t.verification_status,
      t.availability,
      t.opportunity_status,
      t.experience_years,
      t.focus_area,
      t.top_strength,
      t.skills,
      t.languages,
      t.passions,
      t.location,
      t.name,
      t.title,
      t.summary,
      t.current_employer,
      t.email,
      t.career_journey,
      t.photo_storage_path,
      t.intro_video_storage_path
    from public.profiles as t
    where t.account_type = 'talent'
      and t.slug = p_slug
    limit 1
  ),
  viewer as (
    select *
    from public.current_viewer_profile_context() as v
  ),
  decision as (
    select
      target.*,
      public.normalize_profile_visibility(target.visibility) as normalized_visibility,
      (target.user_id = auth.uid()) as is_owner,
      exists (
        select 1
        from viewer as v
        where v.viewer_account_type = 'employer'
          and v.viewer_employer_verification_status = 'verified'
          and v.viewer_abn is not null
          and not (
            coalesce(target.blocked_companies, '{}'::text[])
            &&
            coalesce(v.viewer_company_keys, '{}'::text[])
          )
      ) as viewer_is_verified_employer
    from target
  )
  select
    d.slug,
    d.normalized_visibility as visibility,
    d.is_owner,
    case
      when d.is_owner then 'owner_full'
      when d.normalized_visibility = 'confidential' then 'employer_confidential'
      else 'employer_full'
    end as access_scope,
    d.verification_status,
    d.availability,
    d.opportunity_status,
    d.experience_years,
    d.focus_area,
    d.top_strength,
    d.skills,
    d.languages,
    d.passions,
    case
      when d.is_owner then d.location
      when d.normalized_visibility = 'confidential' then 'General location available'
      else d.location
    end as location,
    case
      when d.is_owner then d.name
      when d.normalized_visibility = 'confidential' then null
      else d.name
    end as name,
    case
      when d.is_owner then d.title
      when d.normalized_visibility = 'confidential' then null
      else d.title
    end as title,
    case
      when d.is_owner then d.summary
      when d.normalized_visibility = 'confidential' then null
      else d.summary
    end as summary,
    case
      when d.is_owner then d.current_employer
      when d.normalized_visibility = 'confidential' then null
      else d.current_employer
    end as current_employer,
    case
      when d.is_owner then d.email
      else null
    end as email,
    case
      when d.is_owner then d.career_journey
      when d.normalized_visibility = 'confidential' then '[]'::jsonb
      else d.career_journey
    end as career_journey,
    case
      when d.is_owner then d.photo_storage_path
      when d.normalized_visibility = 'confidential' then null
      else d.photo_storage_path
    end as photo_storage_path,
    case
      when d.is_owner then d.intro_video_storage_path
      when d.normalized_visibility = 'confidential' then null
      else d.intro_video_storage_path
    end as intro_video_storage_path
  from decision as d
  where d.is_owner
    or (
      d.normalized_visibility is not null
      and d.viewer_is_verified_employer = true
      and d.is_published = true
      and d.normalized_visibility in (
        'public',
        'verified_employer_network',
        'confidential'
      )
    );
$$;

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
  languages text[],
  passions text[],
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
    base.languages,
    base.passions,
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

create or replace function public.talent_passport_for_viewer_v3(p_slug text)
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
  languages text[],
  passions text[],
  location text,
  name text,
  title text,
  summary text,
  bio text,
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
    base.languages,
    base.passions,
    base.location,
    base.name,
    base.title,
    base.summary,
    profile.bio,
    base.current_employer,
    base.email,
    base.career_journey,
    base.photo_storage_path,
    base.intro_video_storage_path,
    case when base.access_scope <> 'employer_confidential' then profile.education else null end,
    case when base.access_scope in ('owner_full', 'employer_full') then profile.salary_expectation else null end
  from public.talent_passport_for_viewer_v2(p_slug) base
  join public.profiles profile on profile.slug = base.slug;
$$;

create or replace function public.list_saved_talent_for_employer(
  p_shortlist_id uuid default null
)
returns table (
  saved_talent_id uuid,
  saved_at timestamptz,
  slug text,
  access_scope text,
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
  career_journey jsonb,
  photo_storage_path text,
  intro_video_storage_path text,
  shortlist_ids uuid[]
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := public.require_verified_employer_actor();
begin
  if p_shortlist_id is not null and not exists (
    select 1
    from public.employer_shortlists s
    where s.id = p_shortlist_id
      and s.employer_user_id = v_uid
  ) then
    raise exception 'shortlist_not_found' using errcode = 'P0002';
  end if;

  return query
  with base as (
    select
      st.id as saved_talent_id,
      st.created_at as saved_at,
      t.slug,
      st.talent_user_id
    from public.employer_saved_talent st
    join public.profiles t
      on t.user_id = st.talent_user_id
     and t.account_type = 'talent'
    where st.employer_user_id = v_uid
      and (
        p_shortlist_id is null
        or exists (
          select 1
          from public.employer_shortlist_members m
          where m.shortlist_id = p_shortlist_id
            and m.employer_user_id = st.employer_user_id
            and m.talent_user_id = st.talent_user_id
        )
      )
  )
  select
    b.saved_talent_id,
    b.saved_at,
    p.slug,
    p.access_scope,
    p.visibility,
    p.verification_status,
    p.availability,
    p.opportunity_status,
    p.experience_years,
    p.focus_area,
    p.top_strength,
    p.skills,
    p.languages,
    p.passions,
    p.location,
    p.name,
    p.title,
    p.summary,
    p.current_employer,
    p.career_journey,
    p.photo_storage_path,
    p.intro_video_storage_path,
    coalesce(
      (
        select array_agg(m.shortlist_id order by m.shortlist_id)
        from public.employer_shortlist_members m
        where m.employer_user_id = v_uid
          and m.talent_user_id = b.talent_user_id
      ),
      '{}'::uuid[]
    ) as shortlist_ids
  from base b
  join lateral public.talent_passport_for_viewer(b.slug) p on true
  order by b.saved_at desc;
end
$$;

revoke all on function public.discovery_profiles_for_verified_employer() from public, anon;
revoke all on function public.discovery_profiles_for_verified_employer_v2() from public, anon;
revoke all on function public.talent_passport_for_viewer(text) from public, anon;
revoke all on function public.talent_passport_for_viewer_v2(text) from public, anon;
revoke all on function public.talent_passport_for_viewer_v3(text) from public, anon;
revoke all on function public.list_saved_talent_for_employer(uuid) from public, anon;

grant execute on function public.discovery_profiles_for_verified_employer() to authenticated;
grant execute on function public.discovery_profiles_for_verified_employer_v2() to authenticated;
grant execute on function public.talent_passport_for_viewer(text) to authenticated;
grant execute on function public.talent_passport_for_viewer_v2(text) to authenticated;
grant execute on function public.talent_passport_for_viewer_v3(text) to authenticated;
grant execute on function public.list_saved_talent_for_employer(uuid) to authenticated;
