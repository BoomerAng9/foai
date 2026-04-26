/**
 * Mode TTS Router — Mode-Based Voice Dispatch
 * =============================================
 * Routes TTS requests to the right provider based on use case.
 * Renamed from `hermes-tts-router.ts` 2026-04-26 to free the "Hermes" name
 * for the canonical Hermes Agent (NousResearch). This is internal voice infra.
 *
 * Routing modes:
 *   live_chat          → ElevenLabs v3 (lowest latency, 75ms)
 *   analyst_voice      → Async (cost-effective, character voices)
 *   podcast_longform   → Async (cheapest per hour, $0.50/hr)
 *   user_custom_voice  → Async (3-sec cloning, user's own voice)
 *   studio_production  → Async primary, ElevenLabs fallback (quality gate)
 *
 * Migration gate (§4 of SMLT-ACHEEVY-VOICE-STACK-001):
 *   When Async hits ≤150ms TTFA sustained → migrate live_chat to Async
 */

import { asyncTextToSpeech, asyncTextToSpeechStream, type AsyncTTSRequest } from './async-client';

const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY || '';
const ASYNC_KEY = process.env.ASYNC_API_KEY || '';

export type TTSMode =
  | 'live_chat'
  | 'analyst_voice'
  | 'podcast_longform'
  | 'user_custom_voice'
  | 'studio_production';

export interface TTSRequest {
  text: string;
  mode: TTSMode;
  voiceId: string;          // Provider-specific voice ID
  speed?: number;
  emotion?: string;
  language?: string;
}

export interface TTSResult {
  audio: Buffer;
  provider: 'elevenlabs' | 'async';
  mode: TTSMode;
  latencyMs?: number;
}

// Per|Form analyst voice IDs — ElevenLabs (current) and Async (after bake-off)
export const ANALYST_VOICES: Record<string, { elevenlabs: string; async?: string }> = {
  'void-caster':   { elevenlabs: 'CGwQbqtvs7tmGnCcGS8C' },
  'astra-novatos': { elevenlabs: 'Hrh6p8s8pMkK1MsFVcJV' },
  'bun-e':         { elevenlabs: 'l8GG2jgNX1cxmHhWY9xd' },
  'the-colonel':   { elevenlabs: 'JCkiVgQNSEVZj5oIolmM' },
  'the-haze':      { elevenlabs: 'mVnUIJrt7ADr33byr6uw' },
  'smoke':         { elevenlabs: 'yNvzaGUue4qoxzazAdK9' },
};

/**
 * Route a TTS request to the appropriate provider.
 */
export async function routeTTS(req: TTSRequest): Promise<TTSResult> {
  const start = Date.now();

  switch (req.mode) {
    case 'live_chat':
      // ElevenLabs for lowest latency (75ms Flash v2.5)
      // Migration gate: switch to Async when §4 gates pass
      return {
        audio: await elevenLabsTTS(req.voiceId, req.text),
        provider: 'elevenlabs',
        mode: req.mode,
        latencyMs: Date.now() - start,
      };

    case 'analyst_voice':
      // Try Async first (cheaper), fallback to ElevenLabs
      if (ASYNC_KEY) {
        try {
          const audio = await asyncTextToSpeech({
            text: req.text,
            voiceId: req.voiceId,
            speed: req.speed,
            emotion: req.emotion,
            language: req.language,
          });
          return { audio, provider: 'async', mode: req.mode, latencyMs: Date.now() - start };
        } catch {
          // Fallback to ElevenLabs
        }
      }
      // Check if we have an ElevenLabs voice for this analyst
      const analystEntry = Object.values(ANALYST_VOICES).find(v => v.elevenlabs === req.voiceId || v.async === req.voiceId);
      const elVoiceId = analystEntry?.elevenlabs || req.voiceId;
      return {
        audio: await elevenLabsTTS(elVoiceId, req.text),
        provider: 'elevenlabs',
        mode: req.mode,
        latencyMs: Date.now() - start,
      };

    case 'podcast_longform':
      // Async primary — cheapest at $0.50/hr
      if (ASYNC_KEY) {
        const audio = await asyncTextToSpeech({
          text: req.text,
          voiceId: req.voiceId,
          speed: req.speed,
          language: req.language,
        });
        return { audio, provider: 'async', mode: req.mode, latencyMs: Date.now() - start };
      }
      return {
        audio: await elevenLabsTTS(req.voiceId, req.text),
        provider: 'elevenlabs',
        mode: req.mode,
        latencyMs: Date.now() - start,
      };

    case 'user_custom_voice':
      // Always Async — user cloned voices live there
      if (!ASYNC_KEY) throw new Error('Async not configured for custom voices');
      return {
        audio: await asyncTextToSpeech({
          text: req.text,
          voiceId: req.voiceId,
          speed: req.speed,
          emotion: req.emotion,
          language: req.language,
        }),
        provider: 'async',
        mode: req.mode,
        latencyMs: Date.now() - start,
      };

    case 'studio_production':
      // Async primary, ElevenLabs fallback for quality
      if (ASYNC_KEY) {
        try {
          const audio = await asyncTextToSpeech({
            text: req.text,
            voiceId: req.voiceId,
            speed: req.speed,
            emotion: req.emotion,
          });
          return { audio, provider: 'async', mode: req.mode, latencyMs: Date.now() - start };
        } catch {
          // Fallback
        }
      }
      return {
        audio: await elevenLabsTTS(req.voiceId, req.text),
        provider: 'elevenlabs',
        mode: req.mode,
        latencyMs: Date.now() - start,
      };

    default:
      throw new Error(`Unknown TTS mode: ${req.mode}`);
  }
}

/**
 * Stream TTS for real-time playback.
 * Only used for live_chat and studio_production modes.
 */
export async function routeTTSStream(req: TTSRequest): Promise<ReadableStream<Uint8Array> | null> {
  if (req.mode === 'live_chat' || !ASYNC_KEY) {
    // ElevenLabs streaming
    return elevenLabsStream(req.voiceId, req.text);
  }

  // Async streaming for everything else
  return asyncTextToSpeechStream({
    text: req.text,
    voiceId: req.voiceId,
    speed: req.speed,
    emotion: req.emotion,
  });
}

// ── ElevenLabs adapter ─────────────────────────────────────────

async function elevenLabsTTS(voiceId: string, text: string): Promise<Buffer> {
  if (!ELEVENLABS_KEY) throw new Error('ELEVENLABS_API_KEY not configured');

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_KEY,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_v3',
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3 },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs [${res.status}]: ${err.slice(0, 200)}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

async function elevenLabsStream(voiceId: string, text: string): Promise<ReadableStream<Uint8Array> | null> {
  if (!ELEVENLABS_KEY) throw new Error('ELEVENLABS_API_KEY not configured');

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_flash_v2_5',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!res.ok) throw new Error(`ElevenLabs stream [${res.status}]`);
  return res.body;
}
