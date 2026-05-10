-- 006_processed_stripe_events.sql
-- Stripe webhook idempotency table.
--
-- WHY: Stripe retries `checkout.session.completed` deliveries on any 5xx
-- response or network glitch (this is normal, not exceptional). Without
-- an idempotency guard, every retry re-runs `issueSqwaadrunKey`, which
-- revokes the customer's just-emailed/displayed key (revoked_at = NOW())
-- and silently drops the new key insert via `ON CONFLICT DO NOTHING` on
-- the handoff row. Customer ends up keyless after a normal Stripe retry.
--
-- WHAT: Single-row idempotency table keyed by Stripe's globally-unique
-- `event.id` (e.g., `evt_1NxYz...`). Webhook handler checks this table
-- BEFORE any side-effects; if the event was already processed, it
-- returns 200 OK to ack Stripe and skips the rest of the switch.
--
-- ROW SIZE: tiny (~120 bytes per event). At ~10 events/customer/year and
-- 10k customers that's ~12 MB/year. Cheap.
--
-- RETENTION: keep 90 days. Stripe will not retry a webhook older than
-- 30 days, so 90 days gives 3x safety margin. A nightly purge job
-- (separate from this PR) reclaims rows older than 90 days.

CREATE TABLE IF NOT EXISTS processed_stripe_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  subscription_id TEXT,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processed_stripe_events_subscription
  ON processed_stripe_events(subscription_id)
  WHERE subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_processed_stripe_events_processed_at
  ON processed_stripe_events(processed_at);
