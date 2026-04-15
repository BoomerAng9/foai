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

const REQUIRED_PLUG_COLUMNS = [
  { name: 'tagline', statement: "ALTER TABLE plugs ADD COLUMN tagline TEXT NOT NULL DEFAULT ''" },
  { name: 'description', statement: "ALTER TABLE plugs ADD COLUMN description TEXT NOT NULL DEFAULT ''" },
  { name: 'category', statement: "ALTER TABLE plugs ADD COLUMN category TEXT NOT NULL DEFAULT 'general'" },
  { name: 'hero_image_url', statement: "ALTER TABLE plugs ADD COLUMN hero_image_url TEXT NOT NULL DEFAULT ''" },
  { name: 'status', statement: "ALTER TABLE plugs ADD COLUMN status TEXT NOT NULL DEFAULT 'draft'" },
  { name: 'features', statement: "ALTER TABLE plugs ADD COLUMN features TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]" },
  { name: 'tags', statement: "ALTER TABLE plugs ADD COLUMN tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]" },
  { name: 'price_cents', statement: "ALTER TABLE plugs ADD COLUMN price_cents INTEGER NOT NULL DEFAULT 0" },
  { name: 'runtime_key', statement: "ALTER TABLE plugs ADD COLUMN runtime_key TEXT NOT NULL DEFAULT ''" },
  { name: 'featured', statement: "ALTER TABLE plugs ADD COLUMN featured BOOLEAN NOT NULL DEFAULT FALSE" },
  { name: 'updated_at', statement: "ALTER TABLE plugs ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now()" },
] as const;

const REQUIRED_RUN_COLUMNS = [
  { name: 'user_id', statement: "ALTER TABLE plug_runs ADD COLUMN user_id TEXT NOT NULL DEFAULT ''" },
  { name: 'status', statement: "ALTER TABLE plug_runs ADD COLUMN status TEXT NOT NULL DEFAULT 'queued'" },
  { name: 'inputs', statement: "ALTER TABLE plug_runs ADD COLUMN inputs JSONB NOT NULL DEFAULT '{}'::jsonb" },
  { name: 'outputs', statement: "ALTER TABLE plug_runs ADD COLUMN outputs JSONB NOT NULL DEFAULT '{}'::jsonb" },
  { name: 'error_message', statement: "ALTER TABLE plug_runs ADD COLUMN error_message TEXT NOT NULL DEFAULT ''" },
  { name: 'started_at', statement: 'ALTER TABLE plug_runs ADD COLUMN started_at TIMESTAMPTZ' },
  { name: 'finished_at', statement: 'ALTER TABLE plug_runs ADD COLUMN finished_at TIMESTAMPTZ' },
  { name: 'last_heartbeat', statement: 'ALTER TABLE plug_runs ADD COLUMN last_heartbeat TIMESTAMPTZ' },
  { name: 'cost_tokens', statement: 'ALTER TABLE plug_runs ADD COLUMN cost_tokens INTEGER NOT NULL DEFAULT 0' },
  { name: 'created_at', statement: 'ALTER TABLE plug_runs ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now()' },
] as const;

const REQUIRED_EVENT_COLUMNS = [
  { name: 'stage', statement: "ALTER TABLE plug_run_events ADD COLUMN stage TEXT NOT NULL DEFAULT ''" },
  { name: 'message', statement: "ALTER TABLE plug_run_events ADD COLUMN message TEXT NOT NULL DEFAULT ''" },
  { name: 'payload', statement: "ALTER TABLE plug_run_events ADD COLUMN payload JSONB NOT NULL DEFAULT '{}'::jsonb" },
  { name: 'created_at', statement: 'ALTER TABLE plug_run_events ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now()' },
] as const;

function quoteIdent(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function getExistingColumns(tableName: string): Promise<Set<string>> {
  if (!sql) return new Set();

  const rows = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${tableName}
  `;

  return new Set(rows.map(row => String(row.column_name)));
}

async function getColumnType(tableName: string, columnName: string): Promise<string | null> {
  if (!sql) return null;

  const rows = await sql`
    SELECT data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${tableName}
      AND column_name = ${columnName}
    LIMIT 1
  `;

  return rows[0]?.data_type ? String(rows[0].data_type) : null;
}

async function ensureColumns(
  tableName: string,
  columns: ReadonlyArray<{ name: string; statement: string }>,
): Promise<void> {
  if (!sql) return;

  const existingColumns = await getExistingColumns(tableName);

  for (const column of columns) {
    if (!existingColumns.has(column.name)) {
      await sql.unsafe(column.statement);
    }
  }
}

async function ensureTextKeyColumn(
  tableName: string,
  columnName: string,
  defaultExpression?: string,
): Promise<void> {
  if (!sql) return;

  const currentType = await getColumnType(tableName, columnName);
  if (!currentType) return;

  if (currentType !== 'text') {
    await sql.unsafe(
      `ALTER TABLE ${quoteIdent(tableName)} ALTER COLUMN ${quoteIdent(columnName)} TYPE TEXT USING ${quoteIdent(columnName)}::text`
    );
  }

  if (defaultExpression) {
    await sql.unsafe(
      `ALTER TABLE ${quoteIdent(tableName)} ALTER COLUMN ${quoteIdent(columnName)} SET DEFAULT ${defaultExpression}`
    );
  }
}

async function rebuildForeignKey(
  tableName: string,
  constraintName: string,
  columnName: string,
  referenceTable: string,
  referenceColumn: string,
): Promise<void> {
  if (!sql) return;

  await sql.unsafe(
    `ALTER TABLE ${quoteIdent(tableName)} DROP CONSTRAINT IF EXISTS ${quoteIdent(constraintName)}`
  );
  await sql.unsafe(
    `ALTER TABLE ${quoteIdent(tableName)} ADD CONSTRAINT ${quoteIdent(constraintName)} FOREIGN KEY (${quoteIdent(columnName)}) REFERENCES ${quoteIdent(referenceTable)}(${quoteIdent(referenceColumn)}) ON DELETE CASCADE`
  );
}

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
  // NOTE: FK to plugs removed — the plugs table may have been created
  // with a different id type in a prior migration. App-level validation
  // checks plug existence before inserting a run.
  await sql`
    CREATE TABLE IF NOT EXISTS plug_runs (
      id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      plug_id         TEXT NOT NULL,
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
  // NOTE: FK to plug_runs removed for same reason as above.
  await sql`
    CREATE TABLE IF NOT EXISTS plug_run_events (
      id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      run_id          TEXT NOT NULL,
      kind            TEXT NOT NULL,
      stage           TEXT NOT NULL DEFAULT '',
      message         TEXT NOT NULL DEFAULT '',
      payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await ensureTextKeyColumn('plugs', 'id', 'gen_random_uuid()::text');
  await ensureTextKeyColumn('plug_runs', 'id', 'gen_random_uuid()::text');
  await ensureTextKeyColumn('plug_runs', 'plug_id');
  await ensureTextKeyColumn('plug_run_events', 'id', 'gen_random_uuid()::text');
  await ensureTextKeyColumn('plug_run_events', 'run_id');

  await ensureColumns('plugs', REQUIRED_PLUG_COLUMNS);
  await ensureColumns('plug_runs', REQUIRED_RUN_COLUMNS);
  await ensureColumns('plug_run_events', REQUIRED_EVENT_COLUMNS);

  // Clean up orphaned rows before foreign keys are rebuilt.
  await sql`
    DELETE FROM plug_run_events e
    WHERE NOT EXISTS (
      SELECT 1
      FROM plug_runs r
      WHERE r.id = e.run_id
    )
  `;
  await sql`
    DELETE FROM plug_runs r
    WHERE NOT EXISTS (
      SELECT 1
      FROM plugs p
      WHERE p.id = r.plug_id
    )
  `;

  await rebuildForeignKey('plug_runs', 'plug_runs_plug_id_fkey', 'plug_id', 'plugs', 'id');
  await rebuildForeignKey('plug_run_events', 'plug_run_events_run_id_fkey', 'run_id', 'plug_runs', 'id');

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
