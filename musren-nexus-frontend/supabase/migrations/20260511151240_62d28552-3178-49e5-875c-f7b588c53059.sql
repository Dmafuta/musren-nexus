CREATE OR REPLACE FUNCTION public.has_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE role = 'superadmin'::public.app_role
  );
$$;

REVOKE EXECUTE ON FUNCTION public.has_superadmin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_superadmin() TO authenticated;