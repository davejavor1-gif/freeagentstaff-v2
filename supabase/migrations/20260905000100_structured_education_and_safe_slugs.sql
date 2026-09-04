alter table public.profiles
  add column if not exists education_entries jsonb not null default '[]'::jsonb;

create or replace function public.generate_profile_slug()
returns trigger
language plpgsql
set search_path = public, extensions, pg_temp
as $$
declare
  base_slug text;
  candidate text;
  attempt integer := 1;
begin
  if new.slug is not null and btrim(new.slug) <> '' then
    return new;
  end if;

  base_slug := regexp_replace(lower(extensions.unaccent(coalesce(nullif(btrim(new.name), ''), 'member'))), '[^a-z0-9]+', '-', 'g');
  base_slug := regexp_replace(base_slug, '(^-+|-+$)', '', 'g');
  base_slug := left(coalesce(nullif(base_slug, ''), 'member'), 48);

  -- Serialize allocation for the same readable base so the unique index cannot race the check.
  perform pg_advisory_xact_lock(hashtextextended(base_slug, 0));

  candidate := base_slug;
  while exists (select 1 from public.profiles p where p.slug = candidate and p.user_id <> new.user_id) loop
    attempt := attempt + 1;
    candidate := left(base_slug, 48 - length('-' || attempt::text)) || '-' || attempt::text;
  end loop;

  new.slug := candidate;
  return new;
end
$$;

drop trigger if exists profiles_generate_slug on public.profiles;
create trigger profiles_generate_slug
before insert or update of slug, name on public.profiles
for each row execute function public.generate_profile_slug();