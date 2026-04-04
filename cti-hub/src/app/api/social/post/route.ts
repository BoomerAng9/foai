import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { postTweet } from '@/lib/social/x-poster';

/**
 * POST /api/social/post
 *
 * Post content to social platforms. Currently supports X/Twitter.
 * Owner-only endpoint.
 *
 * Body: { text: string, platform: 'x' }
 * Returns: { success: true, tweet: { id, text, url } }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    // Owner-only gate
    if (auth.role !== 'owner') {
      return NextResponse.json(
        { error: 'Social posting is restricted to platform owners.', code: 'FORBIDDEN' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { text, platform } = body as { text?: string; platform?: string };

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'text is required and must be a non-empty string.', code: 'VALIDATION_ERROR' },
        { status: 400 },
      );
    }

    if (!platform || platform !== 'x') {
      return NextResponse.json(
        { error: "platform is required. Supported: 'x'", code: 'VALIDATION_ERROR' },
        { status: 400 },
      );
    }

    const result = await postTweet(text.trim());

    return NextResponse.json({
      success: true,
      tweet: {
        id: result.id,
        text: result.text,
        url: result.url,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Social post failed';
    console.error('[Social Post]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
