begin;

create or replace function public.normalize_blocked_company_identifier(
  p_identifier text
)
returns text
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  v_identifier text := btrim(coalesce(p_identifier, ''));
  v_normalized_abn text;
  v_host_name text;
  v_company_name text;
begin
  if v_identifier = '' then
    return null;
  end if;

  if lower(v_identifier) like 'abn:%' then
    v_identifier := btrim(substring(v_identifier from 5));
  elsif lower(v_identifier) like 'domain:%' then
    v_identifier := btrim(substring(v_identifier from 8));
  elsif lower(v_identifier) like 'name:%' then
    v_identifier := btrim(substring(v_identifier from 6));
  end if;

  v_normalized_abn := public.normalized_abn(v_identifier);
  if v_normalized_abn is not null then
    return 'abn:' || v_normalized_abn;
  end if;

  v_host_name := nullif(
    lower(
      regexp_replace(
        regexp_replace(v_identifier, '^https?://', ''),
        '/.*$',
        ''
      )
    ),
    ''
  );

  if v_host_name is not null and v_host_name ~ '^[a-z0-9.-]+\.[a-z]{2,}$' then
    return 'domain:' || v_host_name;
  end if;

  v_company_name := nullif(
    lower(
      regexp_replace(trim(v_identifier), '\s+', ' ', 'g')
    ),
    ''
  );

  if v_company_name is null then
    return null;
  end if;

  return 'name:' || v_company_name;
end
$$;

create or replace function public.update_talent_privacy_settings(
  p_visibility text,
  p_opportunity_status text,
  p_is_published boolean
)
returns table (
  visibility text,
  opportunity_status text,
  is_published boolean,
  blocked_companies text[]
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := public.require_talent_actor();
  v_visibility text := public.normalize_profile_visibility(btrim(coalesce(p_visibility, '')));
  v_opportunity_status text := btrim(coalesce(p_opportunity_status, ''));
  v_result_visibility text;
  v_result_opportunity_status text;
  v_result_is_published boolean;
  v_result_blocked_companies text[];
begin
  if v_visibility not in ('public', 'verified_employer_network', 'confidential') then
    raise exception 'invalid_visibility' using errcode = '23514';
  end if;

  if v_opportunity_status not in ('actively_open', 'exploring', 'not_open') then
    raise exception 'invalid_opportunity_status' using errcode = '23514';
  end if;

  if p_is_published is null then
    raise exception 'missing_publish_state' using errcode = '23502';
  end if;

  perform set_config('freeagent.transition', 'update_talent_privacy_settings', true);
  perform set_config('freeagent.transition_uid', v_uid::text, true);

  update public.profiles p
  set
    visibility = v_visibility,
    opportunity_status = v_opportunity_status,
    is_published = p_is_published,
    updated_at = now()
  where p.user_id = v_uid
  returning p.visibility, p.opportunity_status, p.is_published, p.blocked_companies
  into v_result_visibility, v_result_opportunity_status, v_result_is_published, v_result_blocked_companies;

  return query
  select
    v_result_visibility,
    v_result_opportunity_status,
    v_result_is_published,
    coalesce(v_result_blocked_companies, '{}'::text[]);
end
$$;

create or replace function public.add_talent_blocked_company(
  p_identifier text
)
returns table (
  success boolean,
  blocked_key text,
  blocked_companies text[]
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := public.require_talent_actor();
  v_blocked_key text := public.normalize_blocked_company_identifier(p_identifier);
  v_blocked_companies text[];
begin
  if v_blocked_key is null then
    raise exception 'invalid_block_identifier' using errcode = '23514';
  end if;

  perform set_config('freeagent.transition', 'add_talent_blocked_company', true);
  perform set_config('freeagent.transition_uid', v_uid::text, true);

  update public.profiles p
  set
    blocked_companies = case
      when v_blocked_key = any(coalesce(p.blocked_companies, '{}'::text[])) then coalesce(p.blocked_companies, '{}'::text[])
      else array_append(coalesce(p.blocked_companies, '{}'::text[]), v_blocked_key)
    end,
    updated_at = now()
  where p.user_id = v_uid
  returning p.blocked_companies
  into v_blocked_companies;

  return query
  select true, v_blocked_key, coalesce(v_blocked_companies, '{}'::text[]);
end
$$;

create or replace function public.remove_talent_blocked_company(
  p_key text
)
returns table (
  success boolean,
  removed boolean,
  blocked_companies text[]
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := public.require_talent_actor();
  v_blocked_key text := btrim(coalesce(p_key, ''));
  v_existing_blocked_companies text[];
  v_blocked_companies text[];
begin
  if v_blocked_key = '' then
    raise exception 'missing_block_key' using errcode = '23502';
  end if;

  select coalesce(p.blocked_companies, '{}'::text[])
  into v_existing_blocked_companies
  from public.profiles p
  where p.user_id = v_uid;

  perform set_config('freeagent.transition', 'remove_talent_blocked_company', true);
  perform set_config('freeagent.transition_uid', v_uid::text, true);

  update public.profiles p
  set
    blocked_companies = array_remove(coalesce(p.blocked_companies, '{}'::text[]), v_blocked_key),
    updated_at = now()
  where p.user_id = v_uid
  returning p.blocked_companies
  into v_blocked_companies;

  return query
  select true, v_blocked_key = any(v_existing_blocked_companies), coalesce(v_blocked_companies, '{}'::text[]);
end
$$;

drop function if exists public.list_saved_talent_for_employer(uuid);
drop function if exists public.talent_passport_for_viewer(text);

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

create or replace function public.profiles_guard_protected_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_transition text := current_setting('freeagent.transition', true);
  v_transition_uid_text text := nullif(current_setting('freeagent.transition_uid', true), '');
  v_transition_uid uuid := case
    when v_transition_uid_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then v_transition_uid_text::uuid
    else null
  end;
  v_old_norm_abn text := public.normalized_abn(old.employer_abn);
  v_new_norm_abn text := public.normalized_abn(new.employer_abn);
  v_identity_changed boolean := false;
  v_auto_reset_applied boolean := false;
  v_talent_privacy_changed boolean := false;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if coalesce(new.account_type, '') <> coalesce(old.account_type, '') then
    raise exception 'account_type_immutable' using errcode = '42501';
  end if;

  if old.account_type = 'employer' then
    v_identity_changed :=
      coalesce(new.employer_company_name, '') <> coalesce(old.employer_company_name, '')
      or coalesce(v_new_norm_abn, '') <> coalesce(v_old_norm_abn, '');

    if v_identity_changed and old.employer_verification_status in ('pending', 'verified') then
      new.employer_verification_status := 'unverified';
      new.verification_requested_at := null;
      new.verification_reviewed_at := null;
      new.verification_reviewed_by := null;
      new.verification_rejection_reason := null;
      v_auto_reset_applied := true;
    end if;
  end if;

  if old.account_type = 'talent' then
    v_talent_privacy_changed :=
      coalesce(new.visibility, '') <> coalesce(old.visibility, '')
      or coalesce(new.opportunity_status, '') <> coalesce(old.opportunity_status, '')
      or coalesce(new.is_published, false) <> coalesce(old.is_published, false)
      or coalesce(new.blocked_companies, '{}'::text[]) <> coalesce(old.blocked_companies, '{}'::text[]);

    if v_talent_privacy_changed then
      if v_transition in ('update_talent_privacy_settings', 'add_talent_blocked_company', 'remove_talent_blocked_company')
         and v_transition_uid is not null
         and v_transition_uid = new.user_id then
        return new;
      end if;

      raise exception 'talent_privacy_fields_protected' using errcode = '42501';
    end if;
  end if;

  if coalesce(new.employer_verification_status, '') <> coalesce(old.employer_verification_status, '') then
    if v_auto_reset_applied
       and old.employer_verification_status in ('pending', 'verified')
       and new.employer_verification_status = 'unverified' then
      return new;
    end if;

    if old.employer_verification_status in ('unverified', 'rejected')
       and new.employer_verification_status = 'pending'
       and v_transition = 'submit_employer_verification'
       and v_transition_uid is not null
       and v_transition_uid = new.user_id then
      return new;
    end if;

    if old.employer_verification_status = 'pending'
       and new.employer_verification_status in ('verified', 'rejected')
       and v_transition = 'admin_review_employer_verification'
       and v_transition_uid is not null
       and v_transition_uid = new.user_id then
      return new;
    end if;

    raise exception 'employer_verification_status_protected' using errcode = '42501';
  end if;

  return new;
end
$$;

revoke all on function public.normalize_blocked_company_identifier(text) from public, anon, authenticated, service_role;
revoke all on function public.update_talent_privacy_settings(text, text, boolean) from public, anon;
revoke all on function public.add_talent_blocked_company(text) from public, anon;
revoke all on function public.remove_talent_blocked_company(text) from public, anon;
revoke all on function public.talent_passport_for_viewer(text) from public, anon;
revoke all on function public.list_saved_talent_for_employer(uuid) from public, anon;

grant execute on function public.update_talent_privacy_settings(text, text, boolean) to authenticated;
grant execute on function public.add_talent_blocked_company(text) to authenticated;
grant execute on function public.remove_talent_blocked_company(text) to authenticated;
grant execute on function public.talent_passport_for_viewer(text) to authenticated;
grant execute on function public.list_saved_talent_for_employer(uuid) to authenticated;

commit;