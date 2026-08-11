revoke all on function public.normalize_profile_visibility(text) from anon, authenticated, service_role, public;
revoke all on function public.normalized_abn(text) from anon, authenticated, service_role, public;
revoke all on function public.company_identity_keys(text, text, text) from anon, authenticated, service_role, public;
revoke all on function public.current_viewer_profile_context() from anon, authenticated, service_role, public;

revoke all on function public.discovery_profiles_for_verified_employer() from anon, public;
revoke all on function public.talent_passport_for_viewer(text) from anon, public;

grant execute on function public.discovery_profiles_for_verified_employer() to authenticated;
grant execute on function public.talent_passport_for_viewer(text) to authenticated;
