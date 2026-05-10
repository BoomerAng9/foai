-- Migration 018: Persistent token store (SHIP-CHECKLIST Gate 4 · critical blocker)
-- Date: 2026-04-22
-- Purpose: Replace the in-memory Map() in src/lib/stripe/tokens.ts. The Map
-- loses every balance on container restart; a customer who paid $19.99
-- for the War Room Bundle and then hits a deploy has no product. Gate 4
-- cannot pass with a volatile token store.
--
-- Schema notes:
--   user_id          Firebase UID — authoritative owner key
--   balance          current spendable tokens (0 for unlimited subscribers)
--   total_purchased  lifetime count for audit / support
--   is_unlimited     monthly-subscription flag
--   unlimited_until  NULL for non-subscribers; timestamp for active monthly
--                    subscribers; used to expire at period end on cancel
--   created_at       first-seen time (also grants the 3 free starter tokens)
--   updated_at       last mutation
--
-- Idempotency + upgrade path:
--   - Table uses CREATE TABLE IF NOT EXISTS (safe on re-run)
--   - starter-token logic lives in the app, not here, because we want the
--     grant to happen only once per user — the app's INSERT uses
--     ON CONFLICT (user_id) DO NOTHING

CREATE TABLE IF NOT EXISTS draft_tokens (
  user_id         TEXT PRIMARY KEY,
  balance         INTEGER NOT NULL DEFAULT 0,
  total_purchased INTEGER NOT NULL DEFAULT 0,
  is_unlimited    BOOLEAN NOT NULL DEFAULT FALSE,
  unlimited_until TIMESTAMPTZ NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT draft_tokens_balance_nonneg CHECK (balance >= 0),
  CONSTRAINT draft_tokens_total_nonneg   CHECK (total_purchased >= 0)
);

CREATE INDEX IF NOT EXISTS draft_tokens_unlimited_idx
  ON draft_tokens (is_unlimited)
  WHERE is_unlimited = TRUE;

-- Audit trail: every Stripe checkout session we create, so we can:
--   1. Detect duplicate webhook deliveries (Stripe retries)
--   2. Attribute a credit event to a user + package without re-hitting Stripe
--   3. Debug partial failures (checkout created but webhook never arrived)
CREATE TABLE IF NOT EXISTS stripe_checkout_sessions (
  session_id   TEXT PRIMARY KEY,               -- Stripe checkout.session.id (cs_...)
  user_id      TEXT NOT NULL,
  package_id   TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'created',-- 'created' | 'completed' | 'expired'
  amount_cents INTEGER NOT NULL,
  recurring    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL,
  CONSTRAINT stripe_sessions_status_valid
    CHECK (status IN ('created', 'completed', 'expired'))
);

CREATE INDEX IF NOT EXISTS stripe_checkout_sessions_user_idx
  ON stripe_checkout_sessions (user_id, created_at DESC);
