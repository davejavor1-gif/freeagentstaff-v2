-- Adds an independent Rockstar availability flag for Talent (one-off shift availability).
-- Does not modify or replace the existing availability/opportunity_status columns.
alter table public.profiles
  add column if not exists rockstar_available boolean not null default false;
