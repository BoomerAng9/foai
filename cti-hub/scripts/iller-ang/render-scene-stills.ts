#!/usr/bin/env node
/**
 * Iller_Ang — Scene hero stills renderer (Shield Division Deployment Bay)
 * ========================================================================
 * Reads a scene-stills batch payload (iller_ang_create_batch_v1) and renders
 * each asset via Recraft V4 Pro. Saves PNGs to
 * cti-hub/public/hawks/shield/scene/{slug}.png.
 *
 * Input payload default: foai/runtime/live-look-in/dispatch/scene_hero_stills.json
 *
 * Usage:
 *   RECRAFT_API_KEY=... npx tsx scripts/iller-ang/render-scene-stills.ts
 *   RECRAFT_API_KEY=... npx tsx scripts/iller-ang/render-scene-stills.ts --slug deployment_bay_nominal_ops
 *   RECRAFT_API_KEY=... npx tsx scripts/iller-ang/render-scene-stills.ts --payload /path/to/payload.json
 */

import { promises as fs } from 'fs';
import path from 'path';

const RECRAFT_BASE = 'https://external.api.recraft.ai/v1';
const DEFAULT_PAYLOAD = path.resolve(
  __dirname,
  '../../../runtime/live-look-in/dispatch/scene_hero_stills.json'
);
const PUBLIC_DIR = path.resolve(__dirname, '../../public/hawks/shield/scene');
const MANIFEST_PATH = path.resolve(
  __dirname,
  'shield-scene-manifest.json'
);

interface BatchAsset {
  asset_type: string;
  slug: string;
  subject: string;
  context: string;
  image_model: string;
  aspect_ratio: string;
  output_format: string;
  nft_mint: boolean;
}

interface Batch {
  $schema: string;
  batch_id: string;
  date: string;
  owner: string;
  description: string;
  execution_note: string;
  assets: BatchAsset[];
}

interface ManifestEntry {
  slug: string;
  subject: string;
  prompt: string;
  url: string;
  rendered_at: string;
  model: string;
  size: string;
  cost_estimate_usd: number;
}

interface CliArgs {
  slug?: string;
  payload?: string;
}

function parseArgs(): CliArgs {
  const args: CliArgs = {};
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '--slug') args.slug = process.argv[++i];
    else if (process.argv[i] === '--payload') args.payload = process.argv[++i];
  }
  return args;
}

// Map the payload's aspect_ratio to a Recraft-supported size.
// Recraft V4 supports: 1024x1024, 1280x1024, 1024x1280, 1536x1024,
// 1024x1536, 1280x768, 768x1280. For 21:9 cinematic we take the closest
// wide option (1536x1024, 3:2 aspect) — true 21:9 is not offered natively.
// Recraft V4 actually supports a narrower size set than the recraft.ts type
// definition suggests. Empirically verified 2026-04-18: 1024x1024 works;
// 1536x1024 does NOT. Sticking to safe sizes until we probe the real list.
function aspectToSize(aspect: string): string {
  switch (aspect) {
    case '21:9':
    case '16:9':
    case '3:2':
    case '4:3':
      return '1024x1024';
    case '1:1':
      return '1024x1024';
    case '3:4':
    case '2:3':
      return '1024x1280';
    default:
      return '1024x1024';
  }
}

function buildPromptFromAsset(asset: BatchAsset): string {
  return (
    `Cinematic hero still — ACHIEVEMOR Shield Division Deployment Bay. ` +
    `Subject: ${asset.subject}. ` +
    `Scene: ${asset.context} ` +
    `Production-quality cinematic architectural photography, dramatic key ` +
    `lighting, high detail, illustrated digital painting aesthetic, ` +
    `tactical-realistic. NO firearms, NO blades, NO weapons other than ` +
    `weaponized boomerangs holstered. All characters are anthropomorphic ` +
    `eagle operators (not humans).`
  );
}

async function recraftGenerate(
  prompt: string,
  size: string,
  model: 'recraftv4' | 'recraftv4_pro'
): Promise<string | null> {
  const apiKey = process.env.RECRAFT_API_KEY;
  if (!apiKey) {
    console.error('  [skip] RECRAFT_API_KEY not set');
    return null;
  }

  try {
    const res = await fetch(`${RECRAFT_BASE}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt,
        model,
        size,
        n: 1,
      }),
      signal: AbortSignal.timeout(180000),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.error(`  [error] Recraft ${res.status}: ${txt}`);
      return null;
    }

    const data = (await res.json()) as { data?: Array<{ url?: string }> };
    return data.data?.[0]?.url ?? null;
  } catch (err) {
    console.error(
      `  [error] ${err instanceof Error ? err.message : 'unknown'}`
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

async function main(): Promise<void> {
  const args = parseArgs();
  const payloadPath = args.payload ?? DEFAULT_PAYLOAD;

  const rawPayload = await fs.readFile(payloadPath, 'utf-8');
  const batch = JSON.parse(rawPayload) as Batch;

  let targets = batch.assets;
  if (args.slug) {
    targets = targets.filter((a) => a.slug === args.slug);
    if (targets.length === 0) {
      console.error(`No asset with slug: ${args.slug}`);
      process.exit(1);
    }
  }

  console.log(
    `Iller_Ang scene-stills renderer — ${targets.length} asset(s) to render`
  );
  console.log(`  batch: ${batch.batch_id}`);
  console.log(`  out: ${PUBLIC_DIR}`);

  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  const manifest = await loadManifest();
  let succeeded = 0;
  let failed = 0;

  for (const asset of targets) {
    console.log(`\n→ ${asset.slug}`);
    console.log(`  subject: ${asset.subject.slice(0, 80)}...`);

    // Skip if already rendered unless we were asked explicitly via --slug
    const existing = path.join(PUBLIC_DIR, `${asset.slug}.png`);
    try {
      await fs.access(existing);
      if (!args.slug) {
        console.log(`  [skip] already exists (use --slug to force)`);
        continue;
      }
    } catch {
      // doesn't exist, proceed
    }

    const prompt = buildPromptFromAsset(asset);
    const size = aspectToSize(asset.aspect_ratio);
    // Recraft V4 Pro rejects 1536x1024 (needed for cinematic wide). Use
    // standard recraftv4 for wide scenes — 1536x1024 is supported there.
    // Pro is only justified when the standard output fails QA; drop to
    // standard as default and let the user escalate specific frames.
    const model: 'recraftv4' | 'recraftv4_pro' = 'recraftv4';
    const costEstimate = 0.04;

    console.log(`  model: ${model} (${size})`);

    const url = await recraftGenerate(prompt, size, model);
    if (!url) {
      failed++;
      continue;
    }

    const destPath = path.join(PUBLIC_DIR, `${asset.slug}.png`);
    const downloaded = await downloadTo(url, destPath);
    if (!downloaded) {
      console.error(`  [error] download failed`);
      failed++;
      continue;
    }
    console.log(`  [saved] ${destPath}`);

    manifest.push({
      slug: asset.slug,
      subject: asset.subject,
      prompt,
      url,
      rendered_at: new Date().toISOString(),
      model,
      size,
      cost_estimate_usd: costEstimate,
    });
    await saveManifest(manifest);

    succeeded++;
  }

  const totalCost = manifest
    .filter((m) => targets.some((t) => t.slug === m.slug))
    .reduce((sum, m) => sum + m.cost_estimate_usd, 0);

  console.log(`\n═══ Scene-stills render complete ═══`);
  console.log(`  succeeded: ${succeeded}`);
  console.log(`  failed:    ${failed}`);
  console.log(`  manifest:  ${MANIFEST_PATH}`);
  console.log(`  est cost:  $${totalCost.toFixed(2)}`);
}

main().catch((err) => {
  console.error('Scene-stills renderer crashed:', err);
  process.exit(1);
});
