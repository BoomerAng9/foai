-- Migration 019: Subscription lifecycle + tier (SHIP-CHECKLIST Gate 4 · Items 22 + 23)
-- Date: 2026-04-22
-- Purpose:
--   1. Lifecycle (Item 22) — add subscription_status + stripe_subscription_id so
--      cancel/downgrade/renew can be represented without losing data. Cancel
--      flips status to 'cancel_scheduled' and relies on lazy expiry at
--      unlimited_until to actually demote the account.
--   2. Tier (Item 23) — add tier column so limits can key on the plan tier
--      (free | standard | premium | flagship) without a join to the AIMS
--      pricing matrix on every check.
--
-- subscription_status states:
--   'active'            — subscription is running, will auto-renew
--   'cancel_scheduled'  — user clicked cancel; access continues until
--                         unlimited_until; lazy expiry demotes on read
--   'cancelled'         — access already expired post-cancel
--   'none'              — never subscribed (default)
--
-- tier values (mirror @aims/pricing-matrix):
--   'free'      — 3 starter tokens only, no purchases
--   'standard'  — token-bundle buyers (single / pack / war-room)
--   'premium'   — Unlimited Monthly subscribers
--   'flagship'  — Enterprise (reserved; not reachable from Per|Form checkout)

ALTER TABLE draft_tokens
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'free';

-- Backfill tier for existing rows based on current state:
--   unlimited = true  → premium
--   balance > 0       → standard (bought a bundle)
--   else              → free
UPDATE draft_tokens
SET tier = CASE
    WHEN is_unlimited        THEN 'premium'
    WHEN total_purchased > 0 THEN 'standard'
    ELSE                          'free'
  END
WHERE tier = 'free'
  AND (is_unlimited OR total_purchased > 0);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'draft_tokens_status_valid'
  ) THEN
    ALTER TABLE draft_tokens
      ADD CONSTRAINT draft_tokens_status_valid
        CHECK (subscription_status IN ('none', 'active', 'cancel_scheduled', 'cancelled'));
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'draft_tokens_tier_valid'
  ) THEN
    ALTER TABLE draft_tokens
      ADD CONSTRAINT draft_tokens_tier_valid
        CHECK (tier IN ('free', 'standard', 'premium', 'flagship'));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS draft_tokens_tier_idx ON draft_tokens (tier);
CREATE INDEX IF NOT EXISTS draft_tokens_subscription_status_idx
  ON draft_tokens (subscription_status)
  WHERE subscription_status != 'none';
