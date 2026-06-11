# Affiliate System v2 — Brand Assets, Multi-Channel Sharing & Admin Payouts

This builds on the affiliate tables you already have (`affiliate_referral_codes`, `affiliate_events`, `affiliate_wallets`, `withdrawal_requests`, `loyalty_exchange_rates`, `affiliate_promotions`). I'll extend — not replace — what's there. **Note:** the stack is TanStack Start (not Next.js), Tailwind, Supabase, RBAC — same outcome, correct framework.

Scope reduced to what the existing system is missing.

---

## 1. Database additions (migration)

New tables:
- `product_assets` — admin-uploaded posters / logos / videos / text snippets per product (`product_slug`, `kind`, `title`, `file_url`, `body_text`, `notes`, `active`)
- `share_templates` — per-product, per-channel default messages (`product_slug`, `channel` enum: whatsapp/sms/email/facebook/instagram/tiktok/x, `body`, `cta`, `active`)
- `affiliate_shares` — log every share click (`user_id`, `code`, `product_slug`, `channel`)
- Storage bucket `affiliate-assets` (public read, admin write) for posters/logos/videos

Updates to existing:
- Extend `affiliate_events.kind` enum with `channel` column already-trackable via new `channel` text column on `affiliate_events`
- Reward rules: keep existing `affiliate_reward_rules` but I'll set `purchase_points = 0` and ignore purchases per spec
- `withdrawal_rules` already supports min / cooldown / auto-approve / daily limit — surface in admin UI

RLS:
- Assets & templates: public read (active), admin write
- Shares: owner insert/read, admin read

## 2. Public click tracker upgrade

The existing `/api/public/r/$code` route will accept `?ch=whatsapp` etc. and pass channel to `affiliate_track_event` so channel performance is recorded.

## 3. Affiliate UI (new tab on `/affiliates/dashboard`)

Per-product **Promote** drawer:
- Unique referral link + Copy + QR code
- Asset gallery (download buttons)
- One-click share buttons (WhatsApp / SMS / Email / Facebook / X / Telegram / Copy) using the admin's share templates with the link auto-injected and `?ch=<channel>` appended
- Channel performance mini-stats (clicks, signups, conversion)

Wallet view already exists — I'll add cash equivalent + clearer payout history.

## 4. Admin pages (new under `/admin/`)

- `/admin/products-assets` — upload posters/logos/videos/text per product, manage active state
- `/admin/share-templates` — edit per-product per-channel message + CTA
- `/admin/reward-rules` — set click_points / signup_points per product (purchase fields hidden)
- `/admin/payouts` — full payout console:
  - Affiliate list with clicks / signups / points / cash equivalent
  - Approve / reject / mark paid (uses existing `affiliate_approve_withdrawal` / `affiliate_reject_withdrawal` RPCs)
  - Bulk approve top performers
  - Method tabs: M-Pesa cash / Airtime / Data bundles
  - Payout rules editor (min withdrawal, auto-approve, cooldown, daily limit, points→KES rate)
- `/admin/payout-history` — log of all withdrawals with filters

## 5. Payout providers

Architecture only — I'll define a server-side dispatcher (`payout.functions.ts`) with adapters for `mpesa_b2c`, `airtime`, `data_bundle`. Each adapter is a stub that:
- Currently records `payout_ref` manually entered by admin (works today)
- Has a clean place to plug in real Daraja / airtime API later via secrets

I will **not** wire real M-Pesa Daraja keys in this pass — that needs your sandbox credentials. I'll leave a clear `TODO: add DARAJA_* secrets` comment and the adapter ready.

## 6. What I'm NOT doing in this pass

- Real M-Pesa Daraja B2C HTTP calls (needs your shortcode, consumer key/secret, passkey, initiator credentials) — say the word and I'll add the secret prompts and edge function next
- Real airtime/bundle API integration (same — pick a provider: Africa's Talking, Tanda, etc.)
- Purchase tracking (per spec — clicks + signups only)

---

### Technical notes

- Tables get standard RLS (owner read for shares, admin manage for assets/templates/rules)
- Storage bucket policy: public SELECT, admin INSERT/UPDATE/DELETE
- All admin pages reuse `useAuth().hasAnyRole(["admin","superadmin","staff"])`
- Mobile-first Tailwind, glass cards matching the existing affiliate dashboard

---

Reply **go** to proceed, or tell me which sections to drop / prioritize. I especially want to confirm:

1. OK to defer real M-Pesa/airtime API wiring to a follow-up (admin can still mark withdrawals paid manually now)?
2. Use Lovable Cloud Storage for the asset bucket (recommended) — confirm yes?