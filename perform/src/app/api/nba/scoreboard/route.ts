/**
 * GET /api/nba/scoreboard?date=YYYYMMDD
 * ======================================
 * Proxies ESPN's public scoreboard API for NBA so the browser side of
 * /nba/playoffs can fetch without CORS issues. Caches for 20s on the
 * server (TTL aligned with NBA broadcast pace — fast enough for live
 * games, slow enough not to hammer ESPN).
 *
 * Public route (added to PUBLIC_PREFIXES). No auth, no PII, ESPN data
 * only.
 *
 * Failure mode: if ESPN errors, returns { events: [] } so the page
 * keeps rendering the bracket without live data.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CachedScoreboard {
  fetchedAt: number;
  body: unknown;
}

let cache: CachedScoreboard | null = null;
const TTL_MS = 20_000;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const date = url.searchParams.get('date'); // YYYYMMDD format

  // Date-specific fetches bypass the cache (rarely-asked, can be heavier).
  if (!date && cache && Date.now() - cache.fetchedAt < TTL_MS) {
    return NextResponse.json(cache.body, {
      headers: { 'Cache-Control': 'public, max-age=20' },
    });
  }

  const espnUrl = date
    ? `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${encodeURIComponent(date)}`
    : 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard';

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(espnUrl, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'PerForm/1.0 (+https://perform.foai.cloud)' },
    });
    if (!res.ok) {
      return NextResponse.json({ events: [], source: 'espn', error: `upstream ${res.status}` }, { status: 200 });
    }
    const body = await res.json();
    if (!date) cache = { fetchedAt: Date.now(), body };
    return NextResponse.json(body, {
      headers: { 'Cache-Control': 'public, max-age=20' },
    });
  } catch {
    return NextResponse.json({ events: [], source: 'espn', error: 'fetch_failed' }, { status: 200 });
  } finally {
    clearTimeout(timer);
  }
}
