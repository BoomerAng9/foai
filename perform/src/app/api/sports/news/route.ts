import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { DEFAULT_FEED_SPORTS, SPORT_FEED_CONFIG } from '@/lib/sports/news-feed';
import type { Sport } from '@/lib/franchise/types';

type FeedRow = {
  id: number;
  sport: Sport;
  headline: string;
  summary: string | null;
  source_name: string;
  source_url: string;
  players_mentioned: string[];
  teams_mentioned: string[];
  category: string | null;
  published_at: string | null;
  scraped_at: string | null;
};

function parseSportsParam(value: string | null): Sport[] {
  if (!value) return DEFAULT_FEED_SPORTS;

  const sports = value
    .split(',')
    .map((sport) => sport.trim().toLowerCase())
    .filter((sport): sport is Sport => DEFAULT_FEED_SPORTS.includes(sport as Sport));

  return sports.length > 0 ? sports : DEFAULT_FEED_SPORTS;
}

function sortRows(items: FeedRow[]): FeedRow[] {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.published_at || a.scraped_at || 0).getTime();
    const bTime = new Date(b.published_at || b.scraped_at || 0).getTime();
    return bTime - aTime;
  });
}

export async function GET(req: NextRequest) {
  const db = sql;
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const sports = parseSportsParam(req.nextUrl.searchParams.get('sports'));
  const team = req.nextUrl.searchParams.get('team')?.trim().toUpperCase() || null;
  const perSport = Math.min(12, Math.max(1, parseInt(req.nextUrl.searchParams.get('perSport') || '8', 10)));
  const limit = Math.min(60, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') || String(perSport * sports.length), 10)));

  const segments = await Promise.all(
    sports.map(async (sport) => {
      const rows = team
        ? await db<FeedRow[]>`
            SELECT
              id,
              sport,
              headline,
              summary,
              source_name,
              source_url,
              players_mentioned,
              teams_mentioned,
              category,
              published_at,
              scraped_at
            FROM sports_news_feed
            WHERE sport = ${sport}
              AND ${team} = ANY(teams_mentioned)
            ORDER BY COALESCE(published_at, scraped_at) DESC, scraped_at DESC
            LIMIT ${perSport}
          `
        : await db<FeedRow[]>`
            SELECT
              id,
              sport,
              headline,
              summary,
              source_name,
              source_url,
              players_mentioned,
              teams_mentioned,
              category,
              published_at,
              scraped_at
            FROM sports_news_feed
            WHERE sport = ${sport}
            ORDER BY COALESCE(published_at, scraped_at) DESC, scraped_at DESC
            LIMIT ${perSport}
          `;

      const ordered = sortRows(rows);

      return {
        sport,
        label: SPORT_FEED_CONFIG[sport].label,
        badgeColor: SPORT_FEED_CONFIG[sport].badgeColor,
        segmentMs: SPORT_FEED_CONFIG[sport].segmentMs,
        updatedAt: ordered[0]?.published_at || ordered[0]?.scraped_at || null,
        count: ordered.length,
        items: ordered,
      };
    }),
  );

  const news = sortRows(segments.flatMap((segment) => segment.items)).slice(0, limit);
  const updatedAt = news[0]?.published_at || news[0]?.scraped_at || new Date().toISOString();

  return NextResponse.json({
    sports,
    perSport,
    updatedAt,
    segments: segments.filter((segment) => segment.items.length > 0),
    news,
    count: news.length,
  });
}
