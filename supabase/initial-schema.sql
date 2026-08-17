-- Create the profiles table and enable row level security
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id),
  account_type text not null default 'talent' check (account_type in ('talent', 'employer')),
  -- Employer-facing talent fields are canonical at the top level; `profile` remains a compatibility mirror for editor state.
  slug text,
  visibility text not null default 'public' check (visibility in ('public', 'verified_employer_network', 'confidential', 'employer_network')),
  opportunity_status text not null default 'actively_open' check (opportunity_status in ('actively_open', 'exploring', 'not_open')),
  blocked_companies text[] not null default '{}',
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'pending', 'verified', 'rejected')),
  is_published boolean not null default false,
  employer_contact_name text,
  employer_contact_role text,
  employer_company_name text,
  employer_abn text,
  employer_website text,
  employer_industry text,
  employer_company_size text,
  employer_verification_status text not null default 'unverified' check (employer_verification_status in ('unverified', 'pending', 'verified', 'rejected')),
  verification_requested_at timestamptz,
  verification_reviewed_at timestamptz,
  verification_reviewed_by text,
  verification_rejection_reason text,
  name text,
  title text,
  location text,
  availability text,
  top_strength text,
  experience_years integer not null default 0 check (experience_years >= 0),
  focus_area text,
  education text,
  salary_expectation text check (salary_expectation in ('under_60k', '60k_80k', '80k_100k', '100k_120k', '120k_150k', '150k_200k', '200k_plus', 'prefer_not_to_say')),
  contact_email text check (contact_email is null or contact_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  resume_storage_path text,
  resume_original_filename text,
  resume_uploaded_at timestamptz,
  summary text,
  bio text check (bio is null or char_length(bio) <= 750),
  skills text[] not null default '{}',
  languages text[] not null default '{}',
  passions text[] not null default '{}',
  career_journey jsonb not null default '[]'::jsonb,
  email text,
  image_alt text,
  photo_url text,
  photo_storage_path text,
  current_employer text,
  intro_video_url text,
  intro_video_storage_path text,
  talent_plan text not null default 'free_agent' check (talent_plan in ('free_agent', 'free_agent_pro')),
  talent_subscription_status text not null default 'inactive' check (talent_subscription_status in ('inactive', 'active', 'trialing', 'past_due', 'canceled')),
  talent_subscription_current_period_ends_at timestamptz,
  talent_subscription_cancel_at_period_end boolean not null default false,
  stripe_customer_id text unique,
  stripe_talent_subscription_id text unique,
  stripe_talent_price_id text,
  employer_subscription_status text not null default 'inactive' check (employer_subscription_status in ('inactive', 'active', 'trialing', 'past_due', 'canceled')),
  employer_subscription_current_period_ends_at timestamptz,
  employer_subscription_cancel_at_period_end boolean not null default false,
  stripe_employer_subscription_id text unique,
  stripe_employer_price_id text,
  profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can select their own profile" on profiles
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own profile" on profiles
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own profile" on profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own profile" on profiles
  for delete
  using (auth.uid() = user_id);

create policy "Pro talent can upload intro videos" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'intro-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1
      from public.profiles
      where user_id = auth.uid()
        and account_type = 'talent'
        and talent_plan = 'free_agent_pro'
        and talent_subscription_status in ('active', 'trialing')
        and (talent_subscription_current_period_ends_at is null or talent_subscription_current_period_ends_at >= now())
    )
  );

create policy "Pro talent can update intro videos" on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'intro-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1
      from public.profiles
      where user_id = auth.uid()
        and account_type = 'talent'
        and talent_plan = 'free_agent_pro'
        and talent_subscription_status in ('active', 'trialing')
        and (talent_subscription_current_period_ends_at is null or talent_subscription_current_period_ends_at >= now())
    )
  )
  with check (
    bucket_id = 'intro-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on profiles
  for each row execute function public.set_updated_at();

create or replace function public.protect_talent_subscription_state()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if current_user not in ('service_role', 'postgres') then
    if tg_op = 'INSERT' then
      new.talent_plan := 'free_agent';
      new.talent_subscription_status := 'inactive';
      new.talent_subscription_current_period_ends_at := null;
    else
      new.talent_plan := old.talent_plan;
      new.talent_subscription_status := old.talent_subscription_status;
      new.talent_subscription_current_period_ends_at := old.talent_subscription_current_period_ends_at;
    end if;
  end if;

  return new;
end;
$$;

create trigger protect_talent_subscription_state
  before insert or update on profiles
  for each row execute function public.protect_talent_subscription_state();

create or replace function public.protect_billing_state()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if current_user not in ('service_role', 'postgres') then
    if tg_op = 'INSERT' then
      new.talent_plan := 'free_agent';
      new.talent_subscription_status := 'inactive';
      new.talent_subscription_current_period_ends_at := null;
      new.talent_subscription_cancel_at_period_end := false;
      new.stripe_customer_id := null;
      new.stripe_talent_subscription_id := null;
      new.stripe_talent_price_id := null;
      new.employer_subscription_status := 'inactive';
      new.employer_subscription_current_period_ends_at := null;
      new.employer_subscription_cancel_at_period_end := false;
      new.stripe_employer_subscription_id := null;
      new.stripe_employer_price_id := null;
    else
      new.talent_plan := old.talent_plan;
      new.talent_subscription_status := old.talent_subscription_status;
      new.talent_subscription_current_period_ends_at := old.talent_subscription_current_period_ends_at;
      new.talent_subscription_cancel_at_period_end := old.talent_subscription_cancel_at_period_end;
      new.stripe_customer_id := old.stripe_customer_id;
      new.stripe_talent_subscription_id := old.stripe_talent_subscription_id;
      new.stripe_talent_price_id := old.stripe_talent_price_id;
      new.employer_subscription_status := old.employer_subscription_status;
      new.employer_subscription_current_period_ends_at := old.employer_subscription_current_period_ends_at;
      new.employer_subscription_cancel_at_period_end := old.employer_subscription_cancel_at_period_end;
      new.stripe_employer_subscription_id := old.stripe_employer_subscription_id;
      new.stripe_employer_price_id := old.stripe_employer_price_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_billing_state
  before insert or update on profiles
  for each row execute function public.protect_billing_state();

create table if not exists stripe_processed_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table stripe_processed_events enable row level security;
revoke all on table stripe_processed_events from public, anon, authenticated;
grant select, insert on table stripe_processed_events to service_role;

create table if not exists talent_pro_analytics_events (
  id uuid primary key default gen_random_uuid(),
  talent_user_id uuid not null references auth.users (id) on delete cascade,
  viewer_user_id uuid not null references auth.users (id) on delete cascade,
  employer_company_name text,
  event_type text not null check (event_type in ('search_impression', 'passport_view')),
  event_day date not null default ((now() at time zone 'utc')::date),
  event_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (talent_user_id, viewer_user_id, event_type, event_day)
);

alter table talent_pro_analytics_events enable row level security;

create policy "Talent can view own pro analytics events" on talent_pro_analytics_events
  for select
  using (
    auth.uid() = talent_user_id
    and exists (
      select 1
      from public.profiles
      where user_id = auth.uid()
        and account_type = 'talent'
        and talent_plan = 'free_agent_pro'
        and talent_subscription_status in ('active', 'trialing')
        and (talent_subscription_current_period_ends_at is null or talent_subscription_current_period_ends_at >= now())
    )
  );

create index if not exists talent_pro_analytics_events_talent_day_idx
  on talent_pro_analytics_events (talent_user_id, event_day desc);

create index if not exists talent_pro_analytics_events_viewer_idx
  on talent_pro_analytics_events (viewer_user_id, event_day desc);

-- Security invariant:
-- The freeagent.transition GUC context is an internal DB transition mechanism only.
-- No user-callable RPC may expose arbitrary set_config keys/values, dynamic SQL,
-- or any mechanism that allows caller-controlled transition-context mutation.

create or replace function public.submit_employer_verification()
returns table (
  success boolean,
  employer_verification_status text,
  verification_requested_at timestamptz,
  normalized_abn text,
  message text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid;
  v_account_type text;
  v_status text;
  v_contact_name text;
  v_contact_role text;
  v_company_name text;
  v_abn text;
  v_website text;
  v_industry text;
  v_company_size text;
  v_normalized_abn text;
begin
  v_uid := auth.uid();

  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;

  select
    p.account_type,
    p.employer_verification_status,
    p.employer_contact_name,
    p.employer_contact_role,
    p.employer_company_name,
    p.employer_abn,
    p.employer_website,
    p.employer_industry,
    p.employer_company_size
  into
    v_account_type,
    v_status,
    v_contact_name,
    v_contact_role,
    v_company_name,
    v_abn,
    v_website,
    v_industry,
    v_company_size
  from public.profiles p
  where p.user_id = v_uid
  for update;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  if v_account_type <> 'employer' then
    raise exception 'wrong_account_type' using errcode = '42501';
  end if;

  if v_status not in ('unverified', 'rejected') then
    raise exception 'invalid_state' using errcode = 'P0001';
  end if;

  if
    btrim(coalesce(v_contact_name, '')) = '' or
    btrim(coalesce(v_contact_role, '')) = '' or
    btrim(coalesce(v_company_name, '')) = '' or
    btrim(coalesce(v_abn, '')) = '' or
    btrim(coalesce(v_website, '')) = '' or
    btrim(coalesce(v_industry, '')) = '' or
    btrim(coalesce(v_company_size, '')) = ''
  then
    raise exception 'missing_required_fields' using errcode = '23514';
  end if;

  v_normalized_abn := public.normalized_abn(v_abn);

  if v_normalized_abn is null then
    raise exception 'invalid_abn' using errcode = '23514';
  end if;

  perform set_config('freeagent.transition', 'submit_employer_verification', true);
  perform set_config('freeagent.transition_uid', v_uid::text, true);

  update public.profiles p
  set
    employer_abn = v_normalized_abn,
    employer_verification_status = 'pending',
    verification_requested_at = now(),
    verification_reviewed_at = null,
    verification_reviewed_by = null,
    verification_rejection_reason = null,
    updated_at = now()
  where p.user_id = v_uid;

  return query
  select
    true,
    'pending'::text,
    (select verification_requested_at from public.profiles where user_id = v_uid),
    v_normalized_abn,
    'verification_submitted'::text;
end
$$;

create or replace function public.admin_review_employer_verification(
  p_user_id uuid,
  p_decision text,
  p_reason text default null,
  p_reviewer text default null
)
returns table (
  success boolean,
  employer_verification_status text,
  verification_reviewed_at timestamptz,
  verification_reviewed_by text,
  verification_rejection_reason text,
  message text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_account_type text;
  v_status text;
  v_reviewer text;
begin
  if p_user_id is null then
    raise exception 'missing_user_id' using errcode = '23502';
  end if;

  if p_decision not in ('verified', 'rejected') then
    raise exception 'invalid_decision' using errcode = '23514';
  end if;

  if p_decision = 'rejected' and btrim(coalesce(p_reason, '')) = '' then
    raise exception 'missing_rejection_reason' using errcode = '23514';
  end if;

  select p.account_type, p.employer_verification_status
  into v_account_type, v_status
  from public.profiles p
  where p.user_id = p_user_id
  for update;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  if v_account_type <> 'employer' then
    raise exception 'wrong_account_type' using errcode = '42501';
  end if;

  if v_status <> 'pending' then
    raise exception 'invalid_state' using errcode = 'P0001';
  end if;

  v_reviewer := coalesce(
    nullif(btrim(coalesce(p_reviewer, '')), ''),
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    current_user
  );

  perform set_config('freeagent.transition', 'admin_review_employer_verification', true);
  perform set_config('freeagent.transition_uid', p_user_id::text, true);

  update public.profiles p
  set
    employer_verification_status = p_decision,
    verification_reviewed_at = now(),
    verification_reviewed_by = v_reviewer,
    verification_rejection_reason = case when p_decision = 'rejected' then btrim(p_reason) else null end,
    updated_at = now()
  where p.user_id = p_user_id;

  return query
  select
    true,
    p_decision,
    (select verification_reviewed_at from public.profiles where user_id = p_user_id),
    (select verification_reviewed_by from public.profiles where user_id = p_user_id),
    (select verification_rejection_reason from public.profiles where user_id = p_user_id),
    case when p_decision = 'verified' then 'verification_approved' else 'verification_rejected' end;
end
$$;

revoke all on function public.submit_employer_verification() from public;
revoke all on function public.submit_employer_verification() from anon;
revoke all on function public.submit_employer_verification() from authenticated;
revoke all on function public.submit_employer_verification() from service_role;
grant execute on function public.submit_employer_verification() to authenticated;

revoke all on function public.admin_review_employer_verification(uuid, text, text, text) from public;
revoke all on function public.admin_review_employer_verification(uuid, text, text, text) from anon;
revoke all on function public.admin_review_employer_verification(uuid, text, text, text) from authenticated;
revoke all on function public.admin_review_employer_verification(uuid, text, text, text) from service_role;
grant execute on function public.admin_review_employer_verification(uuid, text, text, text) to service_role;

create table if not exists public.system_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users (id) on delete set null
);

alter table public.system_admins enable row level security;
revoke all privileges on table public.system_admins from public, anon, authenticated;
grant select, insert, update, delete on table public.system_admins to service_role;

create or replace function public.require_system_admin_actor()
returns uuid
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_admin_user_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select sa.user_id
  into v_admin_user_id
  from public.system_admins sa
  where sa.user_id = v_uid;

  if v_admin_user_id is null then
    raise exception 'system_admin_required' using errcode = '42501';
  end if;

  return v_admin_user_id;
end
$$;

create or replace function public.admin_dashboard_summary()
returns table (
  total_talent_accounts integer,
  published_talent integer,
  unpublished_talent integer,
  total_employer_accounts integer,
  verified_employers integer,
  pending_employers integer,
  rejected_employers integer
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  perform public.require_system_admin_actor();

  return query
  select
    coalesce(count(*) filter (where p.account_type = 'talent'), 0)::integer as total_talent_accounts,
    coalesce(count(*) filter (where p.account_type = 'talent' and p.is_published), 0)::integer as published_talent,
    coalesce(count(*) filter (where p.account_type = 'talent' and not p.is_published), 0)::integer as unpublished_talent,
    coalesce(count(*) filter (where p.account_type = 'employer'), 0)::integer as total_employer_accounts,
    coalesce(count(*) filter (where p.account_type = 'employer' and p.employer_verification_status = 'verified'), 0)::integer as verified_employers,
    coalesce(count(*) filter (where p.account_type = 'employer' and p.employer_verification_status = 'pending'), 0)::integer as pending_employers,
    coalesce(count(*) filter (where p.account_type = 'employer' and p.employer_verification_status = 'rejected'), 0)::integer as rejected_employers
  from public.profiles p;
end
$$;

create or replace function public.admin_list_accounts(
  p_query text default null,
  p_account_type text default null,
  p_limit integer default 25,
  p_after_created_at timestamptz default null,
  p_after_user_id uuid default null
)
returns table (
  user_id uuid,
  account_type text,
  display_name text,
  secondary_label text,
  email text,
  slug text,
  is_published boolean,
  visibility text,
  opportunity_status text,
  employer_verification_status text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_actor uuid;
  v_query text := nullif(lower(btrim(coalesce(p_query, ''))), '');
  v_account_type text := nullif(btrim(coalesce(p_account_type, '')), '');
  v_limit integer := greatest(1, least(coalesce(p_limit, 25), 50));
begin
  v_actor := public.require_system_admin_actor();

  if (p_after_created_at is null) <> (p_after_user_id is null) then
    raise exception 'invalid_cursor' using errcode = '23514';
  end if;

  if v_account_type is not null and v_account_type not in ('talent', 'employer') then
    raise exception 'invalid_account_type_filter' using errcode = '23514';
  end if;

  return query
  with base as (
    select
      p.user_id,
      p.account_type,
      case
        when p.account_type = 'employer' then nullif(btrim(coalesce(p.employer_company_name, p.employer_contact_name, p.email, '')), '')
        else nullif(btrim(coalesce(p.name, p.email, '')), '')
      end as display_name,
      case
        when p.account_type = 'employer' then nullif(btrim(coalesce(p.employer_contact_name, p.employer_contact_role, '')), '')
        else nullif(btrim(coalesce(p.title, p.location, p.opportunity_status, '')), '')
      end as secondary_label,
      p.email,
      p.slug,
      p.is_published,
      p.visibility,
      p.opportunity_status,
      p.employer_verification_status,
      p.created_at,
      p.updated_at
    from public.profiles p
    where (v_account_type is null or p.account_type = v_account_type)
      and (
        v_query is null or (
          lower(coalesce(p.name, '')) like '%' || v_query || '%'
          or lower(coalesce(p.email, '')) like '%' || v_query || '%'
          or lower(coalesce(p.slug, '')) like '%' || v_query || '%'
          or lower(coalesce(p.employer_company_name, '')) like '%' || v_query || '%'
          or lower(coalesce(p.employer_contact_name, '')) like '%' || v_query || '%'
        )
      )
      and (
        p_after_created_at is null
        or (p.created_at, p.user_id) < (p_after_created_at, p_after_user_id)
      )
    order by p.created_at desc, p.user_id desc
    limit v_limit
  )
  select
    b.user_id,
    b.account_type,
    b.display_name,
    b.secondary_label,
    b.email,
    b.slug,
    b.is_published,
    b.visibility,
    b.opportunity_status,
    b.employer_verification_status,
    b.created_at,
    b.updated_at
  from base b;
end
$$;

create or replace function public.admin_get_account(p_user_id uuid)
returns table (
  user_id uuid,
  account_type text,
  email text,
  slug text,
  display_name text,
  secondary_label text,
  is_published boolean,
  visibility text,
  opportunity_status text,
  employer_verification_status text,
  name text,
  title text,
  location text,
  availability text,
  top_strength text,
  focus_area text,
  summary text,
  current_employer text,
  experience_years integer,
  employer_contact_name text,
  employer_contact_role text,
  employer_company_name text,
  employer_abn text,
  employer_website text,
  employer_industry text,
  employer_company_size text,
  verification_requested_at timestamptz,
  verification_reviewed_at timestamptz,
  verification_reviewed_by text,
  verification_rejection_reason text,
  blocked_company_count integer,
  pending_introduction_requests integer,
  active_connections integer,
  saved_talent_count integer,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_actor uuid;
begin
  v_actor := public.require_system_admin_actor();

  if p_user_id is null then
    raise exception 'missing_user_id' using errcode = '23502';
  end if;

  return query
  with profile_row as (
    select p.*
    from public.profiles p
    where p.user_id = p_user_id
    limit 1
  )
  select
    p.user_id,
    p.account_type,
    p.email,
    p.slug,
    case
      when p.account_type = 'employer' then nullif(btrim(coalesce(p.employer_company_name, p.employer_contact_name, p.email, '')), '')
      else nullif(btrim(coalesce(p.name, p.email, '')), '')
    end as display_name,
    case
      when p.account_type = 'employer' then nullif(btrim(coalesce(p.employer_contact_name, p.employer_contact_role, '')), '')
      else nullif(btrim(coalesce(p.title, p.location, p.opportunity_status, '')), '')
    end as secondary_label,
    p.is_published,
    p.visibility,
    p.opportunity_status,
    p.employer_verification_status,
    p.name,
    p.title,
    p.location,
    p.availability,
    p.top_strength,
    p.focus_area,
    p.summary,
    p.current_employer,
    p.experience_years,
    p.employer_contact_name,
    p.employer_contact_role,
    p.employer_company_name,
    p.employer_abn,
    p.employer_website,
    p.employer_industry,
    p.employer_company_size,
    p.verification_requested_at,
    p.verification_reviewed_at,
    p.verification_reviewed_by,
    p.verification_rejection_reason,
    case
      when p.account_type = 'talent' then coalesce(cardinality(p.blocked_companies), 0)
      else 0
    end as blocked_company_count,
    coalesce((
      select count(*)::integer
      from public.employer_introduction_requests r
      where r.talent_user_id = p.user_id
        and r.status = 'pending'
    ), 0) as pending_introduction_requests,
    coalesce((
      select count(*)::integer
      from public.employer_talent_connections c
      where c.talent_user_id = p.user_id
        and c.status = 'active'
    ), 0) as active_connections,
    coalesce((
      select count(*)::integer
      from public.employer_saved_talent s
      where s.employer_user_id = p.user_id
    ), 0) as saved_talent_count,
    p.created_at,
    p.updated_at
  from profile_row p;

  if not found then
    raise exception 'account_not_found' using errcode = 'P0002';
  end if;
end
$$;

revoke all on function public.require_system_admin_actor() from public;
revoke all on function public.require_system_admin_actor() from anon;
revoke all on function public.require_system_admin_actor() from authenticated;
revoke all on function public.require_system_admin_actor() from service_role;
grant execute on function public.require_system_admin_actor() to authenticated;

revoke all on function public.admin_dashboard_summary() from public;
revoke all on function public.admin_dashboard_summary() from anon;
revoke all on function public.admin_dashboard_summary() from authenticated;
revoke all on function public.admin_dashboard_summary() from service_role;
grant execute on function public.admin_dashboard_summary() to authenticated;

revoke all on function public.admin_list_accounts(text, text, integer, timestamptz, uuid) from public;
revoke all on function public.admin_list_accounts(text, text, integer, timestamptz, uuid) from anon;
revoke all on function public.admin_list_accounts(text, text, integer, timestamptz, uuid) from authenticated;
revoke all on function public.admin_list_accounts(text, text, integer, timestamptz, uuid) from service_role;
grant execute on function public.admin_list_accounts(text, text, integer, timestamptz, uuid) to authenticated;

revoke all on function public.admin_get_account(uuid) from public;
revoke all on function public.admin_get_account(uuid) from anon;
revoke all on function public.admin_get_account(uuid) from authenticated;
revoke all on function public.admin_get_account(uuid) from service_role;
grant execute on function public.admin_get_account(uuid) to authenticated;

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

drop trigger if exists trg_profiles_guard_protected_fields on profiles;
create trigger trg_profiles_guard_protected_fields before update on profiles
  for each row execute function public.profiles_guard_protected_fields();

create table if not exists public.employer_saved_talent (
  id uuid primary key default gen_random_uuid(),
  employer_user_id uuid not null references public.profiles(user_id) on delete cascade,
  talent_user_id uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employer_user_id, talent_user_id)
);

create index if not exists employer_saved_talent_employer_created_idx
  on public.employer_saved_talent (employer_user_id, created_at desc);

create index if not exists employer_saved_talent_talent_idx
  on public.employer_saved_talent (talent_user_id);

create table if not exists public.employer_shortlists (
  id uuid primary key default gen_random_uuid(),
  employer_user_id uuid not null references public.profiles(user_id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employer_shortlists_name_check check (char_length(btrim(name)) between 1 and 80),
  unique (id, employer_user_id)
);

create unique index if not exists employer_shortlists_owner_name_uq
  on public.employer_shortlists (employer_user_id, lower(btrim(name)));

create index if not exists employer_shortlists_owner_updated_idx
  on public.employer_shortlists (employer_user_id, updated_at desc);

create table if not exists public.employer_shortlist_members (
  shortlist_id uuid not null,
  employer_user_id uuid not null,
  talent_user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (shortlist_id, talent_user_id),
  constraint employer_shortlist_members_shortlist_fk
    foreign key (shortlist_id, employer_user_id)
    references public.employer_shortlists (id, employer_user_id)
    on delete cascade,
  constraint employer_shortlist_members_saved_fk
    foreign key (employer_user_id, talent_user_id)
    references public.employer_saved_talent (employer_user_id, talent_user_id)
    on delete cascade
);

create index if not exists employer_shortlist_members_owner_shortlist_idx
  on public.employer_shortlist_members (employer_user_id, shortlist_id);

create index if not exists employer_shortlist_members_owner_talent_idx
  on public.employer_shortlist_members (employer_user_id, talent_user_id);

drop trigger if exists trg_employer_saved_talent_set_updated_at on public.employer_saved_talent;
create trigger trg_employer_saved_talent_set_updated_at
before update on public.employer_saved_talent
for each row
execute function public.set_updated_at();

drop trigger if exists trg_employer_shortlists_set_updated_at on public.employer_shortlists;
create trigger trg_employer_shortlists_set_updated_at
before update on public.employer_shortlists
for each row
execute function public.set_updated_at();

create or replace function public.require_employer_actor()
returns uuid
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_account_type text;
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;

  select p.account_type
  into v_account_type
  from public.profiles p
  where p.user_id = v_uid;

  if v_account_type <> 'employer' then
    raise exception 'wrong_account_type' using errcode = '42501';
  end if;

  return v_uid;
end
$$;

create or replace function public.require_verified_employer_actor()
returns uuid
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := public.require_employer_actor();
  v_status text;
  v_abn text;
  v_subscription_status text;
  v_period_end timestamptz;
begin
  select p.employer_verification_status, p.employer_abn, p.employer_subscription_status, p.employer_subscription_current_period_ends_at
  into v_status, v_abn, v_subscription_status, v_period_end
  from public.profiles p
  where p.user_id = v_uid;

  if v_status <> 'verified' then
    raise exception 'unverified_employer' using errcode = '42501';
  end if;

  if public.normalized_abn(v_abn) is null then
    raise exception 'invalid_abn' using errcode = '23514';
  end if;

  if v_subscription_status not in ('active', 'trialing') or (v_period_end is not null and v_period_end < now()) then
    raise exception 'inactive_employer_subscription' using errcode = '42501';
  end if;

  return v_uid;
end
$$;

create or replace function public.validate_saved_talent_roles()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_employer_role text;
  v_talent_role text;
begin
  select p.account_type into v_employer_role
  from public.profiles p
  where p.user_id = new.employer_user_id;

  if v_employer_role <> 'employer' then
    raise exception 'invalid_employer_reference' using errcode = '23514';
  end if;

  select p.account_type into v_talent_role
  from public.profiles p
  where p.user_id = new.talent_user_id;

  if v_talent_role <> 'talent' then
    raise exception 'invalid_talent_reference' using errcode = '23514';
  end if;

  return new;
end
$$;

create or replace function public.validate_shortlist_owner_role()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_employer_role text;
begin
  select p.account_type into v_employer_role
  from public.profiles p
  where p.user_id = new.employer_user_id;

  if v_employer_role <> 'employer' then
    raise exception 'invalid_employer_reference' using errcode = '23514';
  end if;

  return new;
end
$$;

drop trigger if exists trg_validate_saved_talent_roles on public.employer_saved_talent;
create trigger trg_validate_saved_talent_roles
before insert or update on public.employer_saved_talent
for each row execute function public.validate_saved_talent_roles();

drop trigger if exists trg_validate_shortlist_owner_role on public.employer_shortlists;
create trigger trg_validate_shortlist_owner_role
before insert or update on public.employer_shortlists
for each row execute function public.validate_shortlist_owner_role();

drop trigger if exists trg_validate_shortlist_member_roles on public.employer_shortlist_members;
create trigger trg_validate_shortlist_member_roles
before insert or update on public.employer_shortlist_members
for each row execute function public.validate_saved_talent_roles();

alter table public.employer_saved_talent enable row level security;
alter table public.employer_shortlists enable row level security;
alter table public.employer_shortlist_members enable row level security;

revoke all privileges on table public.employer_saved_talent from public, anon, authenticated;
revoke all privileges on table public.employer_shortlists from public, anon, authenticated;
revoke all privileges on table public.employer_shortlist_members from public, anon, authenticated;

grant select, insert, update, delete on table public.employer_saved_talent to service_role;
grant select, insert, update, delete on table public.employer_shortlists to service_role;
grant select, insert, update, delete on table public.employer_shortlist_members to service_role;

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

create or replace function public.unsave_talent_for_employer(
  p_slug text
)
returns table (
  success boolean,
  removed boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := public.require_employer_actor();
  v_slug text := btrim(coalesce(p_slug, ''));
  v_talent_user_id uuid;
  v_count integer := 0;
begin
  if v_slug = '' then
    return query select true, false;
    return;
  end if;

  select p.user_id into v_talent_user_id
  from public.profiles p
  where p.account_type = 'talent'
    and p.slug = v_slug
  limit 1;

  if v_talent_user_id is null then
    return query select true, false;
    return;
  end if;

  delete from public.employer_saved_talent s
  where s.employer_user_id = v_uid
    and s.talent_user_id = v_talent_user_id;

  get diagnostics v_count = row_count;
  return query select true, (v_count > 0);
end
$$;

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
  v_uid uuid := public.require_verified_employer_actor();
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
  v_uid uuid := public.require_verified_employer_actor();
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

create or replace function public.delete_employer_shortlist(
  p_shortlist_id uuid
)
returns table (
  success boolean,
  removed boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := public.require_employer_actor();
  v_count integer := 0;
begin
  delete from public.employer_shortlists s
  where s.id = p_shortlist_id
    and s.employer_user_id = v_uid;

  get diagnostics v_count = row_count;
  return query select true, (v_count > 0);
end
$$;

create or replace function public.add_saved_talent_to_shortlist(
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
  v_uid uuid := public.require_verified_employer_actor();
  v_slug text := btrim(coalesce(p_slug, ''));
  v_talent_user_id uuid;
begin
  if not exists (
    select 1
    from public.employer_shortlists s
    where s.id = p_shortlist_id
      and s.employer_user_id = v_uid
  ) then
    raise exception 'shortlist_not_found' using errcode = 'P0002';
  end if;

  perform * from public.save_talent_for_employer(v_slug, null);

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

create or replace function public.remove_saved_talent_from_shortlist(
  p_slug text,
  p_shortlist_id uuid
)
returns table (
  success boolean,
  removed boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := public.require_employer_actor();
  v_slug text := btrim(coalesce(p_slug, ''));
  v_talent_user_id uuid;
  v_count integer := 0;
begin
  if not exists (
    select 1
    from public.employer_shortlists s
    where s.id = p_shortlist_id
      and s.employer_user_id = v_uid
  ) then
    raise exception 'shortlist_not_found' using errcode = 'P0002';
  end if;

  select p.user_id into v_talent_user_id
  from public.profiles p
  where p.account_type = 'talent'
    and p.slug = v_slug
  limit 1;

  if v_talent_user_id is null then
    return query select true, false;
    return;
  end if;

  delete from public.employer_shortlist_members m
  where m.shortlist_id = p_shortlist_id
    and m.employer_user_id = v_uid
    and m.talent_user_id = v_talent_user_id;

  get diagnostics v_count = row_count;
  return query select true, (v_count > 0);
end
$$;

create or replace function public.list_employer_shortlists()
returns table (
  id uuid,
  name text,
  created_at timestamptz,
  updated_at timestamptz,
  member_count bigint
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  with actor as (
    select public.require_verified_employer_actor() as employer_user_id
  ),
  accessible_members as (
    select
      m.shortlist_id,
      count(*)::bigint as accessible_count
    from public.employer_shortlist_members m
    join actor a on a.employer_user_id = m.employer_user_id
    join public.profiles t
      on t.user_id = m.talent_user_id
     and t.account_type = 'talent'
    join lateral public.talent_passport_for_viewer(t.slug) p on true
    group by m.shortlist_id
  )
  select
    s.id,
    s.name,
    s.created_at,
    s.updated_at,
    coalesce(am.accessible_count, 0)::bigint as member_count
  from public.employer_shortlists s
  join actor a on a.employer_user_id = s.employer_user_id
  left join accessible_members am
    on am.shortlist_id = s.id
  order by s.updated_at desc, s.created_at desc;
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
  join lateral public.talent_passport_for_viewer(b.slug) p on true
  order by b.saved_at desc;
end
$$;

create table if not exists public.employer_introduction_requests (
  id uuid primary key default gen_random_uuid(),
  employer_user_id uuid not null references public.profiles(user_id) on delete cascade,
  talent_user_id uuid not null references public.profiles(user_id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz,
  withdrawn_at timestamptz,
  constraint employer_introduction_requests_actor_pair_check check (employer_user_id <> talent_user_id),
  constraint employer_introduction_requests_message_length_check check (char_length(coalesce(message, '')) <= 2000)
);

create unique index if not exists employer_intro_requests_pending_uq
  on public.employer_introduction_requests (employer_user_id, talent_user_id)
  where status = 'pending';

create index if not exists employer_intro_requests_employer_created_idx
  on public.employer_introduction_requests (employer_user_id, created_at desc);

create index if not exists employer_intro_requests_talent_created_idx
  on public.employer_introduction_requests (talent_user_id, created_at desc);

create index if not exists employer_intro_requests_status_idx
  on public.employer_introduction_requests (status);

drop trigger if exists trg_employer_intro_requests_set_updated_at on public.employer_introduction_requests;
create trigger trg_employer_intro_requests_set_updated_at
before update on public.employer_introduction_requests
for each row
execute function public.set_updated_at();

create or replace function public.require_talent_actor()
returns uuid
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_account_type text;
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;

  select p.account_type
  into v_account_type
  from public.profiles p
  where p.user_id = v_uid;

  if v_account_type <> 'talent' then
    raise exception 'wrong_account_type' using errcode = '42501';
  end if;

  return v_uid;
end
$$;

create or replace function public.validate_introduction_request_roles()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_employer_role text;
  v_talent_role text;
begin
  select p.account_type into v_employer_role
  from public.profiles p
  where p.user_id = new.employer_user_id;

  if v_employer_role <> 'employer' then
    raise exception 'invalid_employer_reference' using errcode = '23514';
  end if;

  select p.account_type into v_talent_role
  from public.profiles p
  where p.user_id = new.talent_user_id;

  if v_talent_role <> 'talent' then
    raise exception 'invalid_talent_reference' using errcode = '23514';
  end if;

  return new;
end
$$;

drop trigger if exists trg_validate_employer_intro_request_roles on public.employer_introduction_requests;
create trigger trg_validate_employer_intro_request_roles
before insert or update on public.employer_introduction_requests
for each row execute function public.validate_introduction_request_roles();

alter table public.employer_introduction_requests enable row level security;
revoke all privileges on table public.employer_introduction_requests from public, anon, authenticated;
grant select, insert, update, delete on table public.employer_introduction_requests to service_role;

create table if not exists public.employer_talent_connections (
  id uuid primary key default gen_random_uuid(),
  employer_user_id uuid not null references public.profiles(user_id) on delete cascade,
  talent_user_id uuid not null references public.profiles(user_id) on delete cascade,
  introduction_request_id uuid references public.employer_introduction_requests(id) on delete set null,
  status text not null default 'active',
  revoked_at timestamptz,
  revoked_by text,
  connected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint employer_talent_connections_actor_pair_check check (employer_user_id <> talent_user_id),
  constraint employer_talent_connections_status_check check (status in ('active', 'revoked')),
  constraint employer_talent_connections_revoked_by_check check (revoked_by is null or revoked_by in ('talent'))
);

create unique index if not exists employer_talent_connections_pair_uq
  on public.employer_talent_connections (employer_user_id, talent_user_id);

create index if not exists employer_talent_connections_employer_connected_idx
  on public.employer_talent_connections (employer_user_id, connected_at desc);

create index if not exists employer_talent_connections_talent_connected_idx
  on public.employer_talent_connections (talent_user_id, connected_at desc);

alter table public.employer_talent_connections enable row level security;
revoke all privileges on table public.employer_talent_connections from public, anon, authenticated;
grant select, insert, update, delete on table public.employer_talent_connections to service_role;

create or replace function public.employer_can_access_talent(
  p_employer_user_id uuid,
  p_talent_slug text
)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  with employer as (
    select
      p.user_id,
      p.account_type,
      p.employer_verification_status,
      public.normalized_abn(p.employer_abn) as normalized_abn,
      public.company_identity_keys(
        p.employer_abn,
        p.employer_website,
        p.employer_company_name
      ) as company_keys
    from public.profiles p
    where p.user_id = p_employer_user_id
    limit 1
  ),
  talent as (
    select
      t.user_id,
      t.slug,
      t.is_published,
      public.normalize_profile_visibility(t.visibility) as visibility,
      t.blocked_companies
    from public.profiles t
    where t.account_type = 'talent'
      and t.slug = p_talent_slug
    limit 1
  )
  select exists (
    select 1
    from employer e
    join talent t on true
    where e.account_type = 'employer'
      and e.employer_verification_status = 'verified'
      and e.normalized_abn is not null
      and t.is_published = true
      and t.visibility in ('public', 'verified_employer_network', 'confidential')
      and not (
        coalesce(t.blocked_companies, '{}'::text[])
        &&
        coalesce(e.company_keys, '{}'::text[])
      )
  );
$$;

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

  return query
  select true, v_already_exists, v_request_id, v_status, v_created_at;
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
    select public.require_employer_actor() as employer_user_id
  ),
  base as (
    select
      r.id as request_id,
      r.talent_user_id,
      t.slug as talent_slug,
      r.status,
      r.message,
      r.created_at,
      r.updated_at,
      r.responded_at,
      r.withdrawn_at
    from public.employer_introduction_requests r
    join actor a
      on a.employer_user_id = r.employer_user_id
    join public.profiles t
      on t.user_id = r.talent_user_id
     and t.account_type = 'talent'
  )
  select
    b.request_id,
    b.talent_user_id,
    b.talent_slug,
    case
      when p.slug is null then 'Profile unavailable'
      else coalesce(p.name, 'Confidential candidate')
    end as talent_name,
    b.status,
    b.message,
    b.created_at,
    b.updated_at,
    b.responded_at,
    b.withdrawn_at,
    p.access_scope,
    (p.slug is not null and p.access_scope in ('employer_full', 'employer_confidential')) as is_currently_eligible
  from base b
  left join lateral public.talent_passport_for_viewer(b.talent_slug) p on true
  order by b.created_at desc;
$$;

create or replace function public.employer_withdraw_introduction_request(
  p_request_id uuid
)
returns table (
  success boolean,
  status text,
  withdrawn_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := public.require_employer_actor();
  v_status text;
  v_withdrawn_at timestamptz;
begin
  update public.employer_introduction_requests r
  set
    status = 'withdrawn',
    withdrawn_at = now(),
    updated_at = now()
  where r.id = p_request_id
    and r.employer_user_id = v_uid
    and r.status = 'pending'
  returning r.status, r.withdrawn_at
  into v_status, v_withdrawn_at;

  if v_status is null then
    if exists (
      select 1
      from public.employer_introduction_requests r
      where r.id = p_request_id
        and r.employer_user_id = v_uid
    ) then
      raise exception 'invalid_state' using errcode = 'P0001';
    end if;

    raise exception 'request_not_found' using errcode = 'P0002';
  end if;

  return query
  select true, v_status, v_withdrawn_at;
end
$$;

create or replace function public.list_talent_introduction_requests()
returns table (
  request_id uuid,
  employer_user_id uuid,
  employer_company_name text,
  employer_contact_name text,
  employer_contact_role text,
  status text,
  message text,
  created_at timestamptz,
  updated_at timestamptz,
  responded_at timestamptz,
  withdrawn_at timestamptz,
  can_talent_respond boolean
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  with actor as (
    select public.require_talent_actor() as talent_user_id
  ),
  base as (
    select
      r.id as request_id,
      r.employer_user_id,
      r.talent_user_id,
      r.status,
      r.message,
      r.created_at,
      r.updated_at,
      r.responded_at,
      r.withdrawn_at
    from public.employer_introduction_requests r
    join actor a
      on a.talent_user_id = r.talent_user_id
  )
  select
    b.request_id,
    b.employer_user_id,
    ep.employer_company_name,
    ep.employer_contact_name,
    ep.employer_contact_role,
    b.status,
    b.message,
    b.created_at,
    b.updated_at,
    b.responded_at,
    b.withdrawn_at,
    (
      b.status = 'pending'
      and tp.slug is not null
      and public.employer_can_access_talent(b.employer_user_id, tp.slug)
    ) as can_talent_respond
  from base b
  join public.profiles ep
    on ep.user_id = b.employer_user_id
   and ep.account_type = 'employer'
  join public.profiles tp
    on tp.user_id = b.talent_user_id
   and tp.account_type = 'talent'
  order by b.created_at desc;
$$;

create or replace function public.talent_set_introduction_request_status(
  p_request_id uuid,
  p_status text
)
returns table (
  success boolean,
  status text,
  responded_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_talent_uid uuid := public.require_talent_actor();
  v_request record;
  v_slug text;
  v_status text;
  v_responded_at timestamptz;
begin
  if p_status not in ('accepted', 'declined') then
    raise exception 'invalid_status' using errcode = '23514';
  end if;

  select r.*
  into v_request
  from public.employer_introduction_requests r
  where r.id = p_request_id
    and r.talent_user_id = v_talent_uid
  for update;

  if not found then
    raise exception 'request_not_found' using errcode = 'P0002';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'invalid_state' using errcode = 'P0001';
  end if;

  select p.slug
  into v_slug
  from public.profiles p
  where p.user_id = v_talent_uid
    and p.account_type = 'talent'
  limit 1;

  if v_slug is null or not public.employer_can_access_talent(v_request.employer_user_id, v_slug) then
    raise exception 'relationship_no_longer_eligible' using errcode = '42501';
  end if;

  update public.employer_introduction_requests r
  set
    status = p_status,
    responded_at = now(),
    withdrawn_at = null,
    updated_at = now()
  where r.id = p_request_id
    and r.talent_user_id = v_talent_uid
    and r.status = 'pending'
  returning r.status, r.responded_at
  into v_status, v_responded_at;

  if v_status is null then
    raise exception 'invalid_state' using errcode = 'P0001';
  end if;

  if p_status = 'accepted' then
    insert into public.employer_talent_connections (
      employer_user_id,
      talent_user_id,
      introduction_request_id,
      connected_at,
      created_at,
      status,
      revoked_at,
      revoked_by
    )
    values (
      v_request.employer_user_id,
      v_talent_uid,
      p_request_id,
      coalesce(v_responded_at, now()),
      now(),
      'active',
      null,
      null
    )
    on conflict (employer_user_id, talent_user_id)
    do update
    set
      introduction_request_id = coalesce(public.employer_talent_connections.introduction_request_id, excluded.introduction_request_id),
      connected_at = excluded.connected_at,
      status = 'active',
      revoked_at = null,
      revoked_by = null;
  end if;

  return query
  select true, v_status, v_responded_at;
end
$$;

create or replace function public.talent_contact_for_connected_employer(
  p_talent_slug text
)
returns table (
  talent_slug text,
  email text
)
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
  where p.account_type = 'talent'
    and p.slug = v_slug
  limit 1;

  if v_talent_user_id is null then
    raise exception 'contact_unavailable' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.employer_talent_connections c
    where c.employer_user_id = v_employer_uid
      and c.talent_user_id = v_talent_user_id
      and c.status = 'active'
  ) then
    raise exception 'contact_unavailable' using errcode = '42501';
  end if;

  if not public.employer_can_access_talent(v_employer_uid, v_slug)
     or not exists (
       select 1
       from public.talent_private_access_requests r
       where r.talent_user_id = v_talent_user_id
         and r.employer_user_id = v_employer_uid
         and r.status = 'accepted'
     ) then
    raise exception 'contact_unavailable' using errcode = '42501';
  end if;

  if nullif(btrim(coalesce(v_email, '')), '') is null or v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'contact_unavailable' using errcode = '42501';
  end if;

  return query
  select v_slug, v_email;
end
$$;

create or replace function public.talent_revoke_connection(
  p_connection_id uuid
)
returns table (
  connection_id uuid,
  status text,
  revoked_at timestamptz,
  revoked_by text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_talent_uid uuid := public.require_talent_actor();
  v_connection_id uuid;
  v_talent_user_id uuid;
  v_status text;
  v_revoked_at timestamptz;
  v_revoked_by text;
begin
  if p_connection_id is null then
    raise exception 'missing_connection_id' using errcode = '23502';
  end if;

  select c.id, c.talent_user_id, c.status, c.revoked_at, c.revoked_by
  into v_connection_id, v_talent_user_id, v_status, v_revoked_at, v_revoked_by
  from public.employer_talent_connections c
  where c.id = p_connection_id
  for update;

  if v_connection_id is null then
    raise exception 'connection_not_found' using errcode = 'P0002';
  end if;

  if v_talent_user_id <> v_talent_uid then
    raise exception 'not_authorized_connection' using errcode = '42501';
  end if;

  if v_status = 'revoked' then
    return query
    select v_connection_id, v_status, v_revoked_at, v_revoked_by;
    return;
  end if;

  if v_status <> 'active' then
    raise exception 'invalid_state' using errcode = 'P0001';
  end if;

  update public.employer_talent_connections c
  set
    status = 'revoked',
    revoked_at = now(),
    revoked_by = 'talent'
  where c.id = p_connection_id
  returning c.id, c.status, c.revoked_at, c.revoked_by
  into v_connection_id, v_status, v_revoked_at, v_revoked_by;

  return query
  select v_connection_id, v_status, v_revoked_at, v_revoked_by;
end
$$;

create or replace function public.list_employer_connections()
returns table (
  connection_id uuid,
  status text,
  connected_at timestamptz,
  revoked_at timestamptz,
  is_currently_eligible boolean,
  talent_slug text,
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
  current_employer text
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
    select
      c.id as connection_id,
      c.employer_user_id,
      c.status,
      c.connected_at,
      c.revoked_at,
      t.slug as talent_slug
    from public.employer_talent_connections c
    join actor a
      on a.employer_user_id = c.employer_user_id
    join public.profiles t
      on t.user_id = c.talent_user_id
     and t.account_type = 'talent'
  )
  select
    b.connection_id,
    b.status,
    b.connected_at,
    b.revoked_at,
    (
      b.status = 'active'
      and b.talent_slug is not null
      and public.employer_can_access_talent(b.employer_user_id, b.talent_slug)
    ) as is_currently_eligible,
    p.slug as talent_slug,
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
    p.current_employer
  from base b
  left join lateral public.talent_passport_for_viewer(b.talent_slug) p
    on b.talent_slug is not null
  order by b.connected_at desc;
$$;

create or replace function public.list_talent_connections()
returns table (
  connection_id uuid,
  status text,
  connected_at timestamptz,
  revoked_at timestamptz,
  employer_company_name text,
  employer_contact_name text,
  employer_contact_role text
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  with actor as (
    select public.require_talent_actor() as talent_user_id
  )
  select
    c.id as connection_id,
    c.status,
    c.connected_at,
    c.revoked_at,
    p.employer_company_name,
    p.employer_contact_name,
    p.employer_contact_role
  from public.employer_talent_connections c
  join actor a
    on a.talent_user_id = c.talent_user_id
  join public.profiles p
    on p.user_id = c.employer_user_id
   and p.account_type = 'employer'
  order by c.connected_at desc;
$$;

create or replace function public.talent_accept_introduction_request(
  p_request_id uuid
)
returns table (
  success boolean,
  status text,
  responded_at timestamptz
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select *
  from public.talent_set_introduction_request_status(p_request_id, 'accepted');
$$;

create or replace function public.talent_decline_introduction_request(
  p_request_id uuid
)
returns table (
  success boolean,
  status text,
  responded_at timestamptz
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select *
  from public.talent_set_introduction_request_status(p_request_id, 'declined');
$$;

revoke all on function public.require_employer_actor() from public, anon, authenticated, service_role;
revoke all on function public.require_verified_employer_actor() from public, anon, authenticated, service_role;
revoke all on function public.validate_saved_talent_roles() from public, anon, authenticated, service_role;
revoke all on function public.validate_shortlist_owner_role() from public, anon, authenticated, service_role;
revoke all on function public.require_talent_actor() from public, anon, authenticated, service_role;
revoke all on function public.validate_introduction_request_roles() from public, anon, authenticated, service_role;
revoke all on function public.employer_can_access_talent(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.talent_set_introduction_request_status(uuid, text) from public, anon, authenticated, service_role;

revoke all on function public.save_talent_for_employer(text, uuid[]) from public, anon;
revoke all on function public.unsave_talent_for_employer(text) from public, anon;
revoke all on function public.create_employer_shortlist(text) from public, anon;
revoke all on function public.rename_employer_shortlist(uuid, text) from public, anon;
revoke all on function public.delete_employer_shortlist(uuid) from public, anon;
revoke all on function public.add_saved_talent_to_shortlist(text, uuid) from public, anon;
revoke all on function public.remove_saved_talent_from_shortlist(text, uuid) from public, anon;
revoke all on function public.list_employer_shortlists() from public, anon;
revoke all on function public.list_saved_talent_for_employer(uuid) from public, anon;
revoke all on function public.create_employer_introduction_request(text, text) from public, anon;
revoke all on function public.list_employer_introduction_requests() from public, anon;
revoke all on function public.employer_withdraw_introduction_request(uuid) from public, anon;
revoke all on function public.list_talent_introduction_requests() from public, anon;
revoke all on function public.talent_accept_introduction_request(uuid) from public, anon;
revoke all on function public.talent_decline_introduction_request(uuid) from public, anon;
revoke all on function public.talent_contact_for_connected_employer(text) from public, anon;
revoke all on function public.talent_revoke_connection(uuid) from public, anon;
revoke all on function public.list_employer_connections() from public, anon;
revoke all on function public.list_talent_connections() from public, anon;

grant execute on function public.save_talent_for_employer(text, uuid[]) to authenticated;
grant execute on function public.unsave_talent_for_employer(text) to authenticated;
grant execute on function public.create_employer_shortlist(text) to authenticated;
grant execute on function public.rename_employer_shortlist(uuid, text) to authenticated;
grant execute on function public.delete_employer_shortlist(uuid) to authenticated;
grant execute on function public.add_saved_talent_to_shortlist(text, uuid) to authenticated;
grant execute on function public.remove_saved_talent_from_shortlist(text, uuid) to authenticated;
grant execute on function public.list_employer_shortlists() to authenticated;
grant execute on function public.list_saved_talent_for_employer(uuid) to authenticated;

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
grant execute on function public.create_employer_introduction_request(text, text) to authenticated;
grant execute on function public.list_employer_introduction_requests() to authenticated;
grant execute on function public.employer_withdraw_introduction_request(uuid) to authenticated;
grant execute on function public.list_talent_introduction_requests() to authenticated;
grant execute on function public.talent_accept_introduction_request(uuid) to authenticated;
grant execute on function public.talent_decline_introduction_request(uuid) to authenticated;
grant execute on function public.talent_contact_for_connected_employer(text) to authenticated;
grant execute on function public.talent_revoke_connection(uuid) to authenticated;
grant execute on function public.list_employer_connections() to authenticated;
grant execute on function public.list_talent_connections() to authenticated;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references public.profiles(user_id) on delete cascade,
  actor_user_id uuid references public.profiles(user_id) on delete set null,
  notification_type text not null,
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  event_key text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_event_key_unique unique (event_key)
);

create index if not exists notifications_recipient_read_created_idx
  on public.notifications (recipient_user_id, read_at, created_at desc);

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_user_id, created_at desc);

create index if not exists notifications_entity_lookup_idx
  on public.notifications (entity_type, entity_id);

alter table public.notifications enable row level security;
revoke all privileges on table public.notifications from public, anon, authenticated;
grant select, insert, update, delete on table public.notifications to service_role;

create or replace function public.create_notification_event(
  p_recipient_user_id uuid,
  p_actor_user_id uuid,
  p_notification_type text,
  p_title text,
  p_body text,
  p_entity_type text,
  p_entity_id uuid,
  p_event_key text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_recipient_user_id is null then
    raise exception 'missing_recipient_user_id' using errcode = '23502';
  end if;

  if nullif(btrim(coalesce(p_notification_type, '')), '') is null then
    raise exception 'missing_notification_type' using errcode = '23502';
  end if;

  if nullif(btrim(coalesce(p_title, '')), '') is null then
    raise exception 'missing_notification_title' using errcode = '23502';
  end if;

  if nullif(btrim(coalesce(p_event_key, '')), '') is null then
    raise exception 'missing_event_key' using errcode = '23502';
  end if;

  insert into public.notifications (
    recipient_user_id,
    actor_user_id,
    notification_type,
    title,
    body,
    entity_type,
    entity_id,
    event_key
  )
  values (
    p_recipient_user_id,
    p_actor_user_id,
    p_notification_type,
    p_title,
    nullif(btrim(coalesce(p_body, '')), ''),
    nullif(btrim(coalesce(p_entity_type, '')), ''),
    p_entity_id,
    p_event_key
  )
  on conflict (event_key) do nothing;
end
$$;

create or replace function public.list_my_notifications(
  p_limit integer default 20,
  p_unread_only boolean default false
)
returns table (
  notification_id uuid,
  notification_type text,
  title text,
  body text,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz,
  action_path text
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_limit integer := coalesce(p_limit, 20);
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;

  if v_limit < 1 then
    v_limit := 1;
  end if;

  if v_limit > 100 then
    v_limit := 100;
  end if;

  return query
  with scoped as (
    select n.*
    from public.notifications n
    where n.recipient_user_id = v_uid
      and (not coalesce(p_unread_only, false) or n.read_at is null)
    order by n.created_at desc
    limit v_limit
  )
  select
    s.id as notification_id,
    s.notification_type,
    s.title,
    s.body,
    s.entity_type,
    s.entity_id,
    s.read_at,
    s.created_at,
    case
      when s.notification_type = 'connection_revoked' then '/connections'
      when s.notification_type in ('verification_approved', 'verification_rejected') then '/onboarding/employer'
      else '/dashboard'
    end as action_path
  from scoped s
  order by s.created_at desc;
end
$$;

create or replace function public.mark_notification_read(
  p_notification_id uuid
)
returns table (
  success boolean,
  notification_id uuid,
  read_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_notification_id uuid;
  v_read_at timestamptz;
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;

  if p_notification_id is null then
    raise exception 'missing_notification_id' using errcode = '23502';
  end if;

  update public.notifications n
  set read_at = coalesce(n.read_at, now())
  where n.id = p_notification_id
    and n.recipient_user_id = v_uid
  returning n.id, n.read_at
  into v_notification_id, v_read_at;

  if v_notification_id is null then
    raise exception 'notification_not_found' using errcode = 'P0002';
  end if;

  return query
  select true, v_notification_id, v_read_at;
end
$$;

create or replace function public.mark_all_notifications_read()
returns table (
  success boolean,
  updated_count bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_updated_count bigint := 0;
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;

  update public.notifications n
  set read_at = now()
  where n.recipient_user_id = v_uid
    and n.read_at is null;

  get diagnostics v_updated_count = row_count;

  return query
  select true, v_updated_count;
end
$$;

create or replace function public.get_unread_notification_count()
returns table (
  unread_count bigint
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select count(*)::bigint as unread_count
  from public.notifications n
  where n.recipient_user_id = auth.uid()
    and n.read_at is null;
$$;

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
    'Review and respond from your dashboard.',
    'introduction_request',
    v_request_id,
    format('intro_request:%s:created', v_request_id::text)
  );

  return query
  select true, v_already_exists, v_request_id, v_status, v_created_at;
end
$$;

create or replace function public.talent_set_introduction_request_status(
  p_request_id uuid,
  p_status text
)
returns table (
  success boolean,
  status text,
  responded_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_talent_uid uuid := public.require_talent_actor();
  v_request record;
  v_slug text;
  v_status text;
  v_responded_at timestamptz;
begin
  if p_status not in ('accepted', 'declined') then
    raise exception 'invalid_status' using errcode = '23514';
  end if;

  select r.*
  into v_request
  from public.employer_introduction_requests r
  where r.id = p_request_id
    and r.talent_user_id = v_talent_uid
  for update;

  if not found then
    raise exception 'request_not_found' using errcode = 'P0002';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'invalid_state' using errcode = 'P0001';
  end if;

  select p.slug
  into v_slug
  from public.profiles p
  where p.user_id = v_talent_uid
    and p.account_type = 'talent'
  limit 1;

  if v_slug is null or not public.employer_can_access_talent(v_request.employer_user_id, v_slug) then
    raise exception 'relationship_no_longer_eligible' using errcode = '42501';
  end if;

  update public.employer_introduction_requests r
  set
    status = p_status,
    responded_at = now(),
    withdrawn_at = null,
    updated_at = now()
  where r.id = p_request_id
    and r.talent_user_id = v_talent_uid
    and r.status = 'pending'
  returning r.status, r.responded_at
  into v_status, v_responded_at;

  if v_status is null then
    raise exception 'invalid_state' using errcode = 'P0001';
  end if;

  if p_status = 'accepted' then
    insert into public.employer_talent_connections (
      employer_user_id,
      talent_user_id,
      introduction_request_id,
      connected_at,
      created_at,
      status,
      revoked_at,
      revoked_by
    )
    values (
      v_request.employer_user_id,
      v_talent_uid,
      p_request_id,
      coalesce(v_responded_at, now()),
      now(),
      'active',
      null,
      null
    )
    on conflict (employer_user_id, talent_user_id)
    do update
    set
      introduction_request_id = coalesce(public.employer_talent_connections.introduction_request_id, excluded.introduction_request_id),
      connected_at = excluded.connected_at,
      status = 'active',
      revoked_at = null,
      revoked_by = null;

    perform public.create_notification_event(
      v_request.employer_user_id,
      v_talent_uid,
      'intro_request_accepted',
      'Your introduction request was accepted.',
      'You can now view this connection in your dashboard.',
      'introduction_request',
      p_request_id,
      format('intro_request:%s:accepted', p_request_id::text)
    );
  else
    perform public.create_notification_event(
      v_request.employer_user_id,
      v_talent_uid,
      'intro_request_declined',
      'Your introduction request was declined.',
      'You can continue searching for other talent profiles.',
      'introduction_request',
      p_request_id,
      format('intro_request:%s:declined', p_request_id::text)
    );
  end if;

  return query
  select true, v_status, v_responded_at;
end
$$;

create or replace function public.talent_revoke_connection(
  p_connection_id uuid
)
returns table (
  connection_id uuid,
  status text,
  revoked_at timestamptz,
  revoked_by text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_talent_uid uuid := public.require_talent_actor();
  v_connection_id uuid;
  v_employer_user_id uuid;
  v_talent_user_id uuid;
  v_status text;
  v_revoked_at timestamptz;
  v_revoked_by text;
begin
  if p_connection_id is null then
    raise exception 'missing_connection_id' using errcode = '23502';
  end if;

  select c.id, c.employer_user_id, c.talent_user_id, c.status, c.revoked_at, c.revoked_by
  into v_connection_id, v_employer_user_id, v_talent_user_id, v_status, v_revoked_at, v_revoked_by
  from public.employer_talent_connections c
  where c.id = p_connection_id
  for update;

  if v_connection_id is null then
    raise exception 'connection_not_found' using errcode = 'P0002';
  end if;

  if v_talent_user_id <> v_talent_uid then
    raise exception 'not_authorized_connection' using errcode = '42501';
  end if;

  if v_status = 'revoked' then
    return query
    select v_connection_id, v_status, v_revoked_at, v_revoked_by;
    return;
  end if;

  if v_status <> 'active' then
    raise exception 'invalid_state' using errcode = 'P0001';
  end if;

  update public.employer_talent_connections c
  set
    status = 'revoked',
    revoked_at = now(),
    revoked_by = 'talent'
  where c.id = p_connection_id
  returning c.id, c.status, c.revoked_at, c.revoked_by
  into v_connection_id, v_status, v_revoked_at, v_revoked_by;

  perform public.create_notification_event(
    v_employer_user_id,
    v_talent_uid,
    'connection_revoked',
    'A talent connection was ended.',
    'Review connection status in your dashboard.',
    'connection',
    v_connection_id,
    format('connection:%s:revoked', v_connection_id::text)
  );

  return query
  select v_connection_id, v_status, v_revoked_at, v_revoked_by;
end
$$;

create or replace function public.admin_review_employer_verification(
  p_user_id uuid,
  p_decision text,
  p_reason text default null,
  p_reviewer text default null
)
returns table (
  success boolean,
  employer_verification_status text,
  verification_reviewed_at timestamptz,
  verification_reviewed_by text,
  verification_rejection_reason text,
  message text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_account_type text;
  v_status text;
  v_reviewer text;
  v_requested_at timestamptz;
  v_result_status text;
  v_result_reviewed_at timestamptz;
  v_result_reviewed_by text;
  v_result_rejection_reason text;
  v_event_key text;
begin
  if p_user_id is null then
    raise exception 'missing_user_id' using errcode = '23502';
  end if;

  if p_decision not in ('verified', 'rejected') then
    raise exception 'invalid_decision' using errcode = '23514';
  end if;

  if p_decision = 'rejected' and btrim(coalesce(p_reason, '')) = '' then
    raise exception 'missing_rejection_reason' using errcode = '23514';
  end if;

  select p.account_type, p.employer_verification_status, p.verification_requested_at
  into v_account_type, v_status, v_requested_at
  from public.profiles p
  where p.user_id = p_user_id
  for update;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  if v_account_type <> 'employer' then
    raise exception 'wrong_account_type' using errcode = '42501';
  end if;

  if v_status <> 'pending' then
    raise exception 'invalid_state' using errcode = 'P0001';
  end if;

  v_reviewer := coalesce(
    nullif(btrim(coalesce(p_reviewer, '')), ''),
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    current_user
  );

  perform set_config('freeagent.transition', 'admin_review_employer_verification', true);
  perform set_config('freeagent.transition_uid', p_user_id::text, true);

  update public.profiles p
  set
    employer_verification_status = p_decision,
    verification_reviewed_at = now(),
    verification_reviewed_by = v_reviewer,
    verification_rejection_reason = case when p_decision = 'rejected' then btrim(p_reason) else null end,
    updated_at = now()
  where p.user_id = p_user_id
  returning
    p.employer_verification_status,
    p.verification_reviewed_at,
    p.verification_reviewed_by,
    p.verification_rejection_reason
  into
    v_result_status,
    v_result_reviewed_at,
    v_result_reviewed_by,
    v_result_rejection_reason;

  v_event_key := format(
    'employer_verification:%s:%s:%s',
    p_user_id::text,
    coalesce(extract(epoch from v_requested_at)::bigint::text, 'none'),
    p_decision
  );

  perform public.create_notification_event(
    p_user_id,
    null,
    case when p_decision = 'verified' then 'verification_approved' else 'verification_rejected' end,
    case when p_decision = 'verified' then 'Employer verification approved.' else 'Employer verification requires action.' end,
    case when p_decision = 'verified'
      then 'Your employer account can now access verified employer workflows.'
      else 'Review your employer details and submit verification again.'
    end,
    'profile',
    p_user_id,
    v_event_key
  );

  return query
  select
    true,
    v_result_status,
    v_result_reviewed_at,
    v_result_reviewed_by,
    v_result_rejection_reason,
    case when p_decision = 'verified' then 'verification_approved' else 'verification_rejected' end;
end
$$;

revoke all on function public.create_notification_event(uuid, uuid, text, text, text, text, uuid, text) from public, anon, authenticated, service_role;

revoke all on function public.list_my_notifications(integer, boolean) from public, anon;
revoke all on function public.mark_notification_read(uuid) from public, anon;
revoke all on function public.mark_all_notifications_read() from public, anon;
revoke all on function public.get_unread_notification_count() from public, anon;

grant execute on function public.list_my_notifications(integer, boolean) to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
grant execute on function public.get_unread_notification_count() to authenticated;

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
      t.education,
      t.salary_expectation,
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
    case when d.is_owner then d.education else d.education end as education,
    case when d.is_owner or d.viewer_is_verified_employer then d.salary_expectation else null end as salary_expectation,
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

create or replace function public.discovery_profiles_for_verified_employer_v2()
returns table (
  slug text, visibility text, verification_status text, availability text, opportunity_status text,
  experience_years integer, focus_area text, top_strength text, skills text[], location text,
  name text, title text, summary text, current_employer text, photo_storage_path text,
  intro_video_storage_path text, can_view_identifying_info boolean, can_view_media boolean,
  education text, salary_expectation text
)
language sql security definer stable set search_path = public, pg_temp
as $$
  select base.slug, base.visibility, base.verification_status, base.availability, base.opportunity_status,
    base.experience_years, base.focus_area, base.top_strength, base.skills, base.location, base.name,
    base.title, base.summary, base.current_employer, base.photo_storage_path, base.intro_video_storage_path,
    base.can_view_identifying_info, base.can_view_media,
    case when base.can_view_identifying_info then profile.education else null end,
    case when base.can_view_identifying_info then profile.salary_expectation else null end
  from public.discovery_profiles_for_verified_employer() base
  join public.profiles profile on profile.slug = base.slug;
$$;

create or replace function public.talent_passport_for_viewer_v2(p_slug text)
returns table (
  slug text, visibility text, is_owner boolean, access_scope text, verification_status text,
  availability text, opportunity_status text, experience_years integer, focus_area text,
  top_strength text, skills text[], location text, name text, title text, summary text,
  current_employer text, email text, career_journey jsonb, photo_storage_path text,
  intro_video_storage_path text, education text, salary_expectation text
)
language sql security definer stable set search_path = public, pg_temp
as $$
  select base.slug, base.visibility, base.is_owner, base.access_scope, base.verification_status,
    base.availability, base.opportunity_status, base.experience_years, base.focus_area, base.top_strength,
    base.skills, base.location, base.name, base.title, base.summary, base.current_employer,
    null::text as email, base.career_journey, base.photo_storage_path, base.intro_video_storage_path,
    case when base.access_scope <> 'employer_confidential' then profile.education else null end,
    case when base.access_scope in ('owner_full', 'employer_full') then profile.salary_expectation else null end
  from public.talent_passport_for_viewer(p_slug) base
  join public.profiles profile on profile.slug = base.slug;
$$;

revoke all on function public.discovery_profiles_for_verified_employer_v2() from public, anon;
revoke all on function public.talent_passport_for_viewer_v2(text) from public, anon;
grant execute on function public.discovery_profiles_for_verified_employer_v2() to authenticated;
grant execute on function public.talent_passport_for_viewer_v2(text) to authenticated;

create extension if not exists unaccent with schema extensions;

create or replace function public.generate_profile_slug()
returns trigger
language plpgsql
set search_path = public, extensions, pg_temp
as $$
declare
  base_slug text;
  candidate text;
  suffix text;
  attempt integer := 0;
begin
  if new.slug is not null and btrim(new.slug) <> '' and not (tg_op = 'UPDATE' and old.slug = 'member') then
    return new;
  end if;

  base_slug := regexp_replace(lower(extensions.unaccent(coalesce(nullif(btrim(new.name), ''), 'member'))), '[^a-z0-9]+', '-', 'g');
  base_slug := regexp_replace(base_slug, '(^-+|-+$)', '', 'g');
  base_slug := left(coalesce(nullif(base_slug, ''), 'member'), 48);
  candidate := base_slug;

  while exists (select 1 from public.profiles p where p.slug = candidate and p.user_id <> new.user_id) loop
    attempt := attempt + 1;
    suffix := substr(md5(new.user_id::text || ':' || attempt::text), 1, 4);
    candidate := left(base_slug, 43) || '-' || suffix;
  end loop;

  new.slug := candidate;
  return new;
end
$$;

drop trigger if exists profiles_generate_slug on public.profiles;
create trigger profiles_generate_slug
before insert or update of slug, name on public.profiles
for each row execute function public.generate_profile_slug();

create unique index if not exists profiles_slug_unique_idx on public.profiles(slug) where slug is not null;

create table if not exists public.talent_private_access_requests (
  id uuid primary key default gen_random_uuid(),
  talent_user_id uuid not null references public.profiles(user_id) on delete cascade,
  employer_user_id uuid not null references public.profiles(user_id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'revoked')),
  requested_at timestamptz not null default now(), responded_at timestamptz, revoked_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint talent_private_access_requests_pair_unique unique (talent_user_id, employer_user_id),
  constraint talent_private_access_requests_distinct_users check (talent_user_id <> employer_user_id)
);
create index if not exists talent_private_access_talent_status_idx on public.talent_private_access_requests (talent_user_id, status, updated_at desc);
create index if not exists talent_private_access_employer_status_idx on public.talent_private_access_requests (employer_user_id, status, updated_at desc);
alter table public.talent_private_access_requests enable row level security;
revoke all privileges on table public.talent_private_access_requests from public, anon, authenticated;
grant select, insert, update, delete on table public.talent_private_access_requests to service_role;

create or replace function public.employer_request_talent_private_access(p_talent_slug text)
returns table (request_id uuid, request_status text, requested_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_employer uuid := public.require_verified_employer_actor(); v_talent uuid; v_request public.talent_private_access_requests;
begin
  select user_id into v_talent from public.profiles where account_type = 'talent' and slug = nullif(btrim(p_talent_slug), '');
  if v_talent is null or not public.employer_can_access_talent(v_employer, p_talent_slug) then raise exception 'private_access_unavailable' using errcode = '42501'; end if;
  insert into public.talent_private_access_requests (talent_user_id, employer_user_id)
  values (v_talent, v_employer)
  on conflict (talent_user_id, employer_user_id) do update set status = case when public.talent_private_access_requests.status in ('declined','revoked') then 'pending' else public.talent_private_access_requests.status end, requested_at = case when public.talent_private_access_requests.status in ('declined','revoked') then now() else public.talent_private_access_requests.requested_at end, responded_at = case when public.talent_private_access_requests.status in ('declined','revoked') then null else public.talent_private_access_requests.responded_at end, revoked_at = case when public.talent_private_access_requests.status in ('declined','revoked') then null else public.talent_private_access_requests.revoked_at end, updated_at = now()
  returning * into v_request;
  if v_request.status = 'pending' then perform public.create_notification_event(v_talent, v_employer, 'private_access_request_received', 'Private access request', 'A verified employer requested access to your private resume and contact details.', 'talent_private_access_request', v_request.id, 'private-access-request:' || v_request.id::text || ':' || to_char(v_request.requested_at, 'YYYYMMDDHH24MISSMS')); end if;
  return query select v_request.id, v_request.status, v_request.requested_at;
end $$;

create or replace function public.list_talent_private_access_requests()
returns table (request_id uuid, employer_user_id uuid, employer_company_name text, employer_contact_name text, employer_contact_role text, request_status text, requested_at timestamptz, responded_at timestamptz, revoked_at timestamptz)
language plpgsql security definer stable set search_path = public, pg_temp as $$
declare v_talent uuid := public.require_talent_actor();
begin return query select r.id, r.employer_user_id, p.employer_company_name, p.employer_contact_name, p.employer_contact_role, r.status, r.requested_at, r.responded_at, r.revoked_at from public.talent_private_access_requests r join public.profiles p on p.user_id = r.employer_user_id where r.talent_user_id = v_talent order by r.updated_at desc; end $$;

create or replace function public.talent_set_private_access_request_status(p_request_id uuid, p_status text)
returns table (request_id uuid, request_status text, responded_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_talent uuid := public.require_talent_actor(); v_request public.talent_private_access_requests;
begin
  if p_status not in ('accepted','declined') then raise exception 'invalid_private_access_status' using errcode = '22023'; end if;
  update public.talent_private_access_requests set status = p_status, responded_at = now(), updated_at = now() where id = p_request_id and talent_user_id = v_talent and status = 'pending' returning * into v_request;
  if v_request.id is null then select * into v_request from public.talent_private_access_requests where id = p_request_id and talent_user_id = v_talent; if v_request.id is null then raise exception 'private_access_request_not_found' using errcode = '42501'; end if;
  else perform public.create_notification_event(v_request.employer_user_id, v_talent, 'private_access_request_' || p_status, 'Private access ' || p_status, 'The talent updated your private resume and contact access request.', 'talent_private_access_request', v_request.id, 'private-access-response:' || v_request.id::text || ':' || p_status || ':' || to_char(v_request.responded_at, 'YYYYMMDDHH24MISSMS')); end if;
  return query select v_request.id, v_request.status, v_request.responded_at;
end $$;

create or replace function public.talent_revoke_private_access(p_request_id uuid)
returns table (request_id uuid, request_status text, revoked_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_talent uuid := public.require_talent_actor(); v_request public.talent_private_access_requests;
begin update public.talent_private_access_requests set status = 'revoked', revoked_at = now(), updated_at = now() where id = p_request_id and talent_user_id = v_talent and status = 'accepted' returning * into v_request; if v_request.id is null then raise exception 'private_access_request_not_found' using errcode = '42501'; end if; perform public.create_notification_event(v_request.employer_user_id, v_talent, 'private_access_request_revoked', 'Private access revoked', 'The talent revoked private resume and contact access.', 'talent_private_access_request', v_request.id, 'private-access-revoked:' || v_request.id::text || ':' || to_char(v_request.revoked_at, 'YYYYMMDDHH24MISSMS')); return query select v_request.id, v_request.status, v_request.revoked_at; end $$;

create or replace function public.talent_private_access_for_viewer(p_talent_slug text)
returns table (request_id uuid, is_owner boolean, request_status text, requested_at timestamptz, contact_email text, resume_original_filename text, resume_uploaded_at timestamptz, resume_available boolean)
language plpgsql security definer stable set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_talent uuid; v_request public.talent_private_access_requests;
begin
  if v_uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  select user_id into v_talent from public.profiles where account_type = 'talent' and slug = p_talent_slug;
  if v_talent is null then raise exception 'private_access_unavailable' using errcode = '42501'; end if;
  if v_uid = v_talent then return query select null::uuid, true, 'owner_full'::text, now(), p.contact_email, p.resume_original_filename, p.resume_uploaded_at, p.resume_storage_path is not null from public.profiles p where p.user_id = v_talent; return; end if;
  if not public.employer_can_access_talent(v_uid, p_talent_slug) then raise exception 'private_access_unavailable' using errcode = '42501'; end if;
  select * into v_request from public.talent_private_access_requests where talent_user_id = v_talent and employer_user_id = v_uid;
  return query select v_request.id, false, coalesce(v_request.status, 'none'), v_request.requested_at, case when v_request.status = 'accepted' then p.contact_email else null end, case when v_request.status = 'accepted' then p.resume_original_filename else null end, case when v_request.status = 'accepted' then p.resume_uploaded_at else null end, case when v_request.status = 'accepted' then p.resume_storage_path is not null else false end from public.profiles p where p.user_id = v_talent;
end $$;

create or replace function public.talent_private_details_for_authorized_employer(p_talent_slug text)
returns table (contact_email text, resume_original_filename text, resume_uploaded_at timestamptz, resume_storage_path text)
language plpgsql security definer stable set search_path = public, pg_temp as $$
declare v_uid uuid := public.require_verified_employer_actor(); v_talent uuid;
begin select user_id into v_talent from public.profiles where account_type = 'talent' and slug = p_talent_slug; if v_talent is null or not public.employer_can_access_talent(v_uid, p_talent_slug) or not exists (select 1 from public.talent_private_access_requests r where r.talent_user_id = v_talent and r.employer_user_id = v_uid and r.status = 'accepted') then raise exception 'private_access_unavailable' using errcode = '42501'; end if; return query select p.contact_email, p.resume_original_filename, p.resume_uploaded_at, p.resume_storage_path from public.profiles p where p.user_id = v_talent; end $$;

revoke all on function public.employer_request_talent_private_access(text) from public, anon;
revoke all on function public.list_talent_private_access_requests() from public, anon;
revoke all on function public.talent_set_private_access_request_status(uuid, text) from public, anon;
revoke all on function public.talent_revoke_private_access(uuid) from public, anon;
revoke all on function public.talent_private_access_for_viewer(text) from public, anon;
revoke all on function public.talent_private_details_for_authorized_employer(text) from public, anon;
grant execute on function public.employer_request_talent_private_access(text) to authenticated;
grant execute on function public.list_talent_private_access_requests() to authenticated;
grant execute on function public.talent_set_private_access_request_status(uuid, text) to authenticated;
grant execute on function public.talent_revoke_private_access(uuid) to authenticated;
grant execute on function public.talent_private_access_for_viewer(text) to authenticated;
grant execute on function public.talent_private_details_for_authorized_employer(text) to authenticated;

create or replace function public.talent_passport_for_viewer_v3(p_slug text)
returns table (slug text, visibility text, is_owner boolean, access_scope text, verification_status text, availability text, opportunity_status text, experience_years integer, focus_area text, top_strength text, skills text[], languages text[], passions text[], location text, name text, title text, summary text, bio text, current_employer text, email text, career_journey jsonb, photo_storage_path text, intro_video_storage_path text, education text, salary_expectation text)
language sql security definer stable set search_path = public, pg_temp
as $$
  select base.slug, base.visibility, base.is_owner, base.access_scope, base.verification_status, base.availability, base.opportunity_status, base.experience_years, base.focus_area, base.top_strength, base.skills, profile.languages, profile.passions, base.location, base.name, base.title, base.summary, profile.bio, base.current_employer, base.email, base.career_journey, base.photo_storage_path, base.intro_video_storage_path, case when base.access_scope <> 'employer_confidential' then profile.education else null end, case when base.access_scope in ('owner_full', 'employer_full') then profile.salary_expectation else null end
  from public.talent_passport_for_viewer_v2(p_slug) base join public.profiles profile on profile.slug = base.slug;
$$;
revoke all on function public.talent_passport_for_viewer_v3(text) from public, anon;
grant execute on function public.talent_passport_for_viewer_v3(text) to authenticated;
