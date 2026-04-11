import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { rateLimit } from '@/lib/rate-limit-simple';
import { scrapeUrl, scrapeQuery } from '@/lib/aiplug/sqwaadrun';

/**
 * POST /api/scrape — Web scraping via Sqwaadrun 17-Hawk fleet.
 *
 * Sqwaadrun is the sole scraping engine. Pure Python, Brave API powered,
 * zero cost. Routes through the Sqwaadrun gateway (SQWAADRUN_GATEWAY_URL).
 *
 * Body:
 *   { urls: string[] }                    — scrape specific URLs
 *   { intent: string, targets?: string[] } — NL intent, Chicken_Hawk auto-routes
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (!rateLimit(auth.userId, 10, 60000)) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.', code: 'RATE_LIMITED' }, { status: 429 });
  }

  try {
    const body = await request.json() as {
      urls?: string[];
      intent?: string;
      targets?: string[];
    };

    // Intent-based scraping — Chicken_Hawk routes to the right Hawk
    if (body.intent) {
      const result = await scrapeQuery(body.intent, body.targets || [], { timeoutMs: 60_000 });
      if (!result.ok) {
        return NextResponse.json({ error: result.error || 'Scrape failed' }, { status: 502 });
      }
      return NextResponse.json({
        results: result.pages.map(p => ({
          url: p.url,
          title: p.title || p.url,
          content: p.text,
          scraped_at: new Date().toISOString(),
        })),
        total: result.pages.length,
        failed: 0,
      });
    }

    // URL-based scraping
    const urls = body.urls;
    if (!urls || urls.length === 0) {
      return NextResponse.json({ error: 'urls array or intent string required' }, { status: 400 });
    }

    if (urls.length > 5) {
      return NextResponse.json({ error: 'Too many URLs (max 5)', code: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const urlPattern = /^https?:\/\/.+/i;
    for (const u of urls) {
      if (typeof u !== 'string' || !urlPattern.test(u)) {
        return NextResponse.json({ error: `Invalid URL: "${u}". Must start with http:// or https://`, code: 'VALIDATION_ERROR' }, { status: 400 });
      }
    }

    const results: Array<{ url: string; title: string; content: string; scraped_at: string }> = [];
    const errors: Array<{ url: string; error: string }> = [];

    for (const url of urls) {
      const result = await scrapeUrl(url, { timeoutMs: 30_000 });
      if (result.ok && result.pages.length > 0) {
        results.push({
          url,
          title: result.pages[0].title || url,
          content: result.text,
          scraped_at: new Date().toISOString(),
        });
      } else {
        errors.push({ url, error: result.error || 'Scrape returned no content' });
      }
    }

    return NextResponse.json({
      results,
      errors,
      total: results.length,
      failed: errors.length,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Scrape API error' },
      { status: 500 },
    );
  }
}
