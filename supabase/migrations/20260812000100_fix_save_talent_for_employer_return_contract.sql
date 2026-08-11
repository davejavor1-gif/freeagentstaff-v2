begin;

create or replace function public.save_talent_for_employer(
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
  v_uid uuid := public.require_verified_employer_actor();
  v_slug text := btrim(coalesce(p_slug, ''));
  v_talent_user_id uuid;
  v_passport record;
  v_row_id uuid;
  v_row_created_at timestamptz;
  v_was_already_saved boolean := false;
begin
  if v_slug = '' then
    raise exception 'missing_slug' using errcode = '23502';
  end if;

  select * into v_passport
  from public.talent_passport_for_viewer(v_slug)
  limit 1;

  if not found or v_passport.access_scope not in ('employer_full', 'employer_confidential') then
    raise exception 'not_authorized_for_candidate' using errcode = '42501';
  end if;

  if v_passport.is_owner is true then
    raise exception 'cannot_save_self' using errcode = '42501';
  end if;

  select p.user_id into v_talent_user_id
  from public.profiles p
  where p.account_type = 'talent'
    and p.slug = v_slug
  limit 1;

  if v_talent_user_id is null then
    raise exception 'candidate_not_found' using errcode = 'P0002';
  end if;

  select s.id, s.created_at
  into v_row_id, v_row_created_at
  from public.employer_saved_talent s
  where s.employer_user_id = v_uid
    and s.talent_user_id = v_talent_user_id
  limit 1;

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

commit;
