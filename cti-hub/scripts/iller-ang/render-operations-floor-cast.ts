#!/usr/bin/env node
/**
 * Iller_Ang — Operations Floor Cast Recraft V4 renderer
 * ======================================================
 * Routes Port_Ang ("Docker") and LUC through Recraft V4. Both are
 * new characters for the "Run a Company, Without the Company" vertical
 * 3D Operations Floor — Gate 1.5 deliverable.
 *
 * Prompts pulled verbatim from the character bibles in the live-look-in
 * skill references:
 *   - aims-core/aims-skills/skills/live-look-in/references/characters/port_ang.md
 *   - aims-core/aims-skills/skills/live-look-in/references/characters/luc.md
 *
 * Same API pattern as render-shield-recraft.ts. Output drops to
 * cti-hub/public/agents/ to match the existing Boomer_Ang roster
 * convention (scout-ang.png, content-ang.png, etc.).
 *
 * Usage:
 *   RECRAFT_API_KEY=... npx tsx scripts/iller-ang/render-operations-floor-cast.ts --slug port_ang
 *   RECRAFT_API_KEY=... npx tsx scripts/iller-ang/render-operations-floor-cast.ts --slug luc
 *   RECRAFT_API_KEY=... npx tsx scripts/iller-ang/render-operations-floor-cast.ts --all
 */

import { promises as fs } from 'fs';
import path from 'path';

const RECRAFT_BASE = 'https://external.api.recraft.ai/v1';
const PUBLIC_DIR = path.resolve(__dirname, '../../public/agents');
const MANIFEST_PATH = path.resolve(
  __dirname,
  'operations-floor-cast-manifest.json'
);

interface ManifestEntry {
  slug: string;
  callsign: string;
  prompt: string;
  url: string;
  rendered_at: string;
  model: string;
  size: string;
  cost_estimate_usd: number;
}

type CastSlug =
  | 'port_ang'
  | 'luc'
  | 'picker_ang'
  | 'code_ang'
  | 'ops_ang'
  | 'cfo_ang';

function parseArgs(): { slug?: CastSlug; all?: boolean } {
  const args: { slug?: CastSlug; all?: boolean } = {};
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--slug') args.slug = process.argv[++i] as CastSlug;
    if (arg === '--all') args.all = true;
  }
  return args;
}

/**
 * Port_Ang ("Docker") — Operations PMO dispatcher.
 * Bible: aims-core/aims-skills/skills/live-look-in/references/characters/port_ang.md
 * Family: Boomer_Ang tactical grammar (hoodie + mask + visor) with
 * cyan palette distinguishing Operations PMO from executive orange.
 * Trademark lock: no whales, no ocean, no Docker Inc. mascot shapes.
 */
function buildPortAngPrompt(): string {
  return (
    `Full-body character portrait on transparent background. ACHIEVEMOR ` +
    `tactical-holographic Boomer_Ang named Port_Ang, nicknamed Docker — ` +
    `Operations PMO dispatcher. Standing pose, feet shoulder-width, body ` +
    `facing forward, grounded ready stance. Masculine build, solid frame. ` +
    `Outfit from head to toe: Black tactical zip hoodie with hood up, ` +
    `reinforced shoulder stitching. Matte black lower-face tactical mask ` +
    `covering nose and mouth. Integrated LED visor across the eye line ` +
    `glowing cyan color #00BCD4, displaying the word "PORT" in crisp ` +
    `cyan LED block letters, four evenly-spaced letters, fully legible. ` +
    `Cyan color #00BCD4 embroidered-patch on right chest reading "OPS" ` +
    `in three clean sans-serif letters. Black tactical utility vest worn ` +
    `over the hoodie with two chest cargo pockets and a lower webbing ` +
    `row. Black cargo joggers with reinforced knee panels, cuffed at ` +
    `ankle. Black tactical high-top boots, lace-up, non-branded. Black ` +
    `tactical gloves, full-finger, knuckle-reinforced. Carrying a ` +
    `floating holographic port manifest held in both hands at waist ` +
    `height — translucent cyan hex-grid display panel, no solid frame, ` +
    `shows small cyan waypoint nodes connected by thin cyan lines and ` +
    `crisp cyan alphanumeric container IDs (only 3-4 short labels, all ` +
    `fully legible — avoid microscopic garbled micro-text). Subtle cyan ambient glow on ` +
    `shoulders, chest patch, and manifest. Color palette: black base, ` +
    `cyan color #00BCD4 accent, silver hardware highlights. No orange. ` +
    `No gold. No yellow high-visibility. No branded logos. No whales. ` +
    `No ocean imagery. No rounded-blue mascot shapes. No shipping ` +
    `container stacks. No Docker Inc. trademarks. Style: cinematic ` +
    `studio portrait, tactical-holographic, high contrast, clean cutout ` +
    `ready for compositing. Matches ACHIEVEMOR Boomer_Ang family visual ` +
    `grammar but with Operations PMO cyan palette instead of executive ` +
    `orange or creative orange. Transparent background (PNG cutout).`
  );
}

/**
 * LUC — Locale Universal Calculator personified.
 * Bible: aims-core/aims-skills/skills/live-look-in/references/characters/luc.md
 * Grammar departures from Boomer_Ang family: coat (not hoodie),
 * math-surface face (not visor), register plate (not embroidered patch).
 * Signals "infrastructure personified," not executive peer.
 */
function buildLucPrompt(): string {
  return (
    `Full-body character portrait on transparent background. ACHIEVEMOR ` +
    `platform-infrastructure character named LUC — Locale Universal ` +
    `Calculator personified, the platform's calculation engine made ` +
    `visible. Standing pose, feet shoulder-width, body facing forward, ` +
    `composed institutional stance. Ungendered silhouette. Outfit from ` +
    `head to toe: Hood up over head, hood shape formal and clean. No ` +
    `visible face. Where the face would be is a live mathematical ` +
    `surface: a rectangular panel of softly glowing gold color #D4AF37 ` +
    `LED-style digits and financial symbols. Legible symbols include ` +
    `dollar signs, percentage symbols, K1, VAT, ledger coefficients ` +
    `like 0.087, and slowly coalescing expressions. The acronyms ` +
    `"VAT" (spelled V-A-T) and "K1" (spelled K-one) must appear fully ` +
    `legible and correctly spelled. No eyes, no mouth, ` +
    `no human facial features at all — the math surface fully replaces ` +
    `the face. Black tactical long-coat, double-breasted structured ` +
    `shoulders, cinched waist, extends to mid-thigh length (not a ` +
    `hoodie — longer and more formal). Flat gold color #D4AF37 ` +
    `register plate on right chest reading "LUC" in clean slab-serif ` +
    `or monospace type, centered on the plate, styled like a ` +
    `bank-of-record plate or currency stamp (not an embroidered ` +
    `patch). Black tailored trousers, straight cut, clean hem. ` +
    `Polished black oxford or cap-toe derby shoes, non-branded. Black ` +
    `formal gloves, full-finger, clean without tactical reinforcement. ` +
    `Carrying a floating gold-framed holographic ledger held between ` +
    `both hands at waist height — rectangular golden frame around a ` +
    `translucent surface displaying active calculation rows, ledger ` +
    `columns, and a small running-totals sidebar. Ledger text uses the ` +
    `same muted gold color #D4AF37 as the face surface. Subtle gold ` +
    `ambient light on shoulders, register plate, and ledger frame. ` +
    `Color palette: black base, muted gold color #D4AF37 accent. No ` +
    `orange (specifically not the #FF6B00 orange used elsewhere in the ` +
    `brand). No cyan. No brown. No green accountant's eyeshade. No red ` +
    `ink. Style: cinematic studio portrait, institutional-holographic, ` +
    `high contrast, clean cutout ready for compositing. ` +
    `Infrastructure-personified feel — present, composed, quiet, ` +
    `precise. Distinct from ACHIEVEMOR Boomer_Ang executive characters. ` +
    `Transparent background (PNG cutout).`
  );
}

/**
 * Picker_Ang — RFP→BAMARAM Step-3 capability router.
 * Existing portrait had bare face + beard visible (violates canonical
 * "no human face" Boomer_Ang rule). Regen enforces full face coverage
 * via hood + lower-face tactical mask + full visor, preserves the
 * gold palette that was already established for this character.
 */
function buildPickerAngPrompt(): string {
  return (
    `Cinematic photoreal studio portrait on transparent background. ` +
    `ACHIEVEMOR Boomer_Ang named Picker_Ang — Step-3 capability router ` +
    `and Bill-of-Materials composer. Standing pose, body facing forward, ` +
    `composed analyst stance. NO HUMAN FACE MAY BE VISIBLE. Head ` +
    `completely covered: black hood up over the head, matte black ` +
    `lower-face tactical mask covering nose, mouth, and jaw entirely ` +
    `(absolutely no beard, no chin, no cheeks, no skin visible below ` +
    `the eyes). Integrated LED visor across the eye line glowing gold ` +
    `color #D4AF37, displaying the word "PICK" in crisp gold LED block ` +
    `letters, four evenly-spaced letters, fully legible. Gold color ` +
    `#D4AF37 embroidered ANG chest patch on right chest in three clean ` +
    `sans-serif letters. Black tailored tactical overcoat or tunic with ` +
    `subtle gold circuit-line embroidery accents. Black tactical gloves. ` +
    `Background: dark obsidian environment with faint gold holographic ` +
    `capability-catalog panels floating at depth (abstract icon nodes, ` +
    `no readable text). Color palette: black base, gold #D4AF37 accent, ` +
    `silver hardware highlights. Matches ACHIEVEMOR Boomer_Ang family ` +
    `visual grammar. No face visible, no beard, no bare skin, no human ` +
    `features whatsoever below the visor. No orange. No cyan. Transparent ` +
    `background (PNG cutout). Square 1:1 framing.`
  );
}

/**
 * Code_Ang — engineering / codebase specialist.
 * Existing portrait was anime-styled with visible face and bare neck.
 * Regen switches to photoreal canon AND enforces face coverage.
 * Preserves teal/green developer palette.
 */
function buildCodeAngPrompt(): string {
  return (
    `Cinematic photoreal studio portrait on transparent background. ` +
    `ACHIEVEMOR Boomer_Ang named Code_Ang — engineering and codebase ` +
    `specialist. Standing pose, body facing forward, coder-ready stance. ` +
    `NO HUMAN FACE MAY BE VISIBLE. Head completely covered: hood up, ` +
    `matte black lower-face tactical mask covering nose, mouth, cheeks, ` +
    `and jaw entirely (absolutely no skin visible anywhere on the face ` +
    `or neck below the visor). Integrated LED visor across the eye line ` +
    `glowing teal-green color #14B8A6, displaying the word "CODE" in ` +
    `crisp teal LED block letters, four evenly-spaced letters, fully ` +
    `legible. Teal-green color #14B8A6 embroidered ANG chest patch on ` +
    `right chest in three clean sans-serif letters. Black tactical zip ` +
    `hoodie, hood up over head. Forearm sleeve with integrated teal ` +
    `code-display accent. Black tactical gloves. Background: dark ` +
    `obsidian environment with faint teal holographic code-grid panels ` +
    `floating at depth (no readable text in background). Color palette: ` +
    `black base, teal-green #14B8A6 accent, silver hardware highlights. ` +
    `Matches ACHIEVEMOR Boomer_Ang family visual grammar. No face visible, ` +
    `no exposed neck, no human features whatsoever. Not anime, not ` +
    `illustrated — photoreal studio rendering. No orange. No gold. ` +
    `No cyan. Transparent background (PNG cutout). Square 1:1 framing.`
  );
}

/**
 * Ops_Ang — Platform Operations Chief (Boomer_COO).
 * Existing portrait was faceless-compliant BUT rendered in illustrated
 * comic-book style. Regen switches to photoreal canon while preserving
 * the distinctive black-visored tactical-armored silhouette and the
 * operations-floor monitor backdrop.
 */
function buildOpsAngPrompt(): string {
  return (
    `Cinematic photoreal studio portrait on transparent background. ` +
    `ACHIEVEMOR Boomer_Ang named Ops_Ang — Platform Operations Chief. ` +
    `Standing composed stance, arms crossed at chest, commanding ` +
    `operational presence. Head completely covered by a fully opaque ` +
    `black tactical helmet with an integrated dark visor wrapping the ` +
    `eye line — no face, no skin, no eyes visible. Heavy tactical ` +
    `armor plate carrier over a muted khaki-and-black field jacket with ` +
    `ops-chief insignia, center chest plate housing a small holographic ` +
    `ops-status display (a few legible status pills reading "UPTIME" ` +
    `and "ALERTS" in small type). Black tactical pants, black tactical ` +
    `boots, black tactical gloves. Background: ops-floor control room ` +
    `at low-light, banks of blue holographic monitors showing ` +
    `network topology graphs and status dashboards (abstract, no ` +
    `readable microcopy), warm amber industrial overhead lighting. ` +
    `Color palette: black base, muted khaki accent, blue monitor glow ` +
    `behind, silver armor plate highlights. Matches ACHIEVEMOR ` +
    `Boomer_Ang family visual grammar. No face visible. PHOTOREAL ` +
    `cinematic studio rendering, not illustrated, not comic-book, ` +
    `not hand-drawn. Transparent background (PNG cutout). Square 1:1 ` +
    `framing.`
  );
}

/**
 * CFO_Ang — Chief Financial Officer persona.
 * Existing portrait was faceless-compliant BUT rendered in illustrated
 * comic-book style. Regen switches to photoreal canon while preserving
 * the silver-helmet finance-trader silhouette and market-ticker backdrop.
 */
function buildCfoAngPrompt(): string {
  return (
    `Cinematic photoreal studio portrait on transparent background. ` +
    `ACHIEVEMOR Boomer_Ang named CFO_Ang — Chief Financial Officer. ` +
    `Standing composed stance, holding a translucent financial tablet ` +
    `at chest height. Head completely covered by a fully opaque silver-` +
    `chrome tactical helmet with an integrated dark visor wrapping the ` +
    `eye line — no face, no skin, no eyes visible. Silver armored plate ` +
    `carrier over a black tailored tactical jacket, structured shoulders, ` +
    `subtle pinstripe accent on inner lining. Tablet in hands displays ` +
    `legible financial summary (a short list of ticker symbols and ` +
    `dollar amounts, clean sans-serif type, nothing garbled). Black ` +
    `tactical pants, polished black boots, black formal gloves. ` +
    `Background: finance ops room at low-light with several large ` +
    `stock-market ticker boards showing abstract ticker rows and candle ` +
    `charts (no readable microcopy required), warm golden industrial ` +
    `lighting. Color palette: silver base, black accent, gold highlight, ` +
    `subtle green-and-red market-ticker background tones. Matches ` +
    `ACHIEVEMOR Boomer_Ang family visual grammar. No face visible. ` +
    `PHOTOREAL cinematic studio rendering, not illustrated, not ` +
    `comic-book, not hand-drawn. Transparent background (PNG cutout). ` +
    `Square 1:1 framing.`
  );
}

const CAST: Record<
  CastSlug,
  { callsign: string; builder: () => string; filename: string }
> = {
  port_ang: {
    callsign: 'Port_Ang',
    builder: buildPortAngPrompt,
    filename: 'port-ang.png',
  },
  luc: {
    callsign: 'LUC',
    builder: buildLucPrompt,
    filename: 'luc.png',
  },
  picker_ang: {
    callsign: 'Picker_Ang',
    builder: buildPickerAngPrompt,
    filename: 'picker-ang.png',
  },
  code_ang: {
    callsign: 'Code_Ang',
    builder: buildCodeAngPrompt,
    filename: 'code-ang.png',
  },
  ops_ang: {
    callsign: 'Ops_Ang',
    builder: buildOpsAngPrompt,
    filename: 'ops-ang.png',
  },
  cfo_ang: {
    callsign: 'CFO_Ang',
    builder: buildCfoAngPrompt,
    filename: 'cfo-ang.png',
  },
};

async function recraftGenerate(prompt: string): Promise<string | null> {
  const apiKey = process.env.RECRAFT_API_KEY;
  if (!apiKey) {
    console.error('[error] RECRAFT_API_KEY env var missing');
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
        size: '1024x1024', // Recraft V4 supported; deploy-landing card grid crops via aspect-[4/3] object-cover object-top
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

async function renderOne(slug: CastSlug): Promise<boolean> {
  const entry = CAST[slug];
  const prompt = entry.builder();

  console.log(`→ ${entry.callsign} (${slug}) via Recraft V4`);
  console.log(`  prompt: ${prompt.slice(0, 110)}...`);

  const url = await recraftGenerate(prompt);
  if (!url) {
    console.error('  [failed]');
    return false;
  }

  const destPath = path.join(PUBLIC_DIR, entry.filename);
  const downloaded = await downloadTo(url, destPath);
  if (!downloaded) {
    console.error('  [error] download failed');
    return false;
  }
  console.log(`  [saved] ${destPath}`);

  const manifest = await loadManifest();
  manifest.push({
    slug,
    callsign: entry.callsign,
    prompt,
    url,
    rendered_at: new Date().toISOString(),
    model: 'recraftv4',
    size: '1024x1024',
    cost_estimate_usd: 0.04,
  });
  await saveManifest(manifest);

  return true;
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (!args.slug && !args.all) {
    console.error(
      'Usage: --slug port_ang|luc OR --all\n' +
        'Env:   RECRAFT_API_KEY=<key>'
    );
    process.exit(1);
  }

  await fs.mkdir(PUBLIC_DIR, { recursive: true });

  const slugs: CastSlug[] = args.all
    ? (Object.keys(CAST) as CastSlug[])
    : [args.slug as CastSlug];

  if (!args.all && !CAST[args.slug as CastSlug]) {
    console.error(
      `No Operations Floor cast entry with slug: ${args.slug}. Valid: ${Object.keys(CAST).join(', ')}`
    );
    process.exit(1);
  }

  let successCount = 0;
  for (const slug of slugs) {
    const ok = await renderOne(slug);
    if (ok) successCount++;
  }

  console.log(`\n═══ Operations Floor cast render complete ═══`);
  console.log(`  rendered: ${successCount}/${slugs.length}`);
  console.log(`  est cost: $${(successCount * 0.04).toFixed(2)}`);

  if (successCount < slugs.length) process.exit(1);
}

main().catch((err) => {
  console.error('Operations Floor cast renderer crashed:', err);
  process.exit(1);
});
