import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { synthesizeVoice, type VoiceVendorId } from '@/lib/voice/vendors';

const GOOGLE_KEY = process.env.GOOGLE_KEY || '';

// Google Cloud TTS fallback — always available
const VOICE_FALLBACKS = [
  'en-US-Journey-D',
  'en-US-Wavenet-D',
  'en-US-Neural2-D',
  'en-US-Standard-D',
];

async function googleTTSFallback(text: string): Promise<{ audio: string } | null> {
  if (!GOOGLE_KEY) return null;

  for (const voiceName of VOICE_FALLBACKS) {
    try {
      const res = await fetch(
        'https://texttospeech.googleapis.com/v1/text:synthesize',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_KEY,
          },
          body: JSON.stringify({
            input: { text: text.slice(0, 5000) },
            voice: { languageCode: 'en-US', name: voiceName, ssmlGender: 'MALE' },
            audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0, pitch: -2.0 },
          }),
          signal: AbortSignal.timeout(15000),
        },
      );
      if (res.ok) {
        const data = await res.json();
        if (data.audioContent) {
          return { audio: `data:audio/mpeg;base64,${data.audioContent}` };
        }
      }
    } catch { continue; }
  }
  return null;
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { text, vendor, voiceId, modelId } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text required' }, { status: 400 });
    }

    if (text.length > 5000) {
      return NextResponse.json({ error: 'Text too long (max 5000 chars)' }, { status: 400 });
    }

    const selectedVendor: VoiceVendorId = vendor || 'elevenlabs';

    // Try premium vendor first
    try {
      const result = await synthesizeVoice({
        vendor: selectedVendor,
        text: text.slice(0, 5000),
        voiceId,
        modelId,
      });

      return NextResponse.json({
        audio: `data:${result.mimeType};base64,${result.audioBase64}`,
        vendor: result.vendor,
        voiceId: result.voiceId,
      });
    } catch {
      // Premium vendor failed — fall back to Google Cloud TTS
    }

    // Google TTS fallback
    const fallback = await googleTTSFallback(text.slice(0, 5000));
    if (fallback) {
      return NextResponse.json({
        audio: fallback.audio,
        vendor: 'google-tts',
        voiceId: 'Journey-D',
      });
    }

    return NextResponse.json({ error: 'All voice engines unavailable' }, { status: 502 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Voice synthesis failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
