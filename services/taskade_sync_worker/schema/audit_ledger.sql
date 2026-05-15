-- foai.audit_ledger + foai.coaching_notes canonical schema
--
-- This file is the SOURCE OF TRUTH for Track B (#93) and consumed by:
--   - Track B writer service (writes audit events from FOAI agents)
--   - Phase 5 sync worker (mirrors to Taskade)
--   - Phase 6 HRPMO loop (reads for V.I.B.E. + KPI + Org Fit scoring)
--
-- Apply via: psql "$NEON_DATABASE_URL" -f audit_ledger.sql
-- Idempotent — safe to re-run.

BEGIN;

CREATE SCHEMA IF NOT EXISTS foai;

-- ─── audit_ledger ─────────────────────────────────────────────────────────
-- One row per agent action across the FOAI ecosystem. Customer PII goes in
-- customer_uid (will be SHA-256 hashed before any cross-perimeter render).

CREATE TABLE IF NOT EXISTS foai.audit_ledger (
    event_id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    agent              TEXT         NOT NULL,
    action             TEXT         NOT NULL,
    payload            JSONB        NOT NULL DEFAULT '{}'::jsonb,
    customer_uid       TEXT         NULL,
    timestamp_event    TIMESTAMPTZ  NOT NULL,
    synced_to_taskade_at  TIMESTAMPTZ  NULL,
    sync_attempt_count INTEGER      NOT NULL DEFAULT 0,
    last_sync_error    TEXT         NULL,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_ledger_unsynced
    ON foai.audit_ledger (timestamp_event)
    WHERE synced_to_taskade_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_audit_ledger_agent_timestamp
    ON foai.audit_ledger (agent, timestamp_event DESC);

CREATE INDEX IF NOT EXISTS idx_audit_ledger_customer_uid
    ON foai.audit_ledger (customer_uid)
    WHERE customer_uid IS NOT NULL;

-- ─── coaching_notes ────────────────────────────────────────────────────────
-- One row per HRPMO coaching cycle. Authored by Betty-Anne_Ang (with
-- AutoResearch); approved by ACHEEVY (Telegram); outcome measured next cycle.

CREATE TABLE IF NOT EXISTS foai.coaching_notes (
    note_id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name           TEXT         NOT NULL,
    week_iso             TEXT         NOT NULL,
    body_md              TEXT         NOT NULL,
    authored_by          TEXT         NOT NULL DEFAULT 'Betty-Anne_Ang',
    skill_recipe_path    TEXT         NULL,
    approved_by          TEXT         NULL,
    approved_at          TIMESTAMPTZ  NULL,
    taskade_project_id   TEXT         NULL,
    outcome              TEXT         NOT NULL DEFAULT 'pending'
                           CHECK (outcome IN ('pending','improved','no_change','worsened')),
    outcome_measured_at  TIMESTAMPTZ  NULL,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (agent_name, week_iso)
);

CREATE INDEX IF NOT EXISTS idx_coaching_notes_agent_week
    ON foai.coaching_notes (agent_name, week_iso DESC);

CREATE INDEX IF NOT EXISTS idx_coaching_notes_pending_approval
    ON foai.coaching_notes (created_at)
    WHERE approved_at IS NULL;

COMMIT;
