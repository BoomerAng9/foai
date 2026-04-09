import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';

/**
 * POST /api/broadcast/audio — Generate audio/music via Google Lyria (Gemini API)
 *
 * Body: { prompt, duration?, style? }
 *
 * Lyria generates instrumental music, sound effects, and ambient audio
 * for video production in Broad|Cast Studio.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    if (!GEMINI_KEY) {
      return NextResponse.json({ error: 'Audio generation not configured' }, { status: 503 });
    }

    const { prompt, duration = 30, style = 'cinematic' } = await req.json();

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Audio prompt required' }, { status: 400 });
    }

    // Lyria via Gemini generativelanguage API
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/lyria:generateMusic',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GEMINI_KEY,
        },
        body: JSON.stringify({
          prompt: `${style} music: ${prompt}`,
          config: {
            durationSeconds: Math.min(duration, 60),
          },
        }),
      },
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));

      // Fallback: use ElevenLabs sound effects if Lyria unavailable
      const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
      if (elevenLabsKey) {
        const sfxRes = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
          method: 'POST',
          headers: {
            'xi-api-key': elevenLabsKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: `${style} ${prompt}`,
            duration_seconds: Math.min(duration, 22),
          }),
        });

        if (sfxRes.ok) {
          const audioBuffer = await sfxRes.arrayBuffer();
          const base64 = Buffer.from(audioBuffer).toString('base64');
          return NextResponse.json({
            status: 'generated',
            engine: 'sound-effects',
            audio_data: `data:audio/mpeg;base64,${base64}`,
            duration: Math.min(duration, 22),
            prompt,
          });
        }
      }

      return NextResponse.json({
        error: err.error?.message || 'Audio generation failed',
        fallback_attempted: !!elevenLabsKey,
      }, { status: 502 });
    }

    const data = await res.json();

    // Extract audio from Lyria response
    const audioUrl = data.audio?.uri || data.generatedAudio?.[0]?.audio?.uri;

    return NextResponse.json({
      status: 'generated',
      engine: 'lyria',
      audio_url: audioUrl,
      duration,
      prompt,
      style,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Audio generation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
