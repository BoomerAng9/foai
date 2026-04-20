-- ═══════════════════════════════════════════════════════════════════
--  Sqwaadrun SaaS — per-customer API keys
-- ═══════════════════════════════════════════════════════════════════
-- One row per issued key. Plaintext keys (prefix `sqr_live_`) are
-- shown to the customer exactly once at provisioning; the server
-- stores only the HMAC-SHA256 hash computed with SQWAADRUN_KEY_PEPPER.
-- Gateway middleware recomputes the HMAC on each request and does a
-- timing-safe lookup against `key_hash`.
--
-- Quota is enforced per key per billing period. `usage_this_period`
-- is atomically incremented on each successful mission dispatch; the
-- Stripe webhook resets it on subscription renewal.

CREATE TABLE IF NOT EXISTS sqwaadrun_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,                        -- first 12 chars plaintext, for dashboard display
  tier TEXT NOT NULL CHECK (tier IN ('lil_hawk_solo', 'sqwaad', 'sqwaadrun_commander')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  monthly_quota INTEGER NOT NULL,
  usage_this_period INTEGER NOT NULL DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sqwaadrun_api_keys_user_id
  ON sqwaadrun_api_keys (user_id)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sqwaadrun_api_keys_stripe_sub
  ON sqwaadrun_api_keys (stripe_subscription_id)
  WHERE revoked_at IS NULL;

-- Constant-time lookup path: key_hash is already UNIQUE; a btree on it
-- is implicit. Separate index for the common (key_hash, revoked_at IS NULL)
-- authentication query.
CREATE INDEX IF NOT EXISTS idx_sqwaadrun_api_keys_active_hash
  ON sqwaadrun_api_keys (key_hash)
  WHERE revoked_at IS NULL;

-- ═══════════════════════════════════════════════════════════════════
--  Handoff table — plaintext key delivery on checkout success
-- ═══════════════════════════════════════════════════════════════════
-- Stores the freshly-issued plaintext key keyed by Stripe checkout
-- session id so the dashboard can retrieve it exactly once via the
-- `?session_id=...` success redirect. Rows are consumed on retrieval
-- (plaintext cleared) and safe to purge after 24h by a cron job.
-- Email delivery via SendGrid is the primary channel; this table is
-- the fallback + dashboard-first-view surface.

CREATE TABLE IF NOT EXISTS sqwaadrun_key_handoffs (
  stripe_session_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  api_key_row_id UUID NOT NULL REFERENCES sqwaadrun_api_keys(id),
  plaintext_key TEXT,                              -- NULLED after first retrieval
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retrieved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sqwaadrun_key_handoffs_user
  ON sqwaadrun_key_handoffs (user_id);

-- ═══════════════════════════════════════════════════════════════════
--  profiles.sqwaadrun_missions_used — UI mirror for Deploy dashboard
-- ═══════════════════════════════════════════════════════════════════
-- The Deploy Platform dashboard at cti-hub/src/app/(dashboard)/sqwaadrun
-- reads sqwaadrun_missions_used from profiles to render the quota bar.
-- The gateway billing middleware increments BOTH this column and the
-- authoritative sqwaadrun_api_keys.usage_this_period inside one txn,
-- so UI stays consistent with quota enforcement. Stripe webhook resets
-- this to 0 on period rollover (checkout.completed + subscription.updated).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS sqwaadrun_missions_used INTEGER NOT NULL DEFAULT 0;
