import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { safeCompare, requireAuth } from '@/lib/auth-guard';

const AUTH_COOKIE = 'firebase-auth-token';

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
 * Public preview columns — homepage Big Board needs rank, position, and
 * top-line grade/tier/NFL comp to be a real product. Keep deep scouting
 * (strengths, weaknesses, analyst_notes, scouting_summary, film_grade,
 * pillar_*) paywalled. Aligns with "browse-first, gate-on-action".
 */
const PREVIEW_COLUMNS = `
  id, name, school, position, class_year,
  height, weight, overall_rank, position_rank, projected_round,
  grade, tie_grade, tie_tier, nfl_comparison, trend
`.replace(/\s+/g, ' ').trim();
const PREVIEW_LIMIT = 25;

/**
 * GET /api/players — List players with optional filters.
 *
 * Unauthenticated requests receive a limited public preview (top 5 players,
 * name/school/position only). Authenticated requests get the full dataset.
 *
 * Query params: position, school, search, sort (field:asc|desc), limit, offset
 */
export async function GET(req: NextRequest) {
  try {
    await ensureTable();

    // Determine auth status — unauthenticated callers get preview mode
    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const auth = token ? await requireAuth(req) : null;
    const isAuthenticated = auth?.ok === true;

    // NOTE: `sport`, `vertical`, `beast_rank`, `beast_grade`, and
    // `prime_sub_tags` columns are owned by migrations/008_tie_partition_and_analysts.sql.
    // Do not re-introduce runtime ALTERs here — run the migration instead.

    const url = req.nextUrl;
    const position = url.searchParams.get('position');
    const school = url.searchParams.get('school');
    const search = url.searchParams.get('search');
    const sport = url.searchParams.get('sport'); // multi-sport filter
    const sort = url.searchParams.get('sort') || 'overall_rank:asc';
    const limit = isAuthenticated
      ? Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 500)
      : PREVIEW_LIMIT;
    const offset = isAuthenticated
      ? parseInt(url.searchParams.get('offset') || '0', 10)
      : 0;

    const columns = isAuthenticated ? '*' : PREVIEW_COLUMNS;

    // Build dynamic query with conditions
    const conditions: string[] = [];
    const values: (string | number)[] = [];
    let paramIdx = 0;

    if (sport) {
      paramIdx++;
      conditions.push(`sport = $${paramIdx}`);
      values.push(sport);
    }
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
    const allowedSortFields = ['overall_rank', 'grade', 'name', 'position', 'school', 'projected_round', 'position_rank', 'beast_rank', 'forty_time', 'vertical_jump', 'pillar_athleticism', 'pillar_game_performance', 'pillar_intangibles', 'created_at'];
    const safeSortField = allowedSortFields.includes(sortField) ? sortField : 'overall_rank';
    const safeSortDir = sortDir === 'desc' ? 'DESC' : 'ASC';

    paramIdx++;
    const limitParam = `$${paramIdx}`;
    values.push(limit);

    paramIdx++;
    const offsetParam = `$${paramIdx}`;
    values.push(offset);

    // Consensus rank pivot — joins perform_consensus_ranks (migration 012)
    // and exposes one column per source so the /rankings comparison UI
    // can render PFF/ESPN/NFL.com/DrafTek/Yahoo/Ringer/consensus_avg
    // alongside Per|Form's own rank. FILTER aggregation is cheap here:
    // perform_consensus_ranks.UNIQUE(player_id, source) guarantees at
    // most one row per (player, source), so MAX() is a no-op pick.
    const CONSENSUS_SELECT = `,
      cr.consensus_drafttek,
      cr.consensus_yahoo,
      cr.consensus_ringer,
      cr.consensus_avg,
      cr.consensus_pff,
      cr.consensus_espn,
      cr.consensus_nflcom`;
    const CONSENSUS_JOIN = `
      LEFT JOIN LATERAL (
        SELECT
          MAX(rank) FILTER (WHERE source = 'drafttek')      AS consensus_drafttek,
          MAX(rank) FILTER (WHERE source = 'yahoo')         AS consensus_yahoo,
          MAX(rank) FILTER (WHERE source = 'ringer')        AS consensus_ringer,
          MAX(rank) FILTER (WHERE source = 'consensus_avg') AS consensus_avg,
          MAX(rank) FILTER (WHERE source = 'pff')           AS consensus_pff,
          MAX(rank) FILTER (WHERE source = 'espn')          AS consensus_espn,
          MAX(rank) FILTER (WHERE source = 'nflcom')        AS consensus_nflcom
        FROM perform_consensus_ranks
        WHERE player_id = perform_players.id
      ) cr ON TRUE`;

    const query = `SELECT ${columns}${CONSENSUS_SELECT} FROM perform_players${CONSENSUS_JOIN} ${where} ORDER BY ${safeSortField} ${safeSortDir} LIMIT ${limitParam} OFFSET ${offsetParam}`;
    const countQuery = `SELECT COUNT(*) as total FROM perform_players ${where}`;

    const [rows, countResult] = await Promise.all([
      sql!.unsafe(query, values),
      sql!.unsafe(countQuery, values.slice(0, conditions.length > 0 ? -2 : 0)),
    ]);

    const total = parseInt(countResult[0]?.total || '0', 10);

    return NextResponse.json({
      players: rows,
      total,
      limit,
      offset,
      ...(isAuthenticated ? {} : { preview: true }),
    });
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
    if (!PIPELINE_KEY || !safeCompare(token, PIPELINE_KEY)) {
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
