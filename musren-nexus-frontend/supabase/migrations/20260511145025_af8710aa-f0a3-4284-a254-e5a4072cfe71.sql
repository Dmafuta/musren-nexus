
-- enums
DO $$ BEGIN
  CREATE TYPE public.share_channel AS ENUM ('whatsapp','sms','email','facebook','instagram','tiktok','x','telegram','copy');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.product_asset_kind AS ENUM ('poster','logo','video','sms_template','whatsapp_template','email_copy','social_caption','script','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- product_assets
CREATE TABLE IF NOT EXISTS public.product_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_slug text NOT NULL,
  kind public.product_asset_kind NOT NULL,
  title text NOT NULL,
  file_url text,
  body_text text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone authed reads active assets" ON public.product_assets
  FOR SELECT TO authenticated
  USING (active OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));

CREATE POLICY "admins manage assets" ON public.product_assets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER product_assets_updated_at BEFORE UPDATE ON public.product_assets
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_product_assets_product ON public.product_assets(product_slug, active);

-- share_templates
CREATE TABLE IF NOT EXISTS public.share_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_slug text NOT NULL,
  channel public.share_channel NOT NULL,
  body text NOT NULL,
  cta text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_slug, channel)
);
ALTER TABLE public.share_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone authed reads active templates" ON public.share_templates
  FOR SELECT TO authenticated
  USING (active OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));

CREATE POLICY "admins manage templates" ON public.share_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER share_templates_updated_at BEFORE UPDATE ON public.share_templates
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- affiliate_shares
CREATE TABLE IF NOT EXISTS public.affiliate_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL,
  product_slug text,
  channel public.share_channel NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliate_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner inserts share" ON public.affiliate_shares
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "owner reads shares" ON public.affiliate_shares
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));

CREATE INDEX IF NOT EXISTS idx_aff_shares_user ON public.affiliate_shares(user_id, occurred_at DESC);

-- channel column on events
ALTER TABLE public.affiliate_events
  ADD COLUMN IF NOT EXISTS channel public.share_channel;

-- update tracker rpc to accept channel
CREATE OR REPLACE FUNCTION public.affiliate_track_event(
  _code text,
  _kind affiliate_event_kind,
  _product_slug text,
  _ip_hash text,
  _ua_hash text,
  _revenue_cents integer DEFAULT 0,
  _channel public.share_channel DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
declare
  v_user uuid;
  v_rule public.affiliate_reward_rules%rowtype;
  v_promo_id uuid;
  v_mult numeric(6,2) := 1.0;
  v_base int := 0;
  v_award int := 0;
  v_event_id uuid;
  v_today_total int;
begin
  select user_id into v_user from public.affiliate_referral_codes
    where code = _code and active limit 1;
  if v_user is null then return null; end if;

  if _kind = 'click' and _ip_hash is not null then
    if exists (select 1 from public.affiliate_events
       where code = _code and kind = 'click' and ip_hash = _ip_hash
         and coalesce(ua_hash,'') = coalesce(_ua_hash,'')
         and occurred_at > now() - interval '1 hour') then
      return null;
    end if;
  end if;

  if _product_slug is not null then
    select * into v_rule from public.affiliate_reward_rules
      where product_slug = _product_slug and active limit 1;
  end if;

  if v_rule.id is not null then
    v_base := case _kind
      when 'click' then v_rule.click_points
      when 'signup' then v_rule.signup_points
      when 'purchase' then v_rule.purchase_points + (coalesce(_revenue_cents,0) * v_rule.revenue_share_bps / 10000)
    end;
  end if;

  select p.id, p.multiplier into v_promo_id, v_mult
  from public.affiliate_promotions p
  left join public.promotion_products pp on pp.promotion_id = p.id
  where p.active and p.starts_at <= now() and (p.ends_at is null or p.ends_at > now())
    and (pp.product_slug = _product_slug or not exists (
      select 1 from public.promotion_products where promotion_id = p.id))
  order by p.multiplier desc limit 1;

  if v_mult is null then v_mult := 1.0; end if;
  v_award := floor(v_base * v_mult)::int;

  if v_rule.id is not null and v_rule.max_daily_points is not null then
    select coalesce(sum(points_awarded),0) into v_today_total
    from public.affiliate_events
    where user_id = v_user and product_slug = _product_slug
      and occurred_at > date_trunc('day', now());
    if v_today_total >= v_rule.max_daily_points then
      v_award := 0;
    elsif v_today_total + v_award > v_rule.max_daily_points then
      v_award := v_rule.max_daily_points - v_today_total;
    end if;
  end if;

  insert into public.affiliate_events(user_id, code, kind, product_slug, ip_hash, ua_hash, revenue_cents, points_awarded, promotion_id, multiplier_applied, channel)
  values (v_user, _code, _kind, _product_slug, _ip_hash, _ua_hash, coalesce(_revenue_cents,0), v_award, v_promo_id, v_mult, _channel)
  returning id into v_event_id;

  if v_award > 0 then
    insert into public.affiliate_wallets(user_id, balance_points, lifetime_points)
      values (v_user, v_award, v_award)
      on conflict (user_id) do update
        set balance_points = public.affiliate_wallets.balance_points + v_award,
            lifetime_points = public.affiliate_wallets.lifetime_points + v_award,
            updated_at = now();
    insert into public.wallet_ledger(user_id, kind, points_delta, ref_event_id, note)
      values (v_user, 'earn', v_award, v_event_id, _kind::text || coalesce(' • '||_product_slug,'') || coalesce(' • '||_channel::text,''));
  end if;

  return v_event_id;
end $function$;

-- storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('affiliate-assets','affiliate-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read affiliate-assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'affiliate-assets');

CREATE POLICY "Admins write affiliate-assets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'affiliate-assets' AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins update affiliate-assets" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'affiliate-assets' AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins delete affiliate-assets" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'affiliate-assets' AND public.has_role(auth.uid(),'admin'));
