-- Preserve stored videos while restricting video mutations and employer delivery to active Pro talent.

drop policy if exists "Users can delete their own intro videos" on storage.objects;
drop policy if exists "Pro talent can delete intro videos" on storage.objects;

create policy "Pro talent can delete intro videos"
  on storage.objects
  for delete
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
  );

create or replace function public.protect_talent_video_introduction()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role'
    and (new.intro_video_url is distinct from old.intro_video_url
      or new.intro_video_storage_path is distinct from old.intro_video_storage_path)
    and not (
      new.account_type = 'talent'
      and new.talent_plan = 'free_agent_pro'
      and new.talent_subscription_status in ('active', 'trialing')
      and (new.talent_subscription_current_period_ends_at is null or new.talent_subscription_current_period_ends_at >= now())
    ) then
    raise exception 'free_agent_pro_required_for_video_introduction' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_talent_video_introduction on public.profiles;
create trigger protect_talent_video_introduction
  before update on public.profiles
  for each row execute function public.protect_talent_video_introduction();