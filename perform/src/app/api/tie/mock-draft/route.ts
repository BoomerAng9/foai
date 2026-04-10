import { NextRequest, NextResponse } from 'next/server';
import { generateMockDraft, type ProspectInput, type MockDraftMode } from '@/lib/draft/mock-engine';
import { gradeAllProspects } from '@/lib/draft/open-mind-grader';
import { sql } from '@/lib/db';

export async function POST(req: NextRequest) {
  // Auth: require pipeline key or Firebase session
  const pipelineKey = process.env.PIPELINE_AUTH_KEY;
  const authHeader = req.headers.get('authorization')?.replace('Bearer ', '') || '';
  if (!(pipelineKey && authHeader === pipelineKey)) {
    const { requireAuth } = await import('@/lib/auth-guard');
    const authResult = await requireAuth(req);
    if (!authResult.ok) return authResult.response;
  }

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
      tieGrade: p.gradeLetter,
      projectedRound: p.projectedRound,
    }));

    const picks = generateMockDraft(prospects, { rounds, mode });

    // Persist to mock_drafts table
    let draftId: number | null = null;
    if (sql) {
      try {
        const picksJson = JSON.stringify(picks);
        const inserted = await sql.unsafe(
          'INSERT INTO mock_drafts (mode, rounds, picks, total_picks, created_at) VALUES ($1, $2, $3::jsonb, $4, NOW()) RETURNING id',
          [mode, rounds, picksJson, picks.length],
        );
        draftId = inserted[0]?.id ?? null;
      } catch {
        // Non-fatal — draft still returned even if storage fails
      }
    }

    return NextResponse.json({ picks, rounds, mode, totalPicks: picks.length, draftId });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Mock draft generation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  try {
    if (!sql) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });
    const result = await sql`SELECT * FROM mock_drafts ORDER BY created_at DESC LIMIT 5`;
    return NextResponse.json({ drafts: result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch mock drafts';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
