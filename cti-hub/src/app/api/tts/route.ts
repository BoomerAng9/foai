import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';

const GOOGLE_KEY = process.env.GOOGLE_KEY || '';

// Ordered fallback list — first available voice wins
const VOICE_FALLBACKS = [
  'en-US-Journey-D',   // Deep male, Journey tier (widely available)
  'en-US-Wavenet-D',   // Deep male, Wavenet tier (most reliable)
  'en-US-Neural2-D',   // Deep male, Neural2 tier
  'en-US-Studio-M',    // Original pick — may not be available on all projects
  'en-US-Standard-D',  // Standard fallback — always available
];

async function synthesize(text: string, voiceName: string) {
  return fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text: text.slice(0, 5000) },
        voice: {
          languageCode: 'en-US',
          name: voiceName,
          ssmlGender: 'MALE',
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 1.0,
          pitch: -2.0,
          volumeGainDb: 0,
        },
      }),
      signal: AbortSignal.timeout(15000),
    },
  );
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { text, voice } = await req.json();
    if (!text?.trim()) {
      return NextResponse.json({ error: 'text required' }, { status: 400 });
    }
    if (!GOOGLE_KEY) {
      return NextResponse.json({ error: 'TTS not configured' }, { status: 503 });
    }

    // Build voice list: explicit choice first, then fallbacks
    const voices = voice ? [voice, ...VOICE_FALLBACKS] : VOICE_FALLBACKS;

    let lastError: unknown = null;
    for (const voiceName of voices) {
      try {
        const res = await synthesize(text, voiceName);
        if (res.ok) {
          const data = await res.json();
          const audioContent = data.audioContent;
          if (!audioContent) {
            console.error(`[TTS] No audioContent in response for voice ${voiceName}`);
            continue;
          }
          return new Response(Buffer.from(audioContent, 'base64'), {
            headers: {
              'Content-Type': 'audio/mpeg',
              'Content-Disposition': 'inline',
              'Cache-Control': 'public, max-age=3600',
            },
          });
        }
        const err = await res.json().catch(() => ({}));
        console.warn(`[TTS] Voice ${voiceName} failed (${res.status}):`, err);
        lastError = err;
      } catch (e) {
        console.warn(`[TTS] Voice ${voiceName} threw:`, e);
        lastError = e;
      }
    }

    console.error('[TTS] All voices exhausted. Last error:', lastError);
    return NextResponse.json({ error: 'Voice generation failed' }, { status: 502 });
  } catch {
    return NextResponse.json({ error: 'TTS failed' }, { status: 500 });
  }
}
