create extension if not exists unaccent with schema extensions;

create or replace function public.generate_profile_slug()
returns trigger
language plpgsql
set search_path = public, extensions, pg_temp
as $$
declare
  base_slug text;
  candidate text;
  suffix text;
  attempt integer := 0;
begin
  if new.slug is not null and btrim(new.slug) <> '' and not (tg_op = 'UPDATE' and old.slug = 'member') then
    return new;
  end if;

  base_slug := regexp_replace(lower(unaccent(coalesce(nullif(btrim(new.name), ''), 'member'))), '[^a-z0-9]+', '-', 'g');
  base_slug := regexp_replace(base_slug, '(^-+|-+$)', '', 'g');
  base_slug := left(coalesce(nullif(base_slug, ''), 'member'), 48);
  candidate := base_slug;

  while exists (select 1 from public.profiles p where p.slug = candidate and p.user_id <> new.user_id) loop
    attempt := attempt + 1;
    suffix := substr(md5(new.user_id::text || ':' || attempt::text), 1, 4);
    candidate := left(base_slug, 43) || '-' || suffix;
  end loop;

  new.slug := candidate;
  return new;
end
$$;

drop trigger if exists profiles_generate_slug on public.profiles;
create trigger profiles_generate_slug
before insert or update of slug, name on public.profiles
for each row execute function public.generate_profile_slug();

do $$
declare
  profile_row record;
  base_slug text;
  candidate text;
  suffix text;
  attempt integer;
begin
  for profile_row in
    select user_id, name
    from public.profiles
    where slug like 'freeaent-%'
      and nullif(btrim(name), '') is not null
  loop
    base_slug := regexp_replace(lower(extensions.unaccent(btrim(profile_row.name))), '[^a-z0-9]+', '-', 'g');
    base_slug := regexp_replace(base_slug, '(^-+|-+$)', '', 'g');
    base_slug := left(coalesce(nullif(base_slug, ''), 'member'), 48);
    candidate := base_slug;
    attempt := 0;

    while exists (select 1 from public.profiles p where p.slug = candidate and p.user_id <> profile_row.user_id) loop
      attempt := attempt + 1;
      suffix := substr(md5(profile_row.user_id::text || ':' || attempt::text), 1, 4);
      candidate := left(base_slug, 43) || '-' || suffix;
    end loop;

    update public.profiles set slug = candidate where user_id = profile_row.user_id;
  end loop;
end
$$;