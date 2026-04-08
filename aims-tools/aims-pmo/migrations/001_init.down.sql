-- ============================================================
-- Rollback for migration 001 (init schema)
-- ============================================================

BEGIN;

DROP TABLE IF EXISTS pmo_form_drafts CASCADE;
DROP TABLE IF EXISTS pmo_forms CASCADE;
DROP TABLE IF EXISTS voice_library CASCADE;
DROP TABLE IF EXISTS agent_promotions CASCADE;
DROP TABLE IF EXISTS agent_evaluations CASCADE;
DROP TABLE IF EXISTS agent_mission_events CASCADE;
DROP TABLE IF EXISTS agent_missions CASCADE;
DROP TABLE IF EXISTS agent_roster CASCADE;

COMMIT;
