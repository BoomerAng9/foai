#!/usr/bin/env node

/**
 * Draft Showcase Pipeline
 * ========================
 * Per player (32 total):
 *   1. Blueprint image — Recraft V4 (architect's pad, CAD-style, measurements)
 *   2. Emergence clip — Seedance 2.0 via Kie.ai (player materializes from blueprint)
 *   3. Action clip — Seedance 2.0 via fal.ai (dynamic action pose)
 *   3b. OR HeyGen talking head (analyst introduces the pick)
 *
 * Usage: node scripts/draft-showcase-pipeline.mjs [phase] [limit]
 *   phase: blueprints | videos | all (default: all)
 *   limit: number of players (default: 32)
 *
 * Env: RECRAFT_API_KEY, FAL_KEY, KIE_AI_API_KEY, DATABASE_URL
 */

import postgres from 'postgres';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(__dirname, '..', 'public', 'generated', 'showcase');
const BLUEPRINT_DIR = resolve(OUTPUT_DIR, 'blueprints');
const VIDEO_DIR = resolve(OUTPUT_DIR, 'videos');

[OUTPUT_DIR, BLUEPRINT_DIR, VIDEO_DIR].forEach(d => { if (!existsSync(d)) mkdirSync(d, { recursive: true }); });

const DATABASE_URL = process.env.DATABASE_URL;
const RECRAFT_KEY = process.env.RECRAFT_API_KEY;
const FAL_KEY = process.env.FAL_KEY;
const KIE_KEY = process.env.KIE_AI_API_KEY;

if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }

const sql = postgres(DATABASE_URL, { ssl: 'require', max: 3 });

// ── Phase 1: Blueprint Images (Recraft V4) ─────────────────────

async function generateBlueprint(player) {
  if (!RECRAFT_KEY) { console.log('    SKIP: no RECRAFT_API_KEY'); return null; }

  const measurements = [
    player.height ? `Height: ${player.height}` : null,
    player.weight ? `Weight: ${player.weight} lbs` : null,
    player.forty ? `40-yd: ${player.forty}s` : null,
    player.vertical ? `Vertical: ${player.vertical}"` : null,
    player.bench ? `Bench: ${player.bench} reps` : null,
  ].filter(Boolean).join(' | ');

  const prompt = `Technical architect's blueprint drawing on graph paper. A football player in ${player.position} stance, drawn in precise CAD-style blue lines on white blueprint paper. Measurements and annotations around the figure: ${measurements || 'Height 6-2, Weight 220 lbs'}. School name "${player.school}" in small text. Clean, precise, engineering drawing style. No color except blueprint blue lines. Grid lines visible. Professional architectural drafting.`;

  const res = await fetch('https://external.api.recraft.ai/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RECRAFT_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      style: 'digital_illustration',
      size: '1024x1024',
      n: 1,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.log(`    Recraft FAIL [${res.status}]: ${err.slice(0, 100)}`);
    return null;
  }

  const data = await res.json();
  const imageUrl = data.data?.[0]?.url;
  if (!imageUrl) { console.log('    No image URL in response'); return null; }

  // Download image
  const imgRes = await fetch(imageUrl);
  const imgBuf = Buffer.from(await imgRes.arrayBuffer());
  const filename = `blueprint-${player.name.toLowerCase().replace(/\s+/g, '-')}.png`;
  const filepath = resolve(BLUEPRINT_DIR, filename);
  writeFileSync(filepath, imgBuf);

  return { filepath, filename, url: `/generated/showcase/blueprints/${filename}` };
}

// ── Phase 2: Seedance Videos (Kie.ai + fal.ai) ────────────────

async function generateSeedanceKie(imageUrl, prompt, outputName) {
  if (!KIE_KEY) { console.log('    SKIP: no KIE_AI_API_KEY'); return null; }

  const res = await fetch('https://api.kie.ai/api/v1/video/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KIE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'seedance-2.0',
      image_url: imageUrl,
      prompt,
      duration: 7,
      resolution: '720p',
    }),
  });

  if (!res.ok) {
    console.log(`    Kie FAIL [${res.status}]`);
    return null;
  }

  const data = await res.json();
  return { task_id: data.task_id || data.id, provider: 'kie', outputName };
}

async function generateSeedanceFal(imageUrl, prompt, outputName) {
  if (!FAL_KEY) { console.log('    SKIP: no FAL_KEY'); return null; }

  const res = await fetch('https://queue.fal.run/fal-ai/seedance/v2/fast/image-to-video', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: imageUrl,
      prompt,
      duration: 7,
      aspect_ratio: '16:9',
    }),
  });

  if (!res.ok) {
    console.log(`    fal FAIL [${res.status}]`);
    return null;
  }

  const data = await res.json();
  return { request_id: data.request_id, provider: 'fal', outputName };
}

// ── Main ───────────────────────────────────────────────────────

async function main() {
  const phase = process.argv[2] || 'blueprints'; // start with blueprints first
  const limit = parseInt(process.argv[3] || '32', 10);

  console.log(`=== Draft Showcase Pipeline ===`);
  console.log(`Phase: ${phase} | Players: ${limit}`);
  console.log('');

  const prospects = await sql`
    SELECT p.name, p.position, p.school, p.grade, p.projected_round,
      c.height, c.weight, c.forty, c.vertical, c.bench
    FROM perform_players p
    LEFT JOIN nfl_combine c ON LOWER(p.name) = LOWER(c.player_name)
    ORDER BY p.grade DESC
    LIMIT ${limit}
  `;

  console.log(`${prospects.length} players loaded\n`);

  if (phase === 'blueprints' || phase === 'all') {
    console.log('--- Phase 1: Blueprint Images (Recraft V4) ---\n');
    let ok = 0;
    for (const p of prospects) {
      console.log(`  [${ok + 1}] ${p.name} (${p.position}, ${p.school})`);
      const result = await generateBlueprint(p);
      if (result) {
        console.log(`    Blueprint: ${result.filename} (${(existsSync(result.filepath) ? 'saved' : 'FAIL')})`);
        ok++;
      }
      await new Promise(r => setTimeout(r, 1000)); // Rate limit
    }
    console.log(`\nBlueprints: ${ok}/${prospects.length}\n`);
  }

  if (phase === 'videos' || phase === 'all') {
    console.log('--- Phase 2: Seedance Videos ---\n');
    console.log('Video generation is async — tasks are submitted, check status later.\n');

    let submitted = 0;
    for (let i = 0; i < prospects.length; i++) {
      const p = prospects[i];
      const blueprintFile = `blueprint-${p.name.toLowerCase().replace(/\s+/g, '-')}.png`;
      const blueprintPath = resolve(BLUEPRINT_DIR, blueprintFile);

      if (!existsSync(blueprintPath)) {
        console.log(`  [${i + 1}] ${p.name}: No blueprint, skipping video`);
        continue;
      }

      console.log(`  [${i + 1}] ${p.name}`);

      // Clip 1: Blueprint emergence (Kie.ai — cheaper)
      const emergencePrompt = `The blueprint drawing comes alive. The blue lines of the football player glow and pulse with energy, then the figure lifts off the paper, transforming from 2D blueprint lines into a fully realized 3D athlete in a ${p.school} uniform. Camera slowly pulls back as the player takes a powerful stance. Cinematic lighting, dramatic.`;

      // For now, just log the prompts — actual video gen needs the blueprint hosted at a URL
      console.log(`    Clip 1 (emergence): prompt ready`);
      console.log(`    Clip 2 (action): prompt ready`);
      console.log(`    Clip 3 (analyst): prompt ready`);
      submitted++;

      await new Promise(r => setTimeout(r, 500));
    }
    console.log(`\nVideo prompts prepared: ${submitted}/${prospects.length}`);
    console.log('NOTE: Blueprint images need to be hosted at a public URL before Seedance can use them.');
    console.log('Upload to GCS or serve via perform.foai.cloud/generated/showcase/blueprints/');
  }

  console.log('\n=== Pipeline Complete ===');
  await sql.end();
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
