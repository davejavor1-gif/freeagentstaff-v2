begin;

-- Copy-only change for NEW intro_request_received notifications.
-- Existing notification rows are not updated.

create or replace function public.create_employer_introduction_request(
  p_slug text,
  p_message text default null
)
returns table (
  success boolean,
  already_exists boolean,
  request_id uuid,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := public.require_verified_employer_actor();
  v_slug text := btrim(coalesce(p_slug, ''));
  v_message text := nullif(btrim(coalesce(p_message, '')), '');
  v_talent_user_id uuid;
  v_passport record;
  v_request_id uuid;
  v_status text;
  v_created_at timestamptz;
  v_already_exists boolean := false;
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
    raise exception 'cannot_request_self' using errcode = '42501';
  end if;

  select p.user_id into v_talent_user_id
  from public.profiles p
  where p.account_type = 'talent'
    and p.slug = v_slug
  limit 1;

  if v_talent_user_id is null then
    raise exception 'candidate_not_found' using errcode = 'P0002';
  end if;

  perform * from public.save_talent_for_employer(v_slug, null);

  with ins as (
    insert into public.employer_introduction_requests (
      employer_user_id,
      talent_user_id,
      status,
      message
    )
    values (
      v_uid,
      v_talent_user_id,
      'pending',
      v_message
    )
    on conflict (employer_user_id, talent_user_id)
      where (public.employer_introduction_requests.status = 'pending')
      do nothing
    returning id, public.employer_introduction_requests.status, public.employer_introduction_requests.created_at
  )
  select i.id, i.status, i.created_at
  into v_request_id, v_status, v_created_at
  from ins i;

  if v_request_id is null then
    select r.id, r.status, r.created_at
    into v_request_id, v_status, v_created_at
    from public.employer_introduction_requests r
    where r.employer_user_id = v_uid
      and r.talent_user_id = v_talent_user_id
      and r.status = 'pending'
    order by r.created_at desc
    limit 1;

    if v_request_id is null then
      raise exception 'request_insert_failed' using errcode = 'P0001';
    end if;

    v_already_exists := true;
  end if;

  perform public.create_notification_event(
    v_talent_user_id,
    v_uid,
    'intro_request_received',
    'You received an introduction request.',
    'Review and respond from your introduction tab.',
    'introduction_request',
    v_request_id,
    format('intro_request:%s:created', v_request_id::text)
  );

  return query
  select true, v_already_exists, v_request_id, v_status, v_created_at;
end
$$;

create or replace function public.create_rockstar_employer_introduction_request(
  p_slug text,
  p_message text default null
)
returns table (
  success boolean,
  already_exists boolean,
  request_id uuid,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_scope text := public.employer_discovery_scope();
  v_uid uuid := auth.uid();
  v_slug text := btrim(coalesce(p_slug, ''));
  v_message text := nullif(btrim(coalesce(p_message, '')), '');
  v_talent record;
  v_viewer_company_keys text[];
  v_talent_user_id uuid;
  v_request_id uuid;
  v_status text;
  v_created_at timestamptz;
  v_already_exists boolean := false;
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

  select public.company_identity_keys(p.employer_abn, p.employer_website, p.employer_company_name)
  into v_viewer_company_keys
  from public.profiles p
  where p.user_id = v_uid;

  if coalesce(v_talent.blocked_companies, '{}'::text[]) && coalesce(v_viewer_company_keys, '{}'::text[]) then
    raise exception 'not_authorized_for_candidate' using errcode = '42501';
  end if;

  v_talent_user_id := v_talent.user_id;

  with ins as (
    insert into public.employer_introduction_requests (employer_user_id, talent_user_id, status, message)
    values (v_uid, v_talent_user_id, 'pending', v_message)
    on conflict (employer_user_id, talent_user_id)
      where (public.employer_introduction_requests.status = 'pending')
      do nothing
    returning id, public.employer_introduction_requests.status, public.employer_introduction_requests.created_at
  )
  select i.id, i.status, i.created_at
  into v_request_id, v_status, v_created_at
  from ins i;

  if v_request_id is null then
    select r.id, r.status, r.created_at
    into v_request_id, v_status, v_created_at
    from public.employer_introduction_requests r
    where r.employer_user_id = v_uid
      and r.talent_user_id = v_talent_user_id
      and r.status = 'pending'
    order by r.created_at desc
    limit 1;

    if v_request_id is null then
      raise exception 'request_insert_failed' using errcode = 'P0001';
    end if;

    v_already_exists := true;
  else
    perform public.create_notification_event(
      v_talent_user_id,
      v_uid,
      'intro_request_received',
      'You received an introduction request.',
      'Review and respond from your introduction tab.',
      'introduction_request',
      v_request_id,
      format('intro_request:%s:created', v_request_id::text)
    );
  end if;

  return query
  select true, v_already_exists, v_request_id, v_status, v_created_at;
end
$$;

commit;
