import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || '';

/**
 * Neon Postgres client — shared connection pool.
 *
 * Matches foai convention (see perform/src/lib/db.ts):
 *   - ssl: 'require' (Neon requires TLS)
 *   - max: 10 connections (sized for Cloud Run concurrency)
 *   - transform: camelCase for column names to simplify TS consumption
 */
export const sql = DATABASE_URL
  ? postgres(DATABASE_URL, {
      ssl: 'require',
      max: 10,
      idle_timeout: 20,
      max_lifetime: 60 * 30,
      transform: postgres.camel,
    })
  : null;

/**
 * Per-request guard. Call at the top of any API handler that MUST have
 * a DB connection. Returns `{ error, status: 503 }` when DATABASE_URL is
 * missing; otherwise returns null and the caller can safely use `sql!`.
 */
export function requireDb(): null | { error: string; status: 503 } {
  if (!sql) {
    return { error: 'Database not configured — set DATABASE_URL', status: 503 };
  }
  return null;
}

/**
 * Boot-time readiness probe. Long-running services (not per-request API
 * handlers) should call this at startup to fail loud rather than silently
 * return empty result sets.
 */
export async function assertDbReady(): Promise<void> {
  if (!sql) {
    throw new Error('[destinations-ai/db] DATABASE_URL is not set — refusing to start.');
  }
  await sql`SELECT 1 AS ok`;
}
