import { NextRequest, NextResponse } from 'next/server';
import {
  sqwaadrunHealth,
  sqwaadrunRoster,
  sqwaadrunScrape,
  sqwaadrunMission,
  sqwaadrunStatus,
} from '@/lib/scrape/sqwaadrun-client';

/* ──────────────────────────────────────────────────────────────
 *  GET  /api/scrape/sqwaadrun          — health check + roster
 *  GET  /api/scrape/sqwaadrun?mode=status
 *  POST /api/scrape/sqwaadrun          — body: { intent, targets }
 *                                         or: { mission: {type, targets} }
 *
 *  Proxies to the Sqwaadrun Python gateway. Auth via
 *  PIPELINE_AUTH_KEY on the Per|Form side; gateway auth is
 *  separately via SQWAADRUN_API_KEY.
 * ────────────────────────────────────────────────────────────── */

function authorized(req: NextRequest): boolean {
  const expected = process.env.PIPELINE_AUTH_KEY || '';
  if (!expected) return true; // dev mode
  const got = (req.headers.get('authorization') || '').replace('Bearer ', '');
  return got === expected;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const mode = url.searchParams.get('mode');

  if (mode === 'status') {
    const status = await sqwaadrunStatus();
    return NextResponse.json(status ?? { error: 'gateway unreachable' });
  }

  const healthy = await sqwaadrunHealth();
  if (!healthy) {
    return NextResponse.json(
      { error: 'Sqwaadrun gateway unreachable', healthy: false },
      { status: 503 },
    );
  }
  const roster = await sqwaadrunRoster();
  return NextResponse.json({ healthy: true, roster });
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  // Typed mission path
  if (body.mission && typeof body.mission === 'object') {
    const m = body.mission as { type?: string; targets?: unknown; config?: unknown };
    if (!m.type || !Array.isArray(m.targets)) {
      return NextResponse.json(
        { error: 'mission.type and mission.targets[] required' },
        { status: 400 },
      );
    }
    const result = await sqwaadrunMission({
      type: m.type as never,
      targets: m.targets as string[],
      config: (m.config as Record<string, unknown>) || {},
    });
    return NextResponse.json(result);
  }

  // Natural language intent path
  const intent = typeof body.intent === 'string' ? body.intent : '';
  const targets = Array.isArray(body.targets) ? (body.targets as string[]) : [];
  const config = (body.config as Record<string, unknown>) || {};

  if (!intent || targets.length === 0) {
    return NextResponse.json(
      { error: 'intent string and targets[] required' },
      { status: 400 },
    );
  }

  const result = await sqwaadrunScrape({ intent, targets, config });
  return NextResponse.json(result);
}
