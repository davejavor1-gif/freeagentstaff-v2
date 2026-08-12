begin;

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

commit;
