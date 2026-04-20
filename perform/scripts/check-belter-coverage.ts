import postgres from 'postgres';
import * as fs from 'fs';
const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
}
const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 2 });

const BELTER_MARKERS = ['kopeng', 'beratna', 'sabe', 'mi pensa', ' dat ', ' dey ', ' dis ', ' da '];

(async () => {
  try {
    const rows = await sql<{ id: number; analyst_id: string; transcript: string }[]>`
      SELECT id, analyst_id, transcript
      FROM podcast_episodes
      WHERE analyst_id IN ('void-caster', 'bun-e')
      ORDER BY analyst_id, id
    `;

    let belterCovered = 0;
    let belterMissing = 0;
    const samples: string[] = [];

    for (const r of rows) {
      const lower = ` ${(r.transcript || '').toLowerCase()} `;
      const hits = BELTER_MARKERS.filter(m => lower.includes(m)).length;
      if (hits >= 2) {
        belterCovered++;
      } else {
        belterMissing++;
        if (samples.length < 4) {
          samples.push(`  [id=${r.id} ${r.analyst_id}] hits=${hits}\n    "${(r.transcript || '').slice(0, 220).replace(/\n/g, ' ')}..."`);
        }
      }
    }

    console.log(`\nBelter Creole coverage on Void-Caster + Bun-E episodes:`);
    console.log(`  total = ${rows.length}`);
    console.log(`  belter_in_transcript = ${belterCovered}`);
    console.log(`  belter_missing       = ${belterMissing}`);
    if (samples.length > 0) {
      console.log(`\nSamples missing Belter (need applyDialect before TTS):`);
      for (const s of samples) console.log(s);
    }
  } finally {
    await sql.end();
  }
})();
