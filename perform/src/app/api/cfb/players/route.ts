import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * GET /api/cfb/players — Query cfb_players with filters, sorting, pagination
 *
 * Query params:
 *   search     — fuzzy name match (ILIKE)
 *   school     — exact or partial match (ILIKE)
 *   position   — exact match, supports comma-separated list (QB,RB,WR)
 *   conference — exact or partial match (ILIKE)
 *   class      — exact (FR/SO/JR/SR)
 *   season     — 2025 or 2026 (default 2026)
 *   unit       — Offense / Defense / Special Teams
 *   sort       — field:asc|desc (default name:asc)
 *   limit      — default 50, max 500
 *   offset     — default 0
 *   withStats  — if "true", include JSONB stats columns
 */
export async function GET(req: NextRequest) {
  try {
    if (!sql) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const url = req.nextUrl;

    const search = url.searchParams.get('search');
    const school = url.searchParams.get('school');
    const position = url.searchParams.get('position');
    const conference = url.searchParams.get('conference');
    const classYear = url.searchParams.get('class');
    const season = url.searchParams.get('season') || '2026';
    const unit = url.searchParams.get('unit');
    const sort = url.searchParams.get('sort') || 'name:asc';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 500);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    const withStats = url.searchParams.get('withStats') === 'true';

    // --- Build dynamic WHERE clauses ---
    const conditions: string[] = [];
    const values: (string | number)[] = [];
    let paramIdx = 0;

    // Season filter (always applied)
    paramIdx++;
    conditions.push(`season = $${paramIdx}`);
    values.push(season);

    if (search) {
      paramIdx++;
      conditions.push(`name ILIKE $${paramIdx}`);
      values.push(`%${search}%`);
    }

    if (school) {
      paramIdx++;
      conditions.push(`school ILIKE $${paramIdx}`);
      values.push(`%${school}%`);
    }

    if (position) {
      const positions = position.split(',').map((p) => p.trim()).filter(Boolean);
      if (positions.length === 1) {
        paramIdx++;
        conditions.push(`position = $${paramIdx}`);
        values.push(positions[0]);
      } else if (positions.length > 1) {
        const placeholders = positions.map((p) => {
          paramIdx++;
          values.push(p);
          return `$${paramIdx}`;
        });
        conditions.push(`position IN (${placeholders.join(', ')})`);
      }
    }

    if (conference) {
      paramIdx++;
      conditions.push(`conference ILIKE $${paramIdx}`);
      values.push(`%${conference}%`);
    }

    if (classYear) {
      paramIdx++;
      conditions.push(`class = $${paramIdx}`);
      values.push(classYear);
    }

    if (unit) {
      paramIdx++;
      conditions.push(`unit = $${paramIdx}`);
      values.push(unit);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // --- Column selection ---
    const baseColumns = [
      'id', 'name', 'school', 'position', 'jersey_number',
      'height', 'weight', 'class', 'birthplace',
      'conference', 'unit', 'season', 'source',
      'created_at', 'updated_at',
    ];
    const statsColumns = [
      'passing_stats', 'rushing_stats', 'receiving_stats',
      'defense_stats', 'kicking_stats',
    ];
    const columns = withStats
      ? [...baseColumns, ...statsColumns].join(', ')
      : baseColumns.join(', ');

    // --- Sorting ---
    const [sortField, sortDir] = sort.split(':');
    const allowedSortFields = [
      'name', 'school', 'position', 'conference', 'class',
      'jersey_number', 'season', 'unit', 'created_at', 'updated_at',
    ];
    const safeSortField = allowedSortFields.includes(sortField) ? sortField : 'name';
    const safeSortDir = sortDir === 'desc' ? 'DESC' : 'ASC';

    // --- Pagination params ---
    paramIdx++;
    const limitParam = `$${paramIdx}`;
    values.push(limit);

    paramIdx++;
    const offsetParam = `$${paramIdx}`;
    values.push(offset);

    const query = `SELECT ${columns} FROM cfb_players ${where} ORDER BY ${safeSortField} ${safeSortDir} LIMIT ${limitParam} OFFSET ${offsetParam}`;
    const countQuery = `SELECT COUNT(*) as total FROM cfb_players ${where}`;

    // Count query uses only the WHERE params (exclude limit/offset)
    const countValues = values.slice(0, values.length - 2);

    const [rows, countResult] = await Promise.all([
      sql.unsafe(query, values),
      sql.unsafe(countQuery, countValues),
    ]);

    const total = parseInt(countResult[0]?.total || '0', 10);

    return NextResponse.json({ players: rows, total, limit, offset });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch CFB players';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
