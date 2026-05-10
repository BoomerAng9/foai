/**
 * scripts/backfill-player-images.ts
 * ===================================
 * Loops every perform_players row where image_url IS NULL, calls the ESPN
 * public-API resolver, and persists the returned CDN URL. Idempotent — safe
 * to re-run at any point; fresh rows picked up on next pass.
 *
 * Default scope: class_year = '2026' (the active NFL Draft cohort).
 * Pass --all to sweep every row across every class_year.
 *
 * Usage:
 *   tsx scripts/backfill-player-images.ts              # 2026 cohort, live
 *   tsx scripts/backfill-player-images.ts --dry        # print only
 *   tsx scripts/backfill-player-images.ts --all        # every class
 *   tsx scripts/backfill-player-images.ts --limit=200  # cap for testing
 *
 * Uses the same resolver Next.js serves at /api/players/headshot. Runs
 * sequentially with a small delay so ESPN's public API isn't spammed.
 */

import postgres from 'postgres';
import * as fs from 'fs';
import { getPlayerHeadshot } from '../src/lib/players/headshots';

const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
}

const DRY_RUN = process.argv.includes('--dry');
const ALL_CLASSES = process.argv.includes('--all');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;

const REQUEST_DELAY_MS = 120;

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 2 });

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

interface PlayerRow {
  id: number;
  name: string;
  school: string;
  class_year: string | null;
}

async function fetchCandidates(): Promise<PlayerRow[]> {
  if (ALL_CLASSES) {
    const rows = await sql<PlayerRow[]>`
      SELECT id, name, school, class_year
      FROM perform_players
      WHERE image_url IS NULL
        AND name IS NOT NULL
        AND school IS NOT NULL
      ORDER BY overall_rank NULLS LAST, id
      ${LIMIT ? sql`LIMIT ${LIMIT}` : sql``}
    `;
    return rows;
  }
  const rows = await sql<PlayerRow[]>`
    SELECT id, name, school, class_year
    FROM perform_players
    WHERE image_url IS NULL
      AND class_year = '2026'
      AND name IS NOT NULL
      AND school IS NOT NULL
    ORDER BY overall_rank NULLS LAST, id
    ${LIMIT ? sql`LIMIT ${LIMIT}` : sql``}
  `;
  return rows;
}

async function persist(id: number, url: string): Promise<void> {
  if (DRY_RUN) return;
  await sql`
    UPDATE perform_players
    SET image_url = ${url}, updated_at = NOW()
    WHERE id = ${id}
  `;
}

(async () => {
  const t0 = Date.now();
  console.log(`[backfill-images] ${DRY_RUN ? 'DRY RUN' : 'LIVE'} — scope=${ALL_CLASSES ? 'all classes' : '2026'}${LIMIT ? ` limit=${LIMIT}` : ''}`);

  const candidates = await fetchCandidates();
  console.log(`[backfill-images] ${candidates.length} rows missing image_url`);

  let hits = 0;
  let misses = 0;
  let errors = 0;

  for (let i = 0; i < candidates.length; i++) {
    const p = candidates[i];
    try {
      const result = await getPlayerHeadshot(p.name, p.school);
      if (result.url) {
        await persist(p.id, result.url);
        hits++;
      } else {
        misses++;
      }
    } catch (e) {
      errors++;
      console.warn(`[backfill-images] error id=${p.id} ${p.name}:`, (e as Error).message);
    }

    if ((i + 1) % 50 === 0 || i === candidates.length - 1) {
      console.log(`[backfill-images] ${i + 1}/${candidates.length} · hit=${hits} miss=${misses} err=${errors}`);
    }
    await sleep(REQUEST_DELAY_MS);
  }

  console.log(`\n[backfill-images] done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`  hit=${hits} (${((hits / Math.max(candidates.length, 1)) * 100).toFixed(1)}%)`);
  console.log(`  miss=${misses}`);
  console.log(`  err=${errors}`);

  await sql.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
