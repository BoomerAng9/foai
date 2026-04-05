import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { grokTextToSpeech, grokSpeechToText, GROK_VOICES, AGENT_VOICE_MAP, type GrokVoiceId } from '@/lib/voice/grok-voice';

/**
 * POST /api/voice — Text-to-speech or speech-to-text
 *
 * TTS: { action: 'speak', text: string, voice?: string, agent?: string }
 * STT: { action: 'transcribe', audio: base64 }
 * Info: { action: 'voices' } — list available voices
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { action } = body;

    if (action === 'voices') {
      return NextResponse.json({
        voices: Object.values(GROK_VOICES),
        agentDefaults: AGENT_VOICE_MAP,
      });
    }

    if (action === 'speak') {
      const { text, voice, agent } = body;
      if (!text?.trim()) return NextResponse.json({ error: 'text required' }, { status: 400 });

      // Resolve voice: explicit > agent default > leo
      const voiceId: GrokVoiceId = voice || AGENT_VOICE_MAP[agent] || 'leo';

      const audio = await grokTextToSpeech(text, voiceId);
      if (!audio) {
        return NextResponse.json({ error: 'Voice generation failed' }, { status: 502 });
      }

      return new Response(audio, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Disposition': 'inline',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    if (action === 'transcribe') {
      const { audio } = body;
      if (!audio) return NextResponse.json({ error: 'audio required' }, { status: 400 });

      const buffer = Buffer.from(audio, 'base64');
      const text = await grokSpeechToText(buffer.buffer);
      if (!text) {
        return NextResponse.json({ error: 'Transcription failed' }, { status: 502 });
      }

      return NextResponse.json({ text });
    }

    return NextResponse.json({ error: 'Invalid action. Use: speak, transcribe, or voices' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Voice failed' }, { status: 500 });
  }
}

/**
 * GET /api/voice — Return WebSocket config for real-time voice
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const agent = req.nextUrl.searchParams.get('agent') || 'acheevy';

    return NextResponse.json({
      websocketUrl: 'wss://api.x.ai/v1/realtime',
      model: 'grok-4.20-beta',
      voice: AGENT_VOICE_MAP[agent] || 'leo',
      voices: Object.values(GROK_VOICES),
      instructions: 'Pass XAI_API_KEY as Bearer token in WebSocket handshake. See https://docs.x.ai/developers/model-capabilities/audio/voice-agent',
    });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
