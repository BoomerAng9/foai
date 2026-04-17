/**
 * @aims/melanium — postgres client wrapper.
 * Mirrors the @aims/contracts + @aims/pricing-matrix pattern.
 */

import postgres from 'postgres';

let _sql: ReturnType<typeof postgres> | null = null;

export function getDbUrl(): string {
  const url =
    process.env.MELANIUM_DATABASE_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.DATABASE_URL ||
    '';
  if (!url) {
    throw new Error(
      '[@aims/melanium] No database URL — set MELANIUM_DATABASE_URL, NEON_DATABASE_URL, or DATABASE_URL',
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
