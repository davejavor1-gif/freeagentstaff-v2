-- Reconcile the live profiles table with the schema used by the app.
-- This migration is additive and only adds missing columns plus safe constraints
-- for the columns that are newly created in this migration.

alter table if exists public.profiles
  add column if not exists visibility text not null default 'public';

alter table if exists public.profiles
  add column if not exists opportunity_status text not null default 'actively_open';

alter table if exists public.profiles
  drop constraint if exists profiles_visibility_check;

alter table if exists public.profiles
  add constraint profiles_visibility_check
  check (visibility in ('public', 'verified_employer_network', 'confidential', 'employer_network'));

alter table if exists public.profiles
  drop constraint if exists profiles_opportunity_status_check;

alter table if exists public.profiles
  add constraint profiles_opportunity_status_check
  check (opportunity_status in ('actively_open', 'exploring', 'not_open'));

alter table if exists public.profiles
  add column if not exists blocked_companies text[] not null default '{}';

alter table if exists public.profiles
  add column if not exists verification_status text not null default 'unverified';

alter table if exists public.profiles
  drop constraint if exists profiles_verification_status_check;

alter table if exists public.profiles
  add constraint profiles_verification_status_check
  check (verification_status in ('unverified', 'pending', 'verified', 'rejected'));

alter table if exists public.profiles
  add column if not exists is_published boolean not null default false;

alter table if exists public.profiles
  add column if not exists employer_company_name text;

alter table if exists public.profiles
  add column if not exists employer_abn text;

alter table if exists public.profiles
  add column if not exists employer_website text;

alter table if exists public.profiles
  add column if not exists employer_industry text;

alter table if exists public.profiles
  add column if not exists employer_company_size text;

alter table if exists public.profiles
  add column if not exists employer_verification_status text not null default 'unverified';

alter table if exists public.profiles
  drop constraint if exists profiles_employer_verification_status_check;

alter table if exists public.profiles
  add constraint profiles_employer_verification_status_check
  check (employer_verification_status in ('unverified', 'pending', 'verified', 'rejected'));

alter table if exists public.profiles
  add column if not exists name text;

alter table if exists public.profiles
  add column if not exists title text;

alter table if exists public.profiles
  add column if not exists location text;

alter table if exists public.profiles
  add column if not exists availability text;

alter table if exists public.profiles
  add column if not exists top_strength text;

alter table if exists public.profiles
  add column if not exists experience_years integer not null default 0;

alter table if exists public.profiles
  drop constraint if exists profiles_experience_years_check;

alter table if exists public.profiles
  add constraint profiles_experience_years_check
  check (experience_years >= 0);

alter table if exists public.profiles
  add column if not exists focus_area text;

alter table if exists public.profiles
  add column if not exists summary text;

alter table if exists public.profiles
  add column if not exists skills text[] not null default '{}';

alter table if exists public.profiles
  add column if not exists career_journey jsonb not null default '[]'::jsonb;

alter table if exists public.profiles
  add column if not exists email text;

alter table if exists public.profiles
  add column if not exists image_alt text;

alter table if exists public.profiles
  add column if not exists current_employer text;

create index if not exists profiles_slug_idx on public.profiles (slug);
create index if not exists profiles_account_type_idx on public.profiles (account_type);
create index if not exists profiles_visibility_idx on public.profiles (visibility);
create index if not exists profiles_is_published_idx on public.profiles (is_published);

notify pgrst, 'reload schema';
