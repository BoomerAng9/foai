import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { routeTTS, type TTSMode } from '@/lib/voice/hermes-tts-router';

/**
 * POST /api/voice/speak
 * Unified TTS endpoint — routes to ElevenLabs / Async based on mode.
 * Body: { text, mode, voiceId, speed?, emotion?, language? }
 * Returns: audio/mpeg stream
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { text, mode, voiceId, speed, emotion, language } = body;

  if (!text?.trim()) return NextResponse.json({ error: 'Text required' }, { status: 400 });
  if (!voiceId) return NextResponse.json({ error: 'voiceId required' }, { status: 400 });

  const validModes: TTSMode[] = ['live_chat', 'analyst_voice', 'podcast_longform', 'user_custom_voice', 'studio_production'];
  if (mode && !validModes.includes(mode)) return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });

  const result = await routeTTS({
    text: text.trim().slice(0, 10000),
    mode: mode || 'live_chat',
    voiceId,
    speed,
    emotion,
    language,
  });

  return new NextResponse(new Uint8Array(result.audio), {
    headers: {
      'Content-Type': 'audio/mpeg',
      'X-TTS-Provider': result.provider,
      'X-TTS-Mode': result.mode,
      'X-TTS-Latency-Ms': String(result.latencyMs || 0),
    },
  });
}
