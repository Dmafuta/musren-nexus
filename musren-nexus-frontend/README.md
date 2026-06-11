# Musren

Multi-role loyalty, rewards, and affiliate platform. Customers, affiliates, merchants, and admins each get their own workspace with role-scoped navigation and dashboards.

## Tech stack

- **Framework:** TanStack Start v1 (React 19, Vite 7, SSR on Cloudflare Workers)
- **Routing:** TanStack Router (file-based, `src/routes/`)
- **Data:** TanStack Query
- **Backend:** Lovable Cloud (Supabase) — Postgres, Auth, Storage, RLS
- **UI:** Tailwind CSS v4 + shadcn/ui + Radix primitives
- **Forms / validation:** react-hook-form + Zod
- **Icons:** lucide-react

## Features

- Role-based access control (`admin`, `superadmin`, `staff`, `affiliate`, `customer`, `merchant`, `developer`) with roles stored in a separate `user_roles` table and checked via a `has_role` security-definer function.
- Per-role layouts and sidebars (`AdminShell`, `AffiliateShell`, `CustomerShell`, `MerchantShell`) with sidebar state persisted per role.
- Authenticated route group (`src/routes/_authenticated/`) with login redirect and role-based dashboard dispatch.
- First-user "Claim Super Admin" flow.
- Affiliate referrals, shares, notifications, and withdrawal requests (server-only inserts via SECURITY DEFINER RPC).
- Admin tools: user management, role requests, affiliates, corporate top-ups, consent log.
- Public marketing site: solutions, industries, developers, about, blog, contact, privacy center.
- Consent banner and WhatsApp contact button.

## Project structure

```
src/
  routes/                  File-based routes
    __root.tsx             Root layout
    _authenticated.tsx     Auth-gated layout
    _authenticated/        Role-scoped dashboards
    api/public/            Public HTTP endpoints (webhooks, redirects)
  components/
    layouts/               Role shells (Admin/Affiliate/Customer/Merchant)
    site/                  Marketing site components
    ui/                    shadcn/ui primitives
  hooks/                   use-auth, use-consent, use-mobile
  integrations/supabase/   Auto-generated Supabase clients
  lib/                     Server functions, onboarding, products, utils
  styles.css               Tailwind v4 tokens + theme
supabase/migrations/       SQL migrations
```

## Getting started

```bash
bun install
bun run dev
```

Open http://localhost:5173.

### Scripts

- `bun run dev` — start the Vite dev server
- `bun run build` — production build
- `bun run build:dev` — development-mode build
- `bun run preview` — preview built app
- `bun run lint` — run ESLint
- `bun run format` — Prettier write

## Environment

Configured via Lovable Cloud — `.env` is auto-managed:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SERVICE_ROLE_KEY` (server runtime only)

Never commit secrets; never use `SUPABASE_SERVICE_ROLE_KEY` in client code.

## Server-side logic

- **Internal app logic:** `createServerFn` from `@tanstack/react-start`, placed in `*.functions.ts` files. Protected functions use `requireSupabaseAuth` middleware; the global `attachSupabaseAuth` middleware in `src/start.ts` forwards the user's bearer token.
- **External APIs / webhooks:** server routes under `src/routes/api/public/`, with signature verification and Zod validation.

## Database & security

- All `public` tables use Row Level Security with explicit `GRANT`s.
- Roles live in `public.user_roles`; checks go through `public.has_role(uuid, app_role)`.
- Sensitive writes (e.g. affiliate withdrawals) go through SECURITY DEFINER RPCs with internal auth, balance, and rate-limit checks.
- `affiliate-assets` storage bucket: public read for files, listing restricted to admins.

## Deployment

Deployed via Lovable. The SSR entry (`src/server.ts`) targets the Cloudflare Workers runtime (`wrangler.jsonc`, `nodejs_compat`).

- Preview: https://id-preview--ab7a0f98-a3dd-4c48-b26a-03c195018a5e.lovable.app
- Production: https://musren-nexus.lovable.app
