import { NextRequest, NextResponse } from 'next/server';
import { searchYouTube, searchPlayerHighlights, searchDraftCoverage } from '@/lib/youtube/client';

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q');
  const player = req.nextUrl.searchParams.get('player');
  const type = req.nextUrl.searchParams.get('type') || 'search';
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '10');

  try {
    let videos;

    if (type === 'player' && player) {
      videos = await searchPlayerHighlights(player);
    } else if (type === 'draft') {
      videos = await searchDraftCoverage(limit);
    } else if (query) {
      videos = await searchYouTube(query, limit);
    } else {
      return NextResponse.json({ error: 'q or player param required' }, { status: 400 });
    }

    return NextResponse.json({ videos, count: videos.length });
  } catch {
    return NextResponse.json({ error: 'YouTube search failed' }, { status: 500 });
  }
}
