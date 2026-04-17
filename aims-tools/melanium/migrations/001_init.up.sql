-- ============================================================
-- @aims/melanium — Initial schema
-- ============================================================
-- Migration 001: Melanium Ingot A2P currency tables.
--
--   melanium_transactions    — append-only, one row per A2P transaction
--   customer_balances        — running customer platform currency balance
--   customer_balance_events  — append-only audit log of balance changes
--
-- Per 2026-04-17 Rish arbitration. Charter surface hides internal split;
-- Ledger (from @aims/contracts) stores full allocation via FK.
-- ============================================================

BEGIN;

DO $$ BEGIN
  CREATE TYPE melanium_event_type AS ENUM (
    'credit_earned',
    'credit_spent',
    'referral_bonus',
    'referral_match',
    'adjustment',
    'refund'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── 1. melanium_transactions — append-only ──────────────────────────

CREATE TABLE IF NOT EXISTS melanium_transactions (
  id                          BIGSERIAL PRIMARY KEY,
  transaction_id              TEXT NOT NULL UNIQUE,               -- caller-provided
  engagement_id               TEXT,                                -- nullable; FK to ledgers.id when attached
  customer_id                 TEXT NOT NULL,

  -- Cost breakdown (internal, never surfaced to customer)
  provider_cost               NUMERIC(10,4) NOT NULL,
  achievemor_margin           NUMERIC(10,4) NOT NULL,
  subtotal                    NUMERIC(10,4) NOT NULL,              -- provider + margin
  digital_maintenance_fee     NUMERIC(10,4) NOT NULL DEFAULT 0.99,
  total_customer_charge       NUMERIC(10,4) NOT NULL,              -- subtotal + fee

  -- Melanium Ingot split (70/30)
  achievemor_vault_amount     NUMERIC(10,4) NOT NULL,              -- 0.70 * digital_maintenance_fee
  customer_balance_amount     NUMERIC(10,4) NOT NULL,              -- 0.30 * digital_maintenance_fee
  vault_id                    TEXT NOT NULL DEFAULT 'melanium_vault_001',

  currency                    TEXT NOT NULL DEFAULT 'USD',

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Keep both halves internally consistent with the 70/30 split.
  CONSTRAINT chk_melanium_split_sum CHECK (
    ROUND((achievemor_vault_amount + customer_balance_amount)::numeric, 4)
      = ROUND(digital_maintenance_fee::numeric, 4)
  ),
  CONSTRAINT chk_total_matches CHECK (
    ROUND(total_customer_charge::numeric, 4)
      = ROUND((subtotal + digital_maintenance_fee)::numeric, 4)
  )
);

CREATE INDEX IF NOT EXISTS idx_melanium_tx_customer   ON melanium_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_melanium_tx_engagement ON melanium_transactions(engagement_id);
CREATE INDEX IF NOT EXISTS idx_melanium_tx_created    ON melanium_transactions(created_at);

-- ── 2. customer_balances — running platform currency balance ────────

CREATE TABLE IF NOT EXISTS customer_balances (
  customer_id                 TEXT PRIMARY KEY,
  balance_usd                 NUMERIC(12,4) NOT NULL DEFAULT 0,
  lifetime_credits_earned     NUMERIC(12,4) NOT NULL DEFAULT 0,
  lifetime_credits_spent      NUMERIC(12,4) NOT NULL DEFAULT 0,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_balance_non_negative CHECK (balance_usd >= 0)
);

-- ── 3. customer_balance_events — audit log of balance changes ───────

CREATE TABLE IF NOT EXISTS customer_balance_events (
  id                          BIGSERIAL PRIMARY KEY,
  customer_id                 TEXT NOT NULL REFERENCES customer_balances(customer_id) ON DELETE CASCADE,
  event_type                  melanium_event_type NOT NULL,
  amount                      NUMERIC(10,4) NOT NULL,              -- signed; negative = spend/refund
  balance_before              NUMERIC(12,4) NOT NULL,
  balance_after               NUMERIC(12,4) NOT NULL,
  transaction_id              TEXT,                                 -- links to melanium_transactions.transaction_id when applicable
  metadata                    JSONB,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_balance_events_customer ON customer_balance_events(customer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_balance_events_type     ON customer_balance_events(event_type);
CREATE INDEX IF NOT EXISTS idx_balance_events_tx       ON customer_balance_events(transaction_id);

-- ── 4. updated_at trigger for customer_balances ─────────────────────

CREATE OR REPLACE FUNCTION melanium_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_customer_balances_updated_at ON customer_balances;
CREATE TRIGGER trg_customer_balances_updated_at
  BEFORE UPDATE ON customer_balances
  FOR EACH ROW EXECUTE FUNCTION melanium_set_updated_at();

COMMIT;
