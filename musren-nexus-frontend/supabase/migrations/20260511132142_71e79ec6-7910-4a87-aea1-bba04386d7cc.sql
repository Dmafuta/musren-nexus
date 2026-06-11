
-- Enums
create type public.affiliate_event_kind as enum ('click','signup','purchase');
create type public.loyalty_rate_kind as enum ('cash','airtime','data');
create type public.withdrawal_method as enum ('mpesa','airtime','data');
create type public.withdrawal_status as enum ('pending','approved','rejected','paid','failed');
create type public.ledger_kind as enum ('earn','redeem','payout','adjust','refund');

-- =========== Reward rules (per product slug) ===========
create table public.affiliate_reward_rules (
  id uuid primary key default gen_random_uuid(),
  product_slug text not null unique,
  click_points int not null default 0 check (click_points >= 0),
  signup_points int not null default 0 check (signup_points >= 0),
  purchase_points int not null default 0 check (purchase_points >= 0),
  revenue_share_bps int not null default 0 check (revenue_share_bps between 0 and 10000),
  max_daily_points int,
  referral_cap int,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.affiliate_reward_rules enable row level security;
create policy "anyone authed can read active rules" on public.affiliate_reward_rules
  for select to authenticated using (active or has_role(auth.uid(),'admin') or has_role(auth.uid(),'staff'));
create policy "admins manage rules" on public.affiliate_reward_rules
  for all to authenticated using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));
create trigger trg_affiliate_reward_rules_updated before update on public.affiliate_reward_rules
  for each row execute function public.tg_set_updated_at();

-- =========== Promotions ===========
create table public.affiliate_promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  multiplier numeric(6,2) not null default 1.0 check (multiplier >= 0 and multiplier <= 100),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  active boolean not null default true,
  public_visible boolean not null default true,
  notify_affiliates boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.affiliate_promotions enable row level security;
create policy "public visible active promotions readable" on public.affiliate_promotions
  for select to authenticated using (
    (active and public_visible and (ends_at is null or ends_at > now()))
    or has_role(auth.uid(),'admin') or has_role(auth.uid(),'staff')
  );
create policy "admins manage promotions" on public.affiliate_promotions
  for all to authenticated using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));
create trigger trg_affiliate_promotions_updated before update on public.affiliate_promotions
  for each row execute function public.tg_set_updated_at();

create table public.promotion_products (
  promotion_id uuid not null references public.affiliate_promotions(id) on delete cascade,
  product_slug text not null,
  primary key (promotion_id, product_slug)
);
alter table public.promotion_products enable row level security;
create policy "read promotion products if promotion readable" on public.promotion_products
  for select to authenticated using (
    exists (select 1 from public.affiliate_promotions p where p.id = promotion_id
      and ((p.active and p.public_visible and (p.ends_at is null or p.ends_at > now()))
           or has_role(auth.uid(),'admin') or has_role(auth.uid(),'staff')))
  );
create policy "admins manage promotion products" on public.promotion_products
  for all to authenticated using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));

-- =========== Loyalty exchange rates ===========
create table public.loyalty_exchange_rates (
  id uuid primary key default gen_random_uuid(),
  kind public.loyalty_rate_kind not null,
  points int not null check (points > 0),
  -- value: cents for cash/airtime, MB for data
  value_amount int not null check (value_amount > 0),
  active boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.loyalty_exchange_rates enable row level security;
create policy "anyone authed reads active rates" on public.loyalty_exchange_rates
  for select to authenticated using (
    (active and starts_at <= now() and (ends_at is null or ends_at > now()))
    or has_role(auth.uid(),'admin') or has_role(auth.uid(),'staff')
  );
create policy "admins manage exchange rates" on public.loyalty_exchange_rates
  for all to authenticated using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));
create trigger trg_loyalty_rates_updated before update on public.loyalty_exchange_rates
  for each row execute function public.tg_set_updated_at();

-- =========== Referral codes ===========
create table public.affiliate_referral_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  code text not null unique check (length(code) between 3 and 32 and code ~ '^[a-zA-Z0-9_-]+$'),
  product_slug text,
  label text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.affiliate_referral_codes(user_id);
alter table public.affiliate_referral_codes enable row level security;
create policy "owner reads codes" on public.affiliate_referral_codes
  for select to authenticated using (user_id = auth.uid() or has_role(auth.uid(),'admin') or has_role(auth.uid(),'staff'));
create policy "owner inserts code" on public.affiliate_referral_codes
  for insert to authenticated with check (user_id = auth.uid() and has_role(auth.uid(),'affiliate'));
create policy "owner updates code" on public.affiliate_referral_codes
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "admins delete codes" on public.affiliate_referral_codes
  for delete to authenticated using (has_role(auth.uid(),'admin'));

-- =========== Events ===========
create table public.affiliate_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  code text not null,
  kind public.affiliate_event_kind not null,
  product_slug text,
  ip_hash text,
  ua_hash text,
  revenue_cents int not null default 0 check (revenue_cents >= 0),
  points_awarded int not null default 0 check (points_awarded >= 0),
  promotion_id uuid,
  multiplier_applied numeric(6,2) not null default 1.0,
  occurred_at timestamptz not null default now()
);
create index on public.affiliate_events(user_id, occurred_at desc);
create index on public.affiliate_events(code);
create index on public.affiliate_events(kind, occurred_at);
alter table public.affiliate_events enable row level security;
create policy "owner reads events" on public.affiliate_events
  for select to authenticated using (user_id = auth.uid() or has_role(auth.uid(),'admin') or has_role(auth.uid(),'staff'));
create policy "admins delete events" on public.affiliate_events
  for delete to authenticated using (has_role(auth.uid(),'admin'));

-- =========== Wallets + ledger ===========
create table public.affiliate_wallets (
  user_id uuid primary key,
  balance_points int not null default 0 check (balance_points >= 0),
  pending_points int not null default 0 check (pending_points >= 0),
  lifetime_points int not null default 0 check (lifetime_points >= 0),
  balance_cash_cents int not null default 0 check (balance_cash_cents >= 0),
  updated_at timestamptz not null default now()
);
alter table public.affiliate_wallets enable row level security;
create policy "owner reads wallet" on public.affiliate_wallets
  for select to authenticated using (user_id = auth.uid() or has_role(auth.uid(),'admin') or has_role(auth.uid(),'staff'));
create trigger trg_affiliate_wallets_updated before update on public.affiliate_wallets
  for each row execute function public.tg_set_updated_at();

create table public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind public.ledger_kind not null,
  points_delta int not null default 0,
  cash_delta_cents int not null default 0,
  ref_event_id uuid,
  ref_withdrawal_id uuid,
  note text,
  created_at timestamptz not null default now()
);
create index on public.wallet_ledger(user_id, created_at desc);
alter table public.wallet_ledger enable row level security;
create policy "owner reads ledger" on public.wallet_ledger
  for select to authenticated using (user_id = auth.uid() or has_role(auth.uid(),'admin') or has_role(auth.uid(),'staff'));

-- =========== Withdrawal rules + treasury ===========
create table public.withdrawal_rules (
  id int primary key default 1 check (id = 1),
  min_points int not null default 1000 check (min_points > 0),
  daily_limit_points int not null default 50000 check (daily_limit_points > 0),
  auto_approve boolean not null default false,
  cooldown_minutes int not null default 60 check (cooldown_minutes >= 0),
  updated_at timestamptz not null default now()
);
insert into public.withdrawal_rules (id) values (1) on conflict do nothing;
alter table public.withdrawal_rules enable row level security;
create policy "anyone authed reads rules" on public.withdrawal_rules for select to authenticated using (true);
create policy "admins update rules" on public.withdrawal_rules
  for all to authenticated using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));
create trigger trg_withdrawal_rules_updated before update on public.withdrawal_rules
  for each row execute function public.tg_set_updated_at();

create table public.admin_treasury (
  id int primary key default 1 check (id = 1),
  balance_cash_cents bigint not null default 0 check (balance_cash_cents >= 0),
  updated_at timestamptz not null default now()
);
insert into public.admin_treasury (id) values (1) on conflict do nothing;
alter table public.admin_treasury enable row level security;
create policy "admins read treasury" on public.admin_treasury
  for select to authenticated using (has_role(auth.uid(),'admin') or has_role(auth.uid(),'staff'));
create policy "admins update treasury" on public.admin_treasury
  for all to authenticated using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));
create trigger trg_admin_treasury_updated before update on public.admin_treasury
  for each row execute function public.tg_set_updated_at();

-- =========== Withdrawal requests ===========
create table public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  method public.withdrawal_method not null,
  amount_points int not null check (amount_points > 0),
  amount_value int not null check (amount_value > 0), -- cents or MB
  destination text, -- e.g. msisdn
  status public.withdrawal_status not null default 'pending',
  payout_ref text,
  reviewer_id uuid,
  reviewer_notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.withdrawal_requests(user_id, created_at desc);
create index on public.withdrawal_requests(status);
alter table public.withdrawal_requests enable row level security;
create policy "owner reads withdrawals" on public.withdrawal_requests
  for select to authenticated using (user_id = auth.uid() or has_role(auth.uid(),'admin') or has_role(auth.uid(),'staff'));
create trigger trg_withdrawal_requests_updated before update on public.withdrawal_requests
  for each row execute function public.tg_set_updated_at();

-- =========== Notifications ===========
create table public.affiliate_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null,
  title text not null,
  body text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.affiliate_notifications(user_id, created_at desc);
alter table public.affiliate_notifications enable row level security;
create policy "owner reads notifications" on public.affiliate_notifications
  for select to authenticated using (user_id = auth.uid() or has_role(auth.uid(),'admin'));
create policy "owner updates notifications" on public.affiliate_notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =========== Helper: get active loyalty rate ===========
create or replace function public.get_active_loyalty_rate(_kind public.loyalty_rate_kind)
returns table(points int, value_amount int, label text)
language sql stable security definer set search_path = public as $$
  select points, value_amount, label
  from public.loyalty_exchange_rates
  where kind = _kind and active
    and starts_at <= now() and (ends_at is null or ends_at > now())
  order by starts_at desc limit 1
$$;

-- =========== Track event ===========
create or replace function public.affiliate_track_event(
  _code text,
  _kind public.affiliate_event_kind,
  _product_slug text,
  _ip_hash text,
  _ua_hash text,
  _revenue_cents int default 0
) returns uuid
language plpgsql security definer set search_path = public as $$
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

  -- click dedupe: same code+ip+ua+kind within last hour
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

  -- find best active promotion that includes this product
  select p.id, p.multiplier into v_promo_id, v_mult
  from public.affiliate_promotions p
  left join public.promotion_products pp on pp.promotion_id = p.id
  where p.active and p.starts_at <= now() and (p.ends_at is null or p.ends_at > now())
    and (pp.product_slug = _product_slug or not exists (
      select 1 from public.promotion_products where promotion_id = p.id))
  order by p.multiplier desc limit 1;

  if v_mult is null then v_mult := 1.0; end if;
  v_award := floor(v_base * v_mult)::int;

  -- daily cap
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

  insert into public.affiliate_events(user_id, code, kind, product_slug, ip_hash, ua_hash, revenue_cents, points_awarded, promotion_id, multiplier_applied)
  values (v_user, _code, _kind, _product_slug, _ip_hash, _ua_hash, coalesce(_revenue_cents,0), v_award, v_promo_id, v_mult)
  returning id into v_event_id;

  if v_award > 0 then
    insert into public.affiliate_wallets(user_id, balance_points, lifetime_points)
      values (v_user, v_award, v_award)
      on conflict (user_id) do update
        set balance_points = public.affiliate_wallets.balance_points + v_award,
            lifetime_points = public.affiliate_wallets.lifetime_points + v_award,
            updated_at = now();
    insert into public.wallet_ledger(user_id, kind, points_delta, ref_event_id, note)
      values (v_user, 'earn', v_award, v_event_id, _kind::text || coalesce(' • '||_product_slug,''));
  end if;

  return v_event_id;
end $$;

-- Allow anonymous tracking via the public referral redirect
grant execute on function public.affiliate_track_event(text, public.affiliate_event_kind, text, text, text, int) to anon, authenticated;
grant execute on function public.get_active_loyalty_rate(public.loyalty_rate_kind) to anon, authenticated;

-- =========== Withdrawal request ===========
create or replace function public.affiliate_request_withdrawal(
  _method public.withdrawal_method,
  _amount_points int,
  _destination text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_rules public.withdrawal_rules%rowtype;
  v_wallet public.affiliate_wallets%rowtype;
  v_kind public.loyalty_rate_kind;
  v_rate record;
  v_value int;
  v_today int;
  v_last timestamptz;
  v_id uuid;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if not public.has_role(v_user, 'affiliate') then raise exception 'affiliate role required'; end if;

  select * into v_rules from public.withdrawal_rules where id = 1;
  if _amount_points < v_rules.min_points then
    raise exception 'minimum withdrawal is % points', v_rules.min_points;
  end if;

  select * into v_wallet from public.affiliate_wallets where user_id = v_user for update;
  if v_wallet.user_id is null or v_wallet.balance_points < _amount_points then
    raise exception 'insufficient points balance';
  end if;

  select created_at into v_last from public.withdrawal_requests
    where user_id = v_user order by created_at desc limit 1;
  if v_last is not null and v_last > now() - make_interval(mins => v_rules.cooldown_minutes) then
    raise exception 'cooldown active, try again later';
  end if;

  select coalesce(sum(amount_points),0) into v_today from public.withdrawal_requests
    where user_id = v_user and created_at > date_trunc('day', now())
      and status not in ('rejected','failed');
  if v_today + _amount_points > v_rules.daily_limit_points then
    raise exception 'daily withdrawal limit exceeded';
  end if;

  v_kind := case _method when 'mpesa' then 'cash'::public.loyalty_rate_kind
                         when 'airtime' then 'airtime'::public.loyalty_rate_kind
                         when 'data' then 'data'::public.loyalty_rate_kind end;
  select * into v_rate from public.get_active_loyalty_rate(v_kind);
  if v_rate.points is null then raise exception 'no active exchange rate for %', _method; end if;
  v_value := floor((_amount_points::numeric / v_rate.points) * v_rate.value_amount)::int;
  if v_value <= 0 then raise exception 'amount too small for current rate'; end if;

  -- deduct points immediately, hold as pending
  update public.affiliate_wallets
    set balance_points = balance_points - _amount_points,
        pending_points = pending_points + _amount_points,
        updated_at = now()
    where user_id = v_user;
  insert into public.wallet_ledger(user_id, kind, points_delta, note)
    values (v_user, 'redeem', -_amount_points, 'withdrawal hold • '||_method::text);

  insert into public.withdrawal_requests(user_id, method, amount_points, amount_value, destination,
    status)
    values (v_user, _method, _amount_points, v_value, _destination,
      case when v_rules.auto_approve then 'approved'::public.withdrawal_status else 'pending' end)
    returning id into v_id;

  insert into public.affiliate_notifications(user_id, type, title, body)
    values (v_user, 'withdrawal_submitted', 'Withdrawal submitted',
            format('Your %s withdrawal for %s points is %s.', _method, _amount_points,
              case when v_rules.auto_approve then 'auto-approved' else 'pending review' end));
  return v_id;
end $$;
grant execute on function public.affiliate_request_withdrawal(public.withdrawal_method, int, text) to authenticated;

-- =========== Approve / reject withdrawal ===========
create or replace function public.affiliate_approve_withdrawal(_id uuid, _payout_ref text)
returns void language plpgsql security definer set search_path = public as $$
declare v_w public.withdrawal_requests%rowtype; begin
  if not (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'staff')) then
    raise exception 'not authorized'; end if;
  select * into v_w from public.withdrawal_requests where id = _id for update;
  if v_w.id is null then raise exception 'not found'; end if;
  if v_w.status not in ('pending','approved') then raise exception 'request not approvable'; end if;

  -- clear pending hold, debit treasury (cash methods only)
  update public.affiliate_wallets set pending_points = greatest(pending_points - v_w.amount_points, 0),
                                      updated_at = now()
    where user_id = v_w.user_id;
  if v_w.method = 'mpesa' then
    update public.admin_treasury set balance_cash_cents = balance_cash_cents - v_w.amount_value,
                                     updated_at = now() where id = 1;
  end if;
  insert into public.wallet_ledger(user_id, kind, points_delta, cash_delta_cents, ref_withdrawal_id, note)
    values (v_w.user_id, 'payout', 0,
      case when v_w.method='mpesa' then -v_w.amount_value else 0 end,
      v_w.id, 'payout • '||v_w.method::text);

  update public.withdrawal_requests
    set status = 'paid', payout_ref = _payout_ref, reviewer_id = auth.uid(), reviewed_at = now(),
        updated_at = now()
    where id = _id;
  insert into public.affiliate_notifications(user_id, type, title, body)
    values (v_w.user_id, 'withdrawal_paid', 'Withdrawal paid',
            format('Your %s withdrawal was paid. Reference: %s', v_w.method, coalesce(_payout_ref,'-')));
end $$;
grant execute on function public.affiliate_approve_withdrawal(uuid, text) to authenticated;

create or replace function public.affiliate_reject_withdrawal(_id uuid, _reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v_w public.withdrawal_requests%rowtype; begin
  if not (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'staff')) then
    raise exception 'not authorized'; end if;
  select * into v_w from public.withdrawal_requests where id = _id for update;
  if v_w.id is null then raise exception 'not found'; end if;
  if v_w.status not in ('pending','approved') then raise exception 'request not rejectable'; end if;

  -- refund pending to balance
  update public.affiliate_wallets
    set pending_points = greatest(pending_points - v_w.amount_points, 0),
        balance_points = balance_points + v_w.amount_points,
        updated_at = now()
    where user_id = v_w.user_id;
  insert into public.wallet_ledger(user_id, kind, points_delta, ref_withdrawal_id, note)
    values (v_w.user_id, 'refund', v_w.amount_points, v_w.id, 'rejected: '||coalesce(_reason,''));

  update public.withdrawal_requests
    set status = 'rejected', reviewer_id = auth.uid(), reviewer_notes = _reason,
        reviewed_at = now(), updated_at = now()
    where id = _id;
  insert into public.affiliate_notifications(user_id, type, title, body)
    values (v_w.user_id, 'withdrawal_rejected', 'Withdrawal rejected',
            coalesce(_reason,'Your withdrawal was rejected.'));
end $$;
grant execute on function public.affiliate_reject_withdrawal(uuid, text) to authenticated;

-- =========== Weekly leaderboard (admin/staff only) ===========
create or replace function public.affiliate_leaderboard_weekly()
returns table(user_id uuid, clicks bigint, signups bigint, purchases bigint, points bigint, revenue_cents bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'staff')) then
    raise exception 'not authorized'; end if;
  return query
  select e.user_id,
         count(*) filter (where e.kind='click')::bigint,
         count(*) filter (where e.kind='signup')::bigint,
         count(*) filter (where e.kind='purchase')::bigint,
         coalesce(sum(e.points_awarded),0)::bigint,
         coalesce(sum(e.revenue_cents),0)::bigint
  from public.affiliate_events e
  where e.occurred_at > now() - interval '7 days'
  group by e.user_id
  order by 5 desc, 4 desc;
end $$;
grant execute on function public.affiliate_leaderboard_weekly() to authenticated;

-- =========== Auto-create wallet when affiliate role granted ===========
create or replace function public.tg_init_affiliate_wallet()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'affiliate' then
    insert into public.affiliate_wallets(user_id) values (new.user_id) on conflict do nothing;
  end if;
  return new;
end $$;
create trigger trg_user_roles_init_wallet
  after insert on public.user_roles
  for each row execute function public.tg_init_affiliate_wallet();

-- Backfill wallets for existing affiliates
insert into public.affiliate_wallets(user_id)
  select user_id from public.user_roles where role = 'affiliate'
  on conflict do nothing;

-- Sensible defaults so the engine works out of the box
insert into public.loyalty_exchange_rates(kind, points, value_amount, label) values
  ('cash', 100, 1000, 'Standard: 100 pts = KES 10'),
  ('airtime', 100, 1000, 'Standard: 100 pts = KES 10 airtime'),
  ('data', 500, 1024, 'Standard: 500 pts = 1 GB');

insert into public.affiliate_reward_rules(product_slug, click_points, signup_points, purchase_points, max_daily_points) values
  ('bulk-sms', 2, 20, 120, 5000),
  ('ussd', 1, 10, 250, 5000),
  ('whatsapp', 5, 40, 500, 5000),
  ('shortcodes', 2, 15, 150, 5000),
  ('loyalty', 3, 25, 200, 5000),
  ('corporate-topup', 4, 30, 400, 5000);
