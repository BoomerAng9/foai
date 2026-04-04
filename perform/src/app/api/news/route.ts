import { NextResponse } from 'next/server';
import { searchDraftNews, type ScrapedArticle } from '@/lib/data-pipeline/scraper';

export const revalidate = 300; // Revalidate every 5 minutes

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
