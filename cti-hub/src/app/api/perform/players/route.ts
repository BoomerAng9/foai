import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { sql } from '@/lib/insforge';

/**
 * NFL Draft 2026 Player Index — Real data, no mocks.
 *
 * GET /api/perform/players — List all players (with optional filters)
 * POST /api/perform/players — Add/update a player
 *
 * Query params:
 *   position — Filter by position (QB, WR, RB, OT, EDGE, CB, S, DT, LB, TE, IOL, K)
 *   school   — Filter by school
 *   round    — Filter by projected round (1-7)
 *   sort     — Sort by: rank, grade, name (default: rank)
 *   limit    — Results limit (default: 50)
 */

// Auto-create table if it doesn't exist
async function ensureTable() {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS perform_players (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      school TEXT NOT NULL,
      position TEXT NOT NULL,
      height TEXT,
      weight TEXT,
      class TEXT DEFAULT '2026',
      forty_time NUMERIC(4,2),
      vertical_jump NUMERIC(4,1),
      bench_reps INTEGER,
      broad_jump NUMERIC(5,1),
      three_cone NUMERIC(5,2),
      shuttle NUMERIC(5,2),
      overall_rank INTEGER,
      position_rank INTEGER,
      projected_round INTEGER,
      grade NUMERIC(4,1),
      trend TEXT DEFAULT 'steady' CHECK (trend IN ('rising', 'falling', 'steady')),
      key_stats TEXT,
      strengths TEXT,
      weaknesses TEXT,
      nfl_comparison TEXT,
      scouting_summary TEXT,
      analyst_notes TEXT,
      film_grade TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(name, school, class)
    )
  `;
}

export async function GET(req: NextRequest) {
  try {
    if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

    await ensureTable();

    const position = req.nextUrl.searchParams.get('position');
    const school = req.nextUrl.searchParams.get('school');
    const round = req.nextUrl.searchParams.get('round');
    const sort = req.nextUrl.searchParams.get('sort') || 'rank';
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50', 10);
    const search = req.nextUrl.searchParams.get('q');

    let query = sql`SELECT * FROM perform_players WHERE class = '2026'`;

    if (position) query = sql`SELECT * FROM perform_players WHERE class = '2026' AND position = ${position}`;
    if (school) query = sql`SELECT * FROM perform_players WHERE class = '2026' AND school ILIKE ${'%' + school + '%'}`;
    if (round) query = sql`SELECT * FROM perform_players WHERE class = '2026' AND projected_round = ${parseInt(round)}`;
    if (search) query = sql`SELECT * FROM perform_players WHERE class = '2026' AND (name ILIKE ${'%' + search + '%'} OR school ILIKE ${'%' + search + '%'})`;

    // Apply sorting
    let players;
    if (sort === 'grade') {
      players = await sql`SELECT * FROM perform_players WHERE class = '2026' ${position ? sql`AND position = ${position}` : sql``} ORDER BY grade DESC NULLS LAST LIMIT ${limit}`;
    } else if (sort === 'name') {
      players = await sql`SELECT * FROM perform_players WHERE class = '2026' ${position ? sql`AND position = ${position}` : sql``} ORDER BY name ASC LIMIT ${limit}`;
    } else {
      players = await sql`SELECT * FROM perform_players WHERE class = '2026' ${position ? sql`AND position = ${position}` : sql``} ORDER BY overall_rank ASC NULLS LAST LIMIT ${limit}`;
    }

    return NextResponse.json({
      players,
      total: players.length,
      class: '2026',
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch players';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;
    if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

    await ensureTable();

    const body = await req.json();
    const { players } = body;

    if (!Array.isArray(players) || players.length === 0) {
      return NextResponse.json({ error: 'players array required' }, { status: 400 });
    }

    let inserted = 0;
    for (const p of players) {
      if (!p.name || !p.school || !p.position) continue;

      await sql`
        INSERT INTO perform_players (
          name, school, position, height, weight, class,
          forty_time, vertical_jump, bench_reps, broad_jump, three_cone, shuttle,
          overall_rank, position_rank, projected_round, grade, trend,
          key_stats, strengths, weaknesses, nfl_comparison, scouting_summary, analyst_notes, film_grade
        ) VALUES (
          ${p.name}, ${p.school}, ${p.position}, ${p.height || null}, ${p.weight || null}, ${p.class || '2026'},
          ${p.forty_time || null}, ${p.vertical_jump || null}, ${p.bench_reps || null}, ${p.broad_jump || null}, ${p.three_cone || null}, ${p.shuttle || null},
          ${p.overall_rank || null}, ${p.position_rank || null}, ${p.projected_round || null}, ${p.grade || null}, ${p.trend || 'steady'},
          ${p.key_stats || null}, ${p.strengths || null}, ${p.weaknesses || null}, ${p.nfl_comparison || null}, ${p.scouting_summary || null}, ${p.analyst_notes || null}, ${p.film_grade || null}
        )
        ON CONFLICT (name, school, class) DO UPDATE SET
          position = EXCLUDED.position,
          height = COALESCE(EXCLUDED.height, perform_players.height),
          weight = COALESCE(EXCLUDED.weight, perform_players.weight),
          forty_time = COALESCE(EXCLUDED.forty_time, perform_players.forty_time),
          vertical_jump = COALESCE(EXCLUDED.vertical_jump, perform_players.vertical_jump),
          overall_rank = COALESCE(EXCLUDED.overall_rank, perform_players.overall_rank),
          position_rank = COALESCE(EXCLUDED.position_rank, perform_players.position_rank),
          projected_round = COALESCE(EXCLUDED.projected_round, perform_players.projected_round),
          grade = COALESCE(EXCLUDED.grade, perform_players.grade),
          trend = COALESCE(EXCLUDED.trend, perform_players.trend),
          key_stats = COALESCE(EXCLUDED.key_stats, perform_players.key_stats),
          strengths = COALESCE(EXCLUDED.strengths, perform_players.strengths),
          weaknesses = COALESCE(EXCLUDED.weaknesses, perform_players.weaknesses),
          nfl_comparison = COALESCE(EXCLUDED.nfl_comparison, perform_players.nfl_comparison),
          scouting_summary = COALESCE(EXCLUDED.scouting_summary, perform_players.scouting_summary),
          analyst_notes = COALESCE(EXCLUDED.analyst_notes, perform_players.analyst_notes),
          film_grade = COALESCE(EXCLUDED.film_grade, perform_players.film_grade),
          updated_at = NOW()
      `;
      inserted++;
    }

    return NextResponse.json({ inserted, total: players.length });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to save players';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
