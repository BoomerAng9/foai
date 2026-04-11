import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * GET /api/tie/rankings — Players sorted by grade DESC with optional position filter
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

    const url = req.nextUrl;
    const position = url.searchParams.get('position');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

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
      SELECT
        id, name, position, school, grade, tie_grade, tie_tier,
        overall_rank, position_rank, projected_round,
        nfl_comparison, strengths, weaknesses, trend
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
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch rankings';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
