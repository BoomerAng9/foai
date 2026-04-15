import { NextRequest, NextResponse } from 'next/server';
import { SCHRAGER_MOCK_2026, DRAFT_TRENDS_2026, TAI_SIMPSON_INTEL, CHRIS_BRAZZELL_INTEL } from '@/lib/draft/schrager-mock-2026';
import { BEAST_TOP_100, BEAST_POSITION_COUNTS } from '@/lib/draft/beast-brugler-2026';
import { COMBINE_2026 } from '@/lib/draft/combine-2026';
import * as fs from 'fs';
import * as path from 'path';

/**
 * GET /api/draft/intel — Aggregated draft intelligence for the War Room / Draft Night
 * ====================================================================================
 * Combines: Beast rankings, Schrager mock, combine data, team needs, consensus boards,
 * late-round projections, UDFA estimates, calibration deltas, and trends.
 * Powers: Draft Night AI decisions, War Room display, analyst commentary feeds.
 *
 * Query params:
 *   ?section=all|beast|mock|combine|trends|teams|consensus|laterounds
 *   ?player=name (filter to specific player)
 */

function loadJSON(relativePath: string): unknown {
  const fullPath = path.join(process.cwd(), relativePath);
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

export async function GET(req: NextRequest) {
  const section = req.nextUrl.searchParams.get('section') || 'all';
  const playerFilter = req.nextUrl.searchParams.get('player')?.toLowerCase();

  const response: Record<string, unknown> = {};

  if (section === 'all' || section === 'beast') {
    let beastData = BEAST_TOP_100;
    if (playerFilter) {
      beastData = beastData.filter(p => p.name.toLowerCase().includes(playerFilter));
    }
    response.beast = {
      top100: beastData,
      positionCounts: BEAST_POSITION_COUNTS,
      totalPlayersInBeast: 2396,
    };
  }

  if (section === 'all' || section === 'mock') {
    let mockData = SCHRAGER_MOCK_2026;
    if (playerFilter) {
      mockData = mockData.filter(p => p.player.toLowerCase().includes(playerFilter));
    }
    response.schragerMock = {
      picks: mockData,
      trends: DRAFT_TRENDS_2026,
      notables: {
        taiSimpson: TAI_SIMPSON_INTEL,
        chrisBrazzell: CHRIS_BRAZZELL_INTEL,
      },
    };
  }

  if (section === 'all' || section === 'combine') {
    let combineData = COMBINE_2026;
    if (playerFilter) {
      combineData = combineData.filter(p => p.name.toLowerCase().includes(playerFilter));
    }
    response.combine = combineData;
  }

  if (section === 'all' || section === 'trends') {
    response.trends = DRAFT_TRENDS_2026;
  }

  if (section === 'all' || section === 'teams') {
    response.teamNeeds = loadJSON('data/nfl-teams/team-needs-2026.json');
  }

  if (section === 'all' || section === 'consensus') {
    response.consensus = loadJSON('data/consensus/consensus-board-2026.json');
  }

  if (section === 'all' || section === 'laterounds') {
    response.lateRounds = loadJSON('data/draft/late-rounds-udfa-2026.json');
  }

  return NextResponse.json(response);
}
