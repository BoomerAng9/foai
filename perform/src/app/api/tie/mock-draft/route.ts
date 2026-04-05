import { NextRequest, NextResponse } from 'next/server';
import { generateMockDraft, type ProspectInput, type MockDraftMode } from '@/lib/draft/mock-engine';
import { BOARD_2026 } from '@/lib/draft/seed-data';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rounds = Math.min(7, Math.max(1, body.rounds ?? 3));
    const mode: MockDraftMode = body.mode === 'consensus' ? 'consensus' : 'perform';

    // Convert seed data to ProspectInput format
    const prospects: ProspectInput[] = BOARD_2026.map(p => ({
      name: p.name,
      school: p.school,
      position: p.position,
      overallRank: p.overallRank,
      grade: p.grade,
      tieGrade: p.tieGrade,
      projectedRound: p.projectedRound,
    }));

    const picks = generateMockDraft(prospects, { rounds, mode });

    return NextResponse.json({ picks, rounds, mode, totalPicks: picks.length });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Mock draft generation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
