import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * GET /api/health — Per|Form health check (SHIP-CHECKLIST G1.5)
 *
 * Aggregates liveness of each component the app depends on:
 *
 *   database        — Neon Postgres: `SELECT 1` round-trip
 *   runtime         — required env vars present
 *   upstream_espn   — ESPN stats API (byathlete). HEAD request with 3s budget.
 *   upstream_gemini — Gemini discovery endpoint (skipped if GEMINI_API_KEY unset).
 *
 * Response codes:
 *   200 — every non-skipped component OK
 *   503 — any component degraded or unreachable
 *
 * No secrets, no stack traces. Suitable for uptime monitors.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type CompResult = { ok: boolean; latencyMs?: number; error?: string; skipped?: boolean };

async function timed<T>(fn: () => Promise<T>): Promise<{ value?: T; error?: string; latencyMs: number }> {
  const t0 = Date.now();
  try {
    const value = await fn();
    return { value, latencyMs: Date.now() - t0 };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err), latencyMs: Date.now() - t0 };
  }
}

async function checkDatabase(): Promise<CompResult> {
  const db = sql;
  if (!db) return { ok: false, error: 'not_configured' };
  const res = await timed(() => db`SELECT 1 AS ok`);
  if (res.error) return { ok: false, latencyMs: res.latencyMs, error: 'unreachable' };
  return { ok: true, latencyMs: res.latencyMs };
}

async function checkEspn(): Promise<CompResult> {
  const res = await timed(async () => {
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 3000);
    try {
      const r = await fetch(
        'https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/statistics/byathlete?limit=1&seasontype=2',
        { method: 'GET', signal: controller.signal, cache: 'no-store' },
      );
      return r.status;
    } finally {
      clearTimeout(to);
    }
  });
  if (res.error) return { ok: false, latencyMs: res.latencyMs, error: 'unreachable' };
  const code = res.value ?? 0;
  return {
    ok: code >= 200 && code < 500,
    latencyMs: res.latencyMs,
    ...(code >= 500 ? { error: `upstream_${code}` } : {}),
  };
}

async function checkGemini(): Promise<CompResult> {
  if (!process.env.GEMINI_API_KEY) return { ok: true, skipped: true };
  const res = await timed(async () => {
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 3000);
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`,
        { method: 'GET', signal: controller.signal, cache: 'no-store' },
      );
      return r.status;
    } finally {
      clearTimeout(to);
    }
  });
  if (res.error) return { ok: false, latencyMs: res.latencyMs, error: 'unreachable' };
  const code = res.value ?? 0;
  return {
    ok: code >= 200 && code < 500,
    latencyMs: res.latencyMs,
    ...(code >= 500 ? { error: `upstream_${code}` } : {}),
  };
}

function checkRuntime(): CompResult {
  const required = ['DATABASE_URL'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) return { ok: false, error: `missing_env: ${missing.join(',')}` };
  return { ok: true };
}

export async function GET(): Promise<NextResponse> {
  const timestamp = new Date().toISOString();

  const [db, espn, gemini] = await Promise.all([checkDatabase(), checkEspn(), checkGemini()]);
  const rt = checkRuntime();

  const allOk = db.ok && espn.ok && gemini.ok && rt.ok;

  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      timestamp,
      components: {
        database: db,
        runtime: rt,
        upstream_espn: espn,
        upstream_gemini: gemini,
      },
    },
    { status: allOk ? 200 : 503 },
  );
}
