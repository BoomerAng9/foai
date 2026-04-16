import postgres from 'postgres';
import * as fs from 'fs';
const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
}
const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 4 });
(async () => {
  console.log('— Top 10 by overall_rank —');
  const top = await sql`
    SELECT name, school, position, overall_rank, grade, tie_tier, level, roster_source
    FROM perform_players WHERE overall_rank IS NOT NULL ORDER BY overall_rank ASC LIMIT 10
  `;
  for (const r of top) console.log(`  #${r.overall_rank} ${r.name} | ${r.school} ${r.position} | grade=${r.grade ?? '--'} tier=${r.tie_tier ?? '--'} src=${r.roster_source ?? '(regrade)'}`);
  console.log('\n— rows missing grade vs total —');
  const [{ total }] = await sql`SELECT COUNT(*)::int total FROM perform_players`;
  const [{ graded }] = await sql`SELECT COUNT(*)::int graded FROM perform_players WHERE grade IS NOT NULL`;
  const [{ ranked }] = await sql`SELECT COUNT(*)::int ranked FROM perform_players WHERE overall_rank IS NOT NULL`;
  console.log(`  total=${total}  graded=${graded}  ranked=${ranked}`);
  console.log('\n— dup name/school pairs —');
  const dups = await sql`
    SELECT name, school, COUNT(*)::int n FROM perform_players GROUP BY name, school HAVING COUNT(*) > 1 ORDER BY n DESC LIMIT 5
  `;
  for (const d of dups) console.log(`  ${d.n}x ${d.name} @ ${d.school}`);
  await sql.end();
})();
