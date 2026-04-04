import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';

const GOOGLE_KEY = process.env.GOOGLE_KEY || '';

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

    // Google Cloud TTS v1 — Gemini voice models
    const res = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: text.slice(0, 5000) },
          voice: {
            languageCode: 'en-US',
            name: voice || 'en-US-Studio-M', // Deep male voice — ACHEEVY default
            ssmlGender: 'MALE',
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 1.0,
            pitch: -2.0, // Slightly deeper
            volumeGainDb: 0,
          },
        }),
        signal: AbortSignal.timeout(15000),
      },
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[TTS] Google API error:', err);
      return NextResponse.json({ error: 'Voice generation failed' }, { status: 502 });
    }

    const data = await res.json();
    const audioContent = data.audioContent; // base64 MP3

    return new Response(Buffer.from(audioContent, 'base64'), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'TTS failed' }, { status: 500 });
  }
}
