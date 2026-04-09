/**
 * Gemini TTS Client
 * ====================
 * Google Gemini 2.5 TTS — text-to-speech via generateContent with
 * audio response modality. Uses GEMINI_API_KEY. Returns 24kHz PCM
 * wrapped in a WAV container for browser playback.
 *
 * IMPORTANT — two Gemini voice products, don't confuse:
 *   - Gemini Live API (gemini-3.1-flash-live-preview): WebSocket
 *     real-time bidirectional voice CHAT. NOT usable via
 *     generateContent. Used by Grammar for user↔agent voice chat
 *     in cti-hub + deploy + SmelterOS.
 *   - Gemini TTS API (gemini-2.5-*-preview-tts): batch text-to-speech
 *     over generateContent, supports multi-speaker dialog natively.
 *     This file targets the TTS API for Per|Form analyst narration.
 *
 * Per feedback_latest_model_only_rule.md: "latest" is per product line.
 * TTS API latest = 2.5 (no 3.1 TTS shipped yet). Migrate when it ships.
 *
 * Models:
 *   - gemini-2.5-pro-preview-tts   (DEFAULT — podcast/audiobook grade)
 *   - gemini-2.5-flash-preview-tts (fast, cheaper)
 *
 * 30 prebuilt voices (astronomy themed):
 *   Zephyr, Puck, Charon, Kore, Fenrir, Leda, Orus, Aoede,
 *   Callirrhoe, Autonoe, Enceladus, Iapetus, Umbriel, Algieba,
 *   Despina, Erinome, Algenib, Rasalgethi, Laomedeia, Achernar,
 *   Alnilam, Schedar, Gacrux, Pulcherrima, Achird, Zubenelgenubi,
 *   Vindemiatrix, Sadachbia, Sadaltager, Sulafat
 *
 * Voice assignments (Per|Form defaults, pending audition):
 *   Void-Caster       → Charon (deep, authoritative)
 *   Astra Novatos     → Orus (refined tenor)
 *   Bun-E             → Aoede (warm alto) — audition flag
 *   Haze              → Puck (upbeat, punchy)
 *   Smoke             → Schedar (deep smooth)
 *   The Colonel + Gino → NOT routed here; ElevenLabs scoped exception
 *                        per feedback_gemini_preferred_not_exclusive.md
 *                        (Jersey Italian dialect not in Gemini 24-lang)
 */

import fs from 'fs';
import path from 'path';

const getApiKey = () => process.env.GEMINI_API_KEY || '';
// Gemini TTS runs on the 2.5 Pro preview TTS model (podcast grade).
// DO NOT use gemini-3.1-flash-live-preview here — that's the Live API
// model, accessible only via WebSocket (not generateContent). Using it
// here silently 404s on every call. Fixed 2026-04-09.
const DEFAULT_MODEL = 'gemini-2.5-pro-preview-tts';
const FLASH_FALLBACK = 'gemini-2.5-flash-preview-tts';
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
      fetch(`${BASE_URL}/models/${modelName}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': key,
        },
        body: JSON.stringify(body),
      });

    let res = await tryModel(primaryModel);
    // If the Pro TTS preview isn't on this key yet, drop to Flash TTS.
    if (!res.ok && (res.status === 404 || res.status === 403) && primaryModel !== FLASH_FALLBACK) {
      console.warn(`[gemini-tts] ${primaryModel} ${res.status}, trying ${FLASH_FALLBACK}`);
      res = await tryModel(FLASH_FALLBACK);
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

/* ── Multi-speaker dialog synthesis ──
 * Gemini 2.5 TTS supports up to 2 speakers natively via
 * speechConfig.multiSpeakerVoiceConfig. Used for Per|Form duo shows
 * (Haze+Smoke). The Colonel+Gino are NOT routed here — they use
 * ElevenLabs as a scoped exception for Jersey Italian dialect.
 *
 * Script format: "Speaker1: line one\nSpeaker2: line two\n..."
 * The speaker names in the prompt must match the `speaker` field
 * of each SpeakerVoiceConfig.
 */
export interface GeminiTtsMultiSpeaker {
  /** The full dialog script with "SpeakerName: line" per line */
  script: string;
  /** Two speakers; each maps a prompt speaker name to a Gemini voice */
  speakers: [
    { speakerName: string; voiceId: string; styleHint?: string },
    { speakerName: string; voiceId: string; styleHint?: string },
  ];
  /** Optional overall style directive prepended to the whole script */
  overallStyle?: string;
  model?: string;
}

export async function synthesizeGeminiTtsMultiSpeaker(
  req: GeminiTtsMultiSpeaker,
): Promise<GeminiTtsResult> {
  const key = getApiKey();
  if (!key) {
    return { audioUrl: null, error: 'GEMINI_API_KEY not set' };
  }

  // Resolve logical voice names to actual Gemini prebuilt voice names
  const resolveVoice = (id: string) => GEMINI_VOICE_MAP[id] || id || 'Kore';
  const [s1, s2] = req.speakers;
  const voice1 = resolveVoice(s1.voiceId);
  const voice2 = resolveVoice(s2.voiceId);

  // Build the prompt. Per-speaker style hints go inline near their
  // speaker name; overall style goes above the whole script.
  const stylePreamble = req.overallStyle
    ? `Generate this dialog as a natural podcast conversation. Style: ${req.overallStyle}\n\n`
    : '';
  const prompt = `${stylePreamble}TTS the following conversation between ${s1.speakerName} and ${s2.speakerName}:\n\n${req.script}`;

  try {
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: s1.speakerName,
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voice1 },
                },
              },
              {
                speaker: s2.speakerName,
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voice2 },
                },
              },
            ],
          },
        },
      },
    };

    const primaryModel = req.model || DEFAULT_MODEL;
    const tryModel = async (modelName: string) =>
      fetch(`${BASE_URL}/models/${modelName}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': key,
        },
        body: JSON.stringify(body),
      });

    let res = await tryModel(primaryModel);
    if (!res.ok && (res.status === 404 || res.status === 403) && primaryModel !== FLASH_FALLBACK) {
      console.warn(`[gemini-tts-multi] ${primaryModel} ${res.status}, trying ${FLASH_FALLBACK}`);
      res = await tryModel(FLASH_FALLBACK);
    }

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      return {
        audioUrl: null,
        error: `Gemini TTS multi-speaker ${res.status}: ${err.slice(0, 200)}`,
      };
    }

    const json = await res.json();
    const inlineData = json.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    const audioBase64 = inlineData?.data;
    const mimeType: string = inlineData?.mimeType || '';

    if (!audioBase64) {
      return { audioUrl: null, error: 'Gemini TTS multi-speaker returned no audio' };
    }

    const rateMatch = mimeType.match(/rate=(\d+)/);
    const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;

    const wavBuffer = pcmToWav(audioBase64, sampleRate);
    const hash = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const dir = path.join(process.cwd(), 'public', 'generated', 'audio');
    fs.mkdirSync(dir, { recursive: true });
    const filename = `gemini-duo-${voice1.toLowerCase()}-${voice2.toLowerCase()}-${hash}.wav`;
    const fullPath = path.join(dir, filename);
    fs.writeFileSync(fullPath, wavBuffer);

    return {
      audioUrl: `/generated/audio/${filename}`,
      durationSeconds: Math.ceil(req.script.length / 15),
    };
  } catch (err) {
    return {
      audioUrl: null,
      error: err instanceof Error ? err.message : 'Gemini TTS multi-speaker failed',
    };
  }
}
