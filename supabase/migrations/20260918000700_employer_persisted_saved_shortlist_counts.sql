-- Count-only saved Talent / shortlist totals for verified Employers without current discovery.
-- Identity-authorized (ABN or ACN). Does not hydrate Talent, grant discovery, or require a subscription.

create or replace function public.employer_persisted_saved_shortlist_counts()
returns table (
  saved_talent_count bigint,
  active_shortlist_count bigint
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := public.require_verified_employer_identity();
begin
  return query
  select
    (
      select count(*)::bigint
      from public.employer_saved_talent s
      where s.employer_user_id = v_uid
    ) as saved_talent_count,
    (
      select count(*)::bigint
      from public.employer_shortlists sl
      where sl.employer_user_id = v_uid
        and exists (
          select 1
          from public.employer_shortlist_members m
          where m.shortlist_id = sl.id
            and m.employer_user_id = v_uid
        )
    ) as active_shortlist_count;
end
$$;

revoke all on function public.employer_persisted_saved_shortlist_counts() from public, anon, authenticated, service_role;
grant execute on function public.employer_persisted_saved_shortlist_counts() to authenticated;
