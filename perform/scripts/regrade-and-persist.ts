/**
 * scripts/regrade-and-persist.ts
 * ================================
 * Bridges the regrade-engine (file-only output) to perform_players (DB).
 *
 * Why this exists:
 *   regradeAllPlayers() produces a JSON snapshot at
 *   src/lib/draft/regraded-prospects.json. That file is never read by any UI;
 *   it was orphaned. Meanwhile perform_players.tie_tier carried legacy strings
 *   like "Tier 1" / "Tier 2" — drift that the rankings page surfaces verbatim.
 *
 * What it does:
 *   1. Calls regradeAllPlayers() in-process
 *   2. For each prospect, locates the DB row via LOWER(TRIM(name)) + school
 *      (resilient to dedupe normalization)
 *   3. UPDATEs grade, tie_tier (canonical PRIME/A_PLUS/...), tie_grade (label
 *      from seed-grades.ts), projected_round, pillar_* columns
 *   4. Reports unmatched prospects so they can be reviewed manually
 *
 * Idempotent. Safe to re-run.
 */

import postgres from 'postgres';
import * as fs from 'fs';
import { regradeAllPlayers } from '../src/lib/draft/regrade-engine';

const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
}

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 4 });

/** Canonical 9-band scale from @aims/tie-matrix seed-grades.ts. */
function canonicalTierFromScore(score: number): { tier: string; label: string } {
  if (score >= 101) return { tier: 'PRIME',    label: 'PRIME' };
  if (score >= 90)  return { tier: 'A_PLUS',   label: 'A+' };
  if (score >= 85)  return { tier: 'A',        label: 'A' };
  if (score >= 80)  return { tier: 'A_MINUS',  label: 'A-' };
  if (score >= 75)  return { tier: 'B_PLUS',   label: 'B+' };
  if (score >= 70)  return { tier: 'B',        label: 'B' };
  if (score >= 65)  return { tier: 'B_MINUS',  label: 'B-' };
  if (score >= 60)  return { tier: 'C_PLUS',   label: 'C+' };
  return { tier: 'C', label: 'C' };
}

(async () => {
  const start = Date.now();
  console.log('[regrade-persist] running regradeAllPlayers()...');
  const prospects = regradeAllPlayers();
  console.log(`[regrade-persist] ${prospects.length} prospects regraded`);

  // Bulk-fetch DB rows in one query — match by name_normalized + school
  const dbRows = await sql<{ id: number; name: string; school: string; name_normalized: string }[]>`
    SELECT id, name, school, name_normalized FROM perform_players
  `;
  // Build lookup by normalized name + school
  const lookup = new Map<string, { id: number; name: string }>();
  for (const r of dbRows) {
    lookup.set(`${r.name_normalized}|${r.school}`, { id: r.id, name: r.name });
  }
  console.log(`[regrade-persist] indexed ${dbRows.length} DB rows`);

  let matched = 0;
  let unmatched = 0;
  let updated = 0;
  const unmatchedSamples: string[] = [];
  const tierCounts: Record<string, number> = {};

  for (const p of prospects) {
    const key = `${p.name.trim().toLowerCase()}|${p.school}`;
    const dbHit = lookup.get(key);
    if (!dbHit) {
      unmatched++;
      if (unmatchedSamples.length < 10) unmatchedSamples.push(`  ${p.name} @ ${p.school} (rank #${(p as { performRank?: number }).performRank ?? '-'})`);
      continue;
    }
    matched++;

    const { tier, label } = canonicalTierFromScore(p.tieGrade);
    tierCounts[tier] = (tierCounts[tier] ?? 0) + 1;

    try {
      await sql`
        UPDATE perform_players
        SET
          grade                   = ${p.tieGrade},
          tie_tier                = ${tier},
          tie_grade               = ${label},
          projected_round         = ${p.projectedRound},
          pillar_athleticism      = ${p.pillars.athleticism},
          pillar_game_performance = ${p.pillars.gamePerformance},
          pillar_intangibles      = ${p.pillars.intangibles},
          updated_at              = NOW()
        WHERE id = ${dbHit.id}
      `;
      updated++;
      if (updated % 100 === 0) console.log(`[regrade-persist]   ${updated}/${prospects.length} persisted`);
    } catch (err) {
      console.error(`[regrade-persist] UPDATE failed for ${p.name} @ ${p.school}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\n[regrade-persist] matched=${matched} unmatched=${unmatched} updated=${updated}`);
  if (unmatchedSamples.length > 0) {
    console.log('[regrade-persist] sample unmatched (first 10):');
    for (const s of unmatchedSamples) console.log(s);
  }
  console.log('\n[regrade-persist] tier distribution:');
  for (const [tier, count] of Object.entries(tierCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${tier.padEnd(10)} ${count}`);
  }

  // Confirm zero legacy "Tier N" strings remain in the graded set
  const [{ legacy_count }] = await sql<{ legacy_count: number }[]>`
    SELECT COUNT(*)::int AS legacy_count
    FROM perform_players
    WHERE tie_tier ~* '^tier\\s'
  `;
  console.log(`\n[regrade-persist] legacy "Tier N" strings remaining: ${legacy_count}`);

  console.log(`[regrade-persist] elapsed = ${((Date.now() - start) / 1000).toFixed(1)}s`);
  await sql.end();
})();
