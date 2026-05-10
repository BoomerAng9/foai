/**
 * scripts/audit-top-300.ts
 * ==========================
 * Read-only validation that every 2026 prospect in the top 300 has a
 * complete display record: grade, tie_tier, tie_grade, scouting_summary.
 * Reports offenders grouped by failure type. Exits 1 if any HARD failure.
 *
 * Run: npx tsx scripts/audit-top-300.ts
 */

import postgres from 'postgres';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
}

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 2 });

const CANONICAL_TIERS = new Set([
  'PRIME', 'A_PLUS', 'A', 'A_MINUS', 'B_PLUS', 'B', 'B_MINUS', 'C_PLUS', 'C',
]);

interface PlayerRow {
  id: number;
  name: string;
  school: string;
  position: string;
  overall_rank: number | null;
  grade: string | null;
  tie_tier: string | null;
  tie_grade: string | null;
  scouting_summary: string | null;
  nfl_comparison: string | null;
  class_year: string | null;
}

(async () => {
  const top300 = await sql<PlayerRow[]>`
    SELECT id, name, school, position, overall_rank, grade, tie_tier,
           tie_grade, scouting_summary, nfl_comparison, class_year
    FROM perform_players
    WHERE class_year = '2026'
      AND overall_rank IS NOT NULL
      AND overall_rank <= 300
    ORDER BY overall_rank ASC
  `;
  console.log(`[audit] checking ${top300.length} rows (class_year=2026, overall_rank<=300)`);

  const missingGrade: PlayerRow[] = [];
  const missingTier: PlayerRow[] = [];
  const nonCanonicalTier: PlayerRow[] = [];
  const missingTieGrade: PlayerRow[] = [];
  const missingSummary: PlayerRow[] = [];
  const missingNflComp: PlayerRow[] = [];

  for (const p of top300) {
    if (p.grade == null) missingGrade.push(p);
    if (p.tie_tier == null) {
      missingTier.push(p);
    } else if (!CANONICAL_TIERS.has(p.tie_tier)) {
      nonCanonicalTier.push(p);
    }
    if (p.tie_grade == null) missingTieGrade.push(p);
    if (!p.scouting_summary || p.scouting_summary.trim().length < 10) missingSummary.push(p);
    if (!p.nfl_comparison) missingNflComp.push(p);
  }

  const hardFails = missingGrade.length + missingTier.length + nonCanonicalTier.length + missingTieGrade.length;
  const softFails = missingSummary.length + missingNflComp.length;

  function preview(list: PlayerRow[], max = 8): string {
    return list.slice(0, max)
      .map(p => `    #${String(p.overall_rank).padEnd(3)} id=${p.id} ${p.name} @ ${p.school} [${p.position}]`)
      .join('\n');
  }

  console.log(`\n[audit] HARD failures (block ship):`);
  console.log(`  missing grade:           ${missingGrade.length}`);
  if (missingGrade.length > 0) console.log(preview(missingGrade));
  console.log(`  missing tie_tier:        ${missingTier.length}`);
  if (missingTier.length > 0) console.log(preview(missingTier));
  console.log(`  non-canonical tie_tier:  ${nonCanonicalTier.length}`);
  if (nonCanonicalTier.length > 0) {
    console.log(preview(nonCanonicalTier));
    const bad = new Set(nonCanonicalTier.map(p => p.tie_tier));
    console.log(`    non-canonical values: ${[...bad].join(', ')}`);
  }
  console.log(`  missing tie_grade:       ${missingTieGrade.length}`);
  if (missingTieGrade.length > 0) console.log(preview(missingTieGrade));

  console.log(`\n[audit] SOFT failures (display fallback acceptable):`);
  console.log(`  missing scouting_summary: ${missingSummary.length}`);
  if (missingSummary.length > 0 && missingSummary.length <= 20) console.log(preview(missingSummary));
  console.log(`  missing nfl_comparison:   ${missingNflComp.length}`);

  console.log(`\n[audit] summary: hard=${hardFails} soft=${softFails} of ${top300.length} top-300 rows`);

  if (hardFails > 0) {
    console.error(`\n[audit] ❌ ${hardFails} hard failures — run regrade-and-persist on the offending IDs`);
    const offenderIds = [
      ...new Set([
        ...missingGrade.map(p => p.id),
        ...missingTier.map(p => p.id),
        ...nonCanonicalTier.map(p => p.id),
        ...missingTieGrade.map(p => p.id),
      ]),
    ].sort((a, b) => a - b);
    console.error(`[audit] offender IDs: ${offenderIds.join(', ')}`);
    process.exitCode = 1;
  } else {
    console.log(`\n[audit] ✅ all top-300 rows have complete grading`);
  }

  await sql.end();
})();
