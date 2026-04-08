-- ============================================================
-- Migration 003: rename TPS_Ang → TPS_Report_Ang
-- ============================================================
-- Per Rish 2026-04-08: TPS_Ang is now TPS_Report_Ang.
--
-- TPS_Report_Ang is a real pencil pusher who deploys a team of
-- Lil_Hawks to watch incremental fee changes, help users monitor
-- tokens, assist with LUC, and is wired into financial process +
-- transactions. Has the @SPEAKLY skill capability.
--
-- Class changes from 'tps_ang' (custom) to 'boomer_ang' (standard
-- C-suite class). Department stays CFO. Reports_to stays boomer_cfo.
-- ============================================================

BEGIN;

-- Add the new agent class to the CHECK constraint if needed.
-- (boomer_ang already exists in the original constraint, so no change.)

-- 1. Insert TPS_Report_Ang as a new roster entry
INSERT INTO agent_roster (id, agent_name, agent_class, rank, department, mature, persona_ref, reports_to)
VALUES (
  'tps_report_ang',
  'TPS_Report_Ang',
  'boomer_ang',
  'senior',
  'CFO',
  TRUE,
  'project_pricing_overseer_agent.md',
  'boomer_cfo'
)
ON CONFLICT (id) DO UPDATE SET
  agent_name = EXCLUDED.agent_name,
  agent_class = EXCLUDED.agent_class,
  department = EXCLUDED.department,
  persona_ref = EXCLUDED.persona_ref,
  reports_to = EXCLUDED.reports_to;

-- 2. Migrate any existing missions / promotions / evaluations
--    from tps_ang to tps_report_ang (defensive — likely none yet
--    since TPS_Ang was only seeded one migration ago).
UPDATE agent_missions    SET assigned_agent  = 'tps_report_ang' WHERE assigned_agent  = 'tps_ang';
UPDATE agent_missions    SET commissioned_by = 'tps_report_ang' WHERE commissioned_by = 'tps_ang';
UPDATE agent_evaluations SET agent_id        = 'tps_report_ang' WHERE agent_id        = 'tps_ang';
UPDATE agent_promotions  SET agent_id        = 'tps_report_ang' WHERE agent_id        = 'tps_ang';
UPDATE voice_library     SET agent_id        = 'tps_report_ang' WHERE agent_id        = 'tps_ang';

-- 3. Drop the old TPS_Ang roster entry
DELETE FROM agent_roster WHERE id = 'tps_ang';

COMMIT;
