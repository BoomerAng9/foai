import postgres from 'postgres';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"]*)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 2 });

(async () => {
  const ids = [314, 371];
  const before = await sql`SELECT id, name, school, position, grade, tie_tier FROM perform_players WHERE id = ANY(${ids})`;
  console.log('Pre-delete:');
  console.table(before);

  const fk1 = await sql<{ c: number }[]>`SELECT COUNT(*)::int AS c FROM perform_consensus_ranks WHERE player_id = ANY(${ids})`;
  const fk2 = await sql<{ c: number }[]>`SELECT COUNT(*)::int AS c FROM perform_team_rosters WHERE perform_player_id = ANY(${ids})`;
  console.log(`FK refs: consensus=${fk1[0].c} rosters=${fk2[0].c}`);

  const del = await sql`DELETE FROM perform_players WHERE id = ANY(${ids})`;
  console.log(`Deleted: ${del.count} rows`);

  const [{ ungraded }] = await sql<{ ungraded: number }[]>`
    SELECT COUNT(*)::int AS ungraded FROM perform_players WHERE class_year='2026' AND grade IS NULL
  `;
  console.log(`2026 ungraded post: ${ungraded}`);
  await sql.end();
})();
