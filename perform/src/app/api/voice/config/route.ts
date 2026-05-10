import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { getRealtimeConfig, type STTMode } from '@/lib/voice/stt-router';
import { ANALYST_VOICES } from '@/lib/voice/mode-tts-router';

/**
 * GET /api/voice/config
 * Returns voice stack configuration for the client.
 * Used by the browser to set up WebSocket connections for realtime STT.
 * Does NOT return API keys — returns the provider and connection metadata only.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const mode = (req.nextUrl.searchParams.get('mode') as STTMode) || 'live_chat';
  const language = req.nextUrl.searchParams.get('language') || undefined;

  const sttConfig = getRealtimeConfig(mode, language);

  return NextResponse.json({
    stt: {
      provider: sttConfig.provider,
      audioFormat: sttConfig.audioFormat,
      sampleRate: sttConfig.sampleRate,
      // WebSocket URL NOT exposed — client must proxy through our server
    },
    tts: {
      modes: ['live_chat', 'analyst_voice', 'podcast_longform', 'user_custom_voice', 'studio_production'],
      analysts: Object.entries(ANALYST_VOICES).map(([id, voices]) => ({
        id,
        hasElevenLabs: !!voices.elevenlabs,
        hasAsync: !!voices.async,
      })),
    },
    capabilities: {
      voiceCloning: true,
      realtimeSTT: true,
      streamingTTS: true,
      multiLanguage: true,
    },
  });
}
