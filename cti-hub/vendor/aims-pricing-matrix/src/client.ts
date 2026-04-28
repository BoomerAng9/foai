/**
 * @aims/pricing-matrix — Postgres client wrapper
 * ==============================================
 * Uses porsager/postgres to match perform's existing stack.
 *
 * Connection string from PRICING_DATABASE_URL env var. Falls back
 * to NEON_DATABASE_URL or DATABASE_URL.
 */

import postgres from 'postgres';

let _sql: ReturnType<typeof postgres> | null = null;

export function getDbUrl(): string {
  const url =
    process.env.PRICING_DATABASE_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.DATABASE_URL ||
    '';
  if (!url) {
    throw new Error(
      '[aims-pricing-matrix] No database URL — set PRICING_DATABASE_URL, NEON_DATABASE_URL, or DATABASE_URL',
    );
  }
  return url;
}

export function getSql() {
  if (!_sql) {
    _sql = postgres(getDbUrl(), {
      prepare: false,
      idle_timeout: 20,
      max: 10,
      transform: postgres.camel,
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
