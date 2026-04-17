-- ============================================================
-- @aims/contracts — Initial schema
-- ============================================================
-- Migration 001: Charter ↔ Ledger dual-surface tables.
--
-- Every RFP → BAMARAM engagement has:
--   • one `charters` row (customer-safe artifact)
--   • one `ledgers` row (internal audit, shares engagement_id)
--   • ten `charter_stages` rows (one per stage, fill over time)
--   • N `ledger_entries` rows (append-only audit log)
--
-- Per 2026-04-17 Rish arbitration + docs/canon/Deploy-Charter-Template-3.1-UPDATED.md.
-- ============================================================

BEGIN;

-- ── 1. Enums (stages + HITL statuses + tier types) ──────────────────

DO $$ BEGIN
  CREATE TYPE rfp_bamaram_stage AS ENUM (
    'rfp_intake',
    'rfp_response',
    'commercial_proposal',
    'technical_sow',
    'formal_quote',
    'purchase_order',
    'assignment_log',
    'qa_security',
    'delivery_receipt',
    'completion_summary'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE hitl_gate_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'escalated'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE security_tier AS ENUM (
    'entry',
    'mid',
    'superior',
    'defense_grade'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE service_status AS ENUM (
    'disabled',
    'enabled',
    'custom'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE ledger_entry_type AS ENUM (
    'ICAR',
    'ACP_Biz',
    'ACP_Tech',
    'FDH',
    'HITL'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── 2. charters — customer-safe artifact ────────────────────────────

CREATE TABLE IF NOT EXISTS charters (
  -- Shared PK with ledgers (one engagement_id for the whole engagement)
  id                          TEXT PRIMARY KEY,

  -- Component 1: Header Identity Block
  plug_id                     TEXT NOT NULL,
  client_id                   TEXT NOT NULL,
  vendor                      TEXT NOT NULL DEFAULT 'Deploy by: ACHIEVEMOR',
  token                       TEXT,
  security_tier               security_tier NOT NULL DEFAULT 'entry',
  voice_services_status       service_status NOT NULL DEFAULT 'disabled',
  nft_services_status         service_status NOT NULL DEFAULT 'disabled',
  effective_date              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Components 2, 4–11 (component 3 = charter_stages table below)
  header_identity             JSONB,                                    -- 1 (rendered view)
  quote_po_cost_summary       JSONB,                                    -- 2
  four_question_lens          JSONB,                                    -- 4
  five_use_cases_pack         JSONB,                                    -- 5
  technical_blueprint         JSONB,                                    -- 6 (customer-safe only)
  security_level_components   JSONB,                                    -- 7
  okrs_kpis                   JSONB,                                    -- 8
  runbook                     JSONB,                                    -- 9
  legal_data_rights           JSONB,                                    -- 10
  acceptance                  JSONB,                                    -- 11

  -- Lifecycle
  bamaram_signal              BOOLEAN NOT NULL DEFAULT FALSE,

  -- Audit
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_charters_client ON charters(client_id);
CREATE INDEX IF NOT EXISTS idx_charters_plug ON charters(plug_id);
CREATE INDEX IF NOT EXISTS idx_charters_tier ON charters(security_tier);
CREATE INDEX IF NOT EXISTS idx_charters_bamaram ON charters(bamaram_signal);

-- ── 3. charter_stages — component 3 Timestamped Deliverables ────────

CREATE TABLE IF NOT EXISTS charter_stages (
  id                          BIGSERIAL PRIMARY KEY,
  charter_id                  TEXT NOT NULL REFERENCES charters(id) ON DELETE CASCADE,
  stage                       rfp_bamaram_stage NOT NULL,
  stage_ordinal               INTEGER NOT NULL CHECK (stage_ordinal BETWEEN 1 AND 10),

  -- Deliverable pointer
  artifact_uri                TEXT,
  what_changed                TEXT,

  -- Gate + ownership
  hitl_gate_status            hitl_gate_status NOT NULL DEFAULT 'pending',
  owner_agent                 TEXT,                                     -- e.g. 'ACHEEVY', 'NTNTN', 'CTO_Ang'

  -- Audit
  timestamp                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (charter_id, stage)
);

CREATE INDEX IF NOT EXISTS idx_charter_stages_charter  ON charter_stages(charter_id);
CREATE INDEX IF NOT EXISTS idx_charter_stages_status   ON charter_stages(hitl_gate_status);
CREATE INDEX IF NOT EXISTS idx_charter_stages_stage    ON charter_stages(stage);

-- ── 4. ledgers — internal audit artifact ────────────────────────────

CREATE TABLE IF NOT EXISTS ledgers (
  -- Same engagement_id as charters.id
  id                          TEXT PRIMARY KEY REFERENCES charters(id) ON DELETE CASCADE,

  -- Cost breakdown (never surfaced to customer)
  cost_breakdown              JSONB,                                    -- provider_cost, margin, melanium_fee, total
  melanium_allocations        JSONB NOT NULL DEFAULT '[]'::jsonb,       -- array of per-transaction splits
  risk_premium_adjustments    JSONB,

  -- Rationale (why decisions were made)
  rationale_entries           JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Step 3 Commercial Proposal outputs (set by Picker_Ang)
  picker_ang_bom              JSONB,                                    -- Bill of Materials
  picker_ang_security_addendum JSONB,
  picker_ang_iir_score        JSONB,                                    -- Impact / Integration-fit / Risk

  -- TTD-DR diffusion-loop evidence
  ttd_dr_cycles               JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Audit
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5. ledger_entries — append-only ICAR/ACP audit log ──────────────

CREATE TABLE IF NOT EXISTS ledger_entries (
  id                          BIGSERIAL PRIMARY KEY,
  ledger_id                   TEXT NOT NULL REFERENCES ledgers(id) ON DELETE CASCADE,
  stage                       rfp_bamaram_stage,
  entry_type                  ledger_entry_type NOT NULL,

  -- ICAR fields (nullable per entry_type)
  intent                      TEXT,
  context                     TEXT,
  action                      TEXT,
  result                      TEXT,

  -- Additional metadata
  confidence                  NUMERIC(3,2) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  owner                       TEXT,                                     -- agent or human id
  source_attribution          JSONB,                                    -- [{source_id, url, hash}, ...]
  payload                     JSONB,                                    -- entry-type-specific data

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_ledger ON ledger_entries(ledger_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_type   ON ledger_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_stage  ON ledger_entries(stage);

-- ── 6. updated_at triggers ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION contracts_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_charters_updated_at ON charters;
CREATE TRIGGER trg_charters_updated_at
  BEFORE UPDATE ON charters
  FOR EACH ROW EXECUTE FUNCTION contracts_set_updated_at();

DROP TRIGGER IF EXISTS trg_charter_stages_updated_at ON charter_stages;
CREATE TRIGGER trg_charter_stages_updated_at
  BEFORE UPDATE ON charter_stages
  FOR EACH ROW EXECUTE FUNCTION contracts_set_updated_at();

DROP TRIGGER IF EXISTS trg_ledgers_updated_at ON ledgers;
CREATE TRIGGER trg_ledgers_updated_at
  BEFORE UPDATE ON ledgers
  FOR EACH ROW EXECUTE FUNCTION contracts_set_updated_at();

COMMIT;
