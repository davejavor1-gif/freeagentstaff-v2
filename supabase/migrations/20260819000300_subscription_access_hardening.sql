-- Enforce current employer subscription access at direct RPC boundaries and restrict new intro-video reads to active Pro talent.

create or replace function public.current_viewer_profile_context()
returns table (
  viewer_user_id uuid,
  viewer_account_type text,
  viewer_employer_verification_status text,
  viewer_abn text,
  viewer_company_keys text[]
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_account_type text;
  v_verification_status text;
  v_abn text;
  v_company_keys text[];
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;

  select
    p.account_type,
    p.employer_verification_status,
    public.normalized_abn(p.employer_abn),
    public.company_identity_keys(p.employer_abn, p.employer_website, p.employer_company_name)
  into v_account_type, v_verification_status, v_abn, v_company_keys
  from public.profiles p
  where p.user_id = v_uid;

  if v_account_type = 'employer' then
    perform public.require_verified_employer_actor();
  elsif v_account_type <> 'talent' then
    raise exception 'wrong_account_type' using errcode = '42501';
  end if;

  return query select v_uid, v_account_type, v_verification_status, v_abn, coalesce(v_company_keys, '{}'::text[]);
end
$$;

create or replace function public.list_employer_introduction_requests()
returns table (
  request_id uuid,
  talent_user_id uuid,
  talent_slug text,
  talent_name text,
  status text,
  message text,
  created_at timestamptz,
  updated_at timestamptz,
  responded_at timestamptz,
  withdrawn_at timestamptz,
  access_scope text,
  is_currently_eligible boolean
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  with actor as (
    select public.require_verified_employer_actor() as employer_user_id
  ),
  base as (
    select r.id as request_id, r.talent_user_id, t.slug as talent_slug, r.status, r.message,
      r.created_at, r.updated_at, r.responded_at, r.withdrawn_at
    from public.employer_introduction_requests r
    join actor a on a.employer_user_id = r.employer_user_id
    join public.profiles t on t.user_id = r.talent_user_id and t.account_type = 'talent'
  )
  select b.request_id, b.talent_user_id, b.talent_slug,
    case when p.slug is null then 'Profile unavailable' else coalesce(p.name, 'Confidential candidate') end,
    b.status, b.message, b.created_at, b.updated_at, b.responded_at, b.withdrawn_at,
    p.access_scope, (p.slug is not null and p.access_scope in ('employer_full', 'employer_confidential'))
  from base b
  left join lateral public.talent_passport_for_viewer(b.talent_slug) p on true
  order by b.created_at desc;
$$;

create or replace function public.talent_private_access_for_viewer(p_talent_slug text)
returns table (
  request_id uuid,
  is_owner boolean,
  request_status text,
  requested_at timestamptz,
  contact_email text,
  resume_original_filename text,
  resume_uploaded_at timestamptz,
  resume_available boolean
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_talent uuid;
  v_intro public.employer_introduction_requests;
  v_connection public.employer_talent_connections;
begin
  if v_uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  select user_id into v_talent from public.profiles where account_type = 'talent' and slug = p_talent_slug;
  if v_talent is null then raise exception 'private_access_unavailable' using errcode = '42501'; end if;
  if v_uid = v_talent then
    return query select null::uuid, true, 'owner_full'::text, now(), p.contact_email, p.resume_original_filename, p.resume_uploaded_at, p.resume_storage_path is not null from public.profiles p where p.user_id = v_talent;
    return;
  end if;
  perform public.require_verified_employer_actor();
  if not public.employer_can_access_talent(v_uid, p_talent_slug) then raise exception 'private_access_unavailable' using errcode = '42501'; end if;
  select * into v_intro from public.employer_introduction_requests where talent_user_id = v_talent and employer_user_id = v_uid order by created_at desc limit 1;
  select * into v_connection from public.employer_talent_connections where talent_user_id = v_talent and employer_user_id = v_uid;
  return query select v_intro.id, false,
    case when v_intro.status = 'pending' then 'pending' when v_connection.status = 'active' then 'accepted' when v_connection.status = 'revoked' then 'revoked' else coalesce(v_intro.status, 'none') end,
    v_intro.created_at,
    case when v_connection.status = 'active' and v_intro.status = 'accepted' then p.contact_email else null end,
    case when v_connection.status = 'active' and v_intro.status = 'accepted' then p.resume_original_filename else null end,
    case when v_connection.status = 'active' and v_intro.status = 'accepted' then p.resume_uploaded_at else null end,
    case when v_connection.status = 'active' and v_intro.status = 'accepted' then p.resume_storage_path is not null else false end
  from public.profiles p where p.user_id = v_talent;
end
$$;

drop policy if exists "Users can select their own intro videos" on storage.objects;
drop policy if exists "Pro talent can select intro videos" on storage.objects;
create policy "Pro talent can select intro videos"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'intro-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.profiles
      where user_id = auth.uid()
        and account_type = 'talent'
        and talent_plan = 'free_agent_pro'
        and talent_subscription_status in ('active', 'trialing')
        and (talent_subscription_current_period_ends_at is null or talent_subscription_current_period_ends_at >= now())
    )
  );
