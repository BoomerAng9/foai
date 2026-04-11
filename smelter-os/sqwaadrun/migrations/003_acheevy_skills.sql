-- Migration 003: ACHEEVY Skill alignment for Sqwaadrun missions
-- Patches both staging and production schemas

ALTER TABLE sqwaadrun_staging.mission_log
  ADD COLUMN IF NOT EXISTS primary_skill TEXT,
  ADD COLUMN IF NOT EXISTS secondary_skills TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS business_engine TEXT,
  ADD COLUMN IF NOT EXISTS hawk_skill_mix JSONB DEFAULT '{}'::JSONB;

ALTER TABLE sqwaadrun_production.mission_archive
  ADD COLUMN IF NOT EXISTS primary_skill TEXT,
  ADD COLUMN IF NOT EXISTS secondary_skills TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS business_engine TEXT,
  ADD COLUMN IF NOT EXISTS hawk_skill_mix JSONB DEFAULT '{}'::JSONB;

-- Optional: COMMENT for documentation
COMMENT ON COLUMN sqwaadrun_staging.mission_log.primary_skill IS 'One of 10 ACHEEVY skills: MARKETING|TECH|SALES|OPERATIONS|FINANCE|TALENT|PARTNERSHIPS|PRODUCT|NARRATIVE|CRISIS';
COMMENT ON COLUMN sqwaadrun_staging.mission_log.business_engine IS 'e.g. mindedge|open_seat|foai_cloud|generic|client_<slug>';
COMMENT ON COLUMN sqwaadrun_staging.mission_log.hawk_skill_mix IS 'Snapshot of hawk_id -> [skills] for the squad that flew this mission';
