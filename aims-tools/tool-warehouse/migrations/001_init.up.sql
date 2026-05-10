-- ============================================================
-- @aims/tool-warehouse — Initial schema
-- ============================================================
-- Migration 001: canonical tool inventory.
--
-- Picker_Ang scans this table at RFP→BAMARAM Step 3 (Commercial Proposal)
-- to produce the BoM JSON + Security Addendum. Replaces the outdated
-- v4 markdown wrapper doc.
-- ============================================================

BEGIN;

DO $$ BEGIN
  CREATE TYPE tool_tier AS ENUM (
    'orchestration',
    'integration',
    'plug_factory',
    'voice_sdk',
    'agent_framework',
    'smelter_os_foundry',
    'persistence',
    'security',
    'external_integration'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE tool_status AS ENUM ('active', 'standby', 'deprecated', 'experimental');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE tool_priority AS ENUM ('critical', 'high', 'medium', 'low');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE tool_license AS ENUM (
    'mit',
    'apache_2_0',
    'bsd',
    'gpl',
    'proprietary',
    'freemium',
    'commercial',
    'unknown'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS tools (
  id                          TEXT PRIMARY KEY,
  name                        TEXT NOT NULL,
  tier                        tool_tier NOT NULL,
  tier_ordinal                INTEGER NOT NULL CHECK (tier_ordinal BETWEEN 1 AND 9),
  category                    TEXT NOT NULL,
  description                 TEXT NOT NULL,

  -- Surfacing rules
  internal_only               BOOLEAN NOT NULL DEFAULT FALSE,
  customer_safe_label         TEXT,                                -- when surfaced, render this instead of `name`

  -- Attribution
  license                     tool_license NOT NULL DEFAULT 'unknown',
  repo_url                    TEXT,
  vendor                      TEXT,
  stars                       INTEGER,
  homepage_url                TEXT,

  -- Lifecycle
  status                      tool_status NOT NULL DEFAULT 'active',
  priority                    tool_priority NOT NULL DEFAULT 'medium',
  rating                      TEXT,                                -- '⭐⭐⭐⭐⭐' etc.
  circuit_breaker_id          TEXT,                                -- e.g. 'CB_MANUS_AI'
  health_endpoint             TEXT,

  -- Ownership (which Boomer_Ang or House wing manages it)
  owner_ang                   TEXT,

  -- Cost model + capabilities as JSONB for flexibility
  cost_model                  JSONB,                               -- { type, pricePerUnit, tierGating, ... }
  capabilities                JSONB NOT NULL DEFAULT '[]'::jsonb,  -- tags
  metadata                    JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Audit
  added_to_warehouse          DATE,
  last_verified               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tools_tier         ON tools(tier);
CREATE INDEX IF NOT EXISTS idx_tools_status       ON tools(status);
CREATE INDEX IF NOT EXISTS idx_tools_priority     ON tools(priority);
CREATE INDEX IF NOT EXISTS idx_tools_internal     ON tools(internal_only);
CREATE INDEX IF NOT EXISTS idx_tools_owner        ON tools(owner_ang);
CREATE INDEX IF NOT EXISTS idx_tools_capabilities ON tools USING GIN (capabilities);

CREATE OR REPLACE FUNCTION tool_warehouse_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tools_updated_at ON tools;
CREATE TRIGGER trg_tools_updated_at
  BEFORE UPDATE ON tools
  FOR EACH ROW EXECUTE FUNCTION tool_warehouse_set_updated_at();

COMMIT;
