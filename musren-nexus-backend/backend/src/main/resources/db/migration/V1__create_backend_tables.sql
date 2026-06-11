-- ─────────────────────────────────────────────────────────────────────────────
-- V1: Backend-owned tables
-- Run automatically by Flyway on application startup.
-- These tables live alongside the Supabase-managed schema.
-- ─────────────────────────────────────────────────────────────────────────────

-- Developer API Keys
-- The full key is never stored — only the prefix (display) and SHA-256 hash (verify).
CREATE TABLE IF NOT EXISTS developer_api_keys (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL,
    name        VARCHAR(100) NOT NULL,
    key_prefix  VARCHAR(12) NOT NULL,
    key_hash    VARCHAR(64) NOT NULL,
    environment VARCHAR(10) NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'live')),
    active      BOOLEAN     NOT NULL DEFAULT TRUE,
    last_used_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON developer_api_keys(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_hash ON developer_api_keys(key_hash) WHERE active = TRUE;

-- Webhook Endpoints
CREATE TABLE IF NOT EXISTS webhook_endpoints (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL,
    url         VARCHAR(500) NOT NULL,
    secret      VARCHAR(64) NOT NULL,
    active      BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhook_endpoints(user_id);

-- Webhook endpoint event subscriptions
CREATE TABLE IF NOT EXISTS webhook_endpoint_events (
    endpoint_id UUID        NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
    event_type  VARCHAR(60) NOT NULL,
    PRIMARY KEY (endpoint_id, event_type)
);

-- Bulk SMS Applications
CREATE TABLE IF NOT EXISTS bulk_sms_applications (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name        VARCHAR(200) NOT NULL,
    box_address         VARCHAR(200),
    director_names      VARCHAR(300) NOT NULL,
    sender_id           VARCHAR(11) NOT NULL,
    purpose             TEXT        NOT NULL,
    preferred_shortcode VARCHAR(20),
    phone               VARCHAR(20) NOT NULL,
    email               VARCHAR(255) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bulk_sms_apps_status ON bulk_sms_applications(status);
CREATE INDEX IF NOT EXISTS idx_bulk_sms_apps_created ON bulk_sms_applications(created_at DESC);
