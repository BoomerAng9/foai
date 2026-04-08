-- Rollback for migration 001
BEGIN;

DROP TRIGGER IF EXISTS trg_bundles_updated_at ON aims_pricing_bundles;
DROP TRIGGER IF EXISTS trg_apm_updated_at ON aims_pricing_matrix;
DROP FUNCTION IF EXISTS aims_pricing_set_updated_at();

DROP TABLE IF EXISTS aims_task_multipliers CASCADE;
DROP TABLE IF EXISTS aims_pricing_history CASCADE;
DROP TABLE IF EXISTS aims_pricing_bundles CASCADE;
DROP TABLE IF EXISTS aims_pricing_matrix CASCADE;

COMMIT;
