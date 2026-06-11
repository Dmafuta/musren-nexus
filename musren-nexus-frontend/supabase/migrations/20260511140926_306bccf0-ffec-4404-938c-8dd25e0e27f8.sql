REVOKE EXECUTE ON FUNCTION public.ensure_user_profile(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ensure_user_profile(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.complete_onboarding(public.profile_role, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.complete_onboarding(public.profile_role, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_onboarding(public.profile_role, text) TO authenticated;