import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth-guard';

const AUTH_COOKIE = 'firebase-auth-token';

/** Public preview: only basic identity fields, no grades or scouting intel. */
const PREVIEW_COLUMNS = 'id, name, position, school, overall_rank';
const FULL_COLUMNS =
  'id, name, position, school, grade, tie_grade, tie_tier, overall_rank, position_rank, projected_round, nfl_comparison, strengths, weaknesses, trend';
const PREVIEW_LIMIT = 5;

/**
 * GET /api/tie/rankings — Players sorted by grade DESC with optional position filter.
 *
 * Unauthenticated requests receive a limited public preview (top 5, no grades).
 * Authenticated requests get the full ranked list.
 *
 * Query params:
 *   position  — filter by position (e.g. QB, WR, EDGE)
 *   limit     — max results (default 50, max 200)
 *   offset    — pagination offset (default 0)
 */
export async function GET(req: NextRequest) {
  try {
    if (!sql) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Determine auth status
    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const auth = token ? await requireAuth(req) : null;
    const isAuthenticated = auth?.ok === true;

    const url = req.nextUrl;
    const position = url.searchParams.get('position');
    const limit = isAuthenticated
      ? Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200)
      : PREVIEW_LIMIT;
    const offset = isAuthenticated
      ? parseInt(url.searchParams.get('offset') || '0', 10)
      : 0;

    const columns = isAuthenticated ? FULL_COLUMNS : PREVIEW_COLUMNS;

    const conditions: string[] = [];
    const values: (string | number)[] = [];
    let paramIdx = 0;

    if (position) {
      paramIdx++;
      conditions.push(`position = $${paramIdx}`);
      values.push(position.toUpperCase());
    }

    // Only include players with a grade
    conditions.push('grade IS NOT NULL');

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    paramIdx++;
    const limitParam = `$${paramIdx}`;
    values.push(limit);

    paramIdx++;
    const offsetParam = `$${paramIdx}`;
    values.push(offset);

    const query = `
      SELECT ${columns}
      FROM perform_players
      ${where}
      ORDER BY grade DESC
      LIMIT ${limitParam} OFFSET ${offsetParam}
    `;

    const countQuery = `SELECT COUNT(*) as total FROM perform_players ${where}`;

    const positionFilterValues = values.slice(0, position ? 1 : 0);

    const [rows, countResult] = await Promise.all([
      sql.unsafe(query, values),
      sql.unsafe(countQuery, positionFilterValues),
    ]);

    const total = parseInt(countResult[0]?.total || '0', 10);

    return NextResponse.json({
      rankings: rows,
      total,
      limit,
      offset,
      ...(isAuthenticated ? {} : { preview: true }),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch rankings';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
