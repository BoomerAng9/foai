/**
 * Per|Form TTS Router — Universal Voice Stack
 * ==============================================
 * Dispatches analyst speech generation to the right engine per the
 * analyst.voice config. Pre-processes scripts to inject expressive
 * cues, strip reasoning artifacts, and split multi-speaker turns.
 *
 * Engine stack (April 2026):
 *   - personaplex — NVIDIA PersonaPlex (Vertex AI, free, 170ms)
 *   - grok-voice  — xAI Grok 4.20 Voice Agent (real-time WebSocket)
 *   - gemini-live — Google Gemini 3.1 Flash Live (barge-in, <500ms)
 *   - vibevoice   — Microsoft VibeVoice 7B (duos, MIT license)
 *   - elevenlabs  — ElevenLabs Turbo v2 (refined solos + cloning)
 *   - playht      — Play.ht v3 (regional accents)
 *   - chatterbox  — Resemble Chatterbox (expressive single)
 *
 * All engines respect `allowImperfections` — when true, natural
 * stutters/laughter/cursing pass through; when false, they're
 * stripped before synthesis.
 */

import { stripReasoningArtifacts } from '@/lib/openrouter';
import type { AnalystPersona } from '@/lib/analysts/personas';

export interface SpeakRequest {
  analyst: AnalystPersona;
  text: string;
  /** Override voice engine for testing */
  engineOverride?: AnalystPersona['voice']['engine'];
}

export interface SpeakResult {
  /** Public URL to the generated audio */
  audioUrl: string | null;
  /** Engine used */
  engine: string;
  /** Approximate duration in seconds */
  durationSeconds?: number;
  /** Content hash for caching */
  contentHash: string;
  /** Error if generation failed */
  error?: string;
}

/* ── Content hashing for cache keys ── */
async function contentHash(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

/* ── Parse multi-speaker tags like [HAZE] / [SMOKE] / [COLONEL] / [GINO] ── */
export interface SpeakerTurn {
  speaker: string | null; // null = narrator / unlabeled
  text: string;
}

export function parseSpeakerTurns(text: string): SpeakerTurn[] {
  const clean = stripReasoningArtifacts(text);
  const lines = clean.split(/\n+/).filter(l => l.trim());
  const turns: SpeakerTurn[] = [];

  for (const line of lines) {
    const match = line.match(/^\[([A-Z][A-Z0-9_ ]*)\]\s*(.*)$/);
    if (match) {
      turns.push({ speaker: match[1].trim(), text: match[2].trim() });
    } else {
      // Continuation of the previous speaker, or narrator
      if (turns.length > 0 && turns[turns.length - 1].speaker) {
        turns[turns.length - 1].text += ' ' + line.trim();
      } else {
        turns.push({ speaker: null, text: line.trim() });
      }
    }
  }

  return turns.filter(t => t.text.length > 0);
}

/* ── Inject expressive cues when the analyst allows imperfections ── */
function injectExpressiveCues(text: string, allowImperfections: boolean): string {
  if (!allowImperfections) {
    // Strip any cue the model might have put in for refined voices
    return text.replace(/\s*\([^)]*?(laughs|stutters|cursing|curses|yelling|raises voice)[^)]*?\)\s*/gi, ' ');
  }
  // Keep whatever the model emitted, which may include (laughs), (pauses), etc.
  return text;
}

/* ── Normalize dialect hints for regional engines ── */
function normalizeDialect(text: string, engine: string): string {
  if (engine !== 'playht') return text;
  // Play.ht handles accents natively but benefits from phonetic hints
  // for heavy Jersey Italian dropped-g's and mannerisms.
  return text; // passthrough for now — engine handles it
}

/* ── Build the engine-specific payload ── */
interface EnginePayload {
  engine: string;
  speakers: Array<{ voiceId: string; text: string; style?: string }>;
  style?: string;
}

function buildPayload(req: SpeakRequest): EnginePayload {
  const engine = req.engineOverride ?? req.analyst.voice.engine;
  const allowImperfections = req.analyst.voice.allowImperfections ?? false;
  const turns = parseSpeakerTurns(req.text);

  // Single-voice engines: concatenate all turns into one block
  if (!req.analyst.voice.speakers) {
    const body = turns.map(t => t.text).join(' ');
    const processed = injectExpressiveCues(normalizeDialect(body, engine), allowImperfections);
    return {
      engine,
      speakers: [
        {
          voiceId: req.analyst.voice.voiceId || req.analyst.id,
          text: processed,
          style: req.analyst.voice.style,
        },
      ],
      style: req.analyst.voice.style,
    };
  }

  // Multi-speaker engines: map each tag to its configured voice
  const speakerMap = req.analyst.voice.speakers;
  const speakers = turns.map((turn) => {
    const cfg = turn.speaker && speakerMap[turn.speaker]
      ? speakerMap[turn.speaker]
      : Object.values(speakerMap)[0];
    return {
      voiceId: cfg.voiceId,
      text: injectExpressiveCues(normalizeDialect(turn.text, engine), allowImperfections),
      style: cfg.style,
    };
  });

  return { engine, speakers, style: req.analyst.voice.style };
}

/* ── Engine stubs — return placeholder until production keys are wired ── */
async function synthesizeStub(payload: EnginePayload): Promise<string | null> {
  console.log(`[tts-router] stub synthesis for engine=${payload.engine}`, {
    turns: payload.speakers.length,
    totalChars: payload.speakers.reduce((a, s) => a + s.text.length, 0),
  });
  // In Phase 2 this hits the real engine and returns a cached URL.
  // For now return null so the client shows the "coming soon" state.
  return null;
}

/* ── Main entry point ── */
export async function speakAnalystContent(req: SpeakRequest): Promise<SpeakResult> {
  const hash = await contentHash(req.text);
  const payload = buildPayload(req);

  try {
    const audioUrl = await synthesizeStub(payload);
    return {
      audioUrl,
      engine: payload.engine,
      contentHash: hash,
    };
  } catch (err) {
    return {
      audioUrl: null,
      engine: payload.engine,
      contentHash: hash,
      error: err instanceof Error ? err.message : 'TTS synthesis failed',
    };
  }
}
