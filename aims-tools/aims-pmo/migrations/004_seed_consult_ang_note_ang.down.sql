-- Rollback for migration 004 — remove Consult_Ang and Note_Ang
BEGIN;

DELETE FROM agent_promotions  WHERE agent_id IN ('consult_ang', 'note_ang');
DELETE FROM agent_evaluations WHERE agent_id IN ('consult_ang', 'note_ang');
DELETE FROM agent_missions    WHERE assigned_agent IN ('consult_ang', 'note_ang')
                                 OR commissioned_by IN ('consult_ang', 'note_ang');
DELETE FROM voice_library     WHERE agent_id IN ('consult_ang', 'note_ang');
DELETE FROM agent_roster      WHERE id IN ('consult_ang', 'note_ang');

COMMIT;
