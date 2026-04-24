#!/usr/bin/env node
/**
 * Iller_Ang — ACHIEVEMOR Shield Division character art renderer
 * =============================================================
 * Walks the Shield Division character canon
 * (cti-hub/src/lib/hawks/shield-characters.ts) and renders production art
 * for any profile where imageReady is false. Saves PNGs to
 * cti-hub/public/hawks/shield/{slug}.png and updates shield-characters.ts
 * in-place to flip imageReady → true.
 *
 * Mirrors render-hawks.ts exactly — same Ideogram V3 route, same manifest
 * pattern, same idempotent + --force + --slug CLI. Only differences:
 *   - Reads from ALL_SHIELD_DIVISION_PROFILES (not ALL_PROFILES)
 *   - Writes to /public/hawks/shield/ (not /public/hawks/)
 *   - Uses SHIELD_BRAND_PROMPT (tactical-realistic, not port cartoon)
 *   - Manifest at scripts/iller-ang/shield-render-manifest.json
 *
 * Brand reference: project_shield_division_hawk_anatomy.md (memory)
 * Constraint files: cti-hub/config/shield/hawks/*.yml (via foai/chicken-hawk)
 *
 * Usage:
 *   IDEOGRAM_API_KEY=... npx tsx scripts/iller-ang/render-shield-division.ts
 *   IDEOGRAM_API_KEY=... npx tsx scripts/iller-ang/render-shield-division.ts --slug lil_mast_hawk
 *   IDEOGRAM_API_KEY=... npx tsx scripts/iller-ang/render-shield-division.ts --force
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { CharacterProfile } from '../../src/lib/hawks/characters';
import {
  ALL_SHIELD_DIVISION_PROFILES,
  SHIELD_BRAND_PROMPT,
} from '../../src/lib/hawks/shield-characters';

const BASE = 'https://api.ideogram.ai';
const PUBLIC_DIR = path.resolve(__dirname, '../../public/hawks/shield');
const PROFILES_TS_PATH = path.resolve(
  __dirname,
  '../../src/lib/hawks/shield-characters.ts'
);
const MANIFEST_PATH = path.resolve(
  __dirname,
  'shield-render-manifest.json'
);

const COMMON_NEGATIVE =
  'humanoid, human being, human character, person, man, woman, ' +
  'soldier, human face, human skin, human head, ' +
  'firearm, rifle, pistol, gun, weapon of any kind other than boomerang, ' +
  'blade, knife, sword, text artifacts, misspelled text, duplicated letters, ' +
  'watermark, logo distortion, blurry, low quality, deformed, extra limbs, ' +
  'bad anatomy, duplicate, mutated, frame, border, chibi, cartoon, cute';

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
  const gear = profile.gear.length > 0 ? `Gear: ${profile.gear.join(', ')}.` : '';
  // Species anchor leads the prompt. Detail-rich personas (Paranoia, Hex)
  // previously collapsed to humanoid output when SHIELD_BRAND_PROMPT was
  // appended at the end — the persona description outweighed the species
  // signal. Leading with the anchor keeps the species locked.
  return (
    `ANTHROPOMORPHIC EAGLE CHARACTER (not human, not humanoid) — ` +
    `${SHIELD_BRAND_PROMPT} ` +
    `Character identity: ${profile.visualDescription} ${gear} ` +
    `Signature color accent: ${profile.signatureColor}. The character ` +
    `"${profile.callsign}" is the focal point — an anthropomorphic eagle ` +
    `with confident posture and clear silhouette. Production-quality ` +
    `portrait for ACHIEVEMOR Shield Division's Live Look In scene. ` +
    `The subject is an eagle-headed operator, never a human.`
  );
}

async function ideogramGenerate(
  prompt: string,
  slug: string
): Promise<string | null> {
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
    console.error(
      `  [error] ${slug}: ${err instanceof Error ? err.message : 'unknown'}`
    );
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
  const src = await fs.readFile(PROFILES_TS_PATH, 'utf-8');
  const slugMarker = `slug: '${slug}',`;
  const idx = src.indexOf(slugMarker);
  if (idx === -1) {
    console.warn(`  [warn] slug '${slug}' not found in shield-characters.ts`);
    return;
  }
  const blockEnd = src.indexOf('  },', idx);
  if (blockEnd === -1) return;
  const before = src.slice(0, idx);
  const block = src.slice(idx, blockEnd);
  const after = src.slice(blockEnd);
  const updatedBlock = block.replace('imageReady: false,', 'imageReady: true,');
  if (updatedBlock === block) return;
  await fs.writeFile(PROFILES_TS_PATH, before + updatedBlock + after);
  console.log(`  [ok] flipped imageReady → true for ${slug}`);
}

async function main(): Promise<void> {
  const args = parseArgs();

  let targets: CharacterProfile[] = (ALL_SHIELD_DIVISION_PROFILES as any[]).map(p => ({
    ...p,
    rank: 'shield',
    callsign: p.name,
    catchphrase: p.personality,
    imagePath: p.imagePath || `/hawks/shield/${p.slug}.png`,
    imageReady: p.imageReady || false,
    visualDescription: p.visual,
    gear: p.gear || [p.unit],
    signatureColor: p.signatureColor || '#22D3EE'
  }));
  if (args.slug) {
    targets = targets.filter((p) => p.slug === args.slug);
    if (targets.length === 0) {
      console.error(`No Shield Division profile with slug: ${args.slug}`);
      process.exit(1);
    }
  } else if (!args.force) {
    targets = targets.filter((p) => !p.imageReady);
  }

  console.log(
    `Iller_Ang Shield Division renderer — ${targets.length} character(s) to render`
  );
  console.log(`  out: ${PUBLIC_DIR}`);

  if (targets.length === 0) {
    console.log('Nothing to do. All Shield Division character art is up to date.');
    return;
  }

  await fs.mkdir(PUBLIC_DIR, { recursive: true });
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

    const destPath = path.join(PUBLIC_DIR, `${profile.slug}.png`);
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
      cost_estimate_usd: 0.04,
    });
    await saveManifest(manifest);

    await flipImageReady(profile.slug);
    succeeded++;
  }

  console.log(`\n═══ Iller_Ang Shield Division complete ═══`);
  console.log(`  succeeded: ${succeeded}`);
  console.log(`  failed:    ${failed}`);
  console.log(`  manifest:  ${MANIFEST_PATH}`);
  console.log(`  est cost:  $${(succeeded * 0.04).toFixed(2)}`);
}

main().catch((err) => {
  console.error('Shield Division renderer crashed:', err);
  process.exit(1);
});
