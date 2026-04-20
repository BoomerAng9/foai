/**
 * scripts/verify-migration-010.ts
 * Confirms migration 010 columns + indexes + collision visibility.
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
  console.log('— Schema check —');
  const cols = await sql`
    SELECT column_name, data_type, is_generated
    FROM information_schema.columns
    WHERE table_name = 'perform_players'
      AND column_name IN ('player_external_id', 'name_normalized', 'sport', 'class_year')
    ORDER BY column_name
  `;
  for (const c of cols) console.log(`  ${c.column_name.padEnd(20)} ${c.data_type.padEnd(20)} generated=${c.is_generated}`);

  console.log('\n— Index check —');
  const idx = await sql`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'perform_players'
      AND indexname IN (
        'perform_players_external_id_key',
        'perform_players_dedupe_key_idx',
        'perform_players_name_normalized_idx'
      )
    ORDER BY indexname
  `;
  for (const i of idx) console.log(`  ${i.indexname}\n    ${i.indexdef}`);

  console.log('\n— Row-level UUID coverage —');
  const [{ total, with_uuid, distinct_uuid, with_norm }] = await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(player_external_id)::int AS with_uuid,
      COUNT(DISTINCT player_external_id)::int AS distinct_uuid,
      COUNT(name_normalized)::int AS with_norm
    FROM perform_players
  `;
  console.log(`  total=${total}  with_uuid=${with_uuid}  distinct_uuid=${distinct_uuid}  with_normalized=${with_norm}`);

  console.log('\n— Top 20 collision pairs by (name_normalized, school, class_year, sport) —');
  const dups = await sql`
    SELECT name_normalized, school, class_year, sport, COUNT(*)::int AS dup_count,
           array_agg(DISTINCT name) AS name_variants,
           array_agg(grade) AS grades,
           array_agg(overall_rank) AS ranks
    FROM perform_players
    GROUP BY name_normalized, school, class_year, sport
    HAVING COUNT(*) > 1
    ORDER BY dup_count DESC, name_normalized
    LIMIT 20
  `;
  if (dups.length === 0) {
    console.log('  (no collisions found — already deduped)');
  } else {
    for (const d of dups) {
      const variants = (d.name_variants as string[]).join(' / ');
      console.log(`  ${d.dup_count}x ${variants} @ ${d.school} (${d.class_year}, ${d.sport})`);
    }
  }

  console.log('\n— Total collision count —');
  const [{ collision_groups, collision_rows }] = await sql`
    WITH groups AS (
      SELECT name_normalized, school, class_year, sport, COUNT(*) AS n
      FROM perform_players
      GROUP BY name_normalized, school, class_year, sport
      HAVING COUNT(*) > 1
    )
    SELECT COUNT(*)::int AS collision_groups, COALESCE(SUM(n)::int, 0) AS collision_rows
    FROM groups
  `;
  console.log(`  collision_groups=${collision_groups}  rows_in_collisions=${collision_rows}  rows_to_delete=${(collision_rows ?? 0) - (collision_groups ?? 0)}`);

  await sql.end();
})();
