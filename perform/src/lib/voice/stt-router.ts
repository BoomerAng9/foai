/**
 * Hermes STT Router — Multi-Provider Speech-to-Text Dispatch
 * ============================================================
 * Routes STT requests across three providers based on use case.
 *
 * Providers:
 *   deepgram    — Lowest latency (~100ms), best for live chat
 *   scribe      — ElevenLabs Scribe v2 (v3 when available), 90+ languages, rich features
 *   gemini      — Google Gemini Live, free with Gemini key, good multilingual
 *
 * Routing:
 *   live_chat       → Deepgram (fastest)
 *   podcast_upload  → Scribe (best accuracy + diarization)
 *   workbench       → Scribe (timestamps + audio events)
 *   multilingual    → Gemini (100+ languages) or Scribe (90+)
 *
 * All providers feed into Grammar/NTNTN filter → ACHEEVY executor
 */

import { transcribeFile as scribeTranscribe, getRealtimeSTTConfig as scribeRealtimeConfig, type TranscriptResult } from './scribe-stt';
import { deepgramTranscribe, getDeepgramRealtimeConfig } from './deepgram-stt';

export type STTProvider = 'deepgram' | 'scribe' | 'gemini';

export type STTMode =
  | 'live_chat'        // Deepgram — fastest
  | 'podcast_upload'   // Scribe — best accuracy + diarization
  | 'workbench'        // Scribe — timestamps + events
  | 'multilingual';    // Gemini or Scribe

export interface STTRequest {
  audio: Buffer;
  mode: STTMode;
  language?: string;
  diarize?: boolean;
  numSpeakers?: number;
}

export interface STTResult {
  text: string;
  provider: STTProvider;
  mode: STTMode;
  language: string;
  confidence?: number;
  words?: Array<{ word: string; start: number; end: number }>;
  latencyMs?: number;
}

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';

/**
 * Route a batch STT request to the best provider.
 */
export async function routeSTT(req: STTRequest): Promise<STTResult> {
  const start = Date.now();

  switch (req.mode) {
    case 'live_chat': {
      // Deepgram — lowest latency
      try {
        const result = await deepgramTranscribe(req.audio, {
          language: req.language,
          model: 'nova-3',
          smartFormat: true,
        });
        return {
          text: result.text,
          provider: 'deepgram',
          mode: req.mode,
          language: result.language,
          confidence: result.confidence,
          words: result.words,
          latencyMs: Date.now() - start,
        };
      } catch {
        // Fallback to Scribe
        return routeSTTFallback(req, start);
      }
    }

    case 'podcast_upload':
    case 'workbench': {
      // Scribe — best accuracy, diarization, timestamps, audio events
      try {
        const result = await scribeTranscribe(req.audio, {
          language: req.language,
          diarize: req.diarize,
          numSpeakers: req.numSpeakers,
          timestamps: 'word',
          tagAudioEvents: true,
        });
        return {
          text: result.text,
          provider: 'scribe',
          mode: req.mode,
          language: result.language,
          words: result.words,
          latencyMs: Date.now() - start,
        };
      } catch {
        // Fallback to Deepgram
        const result = await deepgramTranscribe(req.audio, {
          language: req.language,
          diarize: req.diarize,
        });
        return {
          text: result.text,
          provider: 'deepgram',
          mode: req.mode,
          language: result.language,
          confidence: result.confidence,
          latencyMs: Date.now() - start,
        };
      }
    }

    case 'multilingual': {
      // Try Gemini for 100+ languages, fallback to Scribe for 90+
      if (GEMINI_KEY) {
        try {
          const result = await geminiSTT(req.audio, req.language);
          return {
            text: result.text,
            provider: 'gemini',
            mode: req.mode,
            language: result.language,
            latencyMs: Date.now() - start,
          };
        } catch {
          // Fallback
        }
      }
      return routeSTTFallback(req, start);
    }

    default:
      return routeSTTFallback(req, start);
  }
}

/**
 * Get realtime WebSocket config for the given mode.
 * Client connects directly to the provider's WebSocket.
 */
export function getRealtimeConfig(mode: STTMode, language?: string) {
  switch (mode) {
    case 'live_chat':
      return { provider: 'deepgram' as STTProvider, ...getDeepgramRealtimeConfig({ language }) };

    case 'podcast_upload':
    case 'workbench':
      return { provider: 'scribe' as STTProvider, ...scribeRealtimeConfig({ language, commitStrategy: 'vad' }) };

    case 'multilingual':
    default:
      // Scribe for realtime multilingual
      return { provider: 'scribe' as STTProvider, ...scribeRealtimeConfig({ language, commitStrategy: 'vad' }) };
  }
}

// ── Gemini STT (via Vertex AI) ──────────────────────────────────

async function geminiSTT(audio: Buffer, language?: string): Promise<{ text: string; language: string }> {
  if (!GEMINI_KEY) throw new Error('GEMINI_API_KEY not configured');

  const base64Audio = audio.toString('base64');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType: 'audio/mpeg', data: base64Audio } },
            { text: `Transcribe this audio${language ? ` (language: ${language})` : ''}. Return ONLY the transcript text, nothing else.` },
          ],
        }],
        generationConfig: { maxOutputTokens: 8000, temperature: 0.1 },
      }),
    }
  );

  if (!res.ok) throw new Error(`Gemini STT [${res.status}]`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

  return { text, language: language || 'en' };
}

// ── Fallback ────────────────────────────────────────────────────

async function routeSTTFallback(req: STTRequest, startTime: number): Promise<STTResult> {
  // Try Scribe first, then Deepgram
  try {
    const result = await scribeTranscribe(req.audio, { language: req.language });
    return {
      text: result.text,
      provider: 'scribe',
      mode: req.mode,
      language: result.language,
      latencyMs: Date.now() - startTime,
    };
  } catch {
    const result = await deepgramTranscribe(req.audio, { language: req.language });
    return {
      text: result.text,
      provider: 'deepgram',
      mode: req.mode,
      language: result.language,
      confidence: result.confidence,
      latencyMs: Date.now() - startTime,
    };
  }
}
