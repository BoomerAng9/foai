-- ═══════════════════════════════════════════════════════════════════
--  Sqwaadrun add-on subscription columns on profiles
--  Migration 008
-- ═══════════════════════════════════════════════════════════════════
--
--  Tracks the customer's Sqwaadrun add-on tier (independent of their
--  Deploy Platform plan). Webhook updates these columns when a
--  customer.subscription.* event has product=sqwaadrun in metadata.
--
--  Apply with: psql $NEON_DATABASE_URL -f sql/008_sqwaadrun_addon_neon.sql

ALTER TABLE IF EXISTS profiles
  ADD COLUMN IF NOT EXISTS sqwaadrun_tier            TEXT,
  ADD COLUMN IF NOT EXISTS sqwaadrun_status          TEXT DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS sqwaadrun_monthly_quota   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sqwaadrun_missions_used   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sqwaadrun_period_start    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sqwaadrun_period_end      TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_sqwaadrun_tier
  ON profiles (sqwaadrun_tier)
  WHERE sqwaadrun_tier IS NOT NULL;

-- Quota reset function — call on cron when sqwaadrun_period_end passes
CREATE OR REPLACE FUNCTION reset_sqwaadrun_monthly_quotas()
RETURNS INTEGER AS $$
DECLARE
  reset_count INTEGER;
BEGIN
  UPDATE profiles
  SET
    sqwaadrun_missions_used = 0,
    sqwaadrun_period_start = sqwaadrun_period_end,
    sqwaadrun_period_end = sqwaadrun_period_end + INTERVAL '1 month'
  WHERE sqwaadrun_status = 'active'
    AND sqwaadrun_period_end IS NOT NULL
    AND sqwaadrun_period_end < NOW();

  GET DIAGNOSTICS reset_count = ROW_COUNT;
  RETURN reset_count;
END;
$$ LANGUAGE plpgsql;
