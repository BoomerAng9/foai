-- ============================================================
-- Migration 002: LISTEN/NOTIFY hot-reload triggers
-- ============================================================
-- Fires a NOTIFY on channel `aims_pricing_changed` whenever any
-- row in aims_pricing_matrix or aims_pricing_bundles changes.
-- The Neon loader subscribes to this and busts its in-memory cache.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION aims_pricing_notify_change()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
BEGIN
  payload := jsonb_build_object(
    'table', TG_TABLE_NAME,
    'op',    TG_OP,
    'id',    COALESCE(NEW.id, OLD.id),
    'at',    NOW()
  );
  PERFORM pg_notify('aims_pricing_changed', payload::text);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_apm_notify ON aims_pricing_matrix;
CREATE TRIGGER trg_apm_notify
  AFTER INSERT OR UPDATE OR DELETE ON aims_pricing_matrix
  FOR EACH ROW
  EXECUTE FUNCTION aims_pricing_notify_change();

DROP TRIGGER IF EXISTS trg_bundles_notify ON aims_pricing_bundles;
CREATE TRIGGER trg_bundles_notify
  AFTER INSERT OR UPDATE OR DELETE ON aims_pricing_bundles
  FOR EACH ROW
  EXECUTE FUNCTION aims_pricing_notify_change();

COMMIT;
