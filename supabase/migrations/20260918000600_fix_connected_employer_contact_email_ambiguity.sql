-- Qualify profiles.email so it is not ambiguous with the RETURNS TABLE email column.
create or replace function public.talent_contact_for_connected_employer(p_talent_slug text)
returns table (talent_slug text, email text)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := public.require_verified_employer_identity();
  v_talent uuid;
  v_email text;
begin
  select p.user_id, coalesce(nullif(btrim(p.contact_email), ''), nullif(btrim(p.email), ''))
  into v_talent, v_email
  from public.profiles p
  where p.account_type = 'talent' and p.slug = p_talent_slug;

  if v_talent is null
    or not exists (
      select 1 from public.employer_talent_connections c
      where c.employer_user_id = v_uid
        and c.talent_user_id = v_talent
        and c.status = 'active'
    )
    or not public.employer_can_access_talent(v_uid, p_talent_slug) then
    raise exception 'contact_unavailable' using errcode = '42501';
  end if;

  return query select p_talent_slug, v_email;
end
$$;

revoke all on function public.talent_contact_for_connected_employer(text) from public, anon;
grant execute on function public.talent_contact_for_connected_employer(text) to authenticated;
