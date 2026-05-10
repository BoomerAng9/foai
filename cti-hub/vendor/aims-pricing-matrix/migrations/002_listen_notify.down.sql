-- Rollback for migration 002
BEGIN;

DROP TRIGGER IF EXISTS trg_bundles_notify ON aims_pricing_bundles;
DROP TRIGGER IF EXISTS trg_apm_notify ON aims_pricing_matrix;
DROP FUNCTION IF EXISTS aims_pricing_notify_change();

COMMIT;
