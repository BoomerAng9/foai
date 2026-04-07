/**
 * Gemini TTS Client
 * ====================
 * Google Gemini 2.5 Flash Preview TTS — real voice synthesis via
 * the existing GEMINI_API_KEY. FREE alternative to ElevenLabs.
 * Returns 24kHz PCM which we wrap into a WAV file for browser playback.
 *
 * Models:
 *   - gemini-2.5-pro-preview-tts   (DEFAULT — podcast/audiobook grade)
 *   - gemini-2.5-flash-preview-tts (fast, cheaper)
 *   - gemini-3.1-flash-live-preview (real-time bidi, requires WebSocket — not used here)
 * Voices (prebuilt): Kore, Puck, Zephyr, Charon, Fenrir, Leda,
 *                    Orus, Aoede, Callirrhoe, Autonoe, Enceladus,
 *                    Iapetus, Umbriel, Algieba, Despina, Erinome,
 *                    Algenib, Rasalgethi, Laomedeia, Achernar,
 *                    Alnilam, Schedar, Gacrux, Pulcherrima, Achird,
 *                    Zubenelgenubi, Vindemiatrix, Sadachbia, Sadaltager,
 *                    Sulafat (30 total)
 *
 * Voice assignments (Per|Form defaults):
 *   Void-Caster       → Charon (deep, authoritative)
 *   Astra Novatos     → Orus (refined tenor)
 *   Bun-E             → Aoede (warm alto)
 *   The Colonel       → Algieba (gravelly mid-range)
 *   Gino              → Rasalgethi (warmer Italian tone)
 *   Haze              → Puck (upbeat, punchy)
 *   Smoke             → Schedar (deep smooth)
 */

import fs from 'fs';
import path from 'path';

const getApiKey = () => process.env.GEMINI_API_KEY || '';
const DEFAULT_MODEL = 'gemini-2.5-pro-preview-tts';
const FALLBACK_MODEL = 'gemini-2.5-flash-preview-tts';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

// Logical voice name → Gemini prebuilt voice
export const GEMINI_VOICE_MAP: Record<string, string> = {
  // Void-Caster + refined solos
  'idris-broadcast': 'Charon',
  'astra-refined-tenor': 'Orus',
  'bun-e-cosmic-alto': 'Aoede',

  // The Colonel + Gino (Jersey Italian approximation)
  'colonel-jersey-italian': 'Algieba',
  'gino-jersey-italian-pizzeria': 'Rasalgethi',

  // Haze duo
  'haze-nyc-golden': 'Puck',
  'smoke-houston-southern': 'Schedar',
};

export interface GeminiTtsRequest {
  text: string;
  /** Logical voice name from GEMINI_VOICE_MAP or raw Gemini voice name */
  voiceId: string;
  /** Optional — adds style directives at the top of the prompt */
  styleHint?: string;
  /** Override TTS model. Defaults to gemini-2.5-pro-preview-tts (podcast grade). */
  model?: string;
}

export interface GeminiTtsResult {
  audioUrl: string | null;
  durationSeconds?: number;
  error?: string;
}

export function geminiTtsAvailable(): boolean {
  return getApiKey().length > 0;
}

/* ── PCM → WAV conversion ── */
function pcmToWav(pcmBase64: string, sampleRate = 24000): Buffer {
  const pcmBuffer = Buffer.from(pcmBase64, 'base64');
  const byteLength = pcmBuffer.length;
  const wav = Buffer.alloc(44 + byteLength);

  // RIFF chunk
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + byteLength, 4);
  wav.write('WAVE', 8);

  // fmt subchunk
  wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16);         // subchunk size
  wav.writeUInt16LE(1, 20);          // PCM format
  wav.writeUInt16LE(1, 22);          // mono
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28); // byte rate
  wav.writeUInt16LE(2, 32);          // block align
  wav.writeUInt16LE(16, 34);         // bits per sample

  // data subchunk
  wav.write('data', 36);
  wav.writeUInt32LE(byteLength, 40);
  pcmBuffer.copy(wav, 44);

  return wav;
}

/* ── Main synthesis entry ── */
export async function synthesizeGeminiTts(req: GeminiTtsRequest): Promise<GeminiTtsResult> {
  const key = getApiKey();
  if (!key) {
    return { audioUrl: null, error: 'GEMINI_API_KEY not set' };
  }

  const voiceName = GEMINI_VOICE_MAP[req.voiceId] || req.voiceId || 'Kore';
  // Inject style hint into the prompt (Gemini TTS responds to natural
  // language style directives placed before the text-to-speak)
  const styledText = req.styleHint
    ? `Say the following in this style: ${req.styleHint}\n\n${req.text}`
    : req.text;

  try {
    const body = {
      contents: [{ parts: [{ text: styledText }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    };

    const primaryModel = req.model || DEFAULT_MODEL;
    const tryModel = async (modelName: string) =>
      fetch(`${BASE_URL}/models/${modelName}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

    let res = await tryModel(primaryModel);
    // If Pro TTS isn't accessible on this key (404/403), fall back to Flash TTS
    if (!res.ok && (res.status === 404 || res.status === 403) && primaryModel !== FALLBACK_MODEL) {
      console.warn(`[gemini-tts] ${primaryModel} ${res.status}, falling back to ${FALLBACK_MODEL}`);
      res = await tryModel(FALLBACK_MODEL);
    }

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      return {
        audioUrl: null,
        error: `Gemini TTS ${res.status}: ${err.slice(0, 200)}`,
      };
    }

    const json = await res.json();
    const inlineData = json.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    const audioBase64 = inlineData?.data;
    const mimeType: string = inlineData?.mimeType || '';

    if (!audioBase64) {
      return { audioUrl: null, error: 'Gemini TTS returned no audio' };
    }

    // Parse sample rate from the mimeType (e.g. audio/L16;codec=pcm;rate=24000)
    const rateMatch = mimeType.match(/rate=(\d+)/);
    const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;

    // Wrap the raw PCM in a WAV container
    const wavBuffer = pcmToWav(audioBase64, sampleRate);

    // Cache to disk under public/generated/audio/
    const hash = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const dir = path.join(process.cwd(), 'public', 'generated', 'audio');
    fs.mkdirSync(dir, { recursive: true });
    const filename = `gemini-${voiceName.toLowerCase()}-${hash}.wav`;
    const fullPath = path.join(dir, filename);
    fs.writeFileSync(fullPath, wavBuffer);

    return {
      audioUrl: `/generated/audio/${filename}`,
      durationSeconds: Math.ceil(req.text.length / 15),
    };
  } catch (err) {
    return {
      audioUrl: null,
      error: err instanceof Error ? err.message : 'Gemini TTS failed',
    };
  }
}
