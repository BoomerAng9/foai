import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const CREATE_TABLE = `
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
`;

async function ensureTable() {
  if (!sql) throw new Error('Database not configured');
  await sql.unsafe(CREATE_TABLE);
}

/**
 * GET /api/players — List players with optional filters
 * Query params: position, school, search, sort (field:asc|desc), limit, offset
 */
export async function GET(req: NextRequest) {
  try {
    await ensureTable();
    const url = req.nextUrl;
    const position = url.searchParams.get('position');
    const school = url.searchParams.get('school');
    const search = url.searchParams.get('search');
    const sort = url.searchParams.get('sort') || 'overall_rank:asc';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 500);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    // Build dynamic query with conditions
    const conditions: string[] = [];
    const values: (string | number)[] = [];
    let paramIdx = 0;

    if (position) {
      paramIdx++;
      conditions.push(`position = $${paramIdx}`);
      values.push(position);
    }
    if (school) {
      paramIdx++;
      conditions.push(`school = $${paramIdx}`);
      values.push(school);
    }
    if (search) {
      paramIdx++;
      conditions.push(`(name ILIKE $${paramIdx} OR school ILIKE $${paramIdx} OR nfl_comparison ILIKE $${paramIdx})`);
      values.push(`%${search}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Parse sort
    const [sortField, sortDir] = sort.split(':');
    const allowedSortFields = ['overall_rank', 'grade', 'name', 'position', 'school', 'projected_round', 'position_rank', 'created_at'];
    const safeSortField = allowedSortFields.includes(sortField) ? sortField : 'overall_rank';
    const safeSortDir = sortDir === 'desc' ? 'DESC' : 'ASC';

    paramIdx++;
    const limitParam = `$${paramIdx}`;
    values.push(limit);

    paramIdx++;
    const offsetParam = `$${paramIdx}`;
    values.push(offset);

    const query = `SELECT * FROM perform_players ${where} ORDER BY ${safeSortField} ${safeSortDir} LIMIT ${limitParam} OFFSET ${offsetParam}`;
    const countQuery = `SELECT COUNT(*) as total FROM perform_players ${where}`;

    const [rows, countResult] = await Promise.all([
      sql!.unsafe(query, values),
      sql!.unsafe(countQuery, values.slice(0, conditions.length > 0 ? -2 : 0)),
    ]);

    const total = parseInt(countResult[0]?.total || '0', 10);

    return NextResponse.json({ players: rows, total, limit, offset });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch players';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/players — Upsert one or more players
 * Body: single player object or array of player objects
 */
export async function POST(req: NextRequest) {
  try {
    const PIPELINE_KEY = process.env.PIPELINE_AUTH_KEY || '';
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!PIPELINE_KEY || token !== PIPELINE_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureTable();
    const body = await req.json();
    const players = Array.isArray(body) ? body : [body];

    let upserted = 0;
    for (const p of players) {
      if (!p.name || !p.school || !p.position) {
        continue; // skip invalid entries
      }
      await sql!`
        INSERT INTO perform_players (
          name, school, position, height, weight, class_year,
          forty_time, vertical_jump, bench_reps, broad_jump, three_cone, shuttle,
          overall_rank, position_rank, projected_round, grade,
          tie_grade, tie_tier, trend, key_stats,
          strengths, weaknesses, nfl_comparison, scouting_summary,
          analyst_notes, film_grade
        ) VALUES (
          ${p.name}, ${p.school}, ${p.position},
          ${p.height || null}, ${p.weight || null}, ${p.class_year || p.classYear || '2026'},
          ${p.forty_time || p.fortyTime || null}, ${p.vertical_jump || p.verticalJump || null},
          ${p.bench_reps || p.benchReps || null}, ${p.broad_jump || p.broadJump || null},
          ${p.three_cone || p.threeCone || null}, ${p.shuttle || null},
          ${p.overall_rank || p.overallRank || null}, ${p.position_rank || p.positionRank || null},
          ${p.projected_round || p.projectedRound || null}, ${p.grade || null},
          ${p.tie_grade || p.tieGrade || null}, ${p.tie_tier || p.tieTier || null},
          ${p.trend || 'steady'}, ${p.key_stats || p.keyStats || null},
          ${p.strengths || null}, ${p.weaknesses || null},
          ${p.nfl_comparison || p.nflComparison || null}, ${p.scouting_summary || p.scoutingSummary || null},
          ${p.analyst_notes || p.analystNotes || null}, ${p.film_grade || p.filmGrade || null}
        )
        ON CONFLICT (name, school, class_year) DO UPDATE SET
          position = EXCLUDED.position,
          height = COALESCE(EXCLUDED.height, perform_players.height),
          weight = COALESCE(EXCLUDED.weight, perform_players.weight),
          forty_time = COALESCE(EXCLUDED.forty_time, perform_players.forty_time),
          vertical_jump = COALESCE(EXCLUDED.vertical_jump, perform_players.vertical_jump),
          bench_reps = COALESCE(EXCLUDED.bench_reps, perform_players.bench_reps),
          broad_jump = COALESCE(EXCLUDED.broad_jump, perform_players.broad_jump),
          three_cone = COALESCE(EXCLUDED.three_cone, perform_players.three_cone),
          shuttle = COALESCE(EXCLUDED.shuttle, perform_players.shuttle),
          overall_rank = COALESCE(EXCLUDED.overall_rank, perform_players.overall_rank),
          position_rank = COALESCE(EXCLUDED.position_rank, perform_players.position_rank),
          projected_round = COALESCE(EXCLUDED.projected_round, perform_players.projected_round),
          grade = COALESCE(EXCLUDED.grade, perform_players.grade),
          tie_grade = COALESCE(EXCLUDED.tie_grade, perform_players.tie_grade),
          tie_tier = COALESCE(EXCLUDED.tie_tier, perform_players.tie_tier),
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
      upserted++;
    }

    return NextResponse.json({ upserted, total: players.length });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to upsert players';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
