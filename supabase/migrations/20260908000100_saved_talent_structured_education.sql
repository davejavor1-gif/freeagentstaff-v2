drop function if exists public.list_saved_talent_for_employer(uuid);

create function public.list_saved_talent_for_employer(
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
  education_entries jsonb,
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
    case when p.access_scope <> 'employer_confidential' then profile.education else null end,
    case when p.access_scope <> 'employer_confidential' then profile.education_entries else null end,
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
  join public.profiles profile on profile.slug = b.slug
  order by b.saved_at desc;
end
$$;

revoke all on function public.list_saved_talent_for_employer(uuid) from public, anon;
grant execute on function public.list_saved_talent_for_employer(uuid) to authenticated;