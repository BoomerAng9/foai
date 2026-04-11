#!/usr/bin/env node

/**
 * generate-podcast-audio.mjs
 *
 * Generates TTS audio for all podcast_episodes with NULL audio_url.
 * Uses per-analyst ElevenLabs voice mapping.
 * Saves to public/generated/audio/ (Docker volume-mounted, persists across rebuilds).
 *
 * Usage: ELEVENLABS_API_KEY=sk_... node scripts/generate-podcast-audio.mjs
 */

import postgres from 'postgres';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

// ── Config ───────────────────────────────────────────────────────
const DATABASE_URL = process.env.DATABASE_URL || '';
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
if (!ELEVENLABS_API_KEY) {
  console.error('ERROR: ELEVENLABS_API_KEY env var is required.');
  process.exit(1);
}

// ── Per-analyst voice mapping (ElevenLabs voice IDs) ─────────────
const VOICE_MAP = {
  'void-caster': { id: '29vD33N1CtxCmqQRPOHJ', name: 'Drew',   style: 0.4 },  // deep authoritative male
  'the-colonel': { id: '2EiwWnXFnvU5JabPnv8n', name: 'Clyde',  style: 0.6 },  // Jersey gruff male
  'the-haze':    { id: 'CYw3kZ02Hs0563khs1Fj', name: 'Dave',   style: 0.5 },  // energetic casual male
  'astra-novatos': { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', style: 0.3 }, // polished female
  'bun-e':       { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli',   style: 0.5 },  // warm cosmic female
};
const DEFAULT_VOICE = { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', style: 0.3 };

// Audio saved to generated/ which is volume-mounted at /opt/foai-data/perform/generated
const AUDIO_DIR = resolve(PROJECT_ROOT, 'public', 'generated', 'audio');

const sql = postgres(DATABASE_URL, { ssl: 'require', max: 3 });

if (!existsSync(AUDIO_DIR)) {
  mkdirSync(AUDIO_DIR, { recursive: true });
  console.log(`Created audio directory: ${AUDIO_DIR}`);
}

// ── Chunked TTS for long transcripts ─────────────────────────────
async function generateAudio(text, voice) {
  const TTS_URL = `https://api.elevenlabs.io/v1/text-to-speech/${voice.id}`;

  // ElevenLabs v3 supports up to ~5000 chars per request
  const MAX_CHUNK = 4500;
  const chunks = [];

  if (text.length <= MAX_CHUNK) {
    chunks.push(text);
  } else {
    // Split on sentence boundaries
    let remaining = text;
    while (remaining.length > 0) {
      if (remaining.length <= MAX_CHUNK) {
        chunks.push(remaining);
        break;
      }
      // Find last sentence end within limit
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

    const res = await fetch(TTS_URL, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: chunks[i],
        model_id: 'eleven_v3',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: voice.style,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`ElevenLabs API [${res.status}]: ${errText}`);
    }

    audioBuffers.push(Buffer.from(await res.arrayBuffer()));

    // Rate limit: ~2 req/sec on free tier
    if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 600));
  }

  return Buffer.concat(audioBuffers);
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log('Querying for episodes with NULL audio_url...\n');

  const episodes = await sql`
    SELECT id, title, transcript, analyst_id
    FROM podcast_episodes
    WHERE audio_url IS NULL
    ORDER BY id ASC
  `;

  if (episodes.length === 0) {
    console.log('All episodes already have audio. Nothing to do.');
    await sql.end();
    return;
  }

  console.log(`Found ${episodes.length} episode(s) needing audio.\n`);

  let successCount = 0;
  let failCount = 0;

  for (const ep of episodes) {
    const { id, title, transcript, analyst_id } = ep;
    const voice = VOICE_MAP[analyst_id] || DEFAULT_VOICE;

    console.log(`[${id}] "${title}"`);
    console.log(`  Analyst: ${analyst_id} → Voice: ${voice.name} (${transcript.length} chars)`);

    try {
      const buffer = await generateAudio(transcript, voice);
      const filename = `episode-${id}.mp3`;
      const filepath = resolve(AUDIO_DIR, filename);
      writeFileSync(filepath, buffer);

      // URL path served by Next.js from public/generated/
      const audioUrl = `/generated/audio/${filename}`;

      await sql`
        UPDATE podcast_episodes
        SET audio_url = ${audioUrl},
            duration_seconds = ${Math.round(buffer.length / 16000)}
        WHERE id = ${id}
      `;

      console.log(`  ✓ Saved ${(buffer.length / 1024).toFixed(0)} KB → ${audioUrl}\n`);
      successCount++;
    } catch (err) {
      console.error(`  ✗ FAILED: ${err.message}\n`);
      failCount++;
    }

    // Pause between episodes to stay within rate limits
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\nDone. Success: ${successCount}, Failed: ${failCount}`);
  await sql.end();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
