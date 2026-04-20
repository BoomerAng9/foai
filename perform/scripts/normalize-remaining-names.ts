/**
 * scripts/normalize-remaining-names.ts
 * ======================================
 * One-shot Title Case sweep for all UPPERCASE names in perform_players.
 *
 * The dedupe pass only touched names in collision groups (2,240 of them);
 * single-row uppercase players (e.g., RUEBEN BAIN JR.) didn't get rewritten.
 * This script normalizes those remaining UPPERCASE rows so the entire DB has
 * consistent Title Case display.
 *
 * Preserves: dotted initials (A.J.), suffixes (Jr./Sr./II/III/IV), apostrophes
 * (D'Amari), hyphens (Smith-Marsette).
 *
 * Idempotent. Safe to re-run.
 */

import postgres from 'postgres';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
}

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 4 });

const SUFFIX_KEEPS = new Set(['II', 'III', 'IV', 'V', 'JR', 'SR', 'JR.', 'SR.']);

function toTitleCase(input: string): string {
  if (!input) return input;
  return input
    .split(/(\s+)/)
    .map(token => {
      if (/^\s+$/.test(token)) return token;
      const upper = token.toUpperCase();
      if (SUFFIX_KEEPS.has(upper)) {
        if (upper === 'II' || upper === 'III' || upper === 'IV' || upper === 'V') return upper;
        if (upper === 'JR') return 'Jr';
        if (upper === 'SR') return 'Sr';
        if (upper === 'JR.') return 'Jr.';
        if (upper === 'SR.') return 'Sr.';
      }
      return token
        .split(/([.'\-])/)
        .map(seg => {
          if (/^[.'\-]$/.test(seg)) return seg;
          if (!seg) return seg;
          return seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase();
        })
        .join('');
    })
    .join('');
}

(async () => {
  const start = Date.now();

  // Find all rows where name is fully uppercase (likely from sqwaadrun seed)
  const rows = await sql<{ id: number; name: string }[]>`
    SELECT id, name
    FROM perform_players
    WHERE name = UPPER(name)
      AND name ~ '[A-Z]'  -- skip rows with no letters
  `;
  console.log(`[normalize] found ${rows.length} all-uppercase rows`);

  if (rows.length === 0) {
    console.log('[normalize] nothing to normalize');
    await sql.end();
    return;
  }

  let updated = 0;
  let skipped = 0;
  let errored = 0;
  const samples: string[] = [];

  for (const r of rows) {
    const newName = toTitleCase(r.name);
    if (newName === r.name) { skipped++; continue; }
    if (samples.length < 8) samples.push(`  ${r.name}  →  ${newName}`);

    try {
      await sql`UPDATE perform_players SET name = ${newName}, updated_at = NOW() WHERE id = ${r.id}`;
      updated++;
      if (updated % 500 === 0) console.log(`[normalize]   ${updated} updates applied`);
    } catch (err) {
      errored++;
      if (errored <= 5) console.error(`[normalize] failed id=${r.id} ${r.name} → ${newName}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log('\n[normalize] sample renames:');
  for (const s of samples) console.log(s);
  console.log(`\n[normalize] updated=${updated} skipped=${skipped} errored=${errored}`);
  console.log(`[normalize] elapsed = ${((Date.now() - start) / 1000).toFixed(1)}s`);
  await sql.end();
})();
