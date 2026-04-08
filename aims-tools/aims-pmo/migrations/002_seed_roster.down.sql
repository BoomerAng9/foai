-- Rollback for migration 002 (seed roster)
BEGIN;

DELETE FROM agent_roster WHERE id IN (
  'tps_ang',
  'boomer_cpo', 'boomer_cdo', 'boomer_cmo', 'boomer_coo', 'boomer_cfo', 'boomer_cto',
  'chicken_hawk',
  'acheevy',
  'betty_anne_ang',
  'avva_noon'
);

COMMIT;
