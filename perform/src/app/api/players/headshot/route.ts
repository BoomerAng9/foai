import { NextRequest, NextResponse } from 'next/server';
import { getPlayerHeadshot } from '@/lib/players/headshots';

/**
 * GET /api/players/headshot?name=...&school=...
 *
 * Searches ESPN's public API for a college football player headshot.
 * Returns { url, espnId, source } — cached in-memory after first lookup.
 */
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name');
  const school = req.nextUrl.searchParams.get('school') || '';

  if (!name) {
    return NextResponse.json(
      { error: 'Missing required query param: name' },
      { status: 400 },
    );
  }

  try {
    const result = await getPlayerHeadshot(name, school);

    return NextResponse.json(result, {
      headers: {
        // Cache for 24 hours at CDN / browser level
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to resolve headshot' },
      { status: 500 },
    );
  }
}
