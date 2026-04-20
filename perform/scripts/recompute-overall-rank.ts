/**
 * scripts/recompute-overall-rank.ts
 * ===================================
 * Recomputes overall_rank and position_rank from current grade values.
 *
 * Why this exists:
 *   After dedupe + regrade, ranks need to be reassigned. The old data had
 *   ties (#5/#7 collisions) because two rows shared a rank. Now uses
 *   ROW_NUMBER() so every player gets a unique rank, ordered by grade DESC,
 *   ties broken by position value (QB > EDGE > OT > CB > WR > S > DT/DL >
 *   TE/LB > RB/OG > C > K/P/LS), then by name for full determinism.
 *
 * Idempotent.
 */

import postgres from 'postgres';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
}

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 4 });

(async () => {
  const start = Date.now();

  console.log('[rank] recomputing overall_rank for graded 2026 prospects...');
  // Use a CTE + UPDATE FROM to assign ranks atomically
  const overallResult = await sql.unsafe(`
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          ORDER BY
            grade DESC NULLS LAST,
            CASE position
              WHEN 'QB'   THEN 1
              WHEN 'EDGE' THEN 2
              WHEN 'OT'   THEN 3
              WHEN 'CB'   THEN 4
              WHEN 'WR'   THEN 5
              WHEN 'S'    THEN 6
              WHEN 'DT'   THEN 7
              WHEN 'DL'   THEN 7
              WHEN 'TE'   THEN 8
              WHEN 'LB'   THEN 8
              WHEN 'RB'   THEN 9
              WHEN 'OG'   THEN 9
              WHEN 'C'    THEN 10
              ELSE 99
            END ASC,
            LOWER(name) ASC
        ) AS new_rank
      FROM perform_players
      WHERE grade IS NOT NULL
        AND class_year = '2026'
    )
    UPDATE perform_players p
    SET overall_rank = r.new_rank,
        updated_at = NOW()
    FROM ranked r
    WHERE p.id = r.id
      AND (p.overall_rank IS DISTINCT FROM r.new_rank)
    RETURNING p.id
  `);
  console.log(`[rank] overall_rank updated rows: ${overallResult.length}`);

  console.log('[rank] recomputing position_rank by position...');
  const positionResult = await sql.unsafe(`
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY position
          ORDER BY
            grade DESC NULLS LAST,
            LOWER(name) ASC
        ) AS new_pos_rank
      FROM perform_players
      WHERE grade IS NOT NULL
        AND class_year = '2026'
    )
    UPDATE perform_players p
    SET position_rank = r.new_pos_rank,
        updated_at = NOW()
    FROM ranked r
    WHERE p.id = r.id
      AND (p.position_rank IS DISTINCT FROM r.new_pos_rank)
    RETURNING p.id
  `);
  console.log(`[rank] position_rank updated rows: ${positionResult.length}`);

  // Verify uniqueness — no two rows share an overall_rank now
  const dups = await sql<{ overall_rank: number; n: number }[]>`
    SELECT overall_rank, COUNT(*)::int AS n
    FROM perform_players
    WHERE overall_rank IS NOT NULL
    GROUP BY overall_rank
    HAVING COUNT(*) > 1
    LIMIT 5
  `;
  if (dups.length === 0) {
    console.log('[rank] verified: overall_rank is unique across all rows ✅');
  } else {
    console.error(`[rank] WARN: ${dups.length} overall_rank duplicates remain (expected 0):`);
    for (const d of dups) console.error(`  rank ${d.overall_rank}: ${d.n} rows`);
    process.exitCode = 1;
  }

  // Top 10 preview
  console.log('\n[rank] top 10 after recompute:');
  const top = await sql`
    SELECT overall_rank, position_rank, name, school, position, grade, tie_tier
    FROM perform_players
    WHERE overall_rank IS NOT NULL
    ORDER BY overall_rank ASC
    LIMIT 10
  `;
  for (const r of top) {
    console.log(`  #${String(r.overall_rank).padEnd(3)} ${String(r.name).padEnd(28)} ${String(r.school).padEnd(20)} ${String(r.position).padEnd(5)} g=${r.grade} t=${r.tie_tier} (#${r.position_rank} ${r.position})`);
  }

  console.log(`\n[rank] elapsed = ${((Date.now() - start) / 1000).toFixed(1)}s`);
  await sql.end();
})();
