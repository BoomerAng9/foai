import postgres from 'postgres';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
}
const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 4 });

(async () => {
  console.log('═══ SCHEMA — perform_players columns ═══');
  const cols = await sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'perform_players'
    ORDER BY ordinal_position
  `;
  for (const c of cols) console.log(`  ${c.column_name} : ${c.data_type}`);

  console.log('\n═══ SCHEMA — all perform_* tables ═══');
  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name LIKE 'perform_%'
    ORDER BY table_name
  `;
  for (const t of tables) console.log(`  ${t.table_name}`);

  console.log('\n═══ Staff/personnel table check ═══');
  const staffTables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND (table_name LIKE '%staff%' OR table_name LIKE '%personnel%' OR table_name LIKE '%coach%')
  `;
  console.log(staffTables.length ? staffTables.map(t => '  ' + t.table_name).join('\n') : '  NONE — no staff table exists');

  console.log('\n═══ Distribution by level ═══');
  const levels = await sql`
    SELECT COALESCE(level, '(null)') AS level, COUNT(*)::int AS rows,
           COUNT(grade)::int AS graded, COUNT(tie_tier)::int AS tiered
    FROM perform_players GROUP BY level ORDER BY rows DESC
  `;
  for (const l of levels) console.log(`  level=${l.level}  rows=${l.rows}  graded=${l.graded}  tiered=${l.tiered}`);

  console.log('\n═══ Distribution by class_year ═══');
  const years = await sql`
    SELECT COALESCE(class_year::text, '(null)') AS class_year, COUNT(*)::int AS rows,
           COUNT(grade)::int AS graded, COUNT(overall_rank)::int AS ranked
    FROM perform_players GROUP BY class_year ORDER BY class_year NULLS LAST
  `;
  for (const y of years) console.log(`  class_year=${y.class_year}  rows=${y.rows}  graded=${y.graded}  ranked=${y.ranked}`);

  console.log('\n═══ Distribution by roster_source ═══');
  const sources = await sql`
    SELECT COALESCE(roster_source, '(null)') AS source, COUNT(*)::int AS rows,
           COUNT(grade)::int AS graded
    FROM perform_players GROUP BY roster_source ORDER BY rows DESC
  `;
  for (const s of sources) console.log(`  source=${s.source}  rows=${s.rows}  graded=${s.graded}`);

  console.log('\n═══ Projected round distribution (graded players) ═══');
  const rounds = await sql`
    SELECT COALESCE(projected_round::text, '(null)') AS round, COUNT(*)::int AS rows
    FROM perform_players WHERE grade IS NOT NULL
    GROUP BY projected_round ORDER BY projected_round NULLS LAST
  `;
  for (const r of rounds) console.log(`  round=${r.round}  rows=${r.rows}`);

  console.log('\n═══ TIE tier distribution ═══');
  const tiers = await sql`
    SELECT COALESCE(tie_tier, '(null)') AS tier, COUNT(*)::int AS rows
    FROM perform_players GROUP BY tie_tier ORDER BY rows DESC
  `;
  for (const t of tiers) console.log(`  tier=${t.tier}  rows=${t.rows}`);

  console.log('\n═══ NFL team / roster column check ═══');
  const nflCols = cols.filter(c => /nfl|team|roster|pro|draft/i.test(c.column_name));
  for (const c of nflCols) console.log(`  ${c.column_name} : ${c.data_type}`);

  console.log('\n═══ Draft-year vs class-year graded ═══');
  try {
    const draft = await sql`
      SELECT COALESCE(draft_year::text, '(null)') AS dy, COUNT(*)::int AS rows,
             COUNT(grade)::int AS graded
      FROM perform_players GROUP BY draft_year ORDER BY draft_year NULLS LAST
    `;
    for (const d of draft) console.log(`  draft_year=${d.dy}  rows=${d.rows}  graded=${d.graded}`);
  } catch (e: any) {
    console.log('  (draft_year column may not exist: ' + e.message + ')');
  }

  console.log('\n═══ 2026 class — position breakdown (graded) ═══');
  try {
    const pos = await sql`
      SELECT position, COUNT(*)::int AS rows
      FROM perform_players
      WHERE grade IS NOT NULL AND (class_year='2026' OR class_year='Sr' OR class_year='Redshirt Sr')
      GROUP BY position ORDER BY rows DESC
    `;
    for (const p of pos) console.log(`  ${p.position}: ${p.rows}`);
  } catch (e: any) {
    console.log('  (query failed: ' + e.message + ')');
  }

  console.log('\n═══ Integrity: grade NOT NULL but tie_tier NULL ═══');
  const [{ missing }] = await sql`
    SELECT COUNT(*)::int missing FROM perform_players
    WHERE grade IS NOT NULL AND tie_tier IS NULL
  `;
  console.log(`  rows with grade but no tier: ${missing}`);

  await sql.end();
})();
