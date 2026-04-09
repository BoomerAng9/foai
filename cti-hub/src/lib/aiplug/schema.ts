/**
 * aiPLUG & Play schema + ensureTables helper
 * ==============================================
 * Three tables backing the aiPLUG & Play launcher:
 *
 *   plugs       — one row per flagship demo plug (SMB Marketing,
 *                 Teacher Twin, Finance Analyst, ...). Metadata
 *                 only — the actual runtime code lives in
 *                 src/lib/aiplug/runtimes/<slug>.ts (I-2).
 *
 *   plug_runs   — one row per launch. Tracks state, inputs,
 *                 outputs, and timing for the autonomous runtime.
 *                 Per project_aiplug_and_play_launcher memory:
 *                 needed for the owner-viewable Logs sub-tab and
 *                 for heartbeat / long-loop state.
 *
 *   plug_run_events — append-only event log per run for Live
 *                     Look In and debugging. heartbeat, stage
 *                     transition, error, output.
 *
 * I-1 scope: schema + SMB Marketing seed + read-only UI surface.
 * I-2 scope: wire the autonomous runtime (Gemini Flash brain,
 *            Playwright MCP, Paperform/Stepper, GCS logs).
 */

import { sql } from '@/lib/insforge';

let tablesReady = false;

export async function ensureAiplugTables(): Promise<void> {
  if (tablesReady || !sql) return;

  // plugs — catalog of flagship demo plugs
  await sql`
    CREATE TABLE IF NOT EXISTS plugs (
      id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      slug            TEXT NOT NULL UNIQUE,
      name            TEXT NOT NULL,
      tagline         TEXT NOT NULL DEFAULT '',
      description     TEXT NOT NULL DEFAULT '',
      category        TEXT NOT NULL DEFAULT 'general',
      hero_image_url  TEXT NOT NULL DEFAULT '',
      status          TEXT NOT NULL DEFAULT 'draft',
      features        TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      tags            TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      price_cents     INTEGER NOT NULL DEFAULT 0,
      runtime_key     TEXT NOT NULL DEFAULT '',
      featured        BOOLEAN NOT NULL DEFAULT FALSE,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  // plug_runs — per-launch runtime state
  await sql`
    CREATE TABLE IF NOT EXISTS plug_runs (
      id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      plug_id         TEXT NOT NULL REFERENCES plugs(id) ON DELETE CASCADE,
      user_id         TEXT NOT NULL DEFAULT '',
      status          TEXT NOT NULL DEFAULT 'queued',
      inputs          JSONB NOT NULL DEFAULT '{}'::jsonb,
      outputs         JSONB NOT NULL DEFAULT '{}'::jsonb,
      error_message   TEXT NOT NULL DEFAULT '',
      started_at      TIMESTAMPTZ,
      finished_at     TIMESTAMPTZ,
      last_heartbeat  TIMESTAMPTZ,
      cost_tokens     INTEGER NOT NULL DEFAULT 0,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  // plug_run_events — append-only event log per run
  await sql`
    CREATE TABLE IF NOT EXISTS plug_run_events (
      id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      run_id          TEXT NOT NULL REFERENCES plug_runs(id) ON DELETE CASCADE,
      kind            TEXT NOT NULL,
      stage           TEXT NOT NULL DEFAULT '',
      message         TEXT NOT NULL DEFAULT '',
      payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  // Indices
  await sql`CREATE INDEX IF NOT EXISTS plugs_status_idx ON plugs (status)`;
  await sql`CREATE INDEX IF NOT EXISTS plugs_featured_idx ON plugs (featured, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS plug_runs_plug_idx ON plug_runs (plug_id, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS plug_runs_user_idx ON plug_runs (user_id, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS plug_run_events_run_idx ON plug_run_events (run_id, created_at ASC)`;

  // Seed SMB Marketing as the flagship demo plug if not already present
  const existing = await sql`SELECT id FROM plugs WHERE slug = 'smb-marketing' LIMIT 1`;
  if (existing.length === 0) {
    await sql`
      INSERT INTO plugs (
        slug, name, tagline, description, category, status,
        features, tags, price_cents, runtime_key, featured
      )
      VALUES (
        'smb-marketing',
        'SMB Marketing Agency',
        'Autonomous marketing operations for small and mid-sized businesses.',
        'A real agentic marketing agency that runs autonomously on your behalf. Drafts content, finds prospects, schedules campaigns, and reports weekly — all without human intervention. Built on the aiPLUG & Play runtime with multi-modal reasoning, browser control for live research, and secure owner-viewable logs.',
        'marketing',
        'ready',
        ARRAY[
          'Autonomous prospect research',
          'Content drafting and scheduling',
          'Campaign performance tracking',
          'Weekly executive reports',
          'Live browser automation',
          'Owner-viewable execution logs'
        ],
        ARRAY['marketing', 'agency', 'autonomous', 'flagship'],
        0,
        'smb-marketing',
        TRUE
      )
    `;
  }

<<<<<<< HEAD
  // Seed Teacher Twin
  const existingTt = await sql`SELECT id FROM plugs WHERE slug = 'teacher-twin' LIMIT 1`;
  if (existingTt.length === 0) {
    await sql`
      INSERT INTO plugs (
        slug, name, tagline, description, category, status,
        features, tags, price_cents, runtime_key, featured
      )
      VALUES (
        'teacher-twin',
        'Teacher Twin',
        'Autonomous teaching assistant for classroom and tutoring contexts.',
        'A real agentic teaching partner that builds 2-week learning plans, generates ready-to-print assessments with answer keys, and drafts parent briefings — all grade-appropriate and localized when needed. Every non-English parent brief ships with English labels alongside for ESL households. The Parent Portal invitation flow is the next step.',
        'education',
        'ready',
        ARRAY[
          'Grade-appropriate curriculum plans',
          'Ready-to-print quizzes + worksheets + rubrics',
          'Answer keys generated per assessment',
          'Parent briefings with ESL-friendly bilingual labels',
          'Parent Portal invitation flow (coming in I-3b)',
          'Owner-viewable execution logs'
        ],
        ARRAY['education', 'classroom', 'tutoring', 'parent-portal', 'flagship'],
        0,
        'teacher-twin',
        FALSE
      )
    `;
  }

  // Seed Finance Analyst
  const existingFa = await sql`SELECT id FROM plugs WHERE slug = 'finance-analyst' LIMIT 1`;
  if (existingFa.length === 0) {
    await sql`
      INSERT INTO plugs (
        slug, name, tagline, description, category, status,
        features, tags, price_cents, runtime_key, featured
      )
      VALUES (
        'finance-analyst',
        'Finance Analyst',
        'Autonomous CFO for small and mid-sized businesses, solo operators, and fractional engagements.',
        'A real agentic financial analyst that ships a health snapshot, a 12-week cash flow forecast, and 5 prioritized weekly actions in one launch. Numerate, direct, no-nonsense voice. Flags missing inputs instead of fabricating numbers. Real LLM calls through the free-model cascade — no canned replies.',
        'finance',
        'ready',
        ARRAY[
          'Financial health snapshot (runway + top risks + opportunities)',
          '12-week cash flow forecast with narrative',
          '5 prioritized weekly actions with impact estimates',
          'Flags missing inputs instead of fabricating numbers',
          'Conversational Finance Analyst chat (coming in I-4b)',
          'Owner-viewable execution logs'
        ],
        ARRAY['finance', 'cfo', 'cash-flow', 'forecast', 'flagship'],
        0,
        'finance-analyst',
        FALSE
      )
    `;
  }

  tablesReady = true;
}
