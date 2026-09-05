begin;

-- Extend blocked-company identifier normalization to support ACN in addition to ABN,
-- domain, and free-text company name. Historical blocked_companies entries (abn:, domain:,
-- name: prefixed keys) are unaffected and continue to match exactly as before.
create or replace function public.normalize_blocked_company_identifier(
  p_identifier text
)
returns text
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  v_identifier text := btrim(coalesce(p_identifier, ''));
  v_normalized_abn text;
  v_normalized_acn text;
  v_host_name text;
  v_company_name text;
  v_has_explicit_type boolean := false;
begin
  if v_identifier = '' then
    return null;
  end if;

  if lower(v_identifier) like 'abn:%' then
    v_identifier := btrim(substring(v_identifier from 5));
    v_has_explicit_type := true;
    v_normalized_abn := public.normalized_abn(v_identifier);
    return case when v_normalized_abn is not null then 'abn:' || v_normalized_abn else null end;
  elsif lower(v_identifier) like 'acn:%' then
    v_identifier := btrim(substring(v_identifier from 5));
    v_has_explicit_type := true;
    v_normalized_acn := public.normalized_acn(v_identifier);
    return case when v_normalized_acn is not null then 'acn:' || v_normalized_acn else null end;
  elsif lower(v_identifier) like 'domain:%' then
    v_identifier := btrim(substring(v_identifier from 8));
  elsif lower(v_identifier) like 'name:%' then
    v_identifier := btrim(substring(v_identifier from 6));
  end if;

  if not v_has_explicit_type then
    v_normalized_abn := public.normalized_abn(v_identifier);
    if v_normalized_abn is not null then
      return 'abn:' || v_normalized_abn;
    end if;

    v_normalized_acn := public.normalized_acn(v_identifier);
    if v_normalized_acn is not null then
      return 'acn:' || v_normalized_acn;
    end if;
  end if;

  v_host_name := nullif(
    lower(
      regexp_replace(
        regexp_replace(v_identifier, '^https?://', ''),
        '/.*$',
        ''
      )
    ),
    ''
  );

  if v_host_name is not null and v_host_name ~ '^[a-z0-9.-]+\.[a-z]{2,}$' then
    return 'domain:' || v_host_name;
  end if;

  v_company_name := nullif(
    lower(
      regexp_replace(trim(v_identifier), '\s+', ' ', 'g')
    ),
    ''
  );

  if v_company_name is null then
    return null;
  end if;

  return 'name:' || v_company_name;
end
$$;

revoke all on function public.normalize_blocked_company_identifier(text) from public, anon, authenticated, service_role;

commit;
