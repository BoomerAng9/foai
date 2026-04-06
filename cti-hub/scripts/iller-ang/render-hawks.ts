#!/usr/bin/env node
/**
 * Iller_Ang — Hawk character art renderer
 * ==========================================
 * Walks the Sqwaadrun character canon (cti-hub/src/lib/hawks/characters.ts)
 * and renders production art for any profile where imageReady is false.
 * Saves PNGs to cti-hub/public/hawks/{slug}.png and updates the
 * characters.ts file in-place to flip imageReady → true.
 *
 * Routes via Ideogram V3 — best text-free character art in the stack.
 *
 * Usage:
 *   IDEOGRAM_API_KEY=... npx tsx scripts/iller-ang/render-hawks.ts
 *   IDEOGRAM_API_KEY=... npx tsx scripts/iller-ang/render-hawks.ts --slug lil_guard_hawk
 *   IDEOGRAM_API_KEY=... npx tsx scripts/iller-ang/render-hawks.ts --force
 *
 * Idempotent. Re-runs only render missing slugs unless --force.
 *
 * Brand reference: project_sqwaadrun_brand.md (memory)
 *
 * Manifest output: scripts/iller-ang/render-manifest.json — exact prompts
 * sent and result URLs, for audit + re-runs without re-hitting the API.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { ALL_PROFILES, type CharacterProfile } from '../../src/lib/hawks/characters';

const BASE = 'https://api.ideogram.ai';
const PUBLIC_HAWKS_DIR = path.resolve(__dirname, '../../public/hawks');
const CHARACTERS_TS_PATH = path.resolve(__dirname, '../../src/lib/hawks/characters.ts');
const MANIFEST_PATH = path.resolve(__dirname, 'render-manifest.json');

const COMMON_NEGATIVE =
  'text, watermark, logo, signature, blurry, low quality, deformed, extra limbs, bad anatomy, ' +
  'duplicate, mutated, frame, border, photographic realism';

interface ManifestEntry {
  slug: string;
  callsign: string;
  prompt: string;
  url: string;
  rendered_at: string;
  cost_estimate_usd: number;
}

interface CliArgs {
  slug?: string;
  force: boolean;
}

function parseArgs(): CliArgs {
  const args: CliArgs = { force: false };
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === '--slug') args.slug = process.argv[++i];
    else if (a === '--force') args.force = true;
  }
  return args;
}

function buildPromptFor(profile: CharacterProfile): string {
  // Sqwaadrun brand DNA — keep style stable across the fleet
  const brand =
    'A.I.M.S. shipping container port at night, cinematic dramatic lighting, ' +
    'gold and cyan rim lighting, navy blue background, illustrated character art ' +
    'in stylized animation style, square framing, cinematic composition';

  const gear = profile.gear.length > 0 ? `Gear: ${profile.gear.join(', ')}.` : '';

  return `${profile.visualDescription} ${gear} Setting: ${brand}. ` +
    `Signature color accent: ${profile.signatureColor}. Production-quality character portrait ` +
    `for the ACHIEVEMOR Sqwaadrun fleet. The character "${profile.callsign}" is the focal point ` +
    `with confident posture and clear silhouette against a dramatically lit port backdrop.`;
}

async function ideogramGenerate(prompt: string, slug: string): Promise<string | null> {
  const apiKey = process.env.IDEOGRAM_API_KEY;
  if (!apiKey) {
    console.error('  [skip] IDEOGRAM_API_KEY not set');
    return null;
  }

  const formData = new FormData();
  formData.append('prompt', prompt);
  formData.append('rendering_speed', 'TURBO');
  formData.append('style_type', 'DESIGN');
  formData.append('aspect_ratio', '1x1');
  formData.append('negative_prompt', COMMON_NEGATIVE);

  try {
    const res = await fetch(`${BASE}/v1/ideogram-v3/generate`, {
      method: 'POST',
      headers: { 'Api-Key': apiKey },
      body: formData,
      signal: AbortSignal.timeout(90000),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.error(`  [error] Ideogram ${res.status}: ${txt}`);
      return null;
    }

    const data = (await res.json()) as { data?: Array<{ url?: string }> };
    return data.data?.[0]?.url ?? null;
  } catch (err) {
    console.error(`  [error] ${slug}: ${err instanceof Error ? err.message : 'unknown'}`);
    return null;
  }
}

async function downloadTo(url: string, dest: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, buf);
    return true;
  } catch {
    return false;
  }
}

async function loadManifest(): Promise<ManifestEntry[]> {
  try {
    const raw = await fs.readFile(MANIFEST_PATH, 'utf-8');
    return JSON.parse(raw) as ManifestEntry[];
  } catch {
    return [];
  }
}

async function saveManifest(entries: ManifestEntry[]): Promise<void> {
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(entries, null, 2));
}

async function flipImageReady(slug: string): Promise<void> {
  const src = await fs.readFile(CHARACTERS_TS_PATH, 'utf-8');
  // Find the profile block by slug, then flip its imageReady within that block.
  // The profile block ends at the next `},` after the slug line.
  const slugMarker = `slug: '${slug}',`;
  const idx = src.indexOf(slugMarker);
  if (idx === -1) {
    console.warn(`  [warn] slug '${slug}' not found in characters.ts`);
    return;
  }
  const blockEnd = src.indexOf('  },', idx);
  if (blockEnd === -1) return;
  const before = src.slice(0, idx);
  const block = src.slice(idx, blockEnd);
  const after = src.slice(blockEnd);
  const updatedBlock = block.replace('imageReady: false,', 'imageReady: true,');
  if (updatedBlock === block) return; // already true
  await fs.writeFile(CHARACTERS_TS_PATH, before + updatedBlock + after);
  console.log(`  [ok] flipped imageReady → true for ${slug}`);
}

async function main(): Promise<void> {
  const args = parseArgs();

  // Filter profiles
  let targets: CharacterProfile[] = ALL_PROFILES;
  if (args.slug) {
    targets = targets.filter((p) => p.slug === args.slug);
    if (targets.length === 0) {
      console.error(`No profile with slug: ${args.slug}`);
      process.exit(1);
    }
  } else if (!args.force) {
    targets = targets.filter((p) => !p.imageReady);
  }

  console.log(`Iller_Ang renderer — ${targets.length} character(s) to render`);
  console.log(`  out: ${PUBLIC_HAWKS_DIR}`);

  if (targets.length === 0) {
    console.log('Nothing to do. All character art is up to date.');
    return;
  }

  await fs.mkdir(PUBLIC_HAWKS_DIR, { recursive: true });
  const manifest = await loadManifest();
  let succeeded = 0;
  let failed = 0;

  for (const profile of targets) {
    console.log(`\n→ ${profile.callsign} (${profile.slug})`);
    const prompt = buildPromptFor(profile);
    console.log(`  prompt: ${prompt.slice(0, 100)}...`);

    const url = await ideogramGenerate(prompt, profile.slug);
    if (!url) {
      failed++;
      continue;
    }

    const destPath = path.join(PUBLIC_HAWKS_DIR, `${profile.slug}.png`);
    const downloaded = await downloadTo(url, destPath);
    if (!downloaded) {
      console.error(`  [error] download failed`);
      failed++;
      continue;
    }
    console.log(`  [saved] ${destPath}`);

    manifest.push({
      slug: profile.slug,
      callsign: profile.callsign,
      prompt,
      url,
      rendered_at: new Date().toISOString(),
      cost_estimate_usd: 0.04, // Ideogram V3 turbo
    });
    await saveManifest(manifest);

    await flipImageReady(profile.slug);
    succeeded++;
  }

  console.log(`\n═══ Iller_Ang complete ═══`);
  console.log(`  succeeded: ${succeeded}`);
  console.log(`  failed:    ${failed}`);
  console.log(`  manifest:  ${MANIFEST_PATH}`);
  console.log(`  est cost:  $${(succeeded * 0.04).toFixed(2)}`);
}

main().catch((err) => {
  console.error('Renderer crashed:', err);
  process.exit(1);
});
