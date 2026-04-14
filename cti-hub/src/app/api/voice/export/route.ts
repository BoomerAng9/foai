import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { sql } from '@/lib/insforge';
import { isOwner } from '@/lib/allowlist';

/**
 * POST /api/voice/export — generate and export audio from a cloned voice
 *
 * This is a PAID feature. Owner emails bypass the payment gate.
 * Regular users must have an active subscription or pay-per-use credit.
 *
 * Body: { voiceId: string, text: string, format?: 'mp3' | 'wav' }
 * Returns: audio file download
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  // Owner bypass — never gated
  const ownerBypass = isOwner(auth.email);

  if (!ownerBypass) {
    // Check if user has export credits or active subscription
    if (sql) {
      try {
        const [sub] = await sql`
          SELECT tier FROM subscriptions WHERE user_id = ${auth.userId} AND status = 'active' LIMIT 1
        `.catch(() => []);
        const hasPaidTier = sub && sub.tier && sub.tier !== 'free';
        if (!hasPaidTier) {
          return NextResponse.json({
            error: 'Voice export requires an active subscription.',
            code: 'PAYMENT_REQUIRED',
            upgrade_url: '/billing',
          }, { status: 402 });
        }
      } catch {
        // If subscription check fails, block non-owners
        return NextResponse.json({ error: 'Unable to verify subscription' }, { status: 503 });
      }
    }
  }

  const ASYNC_API_KEY = process.env.ASYNC_API_KEY;
  if (!ASYNC_API_KEY) return NextResponse.json({ error: 'Voice service not configured' }, { status: 503 });

  try {
    const body = await req.json();
    const { voiceId, text, format = 'mp3' } = body;

    if (!voiceId || !text) {
      return NextResponse.json({ error: 'voiceId and text required' }, { status: 400 });
    }

    // Generate audio via Async
    const asyncRes = await fetch('https://api.async.ai/v1/tts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ASYNC_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice_id: voiceId,
        text,
        output_format: format,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!asyncRes.ok) {
      const err = await asyncRes.json().catch(() => ({}));
      return NextResponse.json({ error: err.message || 'Audio generation failed' }, { status: asyncRes.status });
    }

    const audioBuffer = await asyncRes.arrayBuffer();
    const mimeType = format === 'wav' ? 'audio/wav' : 'audio/mpeg';

    // Track export usage
    if (sql) {
      await sql`
        INSERT INTO voice_exports (user_id, voice_id, text_length, format, created_at)
        VALUES (${auth.userId}, ${voiceId}, ${text.length}, ${format}, now())
      `.catch(() => {});
    }

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="voice-export.${format}"`,
        'Content-Length': String(audioBuffer.byteLength),
      },
    });
  } catch (err) {
    console.error('[voice export] error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
