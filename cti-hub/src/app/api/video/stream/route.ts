import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';

/**
 * GET /api/video/stream?taskId=...&index=0
 *
 * Proxies OpenRouter video content through the server so the browser
 * <video> element can play it without needing Authorization headers.
 *
 * Why this exists:
 * OpenRouter's unsigned_urls return content only when the request carries
 * `Authorization: Bearer <OPENROUTER_API_KEY>`. HTML5 <video src="..."> cannot
 * attach headers, so the element silently fails to load the media. This route
 * carries the auth on the server side and streams the bytes back to the
 * browser with the right Content-Type.
 */

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';
const OR_BASE = 'https://openrouter.ai';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  if (!OPENROUTER_KEY) {
    return NextResponse.json({ error: 'OPENROUTER_API_KEY not configured' }, { status: 503 });
  }

  const taskId = req.nextUrl.searchParams.get('taskId');
  const index = req.nextUrl.searchParams.get('index') || '0';
  if (!taskId) {
    return NextResponse.json({ error: 'taskId required' }, { status: 400 });
  }

  // Forward the Range header if the browser sent one (seek support for large videos)
  const range = req.headers.get('range');
  const upstreamHeaders: Record<string, string> = {
    Authorization: `Bearer ${OPENROUTER_KEY}`,
  };
  if (range) upstreamHeaders.Range = range;

  const upstream = await fetch(
    `${OR_BASE}/api/v1/videos/${encodeURIComponent(taskId)}/content?index=${encodeURIComponent(index)}`,
    { headers: upstreamHeaders },
  );

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: `Upstream returned ${upstream.status}` },
      { status: upstream.status },
    );
  }

  // Pass through the bytes + relevant headers. Content-Type tells the browser
  // it's a video; Content-Length + Accept-Ranges let the player seek.
  const headers = new Headers();
  const pass = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag'];
  for (const h of pass) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  if (!headers.has('content-type')) headers.set('content-type', 'video/mp4');
  if (!headers.has('accept-ranges')) headers.set('accept-ranges', 'bytes');
  // Avoid caching by intermediaries; generation content is per-user.
  headers.set('cache-control', 'private, no-store');

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
