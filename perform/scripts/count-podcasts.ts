import postgres from 'postgres';
import * as fs from 'fs';
const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
}
const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 2 });
(async () => {
  try {
    const tables = await sql<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public'
        AND (table_name LIKE '%podcast%' OR table_name LIKE '%episode%' OR table_name LIKE '%analyst%')
      ORDER BY table_name
    `;
    console.log('Podcast/episode/analyst tables:');
    for (const t of tables) console.log(' -', t.table_name);
    for (const t of tables) {
      try {
        const rows = await sql.unsafe(`SELECT COUNT(*)::int n FROM ${t.table_name}`);
        const n = (rows[0] as unknown as { n: number }).n;
        const cols = await sql<{ column_name: string }[]>`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = ${t.table_name}
          ORDER BY ordinal_position LIMIT 30
        `;
        console.log(`\n${t.table_name}: ${n} rows`);
        console.log('  cols:', cols.map(c => c.column_name).join(', '));
        if (t.table_name === 'podcast_episodes') {
          const totals = await sql`
            SELECT analyst_id, COUNT(*)::int as n,
                   SUM(LENGTH(COALESCE(transcript, '')))::int as total_chars,
                   COUNT(audio_url)::int as with_audio
            FROM podcast_episodes
            GROUP BY analyst_id
            ORDER BY analyst_id
          `;
          console.log('\n  podcast_episodes by analyst:');
          let grand = 0;
          for (const r of totals) {
            const chars = (r as Record<string, number>).total_chars ?? 0;
            const n = (r as Record<string, number>).n ?? 0;
            const wa = (r as Record<string, number>).with_audio ?? 0;
            grand += chars;
            console.log(`    ${(r as Record<string, string>).analyst_id?.padEnd(15) || '(null)'.padEnd(15)} ${String(n).padStart(4)} eps · ${String(chars).padStart(7)} chars · ${wa} have audio`);
          }
          console.log(`    TOTAL chars across all episodes: ${grand}`);
        }
      } catch (e) {
        console.log(`  err on ${t.table_name}:`, e instanceof Error ? e.message.slice(0, 80) : e);
      }
    }
  } finally {
    await sql.end();
  }
})();
