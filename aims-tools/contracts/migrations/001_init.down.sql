-- ============================================================
-- @aims/contracts — Rollback of 001_init
-- ============================================================

BEGIN;

DROP TRIGGER IF EXISTS trg_ledgers_updated_at ON ledgers;
DROP TRIGGER IF EXISTS trg_charter_stages_updated_at ON charter_stages;
DROP TRIGGER IF EXISTS trg_charters_updated_at ON charters;

DROP FUNCTION IF EXISTS contracts_set_updated_at();

DROP TABLE IF EXISTS ledger_entries;
DROP TABLE IF EXISTS ledgers;
DROP TABLE IF EXISTS charter_stages;
DROP TABLE IF EXISTS charters;

DROP TYPE IF EXISTS ledger_entry_type;
DROP TYPE IF EXISTS service_status;
DROP TYPE IF EXISTS security_tier;
DROP TYPE IF EXISTS hitl_gate_status;
DROP TYPE IF EXISTS rfp_bamaram_stage;

COMMIT;
