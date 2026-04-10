#!/usr/bin/env node

/**
 * lyria-backgrounds.mjs
 *
 * Generates ambient background audio for each analyst's podcast setting
 * using Google Lyria 3 Pro via the Gemini API.
 *
 * Usage: GEMINI_API_KEY=... node scripts/lyria-backgrounds.mjs
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(__dirname, '..', 'auditions', 'backgrounds');

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

const GEMINI_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_KEY) { console.error('GEMINI_API_KEY required'); process.exit(1); }

const LYRIA_URL = `https://generativelanguage.googleapis.com/v1beta/models/lyria-3-clip-preview:generateContent?key=${GEMINI_KEY}`;

const BACKGROUNDS = [
  {
    id: 'void-caster',
    name: 'Void-Caster — Cosmic Broadcast Studio',
    prompt: 'Subtle ambient sci-fi broadcast studio soundscape. Very low cosmic hum, soft distant electronic pulse, faint holographic interface tones. Spacious, clean, minimal. No melody, no drums, no music. Pure atmospheric ambience like a transmission desk floating in deep space. 30 seconds.',
  },
  {
    id: 'astra-novatos',
    name: 'Astra Novatos — Luxury Private Study',
    prompt: 'Quiet luxury study room ambience. Faint antique clock ticking, very soft distant fabric rustle, warm wood-paneled room tone. Occasional subtle ice clink in a crystal glass. No music, no melody. Just the warm quiet of an expensive private room where time moves slowly. 30 seconds.',
  },
  {
    id: 'bun-e',
    name: 'Bun-E — Scholar Library Observatory',
    prompt: 'Scholarly library with faint cosmic undertone. Warm wood room tone, occasional very soft page turning, subtle distant resonance like stars humming far away. Intellectual, quiet, reverent atmosphere. No music, no drums. Pure ambient presence of a library that touches the cosmos. 30 seconds.',
  },
  {
    id: 'the-colonel',
    name: 'The Colonel — Marlisecio\'s Pizza Shop',
    prompt: 'Pizza restaurant podcast corner ambience. Distant brick oven fire crackling, muffled sports television broadcast in background, occasional plate and glass clinks, faint kitchen bustle and chatter. Warm, lived-in, slightly noisy. The sound of a real North Jersey pizza shop on a weeknight. No music. 30 seconds.',
  },
  {
    id: 'haze-smoke',
    name: 'Haze & Smoke — AIR P.O.D. Studio',
    prompt: 'Modern sleek podcast studio ambience. Very clean room tone, subtle low-end warmth, faint air system hum. Professional, urban, minimal. The quiet of an expensive recording booth between takes. No music, no melody, no drums. Just clean studio air. 30 seconds.',
  },
];

async function generateBackground(bg) {
  console.log(`\n━━━ ${bg.name} ━━━`);

  const body = {
    contents: [{ parts: [{ text: bg.prompt }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
    },
  };

  const res = await fetch(LYRIA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`  ✗ FAILED [${res.status}]: ${err.slice(0, 200)}`);
    return false;
  }

  const data = await res.json();

  // Extract audio from response
  const candidates = data.candidates || [];
  for (const candidate of candidates) {
    const parts = candidate.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('audio/')) {
        const buffer = Buffer.from(part.inlineData.data, 'base64');
        const ext = part.inlineData.mimeType.includes('wav') ? 'wav' : 'mp3';
        const filename = `bg-${bg.id}.${ext}`;
        const filepath = resolve(OUTPUT_DIR, filename);
        writeFileSync(filepath, buffer);
        console.log(`  ✓ ${filename} (${(buffer.length / 1024).toFixed(0)} KB)`);
        return true;
      }
    }
  }

  console.error('  ✗ No audio data in response');
  return false;
}

async function main() {
  console.log('═══ Lyria 3 Pro — Background Audio Generation ═══');

  let success = 0;
  for (const bg of BACKGROUNDS) {
    const ok = await generateBackground(bg);
    if (ok) success++;
    // Rate limit
    await new Promise(r => setTimeout(r, 3000));
  }

  console.log(`\n═══ Done: ${success}/${BACKGROUNDS.length} backgrounds generated ═══`);
  console.log(`Files: ${OUTPUT_DIR}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
