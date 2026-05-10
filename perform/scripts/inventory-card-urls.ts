import postgres from 'postgres';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
}
const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 1 });

(async () => {
  const cols = await sql<Array<{ table_name: string; column_name: string; data_type: string }>>`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (column_name ILIKE '%card%url%'
           OR column_name ILIKE '%image_url%'
           OR column_name ILIKE '%headshot%'
           OR column_name ILIKE '%avatar%'
           OR column_name ILIKE '%photo%'
           OR column_name ILIKE '%asset%')
    ORDER BY table_name, column_name
  `;
  console.log('Image/asset url columns in DB:');
  if (cols.length === 0) console.log('  (none)');
  for (const c of cols) console.log(`  ${c.table_name}.${c.column_name} : ${c.data_type}`);

  // If any perform_players-specific image columns exist, count populated rows
  const playerImageCols = cols.filter(c => c.table_name === 'perform_players');
  if (playerImageCols.length > 0) {
    console.log('\nperform_players populated counts:');
    for (const c of playerImageCols) {
      const [row] = await sql<Array<{ count: number }>>`
        SELECT COUNT(*)::int AS count
        FROM perform_players
        WHERE ${sql(c.column_name)} IS NOT NULL
      `;
      console.log(`  ${c.column_name}: ${row.count}`);
    }
  }

  await sql.end();
})();
