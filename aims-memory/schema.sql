-- ═══════════════════════════════════════════════════════════
-- FOAI-AIMS: Organizational Memory Layer
-- Agent memory, project plans, KPI/OKR tracking, HR PMO evaluation
-- Neon Postgres + pgvector. Multi-tenant. All agents.
-- ═══════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Agent Memory ──────────────────────────────────────────
-- Semantic long-term memory for every agent in the hierarchy.
-- Each task, evaluation, decision, and outcome is embedded
-- and retrievable by similarity for informed future actions.

CREATE TABLE IF NOT EXISTS public.agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'cti',
  agent_name TEXT NOT NULL,          -- Edu_Ang, Scout_Ang, Chicken_Hawk, ACHEEVY, etc.
  agent_tier TEXT NOT NULL,          -- boss, 2ic, boomer_ang, lil_hawk, engine
  dept TEXT,                         -- PMO-ECHO, PMO-SHIELD, PMO-PULSE, PMO-LAUNCH, PMO-LENS
  content TEXT NOT NULL,             -- Full text of the memory
  summary TEXT,                      -- Short summary for display
  embedding VECTOR(768),            -- Gemini text-embedding-004
  memory_type TEXT NOT NULL DEFAULT 'task',  -- task, evaluation, directive, decision, project_plan, kpi_result
  source_id TEXT,                    -- Reference to task_id, eval_id, plan_id
  metadata JSONB DEFAULT '{}',      -- Flexible: scores, durations, costs, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Project Plans ─────────────────────────────────────────
-- Every task requires a project plan before execution.
-- Agents draft: task, role, mission, vision, objective.
-- This is the foundation for running a real org agentically.

CREATE TABLE IF NOT EXISTS public.project_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'cti',
  agent_name TEXT NOT NULL,
  agent_tier TEXT NOT NULL,
  dept TEXT,
  task_id TEXT NOT NULL,             -- Links to state_emitter task_id
  title TEXT NOT NULL,               -- Task title
  role TEXT NOT NULL,                -- Agent's role in this task
  mission TEXT NOT NULL,             -- What the agent is trying to accomplish
  vision TEXT NOT NULL,              -- Desired end state
  objective TEXT NOT NULL,           -- Measurable objective
  steps JSONB NOT NULL DEFAULT '[]', -- Ordered execution steps
  estimated_duration_ms BIGINT,     -- Projected duration
  actual_duration_ms BIGINT,        -- Actual duration (filled on completion)
  status TEXT NOT NULL DEFAULT 'drafted', -- drafted, in_progress, completed, failed
  score INT,                        -- Quality score (0-100) on completion
  grade TEXT,                        -- Letter grade (A-F)
  embedding VECTOR(768),            -- Embedded plan for semantic recall
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ─── KPI Definitions ──────────────────────────────────────
-- Each agent has defined KPIs tracked over time.
-- HR PMO measures these continuously.

CREATE TABLE IF NOT EXISTS public.agent_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'cti',
  agent_name TEXT NOT NULL,
  agent_tier TEXT NOT NULL,
  kpi_name TEXT NOT NULL,            -- e.g. "enrollment_conversion_rate"
  kpi_description TEXT NOT NULL,     -- Human-readable description
  target_value DOUBLE PRECISION NOT NULL,  -- Target threshold
  unit TEXT NOT NULL DEFAULT 'percent',    -- percent, count, usd, ms, score
  measurement_interval TEXT NOT NULL DEFAULT 'weekly', -- daily, weekly, monthly
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, agent_name, kpi_name)
);

-- ─── KPI Measurements ─────────────────────────────────────
-- Actual measurements against KPI definitions.

CREATE TABLE IF NOT EXISTS public.kpi_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'cti',
  agent_name TEXT NOT NULL,
  kpi_name TEXT NOT NULL,
  actual_value DOUBLE PRECISION NOT NULL,
  target_value DOUBLE PRECISION NOT NULL,
  met BOOLEAN NOT NULL,              -- Did it meet the target?
  delta DOUBLE PRECISION,            -- actual - target (positive = exceeded)
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  measured_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── OKR Definitions ──────────────────────────────────────
-- Quarterly objectives with key results per agent.

CREATE TABLE IF NOT EXISTS public.agent_okrs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'cti',
  agent_name TEXT NOT NULL,
  agent_tier TEXT NOT NULL,
  quarter TEXT NOT NULL,             -- e.g. "2026-Q1"
  objective TEXT NOT NULL,           -- The objective
  status TEXT NOT NULL DEFAULT 'active', -- active, completed, abandoned
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.okr_key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_id UUID NOT NULL REFERENCES agent_okrs(id) ON DELETE CASCADE,
  key_result TEXT NOT NULL,
  target_value DOUBLE PRECISION NOT NULL,
  current_value DOUBLE PRECISION NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'percent',
  progress DOUBLE PRECISION GENERATED ALWAYS AS (
    CASE WHEN target_value = 0 THEN 0
         ELSE LEAST((current_value / target_value) * 100, 100)
    END
  ) STORED,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── HR PMO Evaluations ───────────────────────────────────
-- Periodic performance evaluations by HR PMO.
-- Measures agents against their KPIs and OKRs.

CREATE TABLE IF NOT EXISTS public.hr_pmo_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'cti',
  agent_name TEXT NOT NULL,
  agent_tier TEXT NOT NULL,
  dept TEXT,
  eval_type TEXT NOT NULL DEFAULT 'periodic', -- periodic, task_review, promotion_review
  period TEXT NOT NULL,              -- "2026-W13", "2026-Q1", task_id
  kpi_summary JSONB NOT NULL DEFAULT '{}',   -- Snapshot of KPI performance
  okr_summary JSONB NOT NULL DEFAULT '{}',   -- Snapshot of OKR progress
  overall_score INT NOT NULL,        -- 0-100
  grade TEXT NOT NULL,               -- A-F
  strengths JSONB DEFAULT '[]',
  improvements JSONB DEFAULT '[]',
  directive TEXT,                    -- Next action required
  evaluated_by TEXT NOT NULL DEFAULT 'hermes', -- hermes, acheevy, manual
  embedding VECTOR(768),            -- Embedded for trend analysis
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- Indexes
-- ═══════════════════════════════════════════════════════════

-- Agent memory: semantic search
CREATE INDEX IF NOT EXISTS idx_agent_memory_tenant_agent ON agent_memory(tenant_id, agent_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_memory_embedding ON agent_memory USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_agent_memory_type ON agent_memory(memory_type, tenant_id);

-- Project plans
CREATE INDEX IF NOT EXISTS idx_project_plans_agent ON project_plans(tenant_id, agent_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_plans_status ON project_plans(status, tenant_id);
CREATE INDEX IF NOT EXISTS idx_project_plans_embedding ON project_plans USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- KPIs
CREATE INDEX IF NOT EXISTS idx_kpi_measurements_agent ON kpi_measurements(tenant_id, agent_name, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_measurements_period ON kpi_measurements(period_start, period_end);

-- OKRs
CREATE INDEX IF NOT EXISTS idx_agent_okrs_quarter ON agent_okrs(tenant_id, quarter, agent_name);
CREATE INDEX IF NOT EXISTS idx_okr_key_results_okr ON okr_key_results(okr_id);

-- HR PMO evaluations
CREATE INDEX IF NOT EXISTS idx_hr_pmo_evaluations_agent ON hr_pmo_evaluations(tenant_id, agent_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hr_pmo_evaluations_embedding ON hr_pmo_evaluations USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
