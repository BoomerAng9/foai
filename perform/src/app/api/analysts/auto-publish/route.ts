// Cron: 0 */6 * * * curl -s -X POST https://perform.foai.cloud/api/analysts/auto-publish -H "Authorization: Bearer $PIPELINE_KEY"

import { NextRequest, NextResponse } from 'next/server';
import { ANALYSTS } from '@/lib/analysts/personas';
import { searchDraftNews, type ScrapedArticle } from '@/lib/data-pipeline/scraper';
import { generateText, DEFAULT_MODEL } from '@/lib/openrouter';
import { sql } from '@/lib/db';
import { safeCompare } from '@/lib/auth-guard';

const CONTENT_TYPES = ['hot_take', 'scouting_report', 'ranking_update', 'film_breakdown'] as const;

async function ensureTable() {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS analyst_content (
      id SERIAL PRIMARY KEY,
      analyst_id TEXT NOT NULL,
      content_type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function POST(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  const pipelineKey = process.env.PIPELINE_AUTH_KEY;

  if (!pipelineKey || !safeCompare(token, pipelineKey)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    await ensureTable();

    // Fetch latest articles
    const articles: ScrapedArticle[] = await searchDraftNews();
    const usableArticles = articles.slice(0, 5);

    if (usableArticles.length === 0) {
      return NextResponse.json({ error: 'No articles available' }, { status: 503 });
    }

    let published = 0;
    const publishedAnalysts: string[] = [];

    for (const analyst of ANALYSTS) {
      try {
        // Pick a random article for this analyst
        const article = usableArticles[Math.floor(Math.random() * usableArticles.length)];
        const contentType = CONTENT_TYPES[Math.floor(Math.random() * CONTENT_TYPES.length)];

        const userMessage = `Write a ${contentType.replace('_', ' ')} about the following news:\n\nHeadline: ${article.title}\nSummary: ${article.description}\n\nGive your take in 2-3 paragraphs. Start with a compelling title line on the first line (no prefix, no "Title:" label), then a blank line, then your analysis.`;

        const content = await generateText(analyst.systemPrompt, userMessage);

        // Extract title from first line of generated content
        const lines = content.trim().split('\n');
        const title = lines[0].replace(/^#+\s*/, '').replace(/^\*+/, '').replace(/\*+$/, '').trim();
        const body = lines.slice(1).join('\n').trim();

        await sql`
          INSERT INTO analyst_content (analyst_id, content_type, title, content, created_at)
          VALUES (${analyst.id}, ${contentType}, ${title}, ${body || content}, NOW())
        `;

        published++;
        publishedAnalysts.push(analyst.name);
      } catch (err) {
        console.error(`Auto-publish failed for ${analyst.name}:`, err);
      }
    }

    return NextResponse.json({ published, analysts: publishedAnalysts });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Auto-publish failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
