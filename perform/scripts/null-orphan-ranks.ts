/**
 * scripts/null-orphan-ranks.ts
 * ==============================
 * One-shot hygiene: NULL overall_rank + position_rank on any row with
 * grade IS NULL. These are stale ranks from prior seed runs that the
 * recompute script skipped (its WHERE filter is grade IS NOT NULL),
 * creating phantom duplicates with freshly-assigned ranks.
 *
 * Should be called before OR as part of scripts/recompute-overall-rank.ts
 * to keep the table honest. Idempotent.
 */

import postgres from 'postgres';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
}

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 2 });

(async () => {
  const [{ before }] = await sql<{ before: number }[]>`
    SELECT COUNT(*)::int AS before
    FROM perform_players
    WHERE grade IS NULL
      AND (overall_rank IS NOT NULL OR position_rank IS NOT NULL)
  `;
  console.log(`[null-orphan] rows with grade=NULL AND a non-null rank: ${before}`);

  if (before === 0) {
    console.log('[null-orphan] nothing to null');
    await sql.end();
    return;
  }

  const result = await sql`
    UPDATE perform_players
    SET overall_rank = NULL,
        position_rank = NULL,
        updated_at = NOW()
    WHERE grade IS NULL
      AND (overall_rank IS NOT NULL OR position_rank IS NOT NULL)
  `;
  console.log(`[null-orphan] nulled ${result.count} orphan rank rows`);

  // Verify global duplicate count after this fix
  const dups = await sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM (
      SELECT overall_rank
      FROM perform_players
      WHERE overall_rank IS NOT NULL
      GROUP BY overall_rank
      HAVING COUNT(*) > 1
    ) g
  `;
  console.log(`[null-orphan] duplicate rank groups remaining: ${dups[0].n}`);

  await sql.end();
})();
