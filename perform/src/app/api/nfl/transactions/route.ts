import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * GET /api/nfl/transactions — Latest NFL roster transactions
 * ?team=LV — filter by team
 * ?type=trade|signing|release — filter by transaction type
 * ?limit=20 — pagination
 */
export async function GET(req: NextRequest) {
  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const team = req.nextUrl.searchParams.get('team');
  const type = req.nextUrl.searchParams.get('type');
  const limit = Math.min(50, parseInt(req.nextUrl.searchParams.get('limit') || '20', 10));

  if (team) {
    const transactions = await sql`
      SELECT * FROM sports_transactions
      WHERE sport = 'nfl' AND team_abbrev = ${team.toUpperCase()}
      ORDER BY transaction_date DESC NULLS LAST, created_at DESC LIMIT ${limit}
    `;
    return NextResponse.json({ transactions, count: transactions.length });
  }

  if (type) {
    const transactions = await sql`
      SELECT * FROM sports_transactions
      WHERE sport = 'nfl' AND transaction_type = ${type}
      ORDER BY transaction_date DESC NULLS LAST, created_at DESC LIMIT ${limit}
    `;
    return NextResponse.json({ transactions, count: transactions.length });
  }

  const transactions = await sql`
    SELECT * FROM sports_transactions
    WHERE sport = 'nfl'
    ORDER BY transaction_date DESC NULLS LAST, created_at DESC LIMIT ${limit}
  `;
  return NextResponse.json({ transactions, count: transactions.length });
}
