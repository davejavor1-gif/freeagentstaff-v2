begin;

-- 1) Base-table privileges
revoke all privileges on table public.profiles from anon;

revoke delete, references, trigger, truncate on table public.profiles from authenticated;
grant select, insert, update on table public.profiles to authenticated;

-- Preserve service_role privileges.
grant select, insert, update, delete, references, trigger, truncate on table public.profiles to service_role;

-- 2) RLS policies (explicit authenticated scope)
drop policy if exists "Users can select their own profile" on public.profiles;
create policy "Users can select their own profile" on public.profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DELETE is not a supported product flow, so do not allow it for authenticated.
drop policy if exists "Users can delete their own profile" on public.profiles;

commit;
