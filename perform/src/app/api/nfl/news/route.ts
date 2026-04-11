import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * GET /api/nfl/news — Latest NFL news + transactions
 * ?team=LV — filter by team
 * ?category=trade|signing|injury|breaking — filter by type
 * ?limit=20 — pagination
 */
export async function GET(req: NextRequest) {
  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const team = req.nextUrl.searchParams.get('team');
  const category = req.nextUrl.searchParams.get('category');
  const limit = Math.min(50, parseInt(req.nextUrl.searchParams.get('limit') || '20', 10));

  let news;
  if (team) {
    news = await sql`
      SELECT * FROM sports_news_feed
      WHERE sport = 'nfl' AND ${team.toUpperCase()} = ANY(teams_mentioned)
      ORDER BY scraped_at DESC LIMIT ${limit}
    `;
  } else if (category) {
    news = await sql`
      SELECT * FROM sports_news_feed
      WHERE sport = 'nfl' AND category = ${category}
      ORDER BY scraped_at DESC LIMIT ${limit}
    `;
  } else {
    news = await sql`
      SELECT * FROM sports_news_feed
      WHERE sport = 'nfl'
      ORDER BY scraped_at DESC LIMIT ${limit}
    `;
  }

  return NextResponse.json({ news, count: news.length });
}
