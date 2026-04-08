/**
 * @aims/pmo — Neon (Postgres) client wrapper
 * ==========================================
 * Uses porsager/postgres to match perform's existing client.
 *
 * Connection string from PMO_DATABASE_URL env var. Falls back to
 * NEON_DATABASE_URL or DATABASE_URL.
 */

import postgres from 'postgres';

let _sql: ReturnType<typeof postgres> | null = null;

export function getDbUrl(): string {
  const url =
    process.env.PMO_DATABASE_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.DATABASE_URL ||
    '';
  if (!url) {
    throw new Error(
      '[aims-pmo] No database URL — set PMO_DATABASE_URL, NEON_DATABASE_URL, or DATABASE_URL',
    );
  }
  return url;
}

export function getSql() {
  if (!_sql) {
    _sql = postgres(getDbUrl(), {
      prepare: false,             // Neon serverless prefers prepared off
      idle_timeout: 20,
      max: 10,
      transform: postgres.camel,  // snake_case columns → camelCase fields
    });
  }
  return _sql;
}

export async function closeSql(): Promise<void> {
  if (_sql) {
    await _sql.end();
    _sql = null;
  }
}

/**
 * Health check — runs `SELECT 1` and verifies the agent_roster table exists.
 * Returns { ok: true } or { ok: false, error }.
 */
export async function healthCheck(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const sql = getSql();
    await sql`SELECT 1`;
    const exists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'agent_roster'
      ) AS exists
    `;
    if (!exists[0]?.exists) {
      return { ok: false, error: 'agent_roster table not found — run migrations' };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
