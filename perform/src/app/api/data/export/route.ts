import { NextRequest, NextResponse } from 'next/server';
import { safeCompare } from '@/lib/auth-guard';
import { sql } from '@/lib/db';

/**
 * GET /api/data/export — Download all player data as CSV
 */
export async function GET(req: NextRequest) {
  const PIPELINE_KEY = process.env.PIPELINE_AUTH_KEY || '';
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!PIPELINE_KEY || !safeCompare(token, PIPELINE_KEY)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const players = await sql`
      SELECT name, position, school, grade, tie_grade, projected_round,
             overall_rank, nfl_comparison, strengths, weaknesses,
             key_stats, scouting_summary
      FROM perform_players
      ORDER BY overall_rank ASC NULLS LAST
    `;

    const headers = [
      'name', 'position', 'school', 'grade', 'tie_grade',
      'projected_round', 'overall_rank', 'nfl_comparison',
      'strengths', 'weaknesses', 'key_stats', 'scouting_summary',
    ];

    const escapeCSV = (val: unknown): string => {
      const s = val == null ? '' : String(val);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const rows = [headers.join(',')];
    for (const p of players) {
      rows.push(headers.map(h => escapeCSV(p[h])).join(','));
    }

    const csv = rows.join('\n');

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="perform-players-export.csv"',
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Export failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
