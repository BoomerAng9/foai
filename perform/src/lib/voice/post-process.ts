/**
 * Post-processing pipeline for raw podcast sound
 * ==================================================
 * Real podcasts don't sound like TTS. They have:
 *   - Room tone / ambient background (studio hum, pizzeria noise, etc.)
 *   - Natural reverb from the recording space
 *   - Slight compression artifacts
 *   - Volume variation between speakers
 *   - Breathing and environmental bleed
 *
 * This module takes clean TTS output and layers it with:
 *   1. Ambient background from Lyria (Google DeepMind audio gen)
 *   2. Reverb simulation per analyst's studio environment
 *   3. Dynamic range adjustments (not perfect loudness normalization)
 *
 * Per Rish 2026-04-09: "Use Lyria for the background noise and create
 * reverb mixed into the sound. The speaker cannot be so smooth and
 * perfect, and even toned. No podcaster sounds like that."
 *
 * Analyst studio environments (what ambient Lyria should generate):
 *   Void-Caster  → clean broadcast booth, subtle AC hum, distant equipment
 *   Astra Novatos → quiet atelier/study, occasional fabric rustle, clock tick
 *   Bun-E        → scholar library + observatory, quiet, distant Houston traffic
 *   The Haze     → hip-hop studio, subtle equipment hum, occasional beat bleed
 *   The Colonel  → Marlisecio's Pizza back corner, oven hum, distant plates, chatter
 */

import fs from 'fs';
import path from 'path';

/** Per-analyst ambient descriptions for Lyria prompt */
export const ANALYST_AMBIENT_PROMPTS: Record<string, string> = {
  'void-caster':
    'Quiet broadcast studio room tone. Subtle air conditioning hum, distant equipment buzz, clean professional space. No music. Low volume ambient.',
  'astra-novatos':
    'Quiet luxury atelier or study. Occasional soft fabric rustle, distant clock tick, subtle warmth of a wood-paneled room. No music. Very low volume.',
  'bun-e':
    'Scholar library meets observatory. Quiet hum of electronics, distant Houston traffic through thick walls, very faint wind. No music. Whisper-quiet ambient.',
  'the-haze':
    'Hip-hop recording studio. Subtle equipment hum, very faint beat bleeding through headphones, occasional pen tap on desk. No music in foreground. Low volume studio atmosphere.',
  'the-colonel':
    'Back corner of a busy New Jersey pizzeria. Distant oven fan, muffled kitchen chatter, occasional plate clink, faint street noise through the door. No music. Medium-low ambient — you can tell he is in a real place.',
};

/** Reverb presets per analyst (wet/dry mix + decay) */
export const ANALYST_REVERB_PRESETS: Record<string, { wetDry: number; decayMs: number; description: string }> = {
  'void-caster': { wetDry: 0.08, decayMs: 300, description: 'tight broadcast booth, minimal reverb' },
  'astra-novatos': { wetDry: 0.12, decayMs: 500, description: 'warm study with soft surfaces' },
  'bun-e': { wetDry: 0.10, decayMs: 400, description: 'library with high ceilings, controlled' },
  'the-haze': { wetDry: 0.06, decayMs: 200, description: 'dead studio, foam walls, very dry' },
  'the-colonel': { wetDry: 0.18, decayMs: 600, description: 'pizzeria corner with hard tile, some natural echo' },
};

export interface PostProcessConfig {
  analystId: string;
  /** Path to the raw TTS audio file (WAV or MP3) */
  ttsAudioPath: string;
  /** Optional path to a pre-generated Lyria ambient track. If not provided, ambient is skipped. */
  ambientTrackPath?: string;
  /** Ambient volume relative to voice (0.0 = silent, 1.0 = equal). Default per analyst. */
  ambientVolume?: number;
  /** Apply reverb. Default true. */
  applyReverb?: boolean;
}

export interface PostProcessResult {
  /** Path to the processed audio file */
  outputPath: string | null;
  /** What was applied */
  applied: string[];
  error?: string;
}

/**
 * Mix ambient background + reverb into raw TTS output.
 *
 * Implementation approach:
 *   - Phase 1 (NOW): ffmpeg-based mixing via child_process. ffmpeg is
 *     available in Docker images and handles WAV/MP3 mixing + reverb.
 *   - Phase 2: Web Audio API for real-time preview in the audition page.
 *   - Phase 3: Lyria API integration for per-analyst ambient generation.
 *
 * The Lyria integration will call Google's audio generation API with the
 * analyst's ambient prompt to produce a matching background track. Until
 * Lyria API access is wired, pass a pre-generated ambient file via
 * ambientTrackPath, or omit it for voice-only output.
 */
export async function postProcessPodcastAudio(
  config: PostProcessConfig,
): Promise<PostProcessResult> {
  const applied: string[] = [];
  const { execSync } = await import('child_process');

  const reverb = ANALYST_REVERB_PRESETS[config.analystId];
  const ambientPrompt = ANALYST_AMBIENT_PROMPTS[config.analystId];

  // Output file
  const dir = path.join(process.cwd(), 'public', 'generated', 'audio');
  fs.mkdirSync(dir, { recursive: true });
  const hash = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const outputFilename = `podcast-${config.analystId}-${hash}.mp3`;
  const outputPath = path.join(dir, outputFilename);

  try {
    let currentInput = config.ttsAudioPath;

    // Step 1: Mix ambient background if provided
    if (config.ambientTrackPath && fs.existsSync(config.ambientTrackPath)) {
      const ambientVol = config.ambientVolume ?? (config.analystId === 'the-colonel' ? 0.15 : 0.08);
      const mixedPath = path.join(dir, `mix-${hash}.wav`);

      // ffmpeg: mix voice + ambient at specified volume ratio
      // -filter_complex amix with volume-adjusted ambient
      execSync(
        `ffmpeg -y -i "${currentInput}" -i "${config.ambientTrackPath}" ` +
        `-filter_complex "[1:a]volume=${ambientVol}[amb];[0:a][amb]amix=inputs=2:duration=first:dropout_transition=3" ` +
        `-ac 1 -ar 24000 "${mixedPath}" 2>/dev/null`,
        { timeout: 30000 },
      );
      currentInput = mixedPath;
      applied.push(`ambient (${ambientPrompt?.slice(0, 40)}..., vol=${ambientVol})`);
    }

    // Step 2: Apply reverb via ffmpeg's aecho filter
    if (config.applyReverb !== false && reverb) {
      const reverbPath = path.join(dir, `reverb-${hash}.wav`);
      // aecho simulates room reverb: in_gain | out_gain | delay(ms) | decay(0-1)
      const decay = Math.min(reverb.wetDry * 5, 0.9); // scale wet/dry to echo decay
      execSync(
        `ffmpeg -y -i "${currentInput}" ` +
        `-af "aecho=0.8:0.8:${reverb.decayMs}:${decay}" ` +
        `-ac 1 -ar 24000 "${reverbPath}" 2>/dev/null`,
        { timeout: 30000 },
      );
      currentInput = reverbPath;
      applied.push(`reverb (${reverb.description}, decay=${reverb.decayMs}ms)`);
    }

    // Step 3: Final encode to MP3
    if (currentInput !== outputPath) {
      execSync(
        `ffmpeg -y -i "${currentInput}" -codec:a libmp3lame -b:a 128k "${outputPath}" 2>/dev/null`,
        { timeout: 30000 },
      );
    }

    // Cleanup intermediate files
    const intermediates = [
      path.join(dir, `mix-${hash}.wav`),
      path.join(dir, `reverb-${hash}.wav`),
    ];
    for (const f of intermediates) {
      if (f !== outputPath && fs.existsSync(f)) {
        fs.unlinkSync(f);
      }
    }

    applied.push('mp3 encode');
    return { outputPath: `/generated/audio/${outputFilename}`, applied };
  } catch (err) {
    return {
      outputPath: null,
      applied,
      error: err instanceof Error ? err.message : 'post-process failed',
    };
  }
}

/**
 * Generate a Lyria ambient track for an analyst.
 *
 * TODO: Wire Lyria API when access is available. For now this returns
 * null and the post-processor skips the ambient mix step. When Lyria
 * ships, this function will:
 *   1. Call the Lyria API with ANALYST_AMBIENT_PROMPTS[analystId]
 *   2. Cache the generated ambient in GCS/Puter (ambient tracks are
 *      reusable across episodes — generate once, mix many times)
 *   3. Return the local file path for the post-processor to mix
 *
 * Lyria is Google DeepMind's audio generation model (Suno competitor).
 * Per feedback_model_policy_gemini_first.md, it's the preferred ambient
 * generator since it's in the Google ecosystem.
 */
export async function generateLyriaAmbient(
  analystId: string,
): Promise<{ filePath: string | null; cached: boolean; error?: string }> {
  const prompt = ANALYST_AMBIENT_PROMPTS[analystId];
  if (!prompt) {
    return { filePath: null, cached: false, error: `no ambient prompt for ${analystId}` };
  }

  // TODO: Lyria API integration
  // const LYRIA_API_KEY = process.env.LYRIA_API_KEY || process.env.GEMINI_API_KEY;
  // const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/lyria:generateAudio', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': LYRIA_API_KEY },
  //   body: JSON.stringify({ prompt, duration_seconds: 120, style: 'ambient background' }),
  // });
  // ... cache to GCS, return path

  return { filePath: null, cached: false, error: 'Lyria API not yet wired — ambient skipped' };
}
