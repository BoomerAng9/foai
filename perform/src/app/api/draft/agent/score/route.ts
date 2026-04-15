/**
 * POST /api/draft/agent/score
 * =============================
 * Score a user's drafted roster using fantasy-style points (NO GAMBLING).
 * Pure stateless calculator — no DB writes; UI calls this after the
 * draft session ends to show the user how their picks compare against
 * canonical Per|Form TIE expectations.
 *
 * Body:
 *   {
 *     picks: Array<{
 *       overallPick: number,
 *       grade?: number,       // numeric TIE grade — preferred
 *       tier?: TIETier,        // canonical tier — used when no grade
 *       position: string,
 *       primeSubTags?: string[],
 *       filledNeed?: boolean
 *     }>
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  scoreRoster,
  scoreRosterByGrade,
  type RosterPick,
} from '@/lib/draft/fantasy-scoring';
import type { TIETier } from '@aims/tie-matrix';

interface InputPick {
  overallPick: number;
  grade?: number;
  tier?: TIETier;
  position: string;
  primeSubTags?: string[];
  filledNeed?: boolean;
}

const VALID_TIERS = new Set<TIETier>([
  'PRIME', 'A_PLUS', 'A', 'A_MINUS',
  'B_PLUS', 'B', 'B_MINUS', 'C_PLUS', 'C',
]);

export async function POST(req: NextRequest) {
  let body: { picks?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!Array.isArray(body.picks) || body.picks.length === 0) {
    return NextResponse.json({ error: 'picks array required' }, { status: 400 });
  }

  const raw = body.picks as InputPick[];

  // Split: rows with explicit canonical tier vs rows we derive from grade.
  const usingGrade: InputPick[] = [];
  const usingTier: RosterPick[] = [];
  for (const p of raw) {
    if (typeof p.overallPick !== 'number' || typeof p.position !== 'string') continue;
    if (p.tier && VALID_TIERS.has(p.tier)) {
      usingTier.push({
        overallPick: p.overallPick,
        tier: p.tier,
        grade: p.grade,
        position: p.position,
        primeSubTags: p.primeSubTags,
        filledNeed: p.filledNeed,
      });
    } else if (typeof p.grade === 'number' && Number.isFinite(p.grade)) {
      usingGrade.push(p);
    }
  }

  // Score each path and combine — same scoring rules either way.
  const tierScore = scoreRoster(usingTier);
  const gradeScore = scoreRosterByGrade(
    usingGrade.map((p) => ({
      overallPick: p.overallPick,
      grade: p.grade!,
      position: p.position,
      filledNeed: p.filledNeed,
      primeSubTags: p.primeSubTags,
    })),
  );

  const totalPoints = tierScore.totalPoints + gradeScore.totalPoints;
  const perPick = [...tierScore.perPick, ...gradeScore.perPick].sort((a, b) => a.overallPick - b.overallPick);
  const breakdown = {
    tier_match: tierScore.breakdown.tier_match + gradeScore.breakdown.tier_match,
    tier_overshoot: tierScore.breakdown.tier_overshoot + gradeScore.breakdown.tier_overshoot,
    need_fit: tierScore.breakdown.need_fit + gradeScore.breakdown.need_fit,
    surprise: tierScore.breakdown.surprise + gradeScore.breakdown.surprise,
    discipline: tierScore.breakdown.discipline + gradeScore.breakdown.discipline,
  };
  const positionExposure = { ...tierScore.positionExposure };
  for (const [pos, n] of Object.entries(gradeScore.positionExposure)) {
    positionExposure[pos] = (positionExposure[pos] ?? 0) + n;
  }

  return NextResponse.json({
    ok: true,
    notice: 'Fantasy scoring only — no gambling, no real-money payouts.',
    totalPoints,
    perPick,
    breakdown,
    positionExposure,
  });
}
