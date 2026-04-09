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

import path from 'path';
import { stripReasoningArtifacts } from '@/lib/openrouter';
import type { AnalystPersona } from '@/lib/analysts/personas';
import {
  synthesizeElevenLabs,
  synthesizeElevenLabsDialogue,
  elevenLabsAvailable,
} from './elevenlabs-client';
import {
  synthesizeGeminiTts,
  synthesizeGeminiTtsMultiSpeaker,
  geminiTtsAvailable,
} from './gemini-tts-client';

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

/* ── Inject expressive cues + v3 audio tags for raw podcast feel ──
 * Per Rish 2026-04-09: "the speaker cannot be so smooth and perfect,
 * and even toned. No podcaster sounds like that." Real podcasts have
 * breathing, throat clears, micro-pauses, vocal fry, laughter bleed.
 *
 * When allowImperfections is true AND engine is ElevenLabs (v3):
 *   - Convert parenthetical cues (laughs) → [laughs] audio tags
 *   - Inject [breathes] between long sentences
 *   - Inject [clears throat] at occasional turn starts
 *   - Keep model-emitted cues intact
 *
 * When allowImperfections is false (refined voices like Void-Caster):
 *   - Still inject subtle [breathes] for natural pacing
 *   - Strip loud cues (laughs, yelling, cursing)
 */
function injectExpressiveCues(text: string, allowImperfections: boolean): string {
  // Convert parenthetical stage directions to v3 audio tags
  // e.g. (laughs) → [laughs], (sighs) → [sighs]
  let processed = text.replace(
    /\(([^)]+)\)/g,
    (_, cue: string) => `[${cue.toLowerCase().trim()}]`,
  );

  if (!allowImperfections) {
    // Refined voices: strip loud cues but keep subtle breathing
    processed = processed.replace(
      /\s*\[(?:laughs|laughs harder|stutters|cursing|curses|yelling|raises voice|shouts|wheezing)[^\]]*\]\s*/gi,
      ' ',
    );
    // Add subtle breathing between long sentences for natural pacing
    processed = processed.replace(/([.!?])\s+([A-Z])/g, (_, punct, next) => {
      return Math.random() < 0.15 ? `${punct} [breathes] ${next}` : `${punct} ${next}`;
    });
    return processed;
  }

  // Raw voices: inject natural human sounds for podcast authenticity
  // Add breathing between sentences (~20% chance per sentence break)
  processed = processed.replace(/([.!?])\s+([A-Z])/g, (_, punct, next) => {
    const r = Math.random();
    if (r < 0.12) return `${punct} [breathes] ${next}`;
    if (r < 0.18) return `${punct} [exhales] ${next}`;
    return `${punct} ${next}`;
  });

  return processed;
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

/* ── Fallback chain ──
 * ElevenLabs eleven_v3 is PRIMARY for all Per|Form analysts.
 * Gemini 2.5 TTS is OUT — deprecated per Rish's latest-model-only
 * rule (no "per product line" rationalization). If ElevenLabs fails,
 * walk remaining engines as last resort.
 */
const SOLO_FALLBACK_CHAIN: Array<EnginePayload['engine']> = [
  'elevenlabs',      // ElevenLabs eleven_v3 — PRIMARY for all analysts
  'personaplex',     // NVIDIA on Vertex AI (free credits)
  'grok-voice',      // xAI Grok 4.20 voice (when team auth lands)
  'playht',          // Play.ht v3 — paid, regional accents
  'elevenlabs',      // ElevenLabs Turbo v2 — paid refined last-resort
];

/* ── Engine dispatch ── */
async function dispatchSynthesis(payload: EnginePayload): Promise<{ audioUrl: string | null; error?: string }> {
  // Concatenate all turns into a single body for single-voice engines.
  // Multi-speaker engines (VibeVoice, once wired) get the turns array instead.
  const body = payload.speakers.map(s => s.text).join('\n\n');
  const firstSpeaker = payload.speakers[0];

  switch (payload.engine) {
    case 'elevenlabs': {
      if (!elevenLabsAvailable()) {
        return { audioUrl: null, error: 'ELEVENLABS_API_KEY not set' };
      }
      // Multi-speaker: use Eleven v3 dialogue mode via /v1/text-to-dialogue.
      // Detect by counting unique voiceIds across turns (same pattern as
      // Gemini multi-speaker wiring). Dialogue mode supports up to 10
      // unique voices and emits one cohesive audio with natural
      // transitions. Used by The Colonel + Gino today.
      const uniqueVoices = Array.from(
        new Set(payload.speakers.map(s => s.voiceId).filter(Boolean)),
      );
      if (uniqueVoices.length >= 2 && payload.speakers.length >= 2) {
        const dialogueResult = await synthesizeElevenLabsDialogue({
          turns: payload.speakers.map(s => ({
            voiceId: s.voiceId,
            text: s.text,
          })),
        });
        return { audioUrl: dialogueResult.audioUrl, error: dialogueResult.error };
      }
      // Single-speaker path
      const result = await synthesizeElevenLabs({
        text: body,
        voiceId: firstSpeaker?.voiceId || 'idris-broadcast',
      });
      return { audioUrl: result.audioUrl, error: result.error };
    }

    case 'gemini-live': {
      if (!geminiTtsAvailable()) {
        return { audioUrl: null, error: 'GEMINI_API_KEY not set' };
      }
      // Detect duo dialog by counting unique voiceIds across turns.
      // buildPayload emits one entry per turn, not per speaker — so
      // an 8-turn Haze+Smoke conversation produces 8 payload.speakers
      // entries across 2 unique voiceIds. Gemini 2.5 TTS supports up
      // to 2 speakers via multiSpeakerVoiceConfig — use it when we
      // have exactly 2 unique voiceIds and at least 2 turns.
      // Colonel+Gino are NOT routed here (scoped ElevenLabs exception
      // for Jersey Italian dialect per feedback_gemini_preferred_not_exclusive.md).
      const uniqueVoices = Array.from(
        new Set(payload.speakers.map(s => s.voiceId).filter(Boolean)),
      );
      if (uniqueVoices.length === 2 && payload.speakers.length >= 2) {
        const voice1Id = uniqueVoices[0];
        const voice2Id = uniqueVoices[1];
        const s1Name = voice1Id.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
        const s2Name = voice2Id.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
        // Rebuild the dialog script with speaker-name prefixes
        const script = payload.speakers
          .map(s => {
            const name = s.voiceId === voice1Id ? s1Name : s2Name;
            return `${name}: ${s.text}`;
          })
          .join('\n\n');
        // Pick each speaker's style from the first turn where it appears
        const s1Style = payload.speakers.find(s => s.voiceId === voice1Id)?.style;
        const s2Style = payload.speakers.find(s => s.voiceId === voice2Id)?.style;
        const multiResult = await synthesizeGeminiTtsMultiSpeaker({
          script,
          speakers: [
            { speakerName: s1Name, voiceId: voice1Id, styleHint: s1Style },
            { speakerName: s2Name, voiceId: voice2Id, styleHint: s2Style },
          ],
          overallStyle: payload.style,
        });
        return { audioUrl: multiResult.audioUrl, error: multiResult.error };
      }
      // Single-speaker path
      const result = await synthesizeGeminiTts({
        text: body,
        voiceId: firstSpeaker?.voiceId || 'idris-broadcast',
        styleHint: firstSpeaker?.style ?? payload.style,
      });
      return { audioUrl: result.audioUrl, error: result.error };
    }

    case 'vibevoice':
    case 'playht':
    case 'chatterbox':
    case 'personaplex':
    case 'grok-voice':
    default: {
      // Stub — log and return null so the client shows "VOICE COMING SOON"
      console.log(`[tts-router] stub synthesis for engine=${payload.engine}`, {
        turns: payload.speakers.length,
        totalChars: payload.speakers.reduce((a, s) => a + s.text.length, 0),
      });
      return { audioUrl: null };
    }
  }
}

/* ── Collapse multi-speaker turns into a single-voice script ──
 * When the preferred multi-speaker engine (vibevoice, playht duo) is
 * unavailable, fall back to a solo engine by concatenating the turns
 * with inline speaker labels. Gemini TTS can interpret these labels
 * reasonably well for duo-style delivery.
 */
function collapseToSoloPayload(payload: EnginePayload): EnginePayload {
  const joined = payload.speakers
    .map(s => (s.voiceId ? `${s.voiceId}: ${s.text}` : s.text))
    .join('\n\n');
  const primary = payload.speakers[0];
  return {
    engine: payload.engine,
    speakers: [
      {
        voiceId: primary?.voiceId || 'idris-broadcast',
        text: joined,
        style: primary?.style ?? payload.style,
      },
    ],
    style: payload.style,
  };
}

/* ── Walk the fallback chain ──
 * Try the analyst's preferred engine first. If it returns null (stub
 * or unavailable), walk SOLO_FALLBACK_CHAIN. Multi-speaker payloads
 * collapse into a single-voice script before falling back, so Haze
 * and Colonel still get audio instead of silently dead-ending.
 */
async function dispatchWithFallback(payload: EnginePayload): Promise<{ audioUrl: string | null; error?: string; engineUsed: string }> {
  // Try the preferred engine first, with its original multi-speaker
  // payload intact (vibevoice/playht would use this natively once wired).
  const primary = await dispatchSynthesis(payload);
  if (primary.audioUrl) {
    return { ...primary, engineUsed: payload.engine };
  }

  // Preferred engine returned null. Collapse multi-speaker turns into
  // a single-voice script for the solo fallback chain.
  const soloPayload = payload.speakers.length > 1
    ? collapseToSoloPayload(payload)
    : payload;

  const startIdx = SOLO_FALLBACK_CHAIN.indexOf(soloPayload.engine);
  const chain = startIdx >= 0
    ? SOLO_FALLBACK_CHAIN.slice(startIdx + 1)
    : SOLO_FALLBACK_CHAIN.filter(e => e !== payload.engine);

  let lastError: string | undefined = primary.error;
  for (const engine of chain) {
    const attempt = { ...soloPayload, engine };
    const result = await dispatchSynthesis(attempt);
    if (result.audioUrl) {
      return { ...result, engineUsed: engine };
    }
    lastError = result.error;
    console.warn(`[tts-router] ${engine} failed, trying next in chain. err=${result.error}`);
  }
  return { audioUrl: null, error: lastError, engineUsed: payload.engine };
}

/* ── Main entry point ── */
export async function speakAnalystContent(req: SpeakRequest): Promise<SpeakResult> {
  const hash = await contentHash(req.text);
  const payload = buildPayload(req);

  try {
    const { audioUrl, error, engineUsed } = await dispatchWithFallback(payload);

    // Post-process: mix ambient background + reverb for raw podcast sound.
    // Only runs when we have a successful audio URL AND the analyst has
    // a post-process config. Lyria ambient is optional — when not wired,
    // the post-processor applies reverb only. When Lyria is live, each
    // analyst gets a custom ambient track matching their studio setting.
    if (audioUrl) {
      try {
        const { postProcessPodcastAudio, generateLyriaAmbient } = await import('./post-process');
        const audioFilePath = path.join(process.cwd(), 'public', audioUrl);

        // Attempt to get or generate a Lyria ambient track
        const ambient = await generateLyriaAmbient(req.analyst.id);

        const processed = await postProcessPodcastAudio({
          analystId: req.analyst.id,
          ttsAudioPath: audioFilePath,
          ambientTrackPath: ambient.filePath ?? undefined,
        });

        if (processed.outputPath) {
          return {
            audioUrl: processed.outputPath,
            engine: `${engineUsed}+postprocess(${processed.applied.join(', ')})`,
            contentHash: hash,
          };
        }
        // Post-process failed — return raw TTS (still usable)
        console.warn(`[tts-router] post-process failed for ${req.analyst.id}: ${processed.error}`);
      } catch (ppErr) {
        // Post-process import or execution failed — return raw TTS
        console.warn(`[tts-router] post-process skipped: ${ppErr instanceof Error ? ppErr.message : ppErr}`);
      }
    }

    return {
      audioUrl,
      engine: engineUsed,
      contentHash: hash,
      error,
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
