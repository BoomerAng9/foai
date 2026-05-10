import postgres from 'postgres';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"]*)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 2 });

(async () => {
  const overall = await sql<{ class_year: string; total: number; graded: number; ungraded: number; ranked: number }[]>`
    SELECT
      class_year,
      COUNT(*)::int                                  AS total,
      COUNT(grade)::int                              AS graded,
      COUNT(*) FILTER (WHERE grade IS NULL)::int     AS ungraded,
      COUNT(overall_rank)::int                       AS ranked
    FROM perform_players
    WHERE class_year IN ('2026', '2027', '2028', '2029')
    GROUP BY class_year
    ORDER BY class_year
  `;
  console.log('── Class-year grading status ──');
  console.table(overall);

  const consensus = await sql<{ source: string; cnt: number }[]>`
    SELECT source, COUNT(*)::int AS cnt
    FROM perform_consensus_ranks
    GROUP BY source
    ORDER BY source
  `;
  console.log('── Consensus rank coverage by source ──');
  console.table(consensus);

  const tier = await sql<{ tie_tier: string; cnt: number }[]>`
    SELECT tie_tier, COUNT(*)::int AS cnt
    FROM perform_players
    WHERE class_year='2026' AND tie_tier IS NOT NULL
    GROUP BY tie_tier
    ORDER BY MIN(overall_rank) NULLS LAST
  `;
  console.log('── 2026 class TIE tier breakdown ──');
  console.table(tier);

  await sql.end();
})();
