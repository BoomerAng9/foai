import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { query, mode = 'search' } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'query required' }, { status: 400 });
    }

    if (mode === 'search') {
      if (!BRAVE_API_KEY) {
        return NextResponse.json({
          results: [{ title: 'Search unavailable', snippet: 'Search API key not configured. Results will be available once connected.', url: '' }],
        });
      }

      const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`, {
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': BRAVE_API_KEY,
        },
      });

      if (!res.ok) {
        throw new Error('Search request failed');
      }

      const data = await res.json();
      const results = (data.web?.results || []).map((r: { title: string; description: string; url: string }) => ({
        title: r.title,
        snippet: r.description,
        url: r.url,
      }));

      return NextResponse.json({ results });
    }

    return NextResponse.json({
      results: [],
      message: `${mode} mode coming soon. Use search mode for now.`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Research failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
