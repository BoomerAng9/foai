/**
 * scripts/grade-ungraded-180.ts
 * ===============================
 * Backfills `grade`, `tie_tier`, `tie_grade` on the 180 rows in
 * perform_players where class_year='2026' AND grade IS NULL. These rows
 * carry legacy tier strings (BLUE CHIP / DEVELOPMENTAL / ELITE / SOLID /
 * STARTER / Tier 4-7) and `projected_round` (1-8, where 8 is the UDFA
 * sentinel below the NFL draft cutoff). They were never processed by the
 * canonical TIE pipeline.
 *
 * Mapping strategy: anchor primarily on projected_round, refine via legacy
 * tier offset. Rounds 1-7 map to the canonical PRIME/A+...C+/C bands;
 * round 8 (UDFA) maps to C with a small offset for the few ELITE/BLUE CHIP
 * legacy values (those probably came from camp-invite seed sources).
 *
 * Idempotent. Run with --dry to preview without writing. After this lands,
 * run scripts/recompute-overall-rank.ts to integrate the newly-graded
 * 180 into the position_rank + overall_rank ordering.
 */

import postgres from 'postgres';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"]*)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const DRY_RUN = process.argv.includes('--dry');
const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 4 });

const ROUND_BASE: Record<number, number> = {
  1: 90, 2: 82, 3: 75, 4: 70, 5: 66, 6: 62, 7: 58, 8: 54,
};

const LEGACY_OFFSET: Record<string, number> = {
  'PRIME':         +4,
  'BLUE CHIP':     +3,
  'ELITE':         +3,
  'A_PLUS':        +2,
  'A':             +1,
  'SOLID':         0,
  'STARTER':       -1,
  'Tier 4':        -1,
  'Tier 5':        -2,
  'Tier 6':        -3,
  'Tier 7':        -4,
  'DEVELOPMENTAL': -3,
};

function canonicalTierFromGrade(score: number): { tier: string; label: string } {
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

function inferGrade(projectedRound: number | null, legacyTier: string | null): number {
  const round = projectedRound ?? 8;
  const base = ROUND_BASE[round] ?? 50;
  const offset = (legacyTier && LEGACY_OFFSET[legacyTier]) ?? 0;
  return Math.max(45, Math.min(95, base + offset));
}

(async () => {
  const start = Date.now();

  type UngradedRow = {
    id: number;
    name: string;
    school: string;
    position: string | null;
    projected_round: number | null;
    legacy_tier: string | null;
    has_graded_twin: boolean;
  };

  // Tag each ungraded row as "stale duplicate" if a graded row exists under
  // the same name_normalized + position. Those are school-spelling variants
  // (Miami vs Miami (FL), Cal vs California, etc.) that migration 010's
  // dedupe missed. Backfilling them would manufacture contradictory data.
  const ungraded = await sql<UngradedRow[]>`
    WITH graded AS (
      SELECT name_normalized, position FROM perform_players
      WHERE class_year='2026' AND grade IS NOT NULL
    )
    SELECT
      u.id, u.name, u.school, u.position, u.projected_round,
      u.tie_tier AS legacy_tier,
      EXISTS (
        SELECT 1 FROM graded g
        WHERE g.name_normalized = u.name_normalized AND g.position = u.position
      ) AS has_graded_twin
    FROM perform_players u
    WHERE u.class_year='2026' AND u.grade IS NULL
    ORDER BY u.projected_round NULLS LAST, u.id
  `;

  const toGrade = ungraded.filter(r => !r.has_graded_twin);
  const staleDupes = ungraded.filter(r => r.has_graded_twin);

  console.log(`[grade-180] mode=${DRY_RUN ? 'DRY-RUN' : 'WRITE'}`);
  console.log(`[grade-180]   ${ungraded.length} total ungraded`);
  console.log(`[grade-180]   ${toGrade.length} unique → backfill grades`);
  console.log(`[grade-180]   ${staleDupes.length} stale duplicates → SKIP (flagged below for owner review)`);

  const tierCounts: Record<string, number> = {};
  let updated = 0;

  for (const row of toGrade) {
    const grade = inferGrade(row.projected_round, row.legacy_tier);
    const { tier, label } = canonicalTierFromGrade(grade);
    tierCounts[tier] = (tierCounts[tier] ?? 0) + 1;

    if (!DRY_RUN) {
      await sql`
        UPDATE perform_players
        SET
          grade      = ${grade.toFixed(1)},
          tie_tier   = ${tier},
          tie_grade  = ${label},
          updated_at = NOW()
        WHERE id = ${row.id}
      `;
    }
    updated++;
    if (updated <= 5 || updated % 50 === 0) {
      console.log(`  [#${row.id}] ${row.name} @ ${row.school} (${row.position ?? '—'}, R${row.projected_round ?? '8'}, legacy=${row.legacy_tier ?? '—'}) → grade=${grade} tier=${tier}`);
    }
  }

  if (staleDupes.length > 0) {
    console.log(`\n[grade-180] STALE DUPLICATES — owner review (delete or merge into graded twin):`);
    for (const d of staleDupes) {
      const twin = await sql<{ id: number; school: string; grade: string; tie_tier: string }[]>`
        SELECT id, school, grade::text AS grade, tie_tier
        FROM perform_players
        WHERE class_year='2026' AND grade IS NOT NULL
          AND name_normalized = ${d.name.trim().toLowerCase()}
          AND position = ${d.position}
        LIMIT 1
      `;
      const tw = twin[0];
      console.log(`  STALE id=${d.id} ${d.name} @ ${d.school} ${d.position} R${d.projected_round}  ↔  KEEP id=${tw?.id ?? '?'} @ ${tw?.school ?? '?'} grade=${tw?.grade ?? '?'} tier=${tw?.tie_tier ?? '?'}`);
    }
  }

  console.log(`\n[grade-180] processed=${updated} (of ${toGrade.length} unique)`);
  console.log(`[grade-180] new tier distribution among the ${toGrade.length} graded:`);
  for (const [tier, count] of Object.entries(tierCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${tier.padEnd(10)} ${count}`);
  }

  if (!DRY_RUN) {
    const [{ remaining }] = await sql<{ remaining: number }[]>`
      SELECT COUNT(*)::int AS remaining
      FROM perform_players
      WHERE class_year='2026' AND grade IS NULL
    `;
    console.log(`\n[grade-180] remaining ungraded 2026 rows after pass: ${remaining}`);

    const [{ legacy_remaining }] = await sql<{ legacy_remaining: number }[]>`
      SELECT COUNT(*)::int AS legacy_remaining
      FROM perform_players
      WHERE class_year='2026'
        AND tie_tier IS NOT NULL
        AND tie_tier NOT IN ('PRIME','A_PLUS','A','A_MINUS','B_PLUS','B','B_MINUS','C_PLUS','C')
    `;
    console.log(`[grade-180] non-canonical tie_tier values still in 2026 class: ${legacy_remaining}`);
  }

  console.log(`[grade-180] elapsed = ${((Date.now() - start) / 1000).toFixed(1)}s`);
  await sql.end();
})();
