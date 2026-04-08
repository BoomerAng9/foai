-- Rollback for migration 003 — restore TPS_Ang
BEGIN;

INSERT INTO agent_roster (id, agent_name, agent_class, rank, department, mature, persona_ref, reports_to)
VALUES (
  'tps_ang',
  'TPS_Ang',
  'tps_ang',
  'senior',
  'CFO',
  TRUE,
  'project_pricing_overseer_agent.md',
  'boomer_cfo'
)
ON CONFLICT (id) DO NOTHING;

UPDATE agent_missions    SET assigned_agent  = 'tps_ang' WHERE assigned_agent  = 'tps_report_ang';
UPDATE agent_missions    SET commissioned_by = 'tps_ang' WHERE commissioned_by = 'tps_report_ang';
UPDATE agent_evaluations SET agent_id        = 'tps_ang' WHERE agent_id        = 'tps_report_ang';
UPDATE agent_promotions  SET agent_id        = 'tps_ang' WHERE agent_id        = 'tps_report_ang';
UPDATE voice_library     SET agent_id        = 'tps_ang' WHERE agent_id        = 'tps_report_ang';

DELETE FROM agent_roster WHERE id = 'tps_report_ang';

COMMIT;
