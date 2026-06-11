-- ─────────────────────────────────────────────────────────────────────────────
-- V2: STK Push payment orders table
-- Tracks outbound Lipa Na M-Pesa requests from customers.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payment_orders (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID        NOT NULL,
    checkout_request_id VARCHAR(100) NOT NULL,
    amount_cents        INTEGER     NOT NULL CHECK (amount_cents > 0),
    status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
    description         VARCHAR(200),
    mpesa_receipt       VARCHAR(50),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_orders_checkout_id
    ON payment_orders(checkout_request_id);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id
    ON payment_orders(user_id);

CREATE INDEX IF NOT EXISTS idx_payment_orders_status
    ON payment_orders(status);
