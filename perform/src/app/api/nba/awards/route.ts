/**
 * GET /api/nba/awards
 * ==========================================
 * Live NBA Awards Watch projections.
 *
 * Projection basis: ESPN's public byathlete statistics + standings endpoints.
 * Server-side revalidation every 60 seconds (aligned with the scoreboard
 * cadence on /nba/playoffs). Public route — no auth, no PII, ESPN data only.
 *
 * Response: AwardsPayload (see lib/nba/awards.ts) — one category per award,
 * top 3 candidates per category with softmax vote-share projections.
 *
 * Finals MVP is conditional: activates only when the scoreboard indicates a
 * Finals series in progress. Callers pass ?finals=1 if they've already
 * confirmed that from the scoreboard stream to avoid a double fetch.
 */

import { NextResponse } from 'next/server';
import { buildAwardsPayload } from '@/lib/nba/awards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 60;

const SEASON_YEAR = 2026;

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const finalsInProgress = url.searchParams.get('finals') === '1';

  try {
    const payload = await buildAwardsPayload(SEASON_YEAR, finalsInProgress);
    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown_error';
    return NextResponse.json(
      { error: 'awards_projection_failed', message: msg },
      { status: 502 },
    );
  }
}
