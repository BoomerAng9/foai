-- ============================================================
-- A.I.M.S. Pricing Matrix — Initial Schema
-- ============================================================
-- Migration 001: create the canonical pricing & catalog tables.
--
-- Mirrors the TypeScript types in src/types.ts. The shape is the
-- HIDT/A.I.M.S. multi-axis cross-tab (sector x topic x audience x
-- level x cost) adopted from Rish's 2022 workforce matrix.
--
-- Tables:
--   aims_pricing_matrix     — main rows (model, plan, bundle, service,
--                             pillar, compliance)
--   aims_pricing_bundles    — mix-and-match combinations
--   aims_pricing_history    — audit log for owner edits
--   aims_task_multipliers   — task & automation multipliers
-- ============================================================

BEGIN;

-- ── 1. Main pricing matrix ──────────────────────────────────
CREATE TABLE IF NOT EXISTS aims_pricing_matrix (
  id                    TEXT PRIMARY KEY,
  row_type              TEXT NOT NULL CHECK (row_type IN (
    'model', 'plan', 'bundle', 'service', 'pillar', 'compliance'
  )),
  sector                TEXT NOT NULL CHECK (sector IN (
    'llm', 'image', 'video', 'audio', 'tts', 'stt', 'embed',
    'storage', 'compute', 'mcp', 'plan', 'pillar', 'compliance', 'workforce'
  )),
  topic                 TEXT NOT NULL,
  description           TEXT,

  -- Provider details
  provider_id           TEXT,
  provider_name         TEXT,
  route_id              TEXT,
  license               TEXT CHECK (license IN ('open-source', 'proprietary', 'mixed')),

  -- Capability tagging (jsonb array of capability strings)
  capabilities          JSONB NOT NULL DEFAULT '[]'::jsonb,
  context_window        INTEGER,

  -- Tiering
  tier                  TEXT CHECK (tier IN (
    'open-source', 'free', 'fast', 'standard', 'premium', 'flagship'
  )),
  unlocked_at           JSONB NOT NULL DEFAULT '[]'::jsonb,    -- frequency array
  vibe_groups           JSONB NOT NULL DEFAULT '[]'::jsonb,    -- group array

  -- Pricing
  input_per_1m          NUMERIC(10,4),
  output_per_1m         NUMERIC(10,4),
  unit_price            NUMERIC(10,4),
  unit                  TEXT CHECK (unit IN (
    'per_image', 'per_second', 'per_minute', 'per_gb_month',
    'per_request', 'per_seat_month'
  )),

  -- Multi-currency
  multi_currency        JSONB,

  ppu_multiplier        NUMERIC(5,2) NOT NULL DEFAULT 1.4,

  -- Three Pillars uplifts
  confidence_uplift     NUMERIC(5,2),
  convenience_uplift    NUMERIC(5,2),
  security_uplift       NUMERIC(5,2),

  -- Competitive context
  competitor            JSONB,
  demand                TEXT CHECK (demand IN ('High', 'Moderate', 'Medium', 'Low')),
  importance            TEXT CHECK (importance IN ('Essential', 'High', 'Medium', 'Low')),

  -- Prerequisites & outcomes
  prerequisites         JSONB,
  outcomes              JSONB,
  cert_level            TEXT CHECK (cert_level IN ('Basic', 'Intermediate', 'Advanced')),
  accreditation         TEXT,
  source_url            TEXT,

  benchmarks            JSONB,

  -- Lifecycle
  last_verified         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active                BOOLEAN NOT NULL DEFAULT TRUE,
  notes                 TEXT,

  -- Latest-only enforcement
  superseded_by         TEXT,
  is_latest             BOOLEAN,

  -- Routing
  routing_priority      INTEGER,
  vendor_rank           INTEGER CHECK (vendor_rank IN (1, 2, 3, 4)),

  -- Audit
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apm_row_type      ON aims_pricing_matrix(row_type);
CREATE INDEX IF NOT EXISTS idx_apm_sector_active ON aims_pricing_matrix(sector, active);
CREATE INDEX IF NOT EXISTS idx_apm_tier          ON aims_pricing_matrix(tier);
CREATE INDEX IF NOT EXISTS idx_apm_provider      ON aims_pricing_matrix(provider_id);
CREATE INDEX IF NOT EXISTS idx_apm_route         ON aims_pricing_matrix(route_id);
CREATE INDEX IF NOT EXISTS idx_apm_routing_pri   ON aims_pricing_matrix(routing_priority) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_apm_capabilities  ON aims_pricing_matrix USING GIN (capabilities);

-- ── 2. Bundles ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS aims_pricing_bundles (
  id                    TEXT PRIMARY KEY,
  name                  TEXT NOT NULL,
  description           TEXT NOT NULL,
  member_ids            JSONB NOT NULL,           -- array of pricing_matrix.id
  bundle_price_usd      NUMERIC(10,4),
  savings_vs_sum_usd    NUMERIC(10,4),
  vibe_groups           JSONB NOT NULL DEFAULT '[]'::jsonb,
  active                BOOLEAN NOT NULL DEFAULT TRUE,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bundles_active ON aims_pricing_bundles(active);

-- ── 3. Audit history ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS aims_pricing_history (
  id            BIGSERIAL PRIMARY KEY,
  matrix_id     TEXT REFERENCES aims_pricing_matrix(id),
  field         TEXT NOT NULL,
  old_value     TEXT,
  new_value     TEXT,
  changed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by    TEXT,
  source        TEXT
);

CREATE INDEX IF NOT EXISTS idx_history_matrix ON aims_pricing_history(matrix_id, changed_at);

-- ── 4. Task multipliers ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS aims_task_multipliers (
  task_type     TEXT PRIMARY KEY CHECK (task_type IN (
    'code-generation', 'code-review', 'workflow-automation',
    'security-audit', 'architecture-planning', 'business-intelligence',
    'deployment', 'multi-agent', 'full-autonomous'
  )),
  label         TEXT NOT NULL,
  multiplier    NUMERIC(5,2) NOT NULL,
  description   TEXT NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5. updated_at trigger ───────────────────────────────────
CREATE OR REPLACE FUNCTION aims_pricing_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_apm_updated_at ON aims_pricing_matrix;
CREATE TRIGGER trg_apm_updated_at
  BEFORE UPDATE ON aims_pricing_matrix
  FOR EACH ROW
  EXECUTE FUNCTION aims_pricing_set_updated_at();

DROP TRIGGER IF EXISTS trg_bundles_updated_at ON aims_pricing_bundles;
CREATE TRIGGER trg_bundles_updated_at
  BEFORE UPDATE ON aims_pricing_bundles
  FOR EACH ROW
  EXECUTE FUNCTION aims_pricing_set_updated_at();

COMMIT;
