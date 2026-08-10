-- Add intro video support to talent profiles.
-- This is intentionally additive and nullable for the first release.

alter table if exists public.profiles
  add column if not exists intro_video_url text;
