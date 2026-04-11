import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { rateLimit } from '@/lib/rate-limit-simple';

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;

interface ScrapeResult {
  source: 'brave' | 'apify';
  url: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  scraped_at: string;
}

/**
 * Scrape a URL using Brave Web Search API (summarizer mode).
 * Returns cleaned text content from the page.
 */
async function scrapeWithBrave(url: string): Promise<ScrapeResult> {
  if (!BRAVE_API_KEY) throw new Error('Web search not configured');

  // Use Brave's web search with the URL as query to get page summary + content
  const searchUrl = new URL('https://api.search.brave.com/res/v1/web/search');
  searchUrl.searchParams.set('q', url);
  searchUrl.searchParams.set('count', '1');
  searchUrl.searchParams.set('summary', '1');
  searchUrl.searchParams.set('extra_snippets', '1');

  const res = await fetch(searchUrl.toString(), {
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': BRAVE_API_KEY,
    },
    signal: AbortSignal.timeout(15000),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Web search failed');

  const result = data.web?.results?.[0];
  const snippets = result?.extra_snippets || [];
  const summary = data.summarizer?.results?.[0]?.text || '';
  const content = [
    result?.description || '',
    ...snippets,
    summary,
  ].filter(Boolean).join('\n\n');

  return {
    source: 'brave',
    url,
    title: result?.title || url,
    content: content || 'No content extracted',
    metadata: {
      age: result?.age,
      language: result?.language,
      family_friendly: data.query?.is_safe_search,
    },
    scraped_at: new Date().toISOString(),
  };
}

/**
 * Full page scrape using Apify (JS-rendered, more complete).
 * Fallback for when Brave summary is insufficient.
 */
async function scrapeWithApify(url: string): Promise<ScrapeResult> {
  if (!APIFY_API_TOKEN) throw new Error('Full-page scraper not configured');

  const res = await fetch('https://api.apify.com/v2/acts/apify~web-scraper/run-sync-get-dataset-items', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${APIFY_API_TOKEN}`,
    },
    body: JSON.stringify({
      startUrls: [{ url }],
      pageFunction: `async function pageFunction(context) {
        const { page, request } = context;
        const title = await page.title();
        const text = await page.$eval('body', el => el.innerText);
        return { url: request.url, title, text: text.slice(0, 50000) };
      }`,
      maxPagesPerCrawl: 1,
    }),
    signal: AbortSignal.timeout(30000),
  });

  const items = await res.json();
  if (!res.ok || !Array.isArray(items) || items.length === 0) {
    throw new Error('Full-page scrape returned no results');
  }

  const item = items[0];
  return {
    source: 'apify',
    url,
    title: item.title || url,
    content: item.text || '',
    metadata: { pageCount: items.length },
    scraped_at: new Date().toISOString(),
  };
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (!rateLimit(auth.userId, 10, 60000)) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.', code: 'RATE_LIMITED' }, { status: 429 });
  }

  try {
    const { urls, engine, mode: _mode } = await request.json() as {
      urls: string[];
      engine?: 'brave' | 'apify' | 'both';
      mode?: 'scrape' | 'crawl';
    };

    if (!urls || urls.length === 0) {
      return NextResponse.json({ error: 'urls array required' }, { status: 400 });
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

    const results: ScrapeResult[] = [];
    const errors: Array<{ url: string; error: string }> = [];

    for (const url of urls) {
      try {
        if (engine === 'apify' && APIFY_API_TOKEN) {
          results.push(await scrapeWithApify(url));
        } else if (engine === 'both' && BRAVE_API_KEY && APIFY_API_TOKEN) {
          const [br, ap] = await Promise.allSettled([
            scrapeWithBrave(url),
            scrapeWithApify(url),
          ]);
          if (br.status === 'fulfilled') results.push(br.value);
          if (ap.status === 'fulfilled') results.push(ap.value);
          if (br.status === 'rejected' && ap.status === 'rejected') {
            errors.push({ url, error: 'Both engines failed' });
          }
        } else if (BRAVE_API_KEY) {
          results.push(await scrapeWithBrave(url));
        } else if (APIFY_API_TOKEN) {
          results.push(await scrapeWithApify(url));
        } else {
          errors.push({ url, error: 'No scraping engine configured' });
        }
      } catch (err: unknown) {
        errors.push({ url, error: err instanceof Error ? err.message : 'Scrape failed' });
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
