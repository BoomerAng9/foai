/**
 * scripts/tie-integrity-check.ts
 * ================================
 * Runs against DATABASE_URL and reports rows where persisted
 * `tie_tier` disagrees with the canonical tier computed from `grade`.
 *
 * Fails loud:
 *   - tie_tier is a legacy label (ELITE / BLUE CHIP / STARTER / SOLID / DEVELOPMENTAL)
 *   - tie_tier doesn't match getGradeForScore(grade).tier
 *   - vertical is missing or unknown
 *
 * Usage:
 *   DATABASE_URL=postgres://... npx tsx scripts/tie-integrity-check.ts
 *
 * Exit code 0 = all rows aligned. Non-zero = drift found.
 */

import postgres from 'postgres';
import { getGradeForScore, type TIETier, type Vertical } from '@aims/tie-matrix';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('[tie-integrity] DATABASE_URL is not set');
  process.exit(1);
}

const VALID_TIERS: ReadonlySet<TIETier> = new Set([
  'PRIME', 'A_PLUS', 'A', 'A_MINUS',
  'B_PLUS', 'B', 'B_MINUS', 'C_PLUS', 'C',
]);

const VALID_VERTICALS: ReadonlySet<Vertical> = new Set([
  'SPORTS', 'WORKFORCE', 'STUDENT', 'CONTRACTOR', 'FOUNDER', 'CREATIVE',
]);

interface Row {
  id: number;
  name: string;
  grade: string | null;
  tie_tier: string | null;
  vertical: string | null;
}

async function main() {
  const sql = postgres(DATABASE_URL!, { ssl: 'require', max: 1 });
  try {
    const rows = (await sql`
      SELECT id, name, grade, tie_tier, vertical
      FROM perform_players
    `) as Row[];

    let checked = 0;
    let tierDrift = 0;
    let verticalDrift = 0;
    let legacyLabel = 0;
    const samples: string[] = [];

    for (const r of rows) {
      checked++;
      const grade = r.grade != null ? parseFloat(r.grade) : null;
      const tier = r.tie_tier as TIETier | null;
      const vertical = r.vertical as Vertical | null;

      if (vertical == null || !VALID_VERTICALS.has(vertical)) {
        verticalDrift++;
        if (samples.length < 10) samples.push(`#${r.id} ${r.name}: vertical='${r.vertical}'`);
        continue;
      }

      if (tier && !VALID_TIERS.has(tier)) {
        legacyLabel++;
        if (samples.length < 10) samples.push(`#${r.id} ${r.name}: legacy tie_tier='${r.tie_tier}'`);
        continue;
      }

      if (grade != null && tier) {
        const expected = getGradeForScore(grade).tier;
        if (expected !== tier) {
          tierDrift++;
          if (samples.length < 10) {
            samples.push(
              `#${r.id} ${r.name}: grade=${grade} → expected ${expected}, got ${tier}`,
            );
          }
        }
      }
    }

    const bad = tierDrift + verticalDrift + legacyLabel;

    console.log('[tie-integrity] Report');
    console.log('──────────────────────');
    console.log(`  checked         : ${checked}`);
    console.log(`  tier drift      : ${tierDrift}`);
    console.log(`  vertical drift  : ${verticalDrift}`);
    console.log(`  legacy labels   : ${legacyLabel}`);
    if (samples.length) {
      console.log('\n  samples:');
      for (const s of samples) console.log(`    - ${s}`);
    }
    console.log('');
    console.log(bad === 0 ? '[tie-integrity] OK — all rows aligned.' : `[tie-integrity] DRIFT — ${bad} rows need attention.`);

    process.exit(bad === 0 ? 0 : 2);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error('[tie-integrity] FAILED:', err);
  process.exit(1);
});
