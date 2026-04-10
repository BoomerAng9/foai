#!/usr/bin/env node

/**
 * generate-podcast-audio.mjs
 *
 * Reads all podcast_episodes with NULL audio_url from the database,
 * generates TTS audio via ElevenLabs, saves to public/audio/,
 * and updates the database row with the audio_url.
 *
 * Usage: node scripts/generate-podcast-audio.mjs
 *
 * Env vars:
 *   ELEVENLABS_API_KEY  — required
 *   DATABASE_URL        — optional, falls back to hardcoded Neon connection
 */

import postgres from 'postgres';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

// ── Config ───────────────────────────────────────────────────────
const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_25fRtnTYlpsr@ep-dawn-bar-a4orhend-pooler.us-east-1.aws.neon.tech/performdb?sslmode=require';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
if (!ELEVENLABS_API_KEY) {
  console.error('ERROR: ELEVENLABS_API_KEY env var is required.');
  process.exit(1);
}

// Rachel (default female voice)
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM';
const TTS_URL = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;

const AUDIO_DIR = resolve(PROJECT_ROOT, 'public', 'audio');

// ── DB connection ────────────────────────────────────────────────
const sql = postgres(DATABASE_URL, { ssl: 'require', max: 3 });

// ── Ensure audio directory ───────────────────────────────────────
if (!existsSync(AUDIO_DIR)) {
  mkdirSync(AUDIO_DIR, { recursive: true });
  console.log(`Created audio directory: ${AUDIO_DIR}`);
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log('Querying for episodes with NULL audio_url...');

  const episodes = await sql`
    SELECT id, title, transcript
    FROM podcast_episodes
    WHERE audio_url IS NULL
    ORDER BY created_at ASC
  `;

  if (episodes.length === 0) {
    console.log('No episodes need audio generation. All done.');
    await sql.end();
    return;
  }

  console.log(`Found ${episodes.length} episode(s) needing audio.\n`);

  let successCount = 0;
  let failCount = 0;

  for (const ep of episodes) {
    const { id, title, transcript } = ep;

    // Truncate transcript if too long (ElevenLabs has a ~5000 char limit per request)
    const text = transcript.length > 4500
      ? transcript.slice(0, 4500) + '...'
      : transcript;

    console.log(`[${id}] Generating audio for: ${title}`);

    try {
      const res = await fetch(TTS_URL, {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_v3',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`  ERROR [${res.status}]: ${errText}`);
        failCount++;
        continue;
      }

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const filename = `episode-${id}.mp3`;
      const filepath = resolve(AUDIO_DIR, filename);
      writeFileSync(filepath, buffer);

      // URL path relative to public/
      const audioUrl = `/audio/${filename}`;

      await sql`
        UPDATE podcast_episodes
        SET audio_url = ${audioUrl}
        WHERE id = ${id}
      `;

      console.log(`  Generated audio for episode ${id}: ${title}`);
      console.log(`  Saved to: ${filepath} (${(buffer.length / 1024).toFixed(1)} KB)`);
      successCount++;
    } catch (err) {
      console.error(`  EXCEPTION for episode ${id}:`, err.message || err);
      failCount++;
    }
  }

  console.log(`\nDone. Success: ${successCount}, Failed: ${failCount}`);
  await sql.end();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
