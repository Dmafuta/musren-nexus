
DO $$ BEGIN
  CREATE TYPE public.role_request_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.role_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  requested_role public.app_role NOT NULL,
  status public.role_request_status NOT NULL DEFAULT 'pending',
  message text,
  reviewer_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS role_requests_one_pending_per_role
  ON public.role_requests (user_id, requested_role)
  WHERE status = 'pending';

ALTER TABLE public.role_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users insert own request" ON public.role_requests;
CREATE POLICY "users insert own request" ON public.role_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND requested_role IN ('developer','affiliate')
  );

DROP POLICY IF EXISTS "users read own requests" ON public.role_requests;
CREATE POLICY "users read own requests" ON public.role_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "staff read all requests" ON public.role_requests;
CREATE POLICY "staff read all requests" ON public.role_requests
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));

DROP POLICY IF EXISTS "staff update requests" ON public.role_requests;
CREATE POLICY "staff update requests" ON public.role_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));

DROP POLICY IF EXISTS "admins delete requests" ON public.role_requests;
CREATE POLICY "admins delete requests" ON public.role_requests
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

DROP TRIGGER IF EXISTS role_requests_set_updated_at ON public.role_requests;
CREATE TRIGGER role_requests_set_updated_at
  BEFORE UPDATE ON public.role_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- When a request is approved, grant the role
CREATE OR REPLACE FUNCTION public.tg_role_request_grant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, NEW.requested_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    NEW.reviewed_at := COALESCE(NEW.reviewed_at, now());
    NEW.reviewed_by := COALESCE(NEW.reviewed_by, auth.uid());
  ELSIF NEW.status = 'rejected' AND (OLD.status IS DISTINCT FROM 'rejected') THEN
    NEW.reviewed_at := COALESCE(NEW.reviewed_at, now());
    NEW.reviewed_by := COALESCE(NEW.reviewed_by, auth.uid());
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS role_requests_grant ON public.role_requests;
CREATE TRIGGER role_requests_grant
  BEFORE UPDATE ON public.role_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_role_request_grant();

-- Need unique constraint on user_roles for ON CONFLICT
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_id_role_key
  ON public.user_roles (user_id, role);
