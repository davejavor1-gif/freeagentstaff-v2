-- Create the profiles table and enable row level security
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id),
  account_type text not null default 'talent' check (account_type in ('talent', 'employer')),
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
  summary text,
  skills text[] not null default '{}',
  career_journey jsonb not null default '[]'::jsonb,
  email text,
  image_alt text,
  photo_url text,
  photo_storage_path text,
  current_employer text,
  intro_video_url text,
  intro_video_storage_path text,
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

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on profiles
  for each row execute function public.set_updated_at();

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
