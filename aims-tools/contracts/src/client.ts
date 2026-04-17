/**
 * @aims/contracts — Postgres client wrapper
 *
 * Mirrors @aims/pricing-matrix/client pattern (porsager/postgres).
 * Connection string resolves in order:
 *   CONTRACTS_DATABASE_URL → NEON_DATABASE_URL → DATABASE_URL
 */

import postgres from 'postgres';

let _sql: ReturnType<typeof postgres> | null = null;

export function getDbUrl(): string {
  const url =
    process.env.CONTRACTS_DATABASE_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.DATABASE_URL ||
    '';
  if (!url) {
    throw new Error(
      '[@aims/contracts] No database URL — set CONTRACTS_DATABASE_URL, NEON_DATABASE_URL, or DATABASE_URL',
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
