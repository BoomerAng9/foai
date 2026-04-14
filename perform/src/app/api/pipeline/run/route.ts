import { NextRequest, NextResponse } from 'next/server';
import { searchDraftNews, searchTransferPortal } from '@/lib/data-pipeline/scraper';
import { extractPlayerUpdates } from '@/lib/data-pipeline/enricher';
import { sql } from '@/lib/db';
import { safeCompare } from '@/lib/auth-guard';
import { fetchSportsHeadlineFeed } from '@/lib/sports/news-feed';

const PIPELINE_KEY = process.env.PIPELINE_AUTH_KEY || '';

export async function POST(req: NextRequest) {
  // Internal auth — only callable by cron or admin
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!PIPELINE_KEY || !safeCompare(token, PIPELINE_KEY)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (!sql) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

    // Step 1: Scrape latest news
    const [draftNews, portalNews] = await Promise.all([
      searchDraftNews(),
      searchTransferPortal(),
    ]);
    const allArticles = [...draftNews, ...portalNews];
    const sportsFeed = await fetchSportsHeadlineFeed();

    // Step 2: Extract structured updates via LLM
    const updates = await extractPlayerUpdates(allArticles);

    // Step 3: Store articles in news table
    await sql`
      CREATE TABLE IF NOT EXISTS perform_news (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        url TEXT UNIQUE,
        description TEXT,
        source TEXT,
        published_at TIMESTAMP,
        scraped_at TIMESTAMP DEFAULT NOW()
      )
    `;

    let articlesStored = 0;
    for (const article of allArticles) {
      try {
        await sql`
          INSERT INTO perform_news (title, url, description, source, published_at)
          VALUES (${article.title}, ${article.url}, ${article.description}, ${article.source}, ${article.publishedAt || null})
          ON CONFLICT (url) DO NOTHING
        `;
        articlesStored++;
      } catch {}
    }

    // Step 4: Store multi-sport headlines for the live ticker
    await sql`
      CREATE TABLE IF NOT EXISTS sports_news_feed (
        id SERIAL PRIMARY KEY,
        sport TEXT NOT NULL,
        headline TEXT NOT NULL,
        summary TEXT,
        source_name TEXT NOT NULL,
        source_url TEXT NOT NULL UNIQUE,
        players_mentioned TEXT[] DEFAULT '{}'::TEXT[],
        teams_mentioned TEXT[] DEFAULT '{}'::TEXT[],
        category TEXT,
        published_at TIMESTAMPTZ,
        scraped_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    let sportsNewsStored = 0;
    for (const item of sportsFeed) {
      try {
        const inserted = await sql`
          INSERT INTO sports_news_feed (
            sport,
            headline,
            summary,
            source_name,
            source_url,
            players_mentioned,
            teams_mentioned,
            category,
            published_at
          )
          VALUES (
            ${item.sport},
            ${item.headline},
            ${item.summary},
            ${item.source_name},
            ${item.source_url},
            ${item.players_mentioned},
            ${item.teams_mentioned},
            ${item.category},
            ${item.published_at}
          )
          ON CONFLICT (source_url) DO NOTHING
          RETURNING id
        `;
        sportsNewsStored += inserted.length;
      } catch {}
    }

    await sql`
      DELETE FROM sports_news_feed
      WHERE COALESCE(published_at, scraped_at) < NOW() - INTERVAL '14 days'
    `;

    // Step 5: Apply high-confidence player updates to DB
    let updatesApplied = 0;
    for (const update of updates) {
      if (update.confidence < 0.7) continue;
      try {
        // Update player notes with latest info
        await sql`
          UPDATE perform_players
          SET analyst_notes = COALESCE(analyst_notes, '') || ${'\n[' + new Date().toISOString().slice(0, 10) + '] ' + update.summary},
              updated_at = NOW()
          WHERE LOWER(name) = LOWER(${update.playerName})
        `;
        updatesApplied++;
      } catch {}
    }

    return NextResponse.json({
      articlesScraped: allArticles.length,
      articlesStored,
      sportsFeedScraped: sportsFeed.length,
      sportsNewsStored,
      updatesExtracted: updates.length,
      updatesApplied,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: 'Pipeline failed' }, { status: 500 });
  }
}
