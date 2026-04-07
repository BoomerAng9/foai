/**
 * ElevenLabs Turbo v2 client
 * =============================
 * Real TTS for refined single voices (The Void-Caster, Astra Novatos).
 * Credential: ELEVENLABS_API_KEY in openclaw.
 *
 * Returns an audio URL after caching the MP3 blob to disk so the
 * browser <audio> element can play it back.
 */

import fs from 'fs';
import path from 'path';

const getApiKey = () => process.env.ELEVENLABS_API_KEY || '';
const BASE_URL = 'https://api.elevenlabs.io/v1';

// Default voice IDs — ElevenLabs public library. Swap these for
// custom-cloned voices when they're set up.
const VOICE_ID_MAP: Record<string, string> = {
  'idris-broadcast': 'onwK4e9ZLuTAKqWW03F9',        // Daniel — deep British broadcast
  'astra-refined-tenor': 'TX3LPaxmHKxFdv7VOQHJ',    // Liam — refined American tenor
  'bun-e-cosmic-alto': 'EXAVITQu4vr4xnSDxMaL',      // Bella — warm alto (fallback until custom)
};

export interface ElevenLabsRequest {
  text: string;
  voiceId: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
}

export interface ElevenLabsResult {
  audioUrl: string | null;
  durationSeconds?: number;
  error?: string;
}

export async function synthesizeElevenLabs(req: ElevenLabsRequest): Promise<ElevenLabsResult> {
  const key = getApiKey();
  if (!key) {
    return { audioUrl: null, error: 'ELEVENLABS_API_KEY not set' };
  }

  // Resolve logical voice name to ElevenLabs ID
  const actualVoiceId = VOICE_ID_MAP[req.voiceId] || req.voiceId;

  try {
    const body = {
      text: req.text,
      model_id: req.modelId || 'eleven_turbo_v2_5',
      voice_settings: {
        stability: req.stability ?? 0.55,
        similarity_boost: req.similarityBoost ?? 0.75,
        style: req.style ?? 0.3,
        use_speaker_boost: true,
      },
    };

    const res = await fetch(`${BASE_URL}/text-to-speech/${actualVoiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': key,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      return {
        audioUrl: null,
        error: `ElevenLabs ${res.status}: ${err.slice(0, 200)}`,
      };
    }

    // Stream the audio to a cache file under public/generated/audio/
    const buffer = Buffer.from(await res.arrayBuffer());
    const hash = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const dir = path.join(process.cwd(), 'public', 'generated', 'audio');
    fs.mkdirSync(dir, { recursive: true });
    const filename = `elevenlabs-${actualVoiceId}-${hash}.mp3`;
    const fullPath = path.join(dir, filename);
    fs.writeFileSync(fullPath, buffer);

    return {
      audioUrl: `/generated/audio/${filename}`,
      durationSeconds: Math.ceil(req.text.length / 15), // rough estimate
    };
  } catch (err) {
    return {
      audioUrl: null,
      error: err instanceof Error ? err.message : 'ElevenLabs synthesis failed',
    };
  }
}

export function elevenLabsAvailable(): boolean {
  return getApiKey().length > 0;
}
