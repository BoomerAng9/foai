#!/usr/bin/env node
/**
 * Character art generator — Recraft V4
 * ======================================
 * One-off script. Generates 19 character portraits:
 *   - 2 Boomer_Ang visor fixes (ops-ang, cfo-ang) — overwrites
 *     cti-hub/public/agents/{slug}.png
 *   - 17 unique Lil_Hawks — writes to cti-hub/public/hawks/{slug}.png
 *
 * Reads RECRAFT_API_KEY from env. Does not log the key. Aborts if
 * total API calls would exceed 25 (budget guard).
 *
 * Usage:
 *   RECRAFT_API_KEY="$(ssh myclaw-vps 'docker exec openclaw-sop5-openclaw-1 printenv RECRAFT_API_KEY')" \
 *     node cti-hub/scripts/gen-character-art.mjs
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_CTI = path.resolve(__dirname, '..');

const KEY = process.env.RECRAFT_API_KEY;
if (!KEY) {
  console.error('RECRAFT_API_KEY not set');
  process.exit(1);
}

const API_URL = 'https://external.api.recraft.ai/v1/images/generations';
const MODEL = 'recraftv4';
const SIZE = '1024x1024';
const MAX_CALLS = 60;          // 19 images + retries headroom
const DELAY_MS = 4000;         // serialize to respect rate limits
let callCount = 0;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/* ── Prompt suffix applied to every Hawk ── */
const HAWK_SUFFIX =
  ', working port at night, A.I.M.S. shipping containers stacked in background, neon port signage, cyan crane lights overhead, golden accent lighting, illustrated cinematic comic-book style, portrait composition, distinct character identity, NOT a generic chicken hawk';

/* ── Visor rule for Boomer_Angs ── */
const VISOR_RULE =
  'full face mask, neck covered, NO skin visible above the chest plate, solid mirror-black visor obscuring the entire face including the neck';

/* ── Hand-picked Boomer_Ang prompts (the visor fixes) ── */
const BOOMER_ANGS = [
  {
    filename: 'ops-ang.png',
    dir: 'agents',
    style: 'digital_illustration',
    prompt:
      `Ops_Ang, Boomer_Ang Operations Chief, NOC engineer energy, always-watching. ` +
      `Dark tactical Boomer_Ang armor with glowing blue HUD chest plate, tan command coat over armor, arms crossed in authoritative stance. ` +
      `${VISOR_RULE}. ` +
      `Background: operations floor at night with multiple monitors glowing blue and data streams, dark concrete walls, orange accent lighting from alert panels. ` +
      `Illustrated cinematic comic-book style, portrait composition, matches the ACHIEVEMOR Boomer_Ang house style.`,
  },
  {
    filename: 'cfo-ang.png',
    dir: 'agents',
    style: 'digital_illustration',
    prompt:
      `CFO_Ang, Boomer_Ang Chief Financial Officer, every-dollar-tracked, pencil-pusher authority. ` +
      `Pinstripe tactical suit under Boomer_Ang armor, holding a ledger tablet glowing with green ticker data, tan command coat over armor. ` +
      `${VISOR_RULE}. ` +
      `Background: corner office with a wall of monitors showing stock tickers, budget bar charts, and green financial data streams, warm amber accent lighting. ` +
      `Illustrated cinematic comic-book style, portrait composition, matches the ACHIEVEMOR Boomer_Ang house style.`,
  },
];

/* ── 17 Lil_Hawks — visual descriptions lifted verbatim from characters.ts ── */
const LIL_HAWKS = [
  {
    slug: 'lil_guard_hawk',
    desc: 'Chibi armored hawk in red tactical vest with riot shield, yellow hard hat, fierce eyes, perched on an A.I.M.S. shipping container at a port, illustrated cartoon style with cinematic lighting.',
  },
  {
    slug: 'lil_scrapp_hawk',
    desc: 'Chibi armored hawk with green chest core glowing, jetpack on back, captain stripes on shoulders (Squad Lead), fierce determined expression, holding a tactical tablet, port background at night.',
  },
  {
    slug: 'lil_parse_hawk',
    desc: 'Chibi hawk wearing rectangular blue analyst glasses, holding a glowing document scanner, surrounded by holographic markdown text, gentle blue glow, port at night.',
  },
  {
    slug: 'lil_crawl_hawk',
    desc: 'Chibi hawk with eight mechanical spider-leg attachments, amber visor, climbing on a wireframe globe of links, golden trail of URLs behind, port background.',
  },
  {
    slug: 'lil_snap_hawk',
    desc: 'Chibi hawk holding a futuristic camera with magenta lens flare, photographer vest, beret, capturing a glowing screenshot, neon magenta accents, port at night.',
  },
  {
    slug: 'lil_store_hawk',
    desc: 'Chibi hawk standing in front of a glowing cyan vault filled with data crystals, archivist smock, ledger in hand, organized rows of A.I.M.S. containers behind.',
  },
  {
    slug: 'lil_extract_hawk',
    desc: 'Chibi hawk with sniper-style targeting visor, surgical extraction gloves, holding tweezers that pull glowing fields out of a holographic page, orange accents, port at night.',
  },
  {
    slug: 'lil_feed_hawk',
    desc: 'Chibi hawk holding an antenna dish with green RSS bars radiating outward, dispatcher headset, news ticker scrolling around, port background.',
  },
  {
    slug: 'lil_diff_hawk',
    desc: 'Chibi hawk holding two hash tablets glowing orange, magnifying glass over a unified diff, alert bell on belt, focused stare, port background.',
  },
  {
    slug: 'lil_clean_hawk',
    desc: 'Chibi hawk in white lab coat with light-green broom and squeegee, sweeping away ad banners and cookie popups, gleaming clean text behind, port background.',
  },
  {
    slug: 'lil_api_hawk',
    desc: 'Chibi hawk with hacker hoodie in violet, holding a key card with bearer token glow, REST endpoints orbiting around like planets, port at night.',
  },
  {
    slug: 'lil_queue_hawk',
    desc: 'Chibi hawk traffic controller with cyan glow sticks, conveyor belt of glowing job tokens behind, hard hat with priority chevrons, port background.',
  },
  {
    slug: 'lil_sitemap_hawk',
    desc: 'Chibi hawk cartographer with rolled XML sitemap scroll, amber explorer hat, holding a compass that points to glowing URLs, port + warehouse map background.',
  },
  {
    slug: 'lil_stealth_hawk',
    desc: 'Chibi hawk in dark gray ninja outfit, smoke-bomb effect at feet, four ghost-fingerprint silhouettes orbiting (browser profiles), tactical mask, port at night.',
  },
  {
    slug: 'lil_schema_hawk',
    desc: 'Chibi hawk geneticist holding a glowing pink JSON-LD double helix, lab coat with @schema badge, microdata circuits floating around, port lab background.',
  },
  {
    slug: 'lil_pipe_hawk',
    desc: 'Chibi hawk plumber with brown overalls, wrench in hand, copper ETL pipes stretching behind transforming JSON shapes mid-flow, port factory background.',
  },
  {
    slug: 'lil_sched_hawk',
    desc: 'Chibi hawk in railway conductor outfit with purple cap, holding a stopwatch and clipboard with cron schedule, station-clock glow behind, port background.',
  },
];

async function callRecraft(prompt) {
  callCount += 1;
  if (callCount > MAX_CALLS) {
    throw new Error(`Budget guard: exceeded ${MAX_CALLS} API calls`);
  }

  // Recraft V4: do NOT pass a `style` parameter. V4 rejects all V3
  // style names. Let V4 use its native design taste.
  // Verified in reference_recraft_v4_api.md memory.
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      size: SIZE,
      model: MODEL,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Recraft ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  const url = json?.data?.[0]?.url;
  if (!url) {
    throw new Error(`No URL in Recraft response: ${JSON.stringify(json).slice(0, 200)}`);
  }
  return url;
}

async function downloadToPath(url, absPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const arrayBuf = await res.arrayBuffer();
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, Buffer.from(arrayBuf));
}

async function generateOne(label, prompt, outPath, attempt = 1) {
  try {
    const url = await callRecraft(prompt);
    await downloadToPath(url, outPath);
    const s = await fs.stat(outPath);
    console.log(`ok  ${label}  ${(s.size / 1024).toFixed(1)}KB`);
    return { label, ok: true, path: outPath };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Retry on 429 up to twice with exponential backoff
    if (msg.includes('429') && attempt < 3) {
      const backoff = attempt * 8000;
      console.log(`   ${label} 429, retry in ${backoff}ms (attempt ${attempt + 1})`);
      await sleep(backoff);
      return generateOne(label, prompt, outPath, attempt + 1);
    }
    console.log(`err ${label}  ${msg}`);
    return { label, ok: false, error: msg };
  }
}

async function main() {
  const results = [];

  // All 19 images serialized with delay between calls
  const all = [
    ...BOOMER_ANGS.map(b => ({
      label: b.filename,
      prompt: b.prompt,
      outPath: path.join(REPO_CTI, 'public', b.dir, b.filename),
    })),
    ...LIL_HAWKS.map(h => ({
      label: h.slug,
      prompt: `${h.desc}${HAWK_SUFFIX}`,
      outPath: path.join(REPO_CTI, 'public', 'hawks', `${h.slug}.png`),
    })),
  ];

  console.log(`generating ${all.length} images, ${DELAY_MS}ms between calls...`);
  for (let i = 0; i < all.length; i++) {
    const job = all[i];
    results.push(await generateOne(job.label, job.prompt, job.outPath));
    if (i < all.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  const ok = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  console.log('');
  console.log('=== final ===');
  console.log(`generated:   ${ok}/${results.length}`);
  console.log(`failed:      ${failed}`);
  console.log(`api calls:   ${callCount}/${MAX_CALLS}`);
  if (failed > 0) {
    console.log('\nfailures:');
    for (const r of results.filter(x => !x.ok)) {
      console.log(`  - ${r.label}: ${r.error}`);
    }
  }
}

main().catch(err => {
  console.error('FATAL:', err instanceof Error ? err.message : err);
  process.exit(1);
});
