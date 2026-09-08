create or replace function public.delete_my_employer_notifications()
returns table (
  success boolean,
  deleted_count bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_deleted_count bigint := 0;
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.user_id = v_uid
      and p.account_type = 'employer'
  ) then
    raise exception 'wrong_account_type' using errcode = '42501';
  end if;

  delete from public.notifications n
  where n.recipient_user_id = v_uid;

  get diagnostics v_deleted_count = row_count;

  return query select true, v_deleted_count;
end
$$;

revoke all on function public.delete_my_employer_notifications() from public, anon;
grant execute on function public.delete_my_employer_notifications() to authenticated;