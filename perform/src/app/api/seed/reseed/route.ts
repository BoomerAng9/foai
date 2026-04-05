import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { gradeAllProspects } from '@/lib/draft/open-mind-grader';

/* ──────────────────────────────────────────────────────────────
 *  POST /api/seed/reseed
 *  NUCLEAR OPTION: Drops all existing players and reseeds with
 *  the full 600-player DraftTek board, graded by Per|Form's
 *  Open Mind engine. Rankings are by GRADE, not consensus.
 * ────────────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const PIPELINE_KEY = process.env.PIPELINE_AUTH_KEY || '';
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!PIPELINE_KEY || token !== PIPELINE_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!sql) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

    // Ensure table exists
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS perform_players (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        school TEXT NOT NULL,
        position TEXT NOT NULL,
        height TEXT,
        weight TEXT,
        class_year TEXT DEFAULT '2026',
        forty_time NUMERIC,
        vertical_jump NUMERIC,
        bench_reps NUMERIC,
        broad_jump NUMERIC,
        three_cone NUMERIC,
        shuttle NUMERIC,
        overall_rank INTEGER,
        position_rank INTEGER,
        projected_round INTEGER,
        grade NUMERIC(4,1),
        tie_grade TEXT,
        tie_tier TEXT,
        trend TEXT DEFAULT 'steady',
        key_stats TEXT,
        strengths TEXT,
        weaknesses TEXT,
        nfl_comparison TEXT,
        scouting_summary TEXT,
        analyst_notes TEXT,
        film_grade TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(name, school, class_year)
      )
    `);

    // Wipe all existing 2026 data
    const deleted = await sql`DELETE FROM perform_players WHERE class_year = '2026' RETURNING id`;

    // Grade all 600 prospects
    const graded = gradeAllProspects();

    let inserted = 0;
    for (const p of graded) {
      try {
        await sql`
          INSERT INTO perform_players (
            name, school, position, class_year,
            overall_rank, position_rank, projected_round,
            grade, tie_grade, tie_tier, trend, film_grade
          ) VALUES (
            ${p.name}, ${p.school}, ${p.position}, ${p.classYear},
            ${p.performRank}, ${p.positionRank}, ${p.projectedRound},
            ${p.grade}, ${p.tieGrade}, ${p.tieTier}, ${p.trend}, ${p.filmGrade}
          )
          ON CONFLICT (name, school, class_year) DO UPDATE SET
            position = EXCLUDED.position,
            overall_rank = EXCLUDED.overall_rank,
            position_rank = EXCLUDED.position_rank,
            projected_round = EXCLUDED.projected_round,
            grade = EXCLUDED.grade,
            tie_grade = EXCLUDED.tie_grade,
            tie_tier = EXCLUDED.tie_tier,
            trend = EXCLUDED.trend,
            film_grade = EXCLUDED.film_grade,
            updated_at = NOW()
        `;
        inserted++;
      } catch {
        // Skip on error
      }
    }

    // Sample: top 10 by Per|Form grade
    const top10 = graded.slice(0, 10).map(p => ({
      performRank: p.performRank,
      name: p.name,
      position: p.position,
      school: p.school,
      grade: p.grade,
      tieGrade: p.tieGrade,
      consensusRank: p.consensusRank,
      trend: p.trend,
    }));

    // Count biggest disagreements with consensus
    const sleepers = graded
      .filter(p => p.consensusRank - p.performRank > 30)
      .slice(0, 10)
      .map(p => ({
        name: p.name, position: p.position,
        consensus: p.consensusRank, perform: p.performRank,
        grade: p.grade, jump: p.consensusRank - p.performRank,
      }));

    return NextResponse.json({
      message: `Reseed complete. ${inserted} prospects graded by Open Mind.`,
      deleted: deleted.length,
      inserted,
      top10,
      biggestSleepers: sleepers,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Reseed failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
