import { NextRequest, NextResponse } from 'next/server';
import { projectCareer, getHistoricalComps } from '@/lib/draft/career-projection';

/**
 * GET /api/players/career-projection?name=<player>
 *
 * Returns full CareerProjection for a prospect from perform_players,
 * backed by real historical data from nfl_draft_picks + nfl_combine.
 *
 * Optional params:
 *   name     - Player name (required). Supports slug format ("cam-ward") or spaced ("Cam Ward").
 *   position - Override position for raw comp lookup (bypasses perform_players lookup)
 *   round    - Override projected round for raw comp lookup
 *
 * When only position + round are provided (no name), returns raw historical comps
 * without a prospect-specific projection.
 */
export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const name = url.searchParams.get('name');
    const positionOverride = url.searchParams.get('position');
    const roundOverride = url.searchParams.get('round');

    // Raw comps mode: position + round without a specific prospect
    if (!name && positionOverride && roundOverride) {
      const round = parseInt(roundOverride, 10);
      if (isNaN(round) || round < 1 || round > 7) {
        return NextResponse.json({ error: 'round must be 1-7' }, { status: 400 });
      }

      const weight = url.searchParams.get('weight')
        ? Number(url.searchParams.get('weight'))
        : undefined;
      const forty = url.searchParams.get('forty')
        ? Number(url.searchParams.get('forty'))
        : undefined;

      const comps = await getHistoricalComps(
        positionOverride,
        round,
        weight,
        forty,
        undefined,
        25,
      );

      return NextResponse.json({ comps, total: comps.length });
    }

    // Full projection mode: requires name
    if (!name) {
      return NextResponse.json(
        { error: 'name query param required (or provide position + round for raw comps)' },
        { status: 400 },
      );
    }

    const projection = await projectCareer(name);

    return NextResponse.json({ projection });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Career projection failed';
    const status = msg.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
