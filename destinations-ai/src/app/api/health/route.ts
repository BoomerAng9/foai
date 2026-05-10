import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health — Cloud Run liveness + readiness probe.
 *
 * Returns 200 when the server is up AND the DB is reachable; 503
 * otherwise. Cloud Run uses this for startup probes and TCP health.
 */
export async function GET() {
  const started = Date.now();
  const result: {
    status: 'ok' | 'degraded';
    checks: Record<string, { ok: boolean; detail?: string; latencyMs?: number }>;
  } = {
    status: 'ok',
    checks: {
      server: { ok: true },
      database: { ok: false },
    },
  };

  if (!sql) {
    result.status = 'degraded';
    result.checks.database = { ok: false, detail: 'DATABASE_URL not set' };
    return NextResponse.json(result, { status: 503 });
  }

  try {
    const dbStart = Date.now();
    await sql`SELECT 1 AS ok`;
    result.checks.database = { ok: true, latencyMs: Date.now() - dbStart };
  } catch (err) {
    result.status = 'degraded';
    result.checks.database = {
      ok: false,
      detail: err instanceof Error ? err.message : 'unknown error',
    };
    return NextResponse.json(result, { status: 503 });
  }

  return NextResponse.json(
    { ...result, elapsedMs: Date.now() - started },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );
}
