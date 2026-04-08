-- ============================================================
-- A.I.M.S. PMO Office — Initial Schema
-- ============================================================
-- Migration 001: create core PMO tables
-- Per memory project_hr_pmo_office.md
--
-- Tables:
--   agent_roster          — registry of every agent in the fleet
--   agent_missions        — commissioned work, brief + outcome
--   agent_mission_events  — streaming execution log
--   agent_evaluations     — Betty-Anne_Ang's three-layer scores
--   agent_promotions      — Lil_Hawk → Chicken_Hawk maturity ladder
--   voice_library         — agent voices (per-user, BYOK supported)
--   pmo_forms             — Paperform form ID registry
--   pmo_form_drafts       — resume-anywhere form state
-- ============================================================

BEGIN;

-- ── 1. Agent roster ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_roster (
  id              TEXT PRIMARY KEY,
  agent_name      TEXT NOT NULL,
  agent_class     TEXT NOT NULL CHECK (agent_class IN (
    'avva_noon', 'acheevy', 'boomer_ang', 'chicken_hawk', 'lil_hawk',
    'sqwaadrun', 'specialist', 'pmo', 'tps_ang'
  )),
  rank            TEXT NOT NULL CHECK (rank IN (
    'trainee', 'junior', 'senior', 'lead', 'c_suite', 'ceo',
    'evaluator', '2ic', 'platform_brain'
  )),
  department      TEXT,
  mature          BOOLEAN NOT NULL DEFAULT FALSE,
  avatar_url      TEXT,
  persona_ref     TEXT,
  reports_to      TEXT REFERENCES agent_roster(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  promoted_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_roster_class ON agent_roster(agent_class);
CREATE INDEX IF NOT EXISTS idx_agent_roster_dept  ON agent_roster(department);
CREATE INDEX IF NOT EXISTS idx_agent_roster_reports ON agent_roster(reports_to);

-- ── 2. Agent missions (commissioned work) ───────────────────
CREATE TABLE IF NOT EXISTS agent_missions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  TEXT NOT NULL,
  commissioned_by          TEXT NOT NULL,
  commissioned_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_agent           TEXT NOT NULL REFERENCES agent_roster(id),
  mission_type             TEXT NOT NULL,

  -- PRE-WORK brief (drafted by the agent before execution)
  brief_scope              TEXT NOT NULL,
  brief_vision             TEXT NOT NULL,
  brief_expected_outcome   TEXT NOT NULL,
  brief_kpis               JSONB,
  brief_resources          JSONB,
  brief_submitted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Streaming reasoning (PiP window content)
  reasoning_stream         JSONB,
  upchain_consulted        JSONB,

  -- POST-WORK report (drafted after execution completes)
  outcome_report           TEXT,
  outcome_actual           JSONB,
  outcome_cost_usd         NUMERIC(10,4),
  outcome_tokens           INTEGER,
  outcome_duration_ms      BIGINT,
  outcome_submitted_at     TIMESTAMPTZ,

  -- Lifecycle (no HITL approval gate per project_chain_of_command.md)
  status                   TEXT NOT NULL DEFAULT 'drafted' CHECK (status IN (
    'drafted', 'running', 'completed', 'failed', 'cancelled'
  )),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at             TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_missions_user        ON agent_missions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_missions_agent       ON agent_missions(assigned_agent, status);
CREATE INDEX IF NOT EXISTS idx_missions_type        ON agent_missions(mission_type);
CREATE INDEX IF NOT EXISTS idx_missions_status      ON agent_missions(status);
CREATE INDEX IF NOT EXISTS idx_missions_completed   ON agent_missions(completed_at);

-- ── 3. Mission events (streaming log) ───────────────────────
CREATE TABLE IF NOT EXISTS agent_mission_events (
  id          BIGSERIAL PRIMARY KEY,
  mission_id  UUID NOT NULL REFERENCES agent_missions(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL CHECK (event_type IN (
    'tool_call', 'decision', 'blocker', 'progress', 'cost',
    'reasoning', 'consult', 'handoff'
  )),
  payload     JSONB NOT NULL,
  ts          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mission_events_mid_ts ON agent_mission_events(mission_id, ts);

-- ── 4. Agent evaluations (Betty-Anne_Ang's three-layer scoring) ──
CREATE TABLE IF NOT EXISTS agent_evaluations (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id               UUID NOT NULL REFERENCES agent_missions(id),
  agent_id                 TEXT NOT NULL REFERENCES agent_roster(id),
  evaluator                TEXT NOT NULL DEFAULT 'betty-anne_ang',

  -- Layer A: A.I.M.S. Organizational Fit Index (-11 to +18)
  --   7 Core Values × Yes/Maybe/No (+1/0/-1 each)
  --   Work Ability × 3 questions (+1/0/-1 each)
  --   Cultural Fit (+1/0/-1)
  --   Performance Level (-3 to +2)
  --   Keeper Test × 2 questions (+2/0/-1 each)
  fit_score_empathy            INTEGER CHECK (fit_score_empathy BETWEEN -1 AND 1),
  fit_score_vision             INTEGER CHECK (fit_score_vision BETWEEN -1 AND 1),
  fit_score_problem_solving    INTEGER CHECK (fit_score_problem_solving BETWEEN -1 AND 1),
  fit_score_passion            INTEGER CHECK (fit_score_passion BETWEEN -1 AND 1),
  fit_score_reliability        INTEGER CHECK (fit_score_reliability BETWEEN -1 AND 1),
  fit_score_collaboration      INTEGER CHECK (fit_score_collaboration BETWEEN -1 AND 1),
  fit_score_client_centricity  INTEGER CHECK (fit_score_client_centricity BETWEEN -1 AND 1),
  fit_work_ksa                 INTEGER CHECK (fit_work_ksa BETWEEN -1 AND 1),
  fit_work_roles               INTEGER CHECK (fit_work_roles BETWEEN -1 AND 1),
  fit_work_enjoys              INTEGER CHECK (fit_work_enjoys BETWEEN -1 AND 1),
  fit_cultural                 INTEGER CHECK (fit_cultural BETWEEN -1 AND 1),
  fit_performance              INTEGER CHECK (fit_performance BETWEEN -3 AND 2),
  fit_keeper_hire_today        INTEGER CHECK (fit_keeper_hire_today IN (-1, 0, 2)),
  fit_keeper_fight_to_keep     INTEGER CHECK (fit_keeper_fight_to_keep IN (-1, 0, 2)),
  fit_total                    INTEGER GENERATED ALWAYS AS (
    COALESCE(fit_score_empathy, 0) + COALESCE(fit_score_vision, 0) +
    COALESCE(fit_score_problem_solving, 0) + COALESCE(fit_score_passion, 0) +
    COALESCE(fit_score_reliability, 0) + COALESCE(fit_score_collaboration, 0) +
    COALESCE(fit_score_client_centricity, 0) +
    COALESCE(fit_work_ksa, 0) + COALESCE(fit_work_roles, 0) + COALESCE(fit_work_enjoys, 0) +
    COALESCE(fit_cultural, 0) + COALESCE(fit_performance, 0) +
    COALESCE(fit_keeper_hire_today, 0) + COALESCE(fit_keeper_fight_to_keep, 0)
  ) STORED,

  -- Layer B: A.I.M.S. KPI/OKR Metric (6 criteria × 1-5)
  kpi_quality_of_work          INTEGER CHECK (kpi_quality_of_work BETWEEN 1 AND 5),
  kpi_timeliness               INTEGER CHECK (kpi_timeliness BETWEEN 1 AND 5),
  kpi_creativity               INTEGER CHECK (kpi_creativity BETWEEN 1 AND 5),
  kpi_teamwork                 INTEGER CHECK (kpi_teamwork BETWEEN 1 AND 5),
  kpi_communication            INTEGER CHECK (kpi_communication BETWEEN 1 AND 5),
  kpi_professionalism          INTEGER CHECK (kpi_professionalism BETWEEN 1 AND 5),
  kpi_total                    INTEGER GENERATED ALWAYS AS (
    COALESCE(kpi_quality_of_work, 0) + COALESCE(kpi_timeliness, 0) +
    COALESCE(kpi_creativity, 0) + COALESCE(kpi_teamwork, 0) +
    COALESCE(kpi_communication, 0) + COALESCE(kpi_professionalism, 0)
  ) STORED,

  -- Layer C: NOON's V.I.B.E. (Verifiable, Idempotent, Bounded, Evident, 0-1 each)
  vibe_verifiable              NUMERIC(3,2) CHECK (vibe_verifiable BETWEEN 0 AND 1),
  vibe_idempotent              NUMERIC(3,2) CHECK (vibe_idempotent BETWEEN 0 AND 1),
  vibe_bounded                 NUMERIC(3,2) CHECK (vibe_bounded BETWEEN 0 AND 1),
  vibe_evident                 NUMERIC(3,2) CHECK (vibe_evident BETWEEN 0 AND 1),
  vibe_score                   NUMERIC(3,2) GENERATED ALWAYS AS (
    (COALESCE(vibe_verifiable, 0) + COALESCE(vibe_idempotent, 0) +
     COALESCE(vibe_bounded, 0) + COALESCE(vibe_evident, 0)) / 4.0
  ) STORED,

  -- Composite classification (Example Leader | Development Partner | PIP | PEI)
  classification               TEXT CHECK (classification IN (
    'example_leader', 'development_partner', 'pip', 'pei'
  )),

  notes                        TEXT,
  competitor_benchmark         JSONB,
  promote_candidate            BOOLEAN NOT NULL DEFAULT FALSE,
  evaluated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evaluations_agent  ON agent_evaluations(agent_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_mission ON agent_evaluations(mission_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_class  ON agent_evaluations(classification);
CREATE INDEX IF NOT EXISTS idx_evaluations_promote ON agent_evaluations(promote_candidate) WHERE promote_candidate = TRUE;

-- ── 5. Agent promotions (Lil_Hawk → Chicken_Hawk ladder) ────
CREATE TABLE IF NOT EXISTS agent_promotions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id            TEXT NOT NULL REFERENCES agent_roster(id),
  from_rank           TEXT NOT NULL,
  to_rank             TEXT NOT NULL,
  triggered_by_eval   UUID REFERENCES agent_evaluations(id),
  approved_by         TEXT NOT NULL,
  approved_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes               TEXT
);

CREATE INDEX IF NOT EXISTS idx_promotions_agent ON agent_promotions(agent_id);

-- ── 6. Voice library (per project_voice_library_system.md) ──
CREATE TABLE IF NOT EXISTS voice_library (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             TEXT NOT NULL,
  agent_id            TEXT REFERENCES agent_roster(id),
  voice_source        TEXT NOT NULL CHECK (voice_source IN (
    'preloaded', 'custom_spec', 'cloned', 'byok'
  )),
  voice_name          TEXT NOT NULL,
  provider            TEXT NOT NULL,
  provider_voice_id   TEXT,
  byok_key_ref        TEXT,
  spec_form           JSONB,
  sample_audio_url    TEXT,
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'building', 'ready', 'failed'
  )),
  built_at            TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_library_user_status ON voice_library(user_id, status);
CREATE INDEX IF NOT EXISTS idx_voice_library_agent ON voice_library(agent_id);

-- ── 7. Paperform integration tables ─────────────────────────
CREATE TABLE IF NOT EXISTS pmo_forms (
  id              TEXT PRIMARY KEY,
  form_type       TEXT NOT NULL CHECK (form_type IN (
    'mission_brief', 'tna', 'org_fit_index', 'kpi_okr',
    'interview_eval', 'onboarding', 'voice_spec', 'incident_response'
  )),
  paperform_id    TEXT NOT NULL,
  webhook_secret  TEXT,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pmo_form_drafts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL,
  form_id         TEXT NOT NULL REFERENCES pmo_forms(id),
  draft_data      JSONB NOT NULL,
  current_step    INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, form_id)
);

CREATE INDEX IF NOT EXISTS idx_form_drafts_user ON pmo_form_drafts(user_id);

COMMIT;
