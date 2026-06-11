DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'profile_role') THEN
    CREATE TYPE public.profile_role AS ENUM ('customer', 'affiliate', 'merchant', 'developer');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text NOT NULL,
  role public.profile_role,
  role_selected boolean NOT NULL DEFAULT false,
  auth_verified boolean NOT NULL DEFAULT false,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_role_selected_requires_role CHECK ((role_selected = false) OR (role IS NOT NULL)),
  CONSTRAINT profiles_onboarding_requires_role CHECK ((onboarding_completed = false) OR (role_selected = true))
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins read profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Users create own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own onboarding profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role_selected ON public.profiles(role_selected);

CREATE OR REPLACE FUNCTION public.ensure_user_profile(_email text DEFAULT NULL)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_profile public.profiles;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.profiles (user_id, email, auth_verified)
  VALUES (v_user, COALESCE(_email, ''), true)
  ON CONFLICT (user_id) DO UPDATE
    SET email = COALESCE(NULLIF(EXCLUDED.email, ''), public.profiles.email),
        auth_verified = true,
        updated_at = now()
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_onboarding(_role public.profile_role, _email text DEFAULT NULL)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_profile public.profiles;
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

  IF _role = 'developer' THEN
    INSERT INTO public.user_roles(user_id, role)
    VALUES (v_user, 'developer')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSIF _role = 'affiliate' THEN
    INSERT INTO public.user_roles(user_id, role)
    VALUES (v_user, 'affiliate')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN v_profile;
END;
$$;