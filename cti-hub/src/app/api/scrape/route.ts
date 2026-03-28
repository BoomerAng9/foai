import { NextRequest, NextResponse } from 'next/server';

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;

interface ScrapeResult {
  source: 'firecrawl' | 'apify';
  url: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  scraped_at: string;
}

async function scrapeWithFirecrawl(url: string): Promise<ScrapeResult> {
  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
    },
    body: JSON.stringify({
      url,
      formats: ['markdown', 'html'],
      onlyMainContent: true,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Firecrawl scrape failed');

  return {
    source: 'firecrawl',
    url,
    title: data.data?.metadata?.title || url,
    content: data.data?.markdown || data.data?.html || '',
    metadata: data.data?.metadata || {},
    scraped_at: new Date().toISOString(),
  };
}

async function crawlWithFirecrawl(url: string, limit: number = 10): Promise<ScrapeResult[]> {
  const res = await fetch('https://api.firecrawl.dev/v1/crawl', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
    },
    body: JSON.stringify({ url, limit, scrapeOptions: { formats: ['markdown'], onlyMainContent: true } }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Firecrawl crawl failed');

  // Crawl is async — return the job ID for polling
  return [{
    source: 'firecrawl',
    url,
    title: `Crawl job: ${data.id}`,
    content: JSON.stringify({ jobId: data.id, status: data.status }),
    metadata: { jobId: data.id, limit },
    scraped_at: new Date().toISOString(),
  }];
}

async function scrapeWithApify(url: string): Promise<ScrapeResult> {
  if (!APIFY_API_TOKEN) throw new Error('APIFY_API_TOKEN not configured');

  const res = await fetch('https://api.apify.com/v2/acts/apify~web-scraper/run-sync-get-dataset-items?token=' + APIFY_API_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  });

  const items = await res.json();
  if (!res.ok || !Array.isArray(items) || items.length === 0) {
    throw new Error('Apify scrape returned no results');
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
  try {
    const { urls, engine, mode } = await request.json() as {
      urls: string[];
      engine?: 'firecrawl' | 'apify' | 'both';
      mode?: 'scrape' | 'crawl';
    };

    if (!urls || urls.length === 0) {
      return NextResponse.json({ error: 'urls array required' }, { status: 400 });
    }

    const results: ScrapeResult[] = [];
    const errors: Array<{ url: string; error: string }> = [];

    for (const url of urls.slice(0, 20)) {
      try {
        if (mode === 'crawl' && FIRECRAWL_API_KEY) {
          const crawled = await crawlWithFirecrawl(url);
          results.push(...crawled);
        } else if (engine === 'apify' && APIFY_API_TOKEN) {
          results.push(await scrapeWithApify(url));
        } else if (engine === 'both' && FIRECRAWL_API_KEY && APIFY_API_TOKEN) {
          const [fc, ap] = await Promise.allSettled([
            scrapeWithFirecrawl(url),
            scrapeWithApify(url),
          ]);
          if (fc.status === 'fulfilled') results.push(fc.value);
          if (ap.status === 'fulfilled') results.push(ap.value);
          if (fc.status === 'rejected' && ap.status === 'rejected') {
            errors.push({ url, error: 'Both engines failed' });
          }
        } else if (FIRECRAWL_API_KEY) {
          results.push(await scrapeWithFirecrawl(url));
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
