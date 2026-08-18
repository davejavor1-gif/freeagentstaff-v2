begin;

-- An active introduction connection is the scoped consent to identify a Confidential Talent Passport.
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
    from public.profiles t
    where t.account_type = 'talent'
      and t.slug = p_slug
    limit 1
  ),
  viewer as (
    select *
    from public.current_viewer_profile_context() v
  ),
  decision as (
    select
      target.*,
      public.normalize_profile_visibility(target.visibility) as normalized_visibility,
      target.user_id = auth.uid() as is_owner,
      exists (
        select 1
        from viewer v
        where v.viewer_account_type = 'employer'
          and v.viewer_employer_verification_status = 'verified'
          and v.viewer_abn is not null
          and not (
            coalesce(target.blocked_companies, '{}'::text[])
            && coalesce(v.viewer_company_keys, '{}'::text[])
          )
      ) as viewer_is_verified_employer,
      exists (
        select 1
        from public.employer_talent_connections c
        where c.employer_user_id = auth.uid()
          and c.talent_user_id = target.user_id
          and c.status = 'active'
      ) as viewer_has_active_connection
    from target
  )
  select
    d.slug,
    d.normalized_visibility as visibility,
    d.is_owner,
    case
      when d.is_owner then 'owner_full'
      when d.normalized_visibility = 'confidential' and d.viewer_has_active_connection then 'employer_full'
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
      when d.is_owner or d.normalized_visibility <> 'confidential' or d.viewer_has_active_connection then d.location
      else 'General location available'
    end as location,
    case
      when d.is_owner or d.normalized_visibility <> 'confidential' or d.viewer_has_active_connection then d.name
      else null
    end as name,
    case
      when d.is_owner or d.normalized_visibility <> 'confidential' or d.viewer_has_active_connection then d.title
      else null
    end as title,
    case
      when d.is_owner or d.normalized_visibility <> 'confidential' or d.viewer_has_active_connection then d.summary
      else null
    end as summary,
    case
      when d.is_owner or d.normalized_visibility <> 'confidential' or d.viewer_has_active_connection then d.current_employer
      else null
    end as current_employer,
    case when d.is_owner then d.email else null end as email,
    case
      when d.is_owner or d.normalized_visibility <> 'confidential' or d.viewer_has_active_connection then d.career_journey
      else '[]'::jsonb
    end as career_journey,
    case
      when d.is_owner or d.normalized_visibility <> 'confidential' or d.viewer_has_active_connection then d.photo_storage_path
      else null
    end as photo_storage_path,
    case
      when d.is_owner or d.normalized_visibility <> 'confidential' or d.viewer_has_active_connection then d.intro_video_storage_path
      else null
    end as intro_video_storage_path
  from decision d
  where d.is_owner
    or (
      d.normalized_visibility is not null
      and d.viewer_is_verified_employer = true
      and d.is_published = true
      and d.normalized_visibility in ('public', 'verified_employer_network', 'confidential')
    );
$$;

revoke all on function public.talent_passport_for_viewer(text) from public, anon;
grant execute on function public.talent_passport_for_viewer(text) to authenticated;

commit;
