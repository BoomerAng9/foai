/**
 * scripts/regrade-from-attributes.ts
 * ====================================
 * For every perform_players row that has attribute_ratings populated,
 * recompute the TIE grade + tier via the Madden/2K-style rollup engine
 * (lib/tie/rollup.ts). Writes grade, tie_tier, tie_grade.
 *
 * Preserves grades for the 2,400+ players who don't yet have sheets —
 * only seeded players get the rollup-based grade.
 *
 * After this script, run recompute-overall-rank.ts to reassign ranks
 * from fresh grades.
 *
 * Idempotent.
 */

import postgres from 'postgres';
import * as fs from 'fs';
import { rollupAttributes } from '../src/lib/tie/rollup';

const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
}

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 4 });

interface PlayerRow {
  id: number;
  name: string;
  school: string;
  position: string;
  attribute_ratings: Record<string, number>;
  grade: string | null;
  versatility_flex: string | null;
  prime_sub_tags: string[] | null;
}

function tieLabelFromScore(s: number): { tier: string; label: string } {
  if (s >= 101) return { tier: 'PRIME',    label: 'PRIME' };
  if (s >= 90)  return { tier: 'A_PLUS',   label: 'A+' };
  if (s >= 85)  return { tier: 'A',        label: 'A' };
  if (s >= 80)  return { tier: 'A_MINUS',  label: 'A-' };
  if (s >= 75)  return { tier: 'B_PLUS',   label: 'B+' };
  if (s >= 70)  return { tier: 'B',        label: 'B' };
  if (s >= 65)  return { tier: 'B_MINUS',  label: 'B-' };
  if (s >= 60)  return { tier: 'C_PLUS',   label: 'C+' };
  return { tier: 'C', label: 'C' };
}

(async () => {
  const t0 = Date.now();
  const rows = await sql<PlayerRow[]>`
    SELECT id, name, school, position, attribute_ratings, grade, versatility_flex, prime_sub_tags
    FROM perform_players
    WHERE attribute_ratings IS NOT NULL
      AND class_year = '2026'
    ORDER BY id
  `;
  console.log(`[regrade-attr] ${rows.length} players with attribute sheets`);

  let updated = 0;
  const deltas: Array<{ name: string; from: number; to: number }> = [];
  for (const r of rows) {
    const result = rollupAttributes(r.attribute_ratings, r.position, {
      versatility: (r.versatility_flex ?? undefined) as any,
      primeSubTags: (r.prime_sub_tags ?? undefined) as any,
    });
    const newScore = result.tie.score;
    const { tier, label } = tieLabelFromScore(newScore);
    const prev = r.grade ? parseFloat(r.grade) : 0;
    await sql`
      UPDATE perform_players
      SET grade     = ${newScore.toFixed(1)},
          tie_tier  = ${tier},
          tie_grade = ${label},
          pillar_game_performance = ${result.pillars.performance},
          pillar_athleticism      = ${result.pillars.attributes},
          pillar_intangibles      = ${result.pillars.intangibles},
          updated_at = NOW()
      WHERE id = ${r.id}
    `;
    updated++;
    deltas.push({ name: r.name, from: prev, to: newScore });
  }

  deltas.sort((a, b) => (b.to - b.from) - (a.to - a.from));
  console.log('\n[regrade-attr] biggest gains:');
  for (const d of deltas.slice(0, 10)) {
    const delta = d.to - d.from;
    const sign = delta >= 0 ? '+' : '';
    console.log(`  ${d.name.padEnd(26)} ${d.from.toFixed(1)} → ${d.to.toFixed(1)}  (${sign}${delta.toFixed(1)})`);
  }
  console.log('\n[regrade-attr] biggest drops:');
  for (const d of deltas.slice(-5)) {
    const delta = d.to - d.from;
    const sign = delta >= 0 ? '+' : '';
    console.log(`  ${d.name.padEnd(26)} ${d.from.toFixed(1)} → ${d.to.toFixed(1)}  (${sign}${delta.toFixed(1)})`);
  }

  console.log(`\n[regrade-attr] updated=${updated}/${rows.length} elapsed=${((Date.now()-t0)/1000).toFixed(1)}s`);
  await sql.end();
})().catch(e => { console.error(e); process.exit(1); });
