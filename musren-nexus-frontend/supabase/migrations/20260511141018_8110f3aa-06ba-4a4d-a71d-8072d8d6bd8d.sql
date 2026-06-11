DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'customer'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'customer';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'merchant'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'merchant';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.complete_onboarding(_role public.profile_role, _email text DEFAULT NULL)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_profile public.profiles;
  v_app_role public.app_role;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.profiles (user_id, email, role, role_selected, auth_verified, onboarding_completed)
  VALUES (v_user, COALESCE(_email, ''), _role, true, true, true)
  ON CONFLICT (user_id) DO UPDATE
    SET role = CASE
        WHEN public.profiles.role_selected THEN public.profiles.role
        ELSE EXCLUDED.role
      END,
      role_selected = true,
      auth_verified = true,
      onboarding_completed = true,
      email = COALESCE(NULLIF(EXCLUDED.email, ''), public.profiles.email),
      updated_at = now()
  RETURNING * INTO v_profile;

  v_app_role := v_profile.role::text::public.app_role;

  INSERT INTO public.user_roles(user_id, role)
  VALUES (v_user, v_app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN v_profile;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_onboarding(public.profile_role, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.complete_onboarding(public.profile_role, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_onboarding(public.profile_role, text) TO authenticated;