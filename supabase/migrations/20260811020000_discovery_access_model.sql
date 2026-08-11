-- Normalize legacy employer_network values without broadening access.
update public.profiles
set visibility = 'verified_employer_network'
where visibility = 'employer_network';

create or replace function public.normalize_profile_visibility(p_visibility text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when p_visibility = 'employer_network' then 'verified_employer_network'
    when p_visibility in ('public', 'verified_employer_network', 'confidential') then p_visibility
    else null
  end;
$$;

revoke all on function public.normalize_profile_visibility(text) from public;

create or replace function public.normalized_abn(p_abn text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  with digits as (
    select regexp_replace(coalesce(p_abn, ''), '[^0-9]', '', 'g') as abn
  ), weighted as (
    select
      abn,
      (
        ((substring(abn, 1, 1)::int - 1) * 10) +
        (substring(abn, 2, 1)::int * 1) +
        (substring(abn, 3, 1)::int * 3) +
        (substring(abn, 4, 1)::int * 5) +
        (substring(abn, 5, 1)::int * 7) +
        (substring(abn, 6, 1)::int * 9) +
        (substring(abn, 7, 1)::int * 11) +
        (substring(abn, 8, 1)::int * 13) +
        (substring(abn, 9, 1)::int * 15) +
        (substring(abn, 10, 1)::int * 17) +
        (substring(abn, 11, 1)::int * 19)
      ) as checksum
    from digits
    where length(abn) = 11
  )
  select case
    when checksum % 89 = 0 then abn
    else null
  end
  from weighted;
$$;

revoke all on function public.normalized_abn(text) from public;

create or replace function public.company_identity_keys(
  p_abn text,
  p_website text,
  p_company_name text
)
returns text[]
language sql
immutable
set search_path = public, pg_temp
as $$
  with cleaned as (
    select
      public.normalized_abn(p_abn) as abn_digits,
      nullif(
        lower(
          regexp_replace(
            regexp_replace(coalesce(p_website, ''), '^https?://', ''),
            '/.*$',
            ''
          )
        ),
        ''
      ) as host_name,
      nullif(
        lower(
          regexp_replace(trim(coalesce(p_company_name, '')), '\s+', ' ', 'g')
        ),
        ''
      ) as company_name
  )
  select array_remove(array[
    case when abn_digits is not null then 'abn:' || abn_digits end,
    case when host_name is not null then 'domain:' || host_name end,
    case when company_name is not null then 'name:' || company_name end
  ], null)
  from cleaned;
$$;

revoke all on function public.company_identity_keys(text, text, text) from public;

create or replace function public.current_viewer_profile_context()
returns table (
  viewer_user_id uuid,
  viewer_account_type text,
  viewer_employer_verification_status text,
  viewer_abn text,
  viewer_company_keys text[]
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select
    p.user_id,
    p.account_type,
    p.employer_verification_status,
    public.normalized_abn(p.employer_abn) as viewer_abn,
    public.company_identity_keys(
      p.employer_abn,
      p.employer_website,
      p.employer_company_name
    ) as viewer_company_keys
  from public.profiles as p
  where p.user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.current_viewer_profile_context() from public;

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

revoke all on function public.discovery_profiles_for_verified_employer() from public;
grant execute on function public.discovery_profiles_for_verified_employer() to authenticated;

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

revoke all on function public.talent_passport_for_viewer(text) from public;
grant execute on function public.talent_passport_for_viewer(text) to authenticated;