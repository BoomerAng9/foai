import postgres from 'postgres';
import * as fs from 'fs';
const env = fs.readFileSync('.env.local', 'utf8');
const parsed: Record<string, string> = {};
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) parsed[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
}
for (const [k, v] of Object.entries(parsed)) { if (!process.env[k]) process.env[k] = v; }
const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 2 });
(async () => {
  await sql`
    UPDATE perform_players
    SET drafted_by_team = NULL, drafted_pick_number = NULL, drafted_round = NULL, drafted_at = NULL, updated_at = NOW()
    WHERE id = 2410
  `;
  console.log('reset Caleb Downs test pick');
  await sql.end();
})();
