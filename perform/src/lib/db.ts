import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || '';

export const sql = DATABASE_URL
  ? postgres(DATABASE_URL, { ssl: 'require', max: 10 })
  : null;

/**
 * Per-request guard. Call at the top of any API handler that MUST have
 * a DB connection. Returns { error, status: 503 } when DATABASE_URL is
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
 * handlers) should call this at startup to fail loud rather than
 * silently return empty result sets.
 */
export async function assertDbReady(): Promise<void> {
  if (!sql) {
    throw new Error('[perform/db] DATABASE_URL is not set — refusing to start.');
  }
  await sql`SELECT 1 AS ok`;
}
