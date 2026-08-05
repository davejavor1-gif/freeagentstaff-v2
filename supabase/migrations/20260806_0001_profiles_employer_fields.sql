-- Sprint 11 baseline migration: employer account and verification fields on profiles
-- Safe to run multiple times.

alter table if exists public.profiles
  add column if not exists account_type text not null default 'talent';

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

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_account_type_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_account_type_check
      check (account_type in ('talent', 'employer'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_employer_verification_status_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_employer_verification_status_check
      check (employer_verification_status in ('unverified', 'pending', 'verified', 'rejected'));
  end if;
end $$;
