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
  employer_company_name text,
  employer_abn text,
  employer_website text,
  employer_industry text,
  employer_company_size text,
  employer_verification_status text not null default 'unverified' check (employer_verification_status in ('unverified', 'pending', 'verified', 'rejected')),
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
