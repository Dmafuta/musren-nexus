# Musren Connect — Roadmap Discussion

## Platform Status (as of Aug 2026)

### Infrastructure — Done
- Auth (register, login, JWT, roles, forgot/reset password)
- CI/CD — backend → VPS via Docker, frontend → Cloudflare Workers
- M-Pesa STK Push (wallet top-up) + B2C webhooks
- Developer API keys (SHA-256, `sk_live_*`)

### Roles
`superadmin | admin | staff | user | developer | affiliate | merchant | customer`

- `superadmin` — owner. Can promote/demote admins. Cannot be touched by anyone.
- `admin` — trusted staff. Full platform ops, can't touch superadmin.
- `staff` — limited ops (view dashboards, can't approve financials).
- `developer` — tech integrators building on the API.
- `affiliate` — promoters earning commission via referral links.
- `merchant` — businesses running loyalty/rewards campaigns.
- `customer` — end users of merchant loyalty programs.
- `user` — default role on signup, before selecting a workspace role.

### Dashboard Completion
| Role | UI | Backend | Notes |
|---|---|---|---|
| Admin | ~80% | ~80% | Role management, users, corporate top-up, affiliates admin |
| Developer | ~70% | ~70% | API keys & webhooks UI done; webhook delivery not implemented |
| Affiliate | ~80% | ~60% | UI done; needs AT/M-Pesa credentials; referral tracking wired |
| Merchant | ~20% | ~10% | Only reward-config page has real content; rest are placeholders |
| Customer | ~30% | ~30% | Basic dashboard exists |

---

## Open Questions — Require Answers Before Building

### 1. Superadmin vs Admin
**Decision needed:** Keep both roles or collapse into one?

- Current behaviour: `superadmin` is the only role that can assign/revoke other superadmins.
  Everything else (`admin`, `superadmin`) is treated identically.
- Recommendation: Keep both. Without superadmin, any admin can demote any other admin
  including the owner's account. Risk on a multi-staff platform.
- **Action:** Claim superadmin now via the "Claim Superadmin" button in Admin > Users
  (only works while no superadmin exists).

### 2. Affiliate Business Model
**Decision needed:** Who do affiliates promote — Musren itself, or Merchant businesses?

- **Option A (simpler):** Affiliates only promote Musren products (Bulk SMS, USSD, WhatsApp API etc.)
  and earn points when someone signs up or purchases through their link.
  One central commission pool managed by Musren admin.
- **Option B (marketplace):** Affiliates can also be recruited by individual Merchants
  to promote merchant-specific campaigns. Each merchant funds their own affiliate payouts.
  Two-sided marketplace — significantly more complex.

### 3. What is a Merchant?
**Decision needed:** What does a Merchant actually sell/do on this platform?

- **Option A (reseller):** Merchant buys SMS/USSD credits from Musren in bulk and resells
  to their own clients under their own brand.
- **Option B (loyalty operator):** Merchant uses Musren's platform to run a rewards/loyalty
  program for their own customers (e.g. a supermarket's points card).
- **Option C (both):** Merchant can do both.

### 4. Money Flow
**Decision needed:** How does billing work for Merchants?

- Monthly SaaS subscription?
- Pay-per-use (per SMS sent, per campaign, per active customer)?
- Credit top-up (buy credits, spend as they go)?
- Commission share from affiliate conversions?

### 5. Affiliate Payout Pool
**Decision needed:** Where does affiliate payout money come from?

- Central Musren pool (Musren pays all affiliates from its own revenue)?
- Each Merchant funds their own affiliate payouts separately?
- Mixed — Musren-program affiliates paid centrally, Merchant-program affiliates paid by merchant?

### 6. Launch Priority
**Decision needed:** What is the MVP for first real users?

- Can we launch with Developer + Affiliate working, and build Merchant later?
- Are there specific Merchant clients waiting that need it sooner?

---

## Pending Credentials (Platform Won't Function Without These)
- [ ] M-Pesa Daraja credentials (`MPESA_*`) — STK Push and B2C payouts
- [ ] Africa's Talking credentials (`AT_USERNAME`, `AT_API_KEY`) — Bulk SMS send
- [ ] Resend SMTP key (`MAIL_PASSWORD`) — forgot-password emails

## Pending Infrastructure
- [ ] Custom domain — move `musren.quantumconnect.africa` to Cloudflare for SSL + Worker routing
- [ ] Claim superadmin account

## Next Build Priorities (to be confirmed after discussion)
1. Fill in credentials so the platform actually functions end-to-end
2. Claim superadmin
3. Custom domain setup
4. Bulk SMS send UI (highest-demand product, backend mostly done)
5. Developer webhook delivery (backend — fire HTTP POST to registered endpoints on events)
6. Affiliate referral tracking (confirm click → signup → points flow works end-to-end)
7. Merchant dashboard (after business model is defined)
