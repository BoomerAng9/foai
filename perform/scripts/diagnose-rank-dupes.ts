import postgres from 'postgres';
import * as fs from 'fs';
const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
}
const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 2 });

(async () => {
  // 1. Rows by class_year that still have overall_rank
  const byClass = await sql`
    SELECT COALESCE(class_year, '(null)') AS class_year,
           COUNT(*)::int AS ranked_rows,
           COUNT(DISTINCT overall_rank)::int AS distinct_ranks
    FROM perform_players
    WHERE overall_rank IS NOT NULL
    GROUP BY class_year
    ORDER BY ranked_rows DESC
  `;
  console.log('Ranked rows by class_year:');
  for (const r of byClass) console.log(`  ${String(r.class_year).padEnd(12)} ${String(r.ranked_rows).padStart(6)} rows, ${r.distinct_ranks} distinct ranks`);

  // 2. Full detail of the 5 duplicate ranks
  const dupRanks = [1963, 2080, 2125, 2172, 2196];
  console.log('\nDuplicate rank inspection:');
  for (const r of dupRanks) {
    const rows = await sql`
      SELECT id, name, school, position, class_year, grade, tie_tier, level, sport
      FROM perform_players
      WHERE overall_rank = ${r}
      ORDER BY id
    `;
    console.log(`\nRank ${r}:`);
    for (const row of rows) {
      console.log(`  id=${String(row.id).padStart(6)} ${String(row.name).padEnd(28)} @ ${String(row.school).padEnd(22)} pos=${row.position} cy='${row.class_year}' g=${row.grade} lvl=${row.level} sport=${row.sport}`);
    }
  }

  // 3. Global duplicate count
  const dupTotal = await sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM (
      SELECT overall_rank
      FROM perform_players
      WHERE overall_rank IS NOT NULL
      GROUP BY overall_rank
      HAVING COUNT(*) > 1
    ) g
  `;
  console.log(`\nTotal duplicate rank groups: ${dupTotal[0].n}`);

  await sql.end();
})();
