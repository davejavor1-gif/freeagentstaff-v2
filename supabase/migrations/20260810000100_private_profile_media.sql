-- Create private storage buckets for profile media and intro videos.
insert into storage.buckets (id, name, public)
values
  ('profile-media', 'profile-media', false),
  ('intro-videos', 'intro-videos', false)
on conflict (id) do nothing;

-- Add storage-path columns to the profiles table.
alter table public.profiles
  add column if not exists photo_storage_path text;

alter table public.profiles
  add column if not exists intro_video_storage_path text;

-- Ensure authenticated users can manage their own objects.
create policy if not exists "Users can upload their own profile photos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'profile-media' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy if not exists "Users can update their own profile photos"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'profile-media' and
    (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-media' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy if not exists "Users can delete their own profile photos"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'profile-media' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy if not exists "Users can select their own profile photos"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'profile-media' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy if not exists "Users can upload their own intro videos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'intro-videos' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy if not exists "Users can update their own intro videos"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'intro-videos' and
    (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'intro-videos' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy if not exists "Users can delete their own intro videos"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'intro-videos' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy if not exists "Users can select their own intro videos"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'intro-videos' and
    (storage.foldername(name))[1] = auth.uid()::text
  );
