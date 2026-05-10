import postgres from 'postgres';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
}

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 1 });

(async () => {
  const cols = await sql<Array<{ column_name: string; data_type: string }>>`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'perform_players'
      AND (column_name LIKE 'drafted%' OR column_name = 'college_color_phrase')
    ORDER BY column_name
  `;
  console.log('Columns from migration 009:');
  for (const c of cols) console.log(`  ${c.column_name} : ${c.data_type}`);

  const indexes = await sql<Array<{ indexname: string }>>`
    SELECT indexname FROM pg_indexes
    WHERE tablename = 'perform_players' AND indexname LIKE 'idx_perform_players_drafted%'
    ORDER BY indexname
  `;
  console.log('Indexes:');
  for (const i of indexes) console.log(`  ${i.indexname}`);

  await sql.end();
})();
