import { NextRequest, NextResponse } from 'next/server';
import { generateMockDraft, type ProspectInput, type MockDraftMode } from '@/lib/draft/mock-engine';
import { gradeAllProspects } from '@/lib/draft/open-mind-grader';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rounds = Math.min(7, Math.max(1, body.rounds ?? 3));
    const mode: MockDraftMode = body.mode === 'consensus' ? 'consensus' : 'perform';

    // Use the full 600-player graded board
    const graded = gradeAllProspects();
    const prospects: ProspectInput[] = graded.map(p => ({
      name: p.name,
      school: p.school,
      position: p.position,
      overallRank: mode === 'consensus' ? p.consensusRank : p.performRank,
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
