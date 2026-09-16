-- Extends Short Stay Employer (rockstar_only discovery scope) coverage to the EXISTING saved
-- Talent / shortlist tables and RPC surface, without changing behaviour for full-access employers.
-- Reuses employer_saved_talent / employer_shortlists / employer_shortlist_members unchanged.

-- Shared gate for the two shortlist-container CRUD functions that carry no talent-data exposure
-- risk (naming/renaming a container the employer already owns). Widens the caller set to include
-- an unexpired Short Stay pass, on top of the same verification/ABN/system-admin checks as
-- require_verified_employer_actor(). Does not affect require_verified_employer_actor() itself or
-- any function that still calls it directly.
create or replace function public.require_employer_actor_with_discovery_access()
returns uuid
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

  return auth.uid();
end
$$;

revoke all on function public.require_employer_actor_with_discovery_access() from public, anon, authenticated, service_role;
grant execute on function public.require_employer_actor_with_discovery_access() to authenticated;

-- Same body as before; only the actor gate changed (require_verified_employer_actor() ->
-- require_employer_actor_with_discovery_access()). Behaviour for full-access employers unchanged.
create or replace function public.create_employer_shortlist(
  p_name text
)
returns table (
  shortlist_id uuid,
  name text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := public.require_employer_actor_with_discovery_access();
  v_name text := btrim(coalesce(p_name, ''));
begin
  if v_name = '' then
    raise exception 'invalid_name' using errcode = '23514';
  end if;

  insert into public.employer_shortlists (employer_user_id, name)
  values (v_uid, v_name)
  returning id, employer_shortlists.name, employer_shortlists.created_at, employer_shortlists.updated_at
  into shortlist_id, name, created_at, updated_at;

  return next;
end
$$;

create or replace function public.rename_employer_shortlist(
  p_shortlist_id uuid,
  p_name text
)
returns table (
  shortlist_id uuid,
  name text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := public.require_employer_actor_with_discovery_access();
  v_name text := btrim(coalesce(p_name, ''));
begin
  if v_name = '' then
    raise exception 'invalid_name' using errcode = '23514';
  end if;

  update public.employer_shortlists s
  set name = v_name,
      updated_at = now()
  where s.id = p_shortlist_id
    and s.employer_user_id = v_uid
  returning s.id, s.name, s.updated_at
  into shortlist_id, name, updated_at;

  if shortlist_id is null then
    raise exception 'shortlist_not_found' using errcode = 'P0002';
  end if;

  return next;
end
$$;

-- Rockstar-only equivalent of save_talent_for_employer(). Does not call
-- talent_passport_for_viewer() (which requires a full subscription); validates the target
-- talent directly and always requires rockstar_available = true, so this function only ever
-- saves Rockstar Talent regardless of caller scope. Writes to the SAME employer_saved_talent /
-- employer_shortlist_members tables as the full-employer RPC.
create or replace function public.save_rockstar_talent_for_employer(
  p_slug text,
  p_shortlist_ids uuid[] default null
)
returns table (
  success boolean,
  already_saved boolean,
  saved_talent_id uuid,
  saved_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_scope text := public.employer_discovery_scope();
  v_uid uuid := auth.uid();
  v_slug text := btrim(coalesce(p_slug, ''));
  v_talent record;
  v_viewer_company_keys text[];
  v_talent_user_id uuid;
  v_row_id uuid;
  v_row_created_at timestamptz;
  v_was_already_saved boolean := false;
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

  if v_talent.user_id = v_uid then
    raise exception 'cannot_save_self' using errcode = '42501';
  end if;

  select public.company_identity_keys(p.employer_abn, p.employer_website, p.employer_company_name)
  into v_viewer_company_keys
  from public.profiles p
  where p.user_id = v_uid;

  if coalesce(v_talent.blocked_companies, '{}'::text[]) && coalesce(v_viewer_company_keys, '{}'::text[]) then
    raise exception 'not_authorized_for_candidate' using errcode = '42501';
  end if;

  v_talent_user_id := v_talent.user_id;

  select s.id, s.created_at
  into v_row_id, v_row_created_at
  from public.employer_saved_talent s
  where s.employer_user_id = v_uid
    and s.talent_user_id = v_talent_user_id;

  if found then
    v_was_already_saved := true;
  else
    begin
      insert into public.employer_saved_talent (employer_user_id, talent_user_id)
      values (v_uid, v_talent_user_id)
      returning id, created_at
      into v_row_id, v_row_created_at;
      v_was_already_saved := false;
    exception
      when unique_violation then
        select s.id, s.created_at
        into v_row_id, v_row_created_at
        from public.employer_saved_talent s
        where s.employer_user_id = v_uid
          and s.talent_user_id = v_talent_user_id
        limit 1;

        if not found then
          raise;
        end if;

        v_was_already_saved := true;
    end;
  end if;

  if p_shortlist_ids is not null and coalesce(array_length(p_shortlist_ids, 1), 0) > 0 then
    if exists (
      select 1
      from unnest(p_shortlist_ids) x(shortlist_id)
      left join public.employer_shortlists s
        on s.id = x.shortlist_id
       and s.employer_user_id = v_uid
      where s.id is null
    ) then
      raise exception 'invalid_shortlist_ids' using errcode = '23514';
    end if;

    insert into public.employer_shortlist_members (shortlist_id, employer_user_id, talent_user_id)
    select distinct s.id, v_uid, v_talent_user_id
    from public.employer_shortlists s
    where s.employer_user_id = v_uid
      and s.id = any(p_shortlist_ids)
    on conflict do nothing;
  end if;

  return query
  select true, v_was_already_saved, v_row_id, v_row_created_at;
end
$$;

revoke all on function public.save_rockstar_talent_for_employer(text, uuid[]) from public, anon, authenticated, service_role;
grant execute on function public.save_rockstar_talent_for_employer(text, uuid[]) to authenticated;

-- Rockstar-only equivalent of add_saved_talent_to_shortlist(); calls
-- save_rockstar_talent_for_employer() instead of save_talent_for_employer().
create or replace function public.add_rockstar_saved_talent_to_shortlist(
  p_slug text,
  p_shortlist_id uuid
)
returns table (
  success boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_scope text := public.employer_discovery_scope();
  v_uid uuid := auth.uid();
  v_slug text := btrim(coalesce(p_slug, ''));
  v_talent_user_id uuid;
begin
  if v_scope = 'none' then
    raise exception 'inactive_employer_subscription' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.employer_shortlists s
    where s.id = p_shortlist_id
      and s.employer_user_id = v_uid
  ) then
    raise exception 'shortlist_not_found' using errcode = 'P0002';
  end if;

  perform * from public.save_rockstar_talent_for_employer(v_slug, null);

  select p.user_id into v_talent_user_id
  from public.profiles p
  where p.account_type = 'talent'
    and p.slug = v_slug
  limit 1;

  if v_talent_user_id is null then
    raise exception 'candidate_not_found' using errcode = 'P0002';
  end if;

  insert into public.employer_shortlist_members (shortlist_id, employer_user_id, talent_user_id)
  values (p_shortlist_id, v_uid, v_talent_user_id)
  on conflict do nothing;

  return query select true;
end
$$;

revoke all on function public.add_rockstar_saved_talent_to_shortlist(text, uuid) from public, anon, authenticated, service_role;
grant execute on function public.add_rockstar_saved_talent_to_shortlist(text, uuid) to authenticated;

-- Rockstar-only equivalent of list_saved_talent_for_employer(). Hydrates rows via
-- talent_passport_for_rockstar_employer(), which already filters to rockstar_available = true,
-- so previously-saved non-Rockstar talent (saved while on a full plan) never appear here, and
-- previously-saved Rockstar talent reappear automatically on a new Short Stay pass.
create or replace function public.list_saved_talent_for_rockstar_employer(
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
  education text,
  salary_expectation text,
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
  shortlist_ids uuid[]
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_scope text := public.employer_discovery_scope();
  v_uid uuid := auth.uid();
begin
  if v_scope = 'none' then
    raise exception 'inactive_employer_subscription' using errcode = '42501';
  end if;

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
     and t.rockstar_available = true
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
    p.education,
    p.salary_expectation,
    p.top_strength,
    p.skills,
    p.location,
    p.name,
    p.title,
    p.summary,
    p.current_employer,
    p.email,
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
  join lateral public.talent_passport_for_rockstar_employer(b.slug) p on true
  order by b.saved_at desc;
end
$$;

revoke all on function public.list_saved_talent_for_rockstar_employer(uuid) from public, anon, authenticated, service_role;
grant execute on function public.list_saved_talent_for_rockstar_employer(uuid) to authenticated;

-- Rockstar-only equivalent of list_employer_shortlists(); member counts only include Rockstar
-- talent still accessible under this scope.
create or replace function public.list_employer_shortlists_for_rockstar_employer()
returns table (
  id uuid,
  name text,
  created_at timestamptz,
  updated_at timestamptz,
  member_count bigint
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_scope text := public.employer_discovery_scope();
  v_uid uuid := auth.uid();
begin
  if v_scope = 'none' then
    raise exception 'inactive_employer_subscription' using errcode = '42501';
  end if;

  return query
  with accessible_members as (
    select
      m.shortlist_id,
      count(*)::bigint as accessible_count
    from public.employer_shortlist_members m
    join public.profiles t
      on t.user_id = m.talent_user_id
     and t.account_type = 'talent'
     and t.rockstar_available = true
    join lateral public.talent_passport_for_rockstar_employer(t.slug) p on true
    where m.employer_user_id = v_uid
    group by m.shortlist_id
  )
  select
    s.id,
    s.name,
    s.created_at,
    s.updated_at,
    coalesce(am.accessible_count, 0)::bigint as member_count
  from public.employer_shortlists s
  left join accessible_members am
    on am.shortlist_id = s.id
  where s.employer_user_id = v_uid
  order by s.updated_at desc, s.created_at desc;
end
$$;

revoke all on function public.list_employer_shortlists_for_rockstar_employer() from public, anon, authenticated, service_role;
grant execute on function public.list_employer_shortlists_for_rockstar_employer() to authenticated;
