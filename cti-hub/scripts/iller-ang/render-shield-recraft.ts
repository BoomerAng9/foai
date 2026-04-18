#!/usr/bin/env node
/**
 * Iller_Ang — Shield Division Recraft V4 adapter
 * ================================================
 * Routes a single Shield Division Hawk through Recraft V4 instead of
 * Ideogram V3. Used when a Hawk's persona has rich text-like detail
 * (wordmarks, glyphs, mathematical symbols) that Ideogram garbles.
 *
 * Recraft V4 handles typography better than Ideogram V3 for character
 * designs that reference text-adjacent elements.
 *
 * Uses the same Recraft direct-API pattern as perform/src/lib/images/recraft.ts.
 *
 * Usage:
 *   RECRAFT_API_KEY=... npx tsx scripts/iller-ang/render-shield-recraft.ts --slug lil_peel_hawk
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { CharacterProfile } from '../../src/lib/hawks/characters';
import { ALL_SHIELD_DIVISION_PROFILES } from '../../src/lib/hawks/shield-characters';

const RECRAFT_BASE = 'https://external.api.recraft.ai/v1';
const PUBLIC_DIR = path.resolve(__dirname, '../../public/hawks/shield');
const MANIFEST_PATH = path.resolve(
  __dirname,
  'shield-recraft-manifest.json'
);

interface ManifestEntry {
  slug: string;
  callsign: string;
  prompt: string;
  url: string;
  rendered_at: string;
  model: string;
  cost_estimate_usd: number;
}

function parseArgs(): { slug?: string } {
  const args: { slug?: string } = {};
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '--slug') args.slug = process.argv[++i];
  }
  return args;
}

/**
 * Recraft-tuned prompt for Hex (and future text-forward personas).
 * Key adjustments from the Ideogram prompt:
 * - Species anchor at front
 * - NO wordmark text on chestplate (replaced with "etched geometric patterns")
 * - Platinum palette emphasized up front, not buried in the visualDescription
 * - Proof-obligation glyphs described as "abstract mathematical symbols etched
 *   subtly, no Latin letters"
 */
function buildHexPrompt(profile: CharacterProfile): string {
  return (
    `Anthropomorphic eagle character (not human, not humanoid). ` +
    `Cinematic tactical-realistic character portrait. Platinum-textured ` +
    `armor palette with cyan technical accent lighting. ` +
    `Subject: an eagle-headed tactical operator with brown and white plumage ` +
    `and a sharp hooked yellow beak. Wearing an olive-drab tactical helmet ` +
    `augmented with a cluster of five green night-vision lenses mounted on ` +
    `top (specialized reverse-engineering optics, more than standard). ` +
    `Boom microphone across cheek. Polished platinum chestplate armor — ` +
    `NO WORDMARKS, NO LETTERS, NO TEXT of any kind on the chestplate, just ` +
    `abstract etched geometric patterns suggesting mathematical proof ` +
    `symbols (quantifier marks, lattice diagrams) rendered subtly, not ` +
    `literally. Military chevron patch on right shoulder in platinum. ` +
    `Belt tool-rig with technical pouches. Luminous cyan eyes in ` +
    `analytical mode. Tactical gloves. Background: dim workshop-laboratory ` +
    `with blue-cyan holographic proof-chain visualizations floating in the ` +
    `air behind the subject. Dramatic key lighting from the side, cool ` +
    `cyan fill light. Square framing, production-quality illustrated ` +
    `digital painting style, confident posture. ` +
    `The callsign is "${profile.callsign}" — a formal verifier and malware ` +
    `reverse-engineer for the ACHIEVEMOR Shield Division.`
  );
}

async function recraftGenerate(prompt: string): Promise<string | null> {
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
        model: 'recraftv4',
        size: '1024x1024',
        n: 1,
      }),
      signal: AbortSignal.timeout(120000),
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
  if (!args.slug) {
    console.error('Usage: --slug <hawk_slug>');
    process.exit(1);
  }

  const profile = ALL_SHIELD_DIVISION_PROFILES.find(
    (p) => p.slug === args.slug
  );
  if (!profile) {
    console.error(`No Shield Division profile with slug: ${args.slug}`);
    process.exit(1);
  }

  // For Wave 1 only Hex (lil_peel_hawk) has a tuned Recraft prompt.
  // Add per-Hawk Recraft prompts here as future Hawks need the route.
  const promptBuilders: Record<string, (p: CharacterProfile) => string> = {
    lil_peel_hawk: buildHexPrompt,
  };
  const builder = promptBuilders[args.slug];
  if (!builder) {
    console.error(
      `No Recraft-tuned prompt for slug: ${args.slug}. Add one in render-shield-recraft.ts.`
    );
    process.exit(1);
  }

  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  const manifest = await loadManifest();

  console.log(`→ ${profile.callsign} (${profile.slug}) via Recraft V4`);
  const prompt = builder(profile);
  console.log(`  prompt: ${prompt.slice(0, 110)}...`);

  const url = await recraftGenerate(prompt);
  if (!url) {
    console.error('  [failed]');
    process.exit(1);
  }

  const destPath = path.join(PUBLIC_DIR, `${profile.slug}.png`);
  const downloaded = await downloadTo(url, destPath);
  if (!downloaded) {
    console.error('  [error] download failed');
    process.exit(1);
  }
  console.log(`  [saved] ${destPath}`);

  manifest.push({
    slug: profile.slug,
    callsign: profile.callsign,
    prompt,
    url,
    rendered_at: new Date().toISOString(),
    model: 'recraftv4',
    cost_estimate_usd: 0.04,
  });
  await saveManifest(manifest);

  console.log(`\n═══ Recraft V4 render complete ═══`);
  console.log(`  est cost: $0.04`);
}

main().catch((err) => {
  console.error('Recraft renderer crashed:', err);
  process.exit(1);
});
