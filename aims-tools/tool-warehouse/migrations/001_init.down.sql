-- Rollback of @aims/tool-warehouse 001_init

BEGIN;

DROP TRIGGER IF EXISTS trg_tools_updated_at ON tools;
DROP FUNCTION IF EXISTS tool_warehouse_set_updated_at();

DROP TABLE IF EXISTS tools;

DROP TYPE IF EXISTS tool_license;
DROP TYPE IF EXISTS tool_priority;
DROP TYPE IF EXISTS tool_status;
DROP TYPE IF EXISTS tool_tier;

COMMIT;
