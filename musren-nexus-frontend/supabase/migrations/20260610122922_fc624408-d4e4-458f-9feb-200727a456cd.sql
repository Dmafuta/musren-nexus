
-- 1. Lock notification fields except `read`
CREATE OR REPLACE FUNCTION public.tg_affiliate_notifications_lock_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() = OLD.user_id AND NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff')) THEN
    NEW.user_id := OLD.user_id;
    NEW.type    := OLD.type;
    NEW.title   := OLD.title;
    NEW.body    := OLD.body;
    NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS affiliate_notifications_lock_fields ON public.affiliate_notifications;
CREATE TRIGGER affiliate_notifications_lock_fields
BEFORE UPDATE ON public.affiliate_notifications
FOR EACH ROW EXECUTE FUNCTION public.tg_affiliate_notifications_lock_fields();

-- 2. Require active affiliate role to update referral codes
DROP POLICY IF EXISTS "owner updates code" ON public.affiliate_referral_codes;
CREATE POLICY "owner updates code" ON public.affiliate_referral_codes
FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND public.has_role(auth.uid(),'affiliate'))
WITH CHECK (user_id = auth.uid() AND public.has_role(auth.uid(),'affiliate'));

-- 3. Require affiliate role to insert share events
DROP POLICY IF EXISTS "owner inserts share" ON public.affiliate_shares;
CREATE POLICY "owner inserts share" ON public.affiliate_shares
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.has_role(auth.uid(),'affiliate'));

-- 4. Restrict affiliate-assets bucket listing to admins (direct file URLs still work because bucket is public)
DROP POLICY IF EXISTS "Public read affiliate-assets" ON storage.objects;
CREATE POLICY "Admins list affiliate-assets" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'affiliate-assets' AND public.has_role(auth.uid(),'admin'));
