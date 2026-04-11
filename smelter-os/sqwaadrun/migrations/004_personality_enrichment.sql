-- Migration 004: Personality & Identity Enrichment schema
-- Extends person_identities with per-provider personality profiles
-- Adds normalized cross-provider view table
-- Adds PE tracking columns to mission tables

-- 1. Person identity personality columns
ALTER TABLE person_identities
  ADD COLUMN IF NOT EXISTS personality_profile_crystal     JSONB,
  ADD COLUMN IF NOT EXISTS personality_profile_humantic    JSONB,
  ADD COLUMN IF NOT EXISTS personality_profile_receptiviti JSONB,
  ADD COLUMN IF NOT EXISTS personality_profile_sentino     JSONB,
  ADD COLUMN IF NOT EXISTS personality_profile_updated_at  TIMESTAMPTZ;

COMMENT ON COLUMN person_identities.personality_profile_crystal IS 'Raw Crystal Knows DISC profile JSON';
COMMENT ON COLUMN person_identities.personality_profile_humantic IS 'Raw Humantic AI Big Five + DISC JSON';
COMMENT ON COLUMN person_identities.personality_profile_receptiviti IS 'Raw Receptiviti 200+ psych signals JSON';
COMMENT ON COLUMN person_identities.personality_profile_sentino IS 'Raw Sentino Big Five/NEO/HEXACO/DISC JSON';

-- 2. Normalized cross-provider personality view
CREATE TABLE IF NOT EXISTS person_personality_normalized (
  person_id UUID PRIMARY KEY,
  disc_type TEXT,
  disc_d NUMERIC, disc_i NUMERIC, disc_s NUMERIC, disc_c NUMERIC,
  big5_openness NUMERIC, big5_conscientiousness NUMERIC,
  big5_extraversion NUMERIC, big5_agreeableness NUMERIC,
  big5_neuroticism NUMERIC,
  source_priority TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE person_personality_normalized IS 'Unified personality scores derived from best available provider per trait';

-- 3. PE tracking on mission tables
ALTER TABLE sqwaadrun_staging.mission_log
  ADD COLUMN IF NOT EXISTS personality_providers_used TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS personality_profiles_generated INTEGER DEFAULT 0;

ALTER TABLE sqwaadrun_production.mission_archive
  ADD COLUMN IF NOT EXISTS personality_providers_used TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS personality_profiles_generated INTEGER DEFAULT 0;
