#!/usr/bin/env node

/**
 * Regenerate all podcast episodes with approved ElevenLabs Voice Design voices.
 * Then mix with foley backgrounds via FFmpeg.
 *
 * Approved voices (from audition):
 *   Void-Caster  → U7IrMz7btOogZMMksrKF
 *   Astra Novatos → Hrh6p8s8pMkK1MsFVcJV
 *   Bun-E        → l8GG2jgNX1cxmHhWY9xd
 *   The Colonel   → JCkiVgQNSEVZj5oIolmM
 *   Haze         → mVnUIJrt7ADr33byr6uw
 *   Smoke        → yNvzaGUue4qoxzazAdK9
 *
 * Foley backgrounds (ElevenLabs SFX):
 *   void-caster  → foley-void-caster.mp3 (broadcast studio)
 *   astra-novatos → foley-astra-novatos.mp3 (luxury study)
 *   bun-e        → foley-bun-e.mp3 (library)
 *   the-colonel  → foley-the-colonel.mp3 (pizza shop)
 *   the-haze     → foley-haze-smoke.mp3 (pod studio)
 *
 * Usage: ELEVENLABS_API_KEY=sk_... node scripts/regenerate-podcast-voices.mjs
 */

import postgres from 'postgres';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const AUDIO_DIR = resolve(PROJECT_ROOT, 'public', 'generated', 'audio');
const FOLEY_DIR = resolve(PROJECT_ROOT, 'auditions', 'backgrounds');

if (!existsSync(AUDIO_DIR)) mkdirSync(AUDIO_DIR, { recursive: true });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
if (!ELEVENLABS_API_KEY) { console.error('ELEVENLABS_API_KEY required'); process.exit(1); }

const sql = postgres(DATABASE_URL, { ssl: 'require', max: 3 });

// Approved voice IDs from audition
const VOICE_MAP = {
  'void-caster':   'U7IrMz7btOogZMMksrKF',
  'astra-novatos': 'Hrh6p8s8pMkK1MsFVcJV',
  'bun-e':         'l8GG2jgNX1cxmHhWY9xd',
  'the-colonel':   'JCkiVgQNSEVZj5oIolmM',
  'the-haze':      'mVnUIJrt7ADr33byr6uw',
  'smoke':         'yNvzaGUue4qoxzazAdK9',
};

// Foley background files
const FOLEY_MAP = {
  'void-caster':   'foley-void-caster.mp3',
  'astra-novatos': 'foley-astra-novatos.mp3',
  'bun-e':         'foley-bun-e.mp3',
  'the-colonel':   'foley-the-colonel.mp3',
  'the-haze':      'foley-haze-smoke.mp3',
};

function getVoiceId(analystId) {
  return VOICE_MAP[analystId] || VOICE_MAP['void-caster'];
}

function getFoleyFile(analystId) {
  const file = FOLEY_MAP[analystId] || FOLEY_MAP['void-caster'];
  return resolve(FOLEY_DIR, file);
}

async function generateTTS(text, voiceId) {
  const MAX_CHUNK = 4500;
  const chunks = [];

  if (text.length <= MAX_CHUNK) {
    chunks.push(text);
  } else {
    let remaining = text;
    while (remaining.length > 0) {
      if (remaining.length <= MAX_CHUNK) { chunks.push(remaining); break; }
      const slice = remaining.slice(0, MAX_CHUNK);
      const lastPeriod = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '));
      const splitAt = lastPeriod > 0 ? lastPeriod + 2 : MAX_CHUNK;
      chunks.push(remaining.slice(0, splitAt));
      remaining = remaining.slice(splitAt);
    }
  }

  const audioBuffers = [];
  for (let i = 0; i < chunks.length; i++) {
    if (chunks.length > 1) console.log(`    Chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`);

    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: chunks[i],
        model_id: 'eleven_v3',
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3 },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`ElevenLabs [${res.status}]: ${err.slice(0, 200)}`);
    }

    audioBuffers.push(Buffer.from(await res.arrayBuffer()));
    if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 600));
  }

  return Buffer.concat(audioBuffers);
}

function mixWithFoley(voicePath, foleyPath, outputPath) {
  // Check if ffmpeg is available
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
  } catch {
    console.log('    FFmpeg not available — skipping mix, using voice-only');
    // Just copy voice file as output
    const voice = readFileSync(voicePath);
    writeFileSync(outputPath, voice);
    return;
  }

  if (!existsSync(foleyPath)) {
    console.log(`    Foley not found: ${foleyPath} — using voice-only`);
    const voice = readFileSync(voicePath);
    writeFileSync(outputPath, voice);
    return;
  }

  // Mix: voice at full volume, foley at 12% volume, loop foley to match voice length
  try {
    execSync(
      `ffmpeg -y -i "${voicePath}" -stream_loop -1 -i "${foleyPath}" ` +
      `-filter_complex "[1:a]volume=0.12[bg];[0:a][bg]amix=inputs=2:duration=first:dropout_transition=2[out]" ` +
      `-map "[out]" -codec:a libmp3lame -b:a 192k "${outputPath}"`,
      { stdio: 'ignore', timeout: 60000 }
    );
    console.log('    Mixed with foley background');
  } catch {
    console.log('    FFmpeg mix failed — using voice-only');
    const voice = readFileSync(voicePath);
    writeFileSync(outputPath, voice);
  }
}

async function main() {
  console.log('=== Regenerate Podcast Audio — Approved Voices + Foley ===\n');

  const episodes = await sql`
    SELECT id, title, transcript, analyst_id
    FROM podcast_episodes
    ORDER BY id ASC
  `;

  console.log(`${episodes.length} episodes to regenerate\n`);

  let success = 0;
  let fail = 0;

  for (const ep of episodes) {
    const voiceId = getVoiceId(ep.analyst_id);
    const voiceName = Object.entries(VOICE_MAP).find(([, v]) => v === voiceId)?.[0] || 'unknown';

    console.log(`[${ep.id}] "${ep.title}"`);
    console.log(`  Analyst: ${ep.analyst_id} → Voice: ${voiceName} (${ep.transcript.length} chars)`);

    try {
      // Step 1: Generate TTS with approved voice
      const voiceBuffer = await generateTTS(ep.transcript, voiceId);
      const voiceFile = resolve(AUDIO_DIR, `voice-${ep.id}.mp3`);
      writeFileSync(voiceFile, voiceBuffer);
      console.log(`  Voice: ${(voiceBuffer.length / 1024).toFixed(0)} KB`);

      // Step 2: Mix with foley background
      const foleyFile = getFoleyFile(ep.analyst_id);
      const finalFile = resolve(AUDIO_DIR, `episode-${ep.id}.mp3`);
      mixWithFoley(voiceFile, foleyFile, finalFile);

      // Step 3: Update DB
      const audioUrl = `/generated/audio/episode-${ep.id}.mp3`;
      const finalSize = readFileSync(finalFile).length;
      await sql`
        UPDATE podcast_episodes
        SET audio_url = ${audioUrl},
            duration_seconds = ${Math.round(finalSize / 16000)}
        WHERE id = ${ep.id}
      `;

      console.log(`  Final: ${(finalSize / 1024).toFixed(0)} KB → ${audioUrl}\n`);
      success++;
    } catch (err) {
      console.error(`  FAILED: ${err.message}\n`);
      fail++;
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log(`\n=== Done. Success: ${success}, Failed: ${fail} ===`);
  await sql.end();
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
