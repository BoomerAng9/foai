import { NextResponse } from 'next/server';
import { searchDraftNews, type ScrapedArticle } from '@/lib/data-pipeline/scraper';

export const dynamic = 'force-dynamic'; // Always fetch fresh news

export async function GET() {
  try {
    const articles: ScrapedArticle[] = await searchDraftNews();

    return NextResponse.json({
      articles: articles.slice(0, 20),
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ articles: [], updatedAt: new Date().toISOString() });
  }
}
