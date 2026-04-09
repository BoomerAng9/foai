/**
 * ElevenLabs client (Eleven v3 + Dialogue API)
 * ================================================
 * Real TTS for Per|Form analyst voices + any scoped-exception voice
 * where Gemini 2.5 TTS can't deliver the required timbre, accent,
 * or expressivity. Credential: ELEVENLABS_API_KEY in openclaw.
 *
 * Per feedback_latest_model_only_rule.md + project_elevenlabs_authorized_fallback.md,
 * ElevenLabs is the authorized best-in-class fallback when Gemini's
 * 30-voice / 97-language catalog can't cover a persona.
 *
 * Two synthesis paths:
 *   - synthesizeElevenLabs()        → POST /v1/text-to-speech/{voice_id}
 *                                     single-voice TTS, uses eleven_v3 by default
 *   - synthesizeElevenLabsDialogue() → POST /v1/text-to-dialogue
 *                                     multi-speaker dialog, up to 10 unique voices,
 *                                     only available on eleven_v3
 *
 * Model policy: `eleven_v3` is the latest GA model as of 2026-04-09.
 * Previous default `eleven_turbo_v2_5` is DEPRECATED — do not revert.
 *
 * Audio tags (v3 only, inline [brackets] in text):
 *   Reactions: [laughs] [laughs harder] [starts laughing] [wheezing]
 *              [sighs] [exhales] [clears throat] [gulps] [gasps]
 *   Delivery:  [whispers] [shouts] [whispering]
 *   Emotional: [sad] [laughing] [excited] [angry] [nervous]
 *   Contextual: [leaves rustling] [football] [music starts]
 *   Accents:   [Jersey accent] [Italian accent] [British accent] etc.
 *              (v3 tries to interpret any bracket tag)
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
//
// Colonel + Gino use ElevenLabs as a SCOPED EXCEPTION to Gemini-first
// per feedback_gemini_preferred_not_exclusive.md — ElevenLabs v3 has
// authenticated Jersey accent + Italian regional voices that Gemini's
// 24-language catalog doesn't cover. TODO: Rish picks the actual voice
// IDs from his ElevenLabs dashboard and replaces these placeholders.
// Suggested browse: https://elevenlabs.io/voice-library/accent-generator
// Suggested Italian regional: https://elevenlabs.io/text-to-speech/italian
const VOICE_ID_MAP: Record<string, string> = {
  'idris-broadcast': 'onwK4e9ZLuTAKqWW03F9',        // Daniel — deep British broadcast
  'astra-refined-tenor': 'TX3LPaxmHKxFdv7VOQHJ',    // Liam — refined American tenor
  'bun-e-cosmic-alto': 'EXAVITQu4vr4xnSDxMaL',      // Bella — warm alto (fallback until custom)
  // Colonel + Gino — scoped ElevenLabs exception, Jersey Italian dialect
  'colonel-jersey-italian': 'onwK4e9ZLuTAKqWW03F9', // TODO: replace with Jersey accent voice from ElevenLabs library
  'gino-jersey-italian-pizzeria': 'onwK4e9ZLuTAKqWW03F9', // TODO: replace with Italian regional (Roman or Sicilian male)
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
      model_id: req.modelId || 'eleven_v3',
      // Raw podcast sound: lower stability = more vocal variation (not
      // even-toned), higher style = more expressive delivery. Real
      // podcasters breathe, drift in pace, hit emotional peaks. The
      // defaults below make the output sound like a REAL person behind
      // a mic, not a TTS engine. Per Rish 2026-04-09: "the speaker
      // cannot be so smooth and perfect, and even toned. No podcaster
      // sounds like that."
      voice_settings: {
        stability: req.stability ?? 0.3,       // was 0.5 — lower = more natural variation
        similarity_boost: req.similarityBoost ?? 0.7,
        style: req.style ?? 0.55,              // was 0.3 — higher = more expressive delivery
        use_speaker_boost: true,
        speed: 1.0,
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

/* ── Multi-speaker dialog synthesis via /v1/text-to-dialogue ──
 * Eleven v3 only. Supports up to 10 unique voice_ids per request.
 * Used by the tts-router for Per|Form duo shows when the analyst
 * uses ElevenLabs engine (currently The Colonel + Gino). Inputs are
 * an ordered array of turns, each with a voice_id and text. v3
 * handles transitions, interruptions, and emotional context.
 */
export interface ElevenLabsDialogueTurn {
  /** Logical voice name (resolved via VOICE_ID_MAP) or raw voice_id */
  voiceId: string;
  /** Dialogue text — may contain inline [audio tags] for v3 */
  text: string;
}

export interface ElevenLabsDialogueRequest {
  turns: ElevenLabsDialogueTurn[];
  modelId?: string;
  stability?: number;
  seed?: number;
  languageCode?: string;
}

export async function synthesizeElevenLabsDialogue(
  req: ElevenLabsDialogueRequest,
): Promise<ElevenLabsResult> {
  const key = getApiKey();
  if (!key) {
    return { audioUrl: null, error: 'ELEVENLABS_API_KEY not set' };
  }
  if (!req.turns || req.turns.length === 0) {
    return { audioUrl: null, error: 'dialogue requires at least one turn' };
  }
  // v3 supports up to 10 unique voices per request
  const uniqueVoices = new Set(req.turns.map(t => t.voiceId));
  if (uniqueVoices.size > 10) {
    return { audioUrl: null, error: `dialogue max 10 unique voices, got ${uniqueVoices.size}` };
  }

  try {
    const body: Record<string, unknown> = {
      inputs: req.turns.map(t => ({
        text: t.text,
        voice_id: VOICE_ID_MAP[t.voiceId] || t.voiceId,
      })),
      model_id: req.modelId || 'eleven_v3',
      apply_text_normalization: 'auto',
    };
    if (req.stability !== undefined) {
      body.settings = { stability: req.stability };
    }
    if (req.seed !== undefined) {
      body.seed = req.seed;
    }
    if (req.languageCode) {
      body.language_code = req.languageCode;
    }

    const res = await fetch(`${BASE_URL}/text-to-dialogue`, {
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
        error: `ElevenLabs dialogue ${res.status}: ${err.slice(0, 300)}`,
      };
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const hash = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const dir = path.join(process.cwd(), 'public', 'generated', 'audio');
    fs.mkdirSync(dir, { recursive: true });
    const filename = `elevenlabs-dialogue-${hash}.mp3`;
    const fullPath = path.join(dir, filename);
    fs.writeFileSync(fullPath, buffer);

    const totalChars = req.turns.reduce((n, t) => n + t.text.length, 0);
    return {
      audioUrl: `/generated/audio/${filename}`,
      durationSeconds: Math.ceil(totalChars / 15),
    };
  } catch (err) {
    return {
      audioUrl: null,
      error: err instanceof Error ? err.message : 'ElevenLabs dialogue failed',
    };
  }
}

/* ── Voice discovery via GET /v2/voices ──
 * Lists voices in the user's workspace + library. Use this to
 * programmatically find Jersey, Italian, or any accent voices
 * instead of browsing the web dashboard. Returns voice_id, name,
 * description, labels, preview_url per voice.
 */
export interface ElevenLabsVoiceSearchParams {
  search?: string;
  category?: 'premade' | 'cloned' | 'generated' | 'professional';
  voiceType?: 'personal' | 'community' | 'default' | 'workspace' | 'non-default' | 'saved';
  pageSize?: number;
  pageToken?: string;
}

export interface ElevenLabsVoiceSummary {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
  labels?: Record<string, string>;
  preview_url?: string;
}

export async function searchElevenLabsVoices(
  params: ElevenLabsVoiceSearchParams = {},
): Promise<{ voices: ElevenLabsVoiceSummary[]; hasMore: boolean; nextPageToken: string | null; error?: string }> {
  const key = getApiKey();
  if (!key) {
    return { voices: [], hasMore: false, nextPageToken: null, error: 'ELEVENLABS_API_KEY not set' };
  }

  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.category) qs.set('category', params.category);
  if (params.voiceType) qs.set('voice_type', params.voiceType);
  if (params.pageSize) qs.set('page_size', String(params.pageSize));
  if (params.pageToken) qs.set('next_page_token', params.pageToken);

  try {
    const res = await fetch(`${BASE_URL.replace('/v1', '/v2')}/voices?${qs.toString()}`, {
      method: 'GET',
      headers: {
        'xi-api-key': key,
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      return {
        voices: [],
        hasMore: false,
        nextPageToken: null,
        error: `voice search ${res.status}: ${err.slice(0, 200)}`,
      };
    }
    const json = await res.json();
    return {
      voices: json.voices || [],
      hasMore: Boolean(json.has_more),
      nextPageToken: json.next_page_token || null,
    };
  } catch (err) {
    return {
      voices: [],
      hasMore: false,
      nextPageToken: null,
      error: err instanceof Error ? err.message : 'voice search failed',
    };
  }
}
