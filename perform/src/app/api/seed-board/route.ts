import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { BOARD_2026 } from '@/lib/draft/seed-data';

/**
 * POST /api/seed-board — Seed the complete 2026 NFL Draft Big Board
 * Inserts all 50 prospects from seed-data.ts into the perform_players table.
 */
export async function POST(req: NextRequest) {
  try {
    const PIPELINE_KEY = process.env.PIPELINE_AUTH_KEY || '';
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!PIPELINE_KEY || token !== PIPELINE_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!sql) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

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

    let inserted = 0;
    for (const p of BOARD_2026) {
      await sql`
        INSERT INTO perform_players (
          name, school, position, height, weight, class_year,
          overall_rank, position_rank, projected_round, grade,
          tie_grade, tie_tier, trend,
          key_stats, strengths, weaknesses, nfl_comparison,
          scouting_summary, analyst_notes, film_grade
        ) VALUES (
          ${p.name}, ${p.school}, ${p.position},
          ${p.height || null}, ${p.weight || null}, ${p.classYear},
          ${p.overallRank}, ${p.positionRank}, ${p.projectedRound}, ${p.grade},
          ${p.tieGrade}, ${p.tieTier}, ${p.trend},
          ${p.analystNotes}, ${p.strengths}, ${p.weaknesses}, ${p.nflComparison},
          ${p.scoutingSummary}, ${p.analystNotes}, ${p.filmGrade}
        )
        ON CONFLICT (name, school, class_year) DO UPDATE SET
          position = EXCLUDED.position,
          height = COALESCE(EXCLUDED.height, perform_players.height),
          weight = COALESCE(EXCLUDED.weight, perform_players.weight),
          overall_rank = EXCLUDED.overall_rank,
          position_rank = EXCLUDED.position_rank,
          projected_round = EXCLUDED.projected_round,
          grade = EXCLUDED.grade,
          tie_grade = EXCLUDED.tie_grade,
          tie_tier = EXCLUDED.tie_tier,
          trend = EXCLUDED.trend,
          key_stats = EXCLUDED.key_stats,
          strengths = EXCLUDED.strengths,
          weaknesses = EXCLUDED.weaknesses,
          nfl_comparison = EXCLUDED.nfl_comparison,
          scouting_summary = EXCLUDED.scouting_summary,
          analyst_notes = EXCLUDED.analyst_notes,
          film_grade = EXCLUDED.film_grade,
          updated_at = NOW()
      `;
      inserted++;
    }

    return NextResponse.json({
      inserted,
      total: BOARD_2026.length,
      message: '2026 NFL Draft Big Board seeded successfully.',
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Seed failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
