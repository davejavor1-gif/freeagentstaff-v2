begin;

-- Durable evidence of Terms & Conditions / Privacy Policy acceptance at signup time.
-- Nullable: existing accounts have no historical acceptance record and are not backfilled.
alter table public.profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists privacy_acknowledged_at timestamptz,
  add column if not exists privacy_version text;

commit;
