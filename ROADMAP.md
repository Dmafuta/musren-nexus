# Musren Connect — Production Readiness Roadmap

Audited: 2026-08-14. Items are grouped by category and ordered by priority.
"Code" = implement in the codebase. "Infra" = Cloudflare/VPS/third-party config.

---

## Phase 1 — Critical (implement before first real user)

### Security

#### 1. Rate limiting on sensitive routes (Code — Laravel)
Add Laravel's built-in throttle middleware to prevent brute-force and abuse.

Targets:
- `POST /api/auth/login` — 5 attempts / minute per IP
- `POST /api/auth/forgot-password` — 3 / minute per IP
- `POST /api/payments/topup` — 10 / minute per user
- `POST /api/bulk-sms/applications` — 3 / minute per IP
- `POST /api/corporate-topup` — 3 / minute per IP
- `GET /api/referral/{code}` — 30 / minute per IP

Implementation: `Route::middleware('throttle:5,1')` in `routes/api.php`.
Custom JSON error response via `ThrottleRequestsWithRedis` or `Handler.php`.

#### 2. M-Pesa webhook IP allowlisting (Code — Laravel middleware)
Safaricom only sends callbacks from a known IP range. Any other source should be rejected with 403.

Create: `app/Http/Middleware/MpesaIpGuard.php`
- Check `$request->ip()` against Safaricom's published IP list
- Return `response()->json(['ResultCode' => 1, 'ResultDesc' => 'Forbidden'], 403)` on mismatch
- Apply to: `webhooks/mpesa/stk/callback`, `webhooks/mpesa/b2c/result`, `webhooks/mpesa/b2c/timeout`

Safaricom production IPs (verify on Daraja portal — they update occasionally):
- `196.201.214.200/24`
- `196.201.214.206/24`

Note: When behind Cloudflare, use `$request->header('CF-Connecting-IP')` not `$request->ip()`.

#### 3. Idempotency guard on M-Pesa callbacks (Code — MpesaWebhookController)
Safaricom retries callbacks on timeout. Without a guard, a double callback = double wallet credit.

Fix in `stkCallback` and `b2cResult`:
- Check `$order->status` before processing
- If already `completed`, return early with `['ResultCode' => 0]` (acknowledge without re-processing)
- Wrap the status update + wallet credit in a DB transaction

```php
if ($order->status === 'completed') {
    return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Already processed']);
}
DB::transaction(function () use ($order) {
    $order->update(['status' => 'completed']);
    $this->creditWallet($order);
});
```

#### 4. Database indexes (Code — new migration)
Current payment_orders and affiliate_events lookups are full table scans.

Create migration: `2025_01_01_000008_add_performance_indexes.php`

```php
// payment_orders
Schema::table('payment_orders', function (Blueprint $table) {
    $table->index('provider_ref');
    $table->index('user_id');
    $table->index('status');
});

// affiliate_events
Schema::table('affiliate_events', function (Blueprint $table) {
    $table->index(['user_id', 'created_at']);
    $table->index('code');
});

// developer_api_keys
Schema::table('developer_api_keys', function (Blueprint $table) {
    $table->index('key_hash');
});
```

---

### Nginx Security Headers (Code — nginx/nginx.conf)

Remove deprecated header, add missing ones:

```nginx
# Remove (deprecated, misused by old browsers):
# add_header X-XSS-Protection "1; mode=block" always;

# Add:
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Content-Security-Policy "default-src 'none'; frame-ancestors 'none'" always;

# Add after SSL is configured:
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

---

## Phase 2 — Durability (implement before scale)

### 5. Laravel Queues + Redis (Code + Infra)

**Problem**: Wallet credit after M-Pesa callback is synchronous HTTP to Supabase.
If Supabase is slow or down, the callback times out, Safaricom retries, and credits are lost or duplicated.

**Solution**: Move `creditWallet()` into a queued job.

Steps:
1. Add Redis to `docker-compose.yml` (`redis:7-alpine`, internal only)
2. Set `QUEUE_CONNECTION=redis` and `REDIS_HOST=redis` in `.env`
3. Create `app/Jobs/CreditWalletJob.php` — moves the Supabase HTTP call inside a job with 3 retries
4. In `MpesaWebhookController`, dispatch job instead of calling `creditWallet()` directly:
   `CreditWalletJob::dispatch($order)->onQueue('payments');`
5. Run queue worker in `docker/entrypoint.sh`:
   `php artisan queue:work redis --queue=payments --tries=3 &`

### 6. Error monitoring — Sentry (Code + Infra)

Catch silent failures (failed wallet credits, M-Pesa errors, AT SMS failures) before users notice.

Laravel:
- `composer require sentry/sentry-laravel`
- Add `SENTRY_LARAVEL_DSN=` to `.env`
- `php artisan sentry:publish` generates `config/sentry.php`

Frontend (Cloudflare Workers):
- `npm install @sentry/cloudflare`
- Wrap `src/server.ts` export with Sentry handler

### 7. PostgreSQL automated backups (Infra)

Set up a cron job on the VPS that runs daily:
```bash
pg_dump -U postgres musren_prod | gzip > /backups/musren_prod_$(date +%Y%m%d).sql.gz
# Upload to Cloudflare R2 or S3
rclone copy /backups/ r2:musren-backups/postgres/
# Keep 30 days
find /backups -name "*.sql.gz" -mtime +30 -delete
```

Add to `/etc/cron.d/musren-backup` on VPS.

---

## Phase 3 — Performance (implement after launch)

### 8. Cloudflare Cache Rules (Infra)

Cache read-only API responses at the Cloudflare edge to reduce VPS load.

Rules to create in Cloudflare Dashboard > Caching > Cache Rules:
- `musren.co.ke/api/health` — Cache Everything, TTL 30s
- `musren.co.ke/api/exchange-rates` — Cache Everything, TTL 5 minutes
- `musren.co.ke/api/affiliate/assets*` — Cache Everything, TTL 1 hour

### 9. Redis application cache (Code)

Use Redis (added in Phase 2) for Laravel application cache.

Candidates for caching:
- Exchange rates (`ExchangeRate::all()`) — cache 5 minutes
- Affiliate rates — cache 10 minutes
- Reward rules — cache 10 minutes

Pattern:
```php
$rates = Cache::remember('affiliate_rates', 600, fn () => AffiliateRate::where('active', true)->get());
```

### 10. Cloudflare WAF rules (Infra)

Enable in Cloudflare Dashboard > Security > WAF:
- OWASP Core Ruleset — set to Block
- Custom rule: block requests to `/api/admin/*` from non-KE countries (optional)
- Bot Fight Mode — enable

### 11. Rollback strategy (Infra)

Document the rollback procedure in `deploy.sh`:
- Tag each release: `git tag v1.x.x` before deploy
- On failure: `git checkout v1.x.x && docker compose up -d --build`
- DB: keep migration rollback scripts alongside each forward migration

---

## Summary table

| # | Item | Type | Phase | Effort |
|---|------|------|-------|--------|
| 1 | Rate limiting | Code | 1 | Low |
| 2 | M-Pesa IP allowlisting | Code | 1 | Low |
| 3 | Callback idempotency guard | Code | 1 | Low |
| 4 | Database indexes | Code | 1 | Low |
| 5 | Nginx security header fixes | Code | 1 | Low |
| 6 | Laravel queues + Redis | Code + Infra | 2 | Medium |
| 7 | Sentry error monitoring | Code + Infra | 2 | Low |
| 8 | PostgreSQL automated backups | Infra | 2 | Low |
| 9 | Cloudflare cache rules | Infra | 3 | Low |
| 10 | Redis application cache | Code | 3 | Low |
| 11 | Cloudflare WAF | Infra | 3 | Low |
| 12 | Rollback strategy | Infra | 3 | Low |
