/**
 * Seed 28,550+ CFB players from Sqwaadrun rosters into Neon.
 * Source: smelter-os/sqwaadrun/data/all_cfb_2026_rosters.json
 *
 * Run: npx tsx scripts/seed-cfb-rosters.ts
 */
import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
  }
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL missing'); process.exit(1); }

const sql = postgres(DATABASE_URL, { ssl: 'require', max: 10 });

interface Roster {
  name: string;
  number?: number | string;
  position: string;
  height?: string;
  weight?: string;
  class_year?: string;
  birthplace?: string;
  school: string;
  conference?: string;
  unit?: string;
  season?: string;
}

function num(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  const s = String(v).replace(/[^\d.-]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

async function main() {
  const src = path.resolve(process.cwd(), '..', 'smelter-os', 'sqwaadrun', 'data', 'all_cfb_2026_rosters.json');
  if (!fs.existsSync(src)) throw new Error(`Source not found: ${src}`);
  const rosters: Roster[] = JSON.parse(fs.readFileSync(src, 'utf8'));
  console.log(`Loaded ${rosters.length} rosters from ${src}`);

  // Ensure broader schema columns for the year-round Player Index
  const adds = [
    "sport TEXT DEFAULT 'football'",
    "level TEXT DEFAULT 'college'",       // college | pro | hs
    "conference TEXT",
    "birthplace TEXT",
    "jersey_number INTEGER",
    "unit TEXT",                           // Offense | Defense | Special Teams
    "season TEXT",                         // '2026'
    "roster_source TEXT",                  // 'sqwaadrun_cfb_2026'
    "roster_updated_at TIMESTAMPTZ",
  ];
  for (const col of adds) {
    try { await sql.unsafe(`ALTER TABLE perform_players ADD COLUMN IF NOT EXISTS ${col}`); } catch {}
  }

  // Drop the incompatible UNIQUE constraint if it exists and replace with a
  // name/school/class_year form that accepts CFB class years (FR/SO/JR/SR)
  // The existing seed used '2026' as class_year for draft prospects; CFB
  // rosters will use 'FR'|'SO'|'JR'|'SR'. We dedupe on (name, school, class_year).

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const BATCH = 200;

  for (let i = 0; i < rosters.length; i += BATCH) {
    const slice = rosters.slice(i, i + BATCH);
    for (const p of slice) {
      if (!p.name || !p.school) { skipped++; continue; }
      try {
        const r = await sql`
          INSERT INTO perform_players (
            name, school, position, height, weight, class_year,
            conference, birthplace, jersey_number, unit, season,
            sport, level, roster_source, roster_updated_at
          ) VALUES (
            ${p.name}, ${p.school}, ${p.position || 'UNK'},
            ${p.height || null}, ${p.weight ? String(p.weight) : null}, ${p.class_year || '--'},
            ${p.conference || null}, ${p.birthplace || null}, ${num(p.number)},
            ${p.unit || null}, ${p.season || '2026'},
            'football', 'college', 'sqwaadrun_cfb_2026', NOW()
          )
          ON CONFLICT (name, school, class_year) DO UPDATE SET
            position = EXCLUDED.position,
            height = COALESCE(EXCLUDED.height, perform_players.height),
            weight = COALESCE(EXCLUDED.weight, perform_players.weight),
            conference = EXCLUDED.conference,
            birthplace = COALESCE(EXCLUDED.birthplace, perform_players.birthplace),
            jersey_number = COALESCE(EXCLUDED.jersey_number, perform_players.jersey_number),
            unit = EXCLUDED.unit,
            season = EXCLUDED.season,
            sport = COALESCE(perform_players.sport, 'football'),
            level = COALESCE(perform_players.level, 'college'),
            roster_source = 'sqwaadrun_cfb_2026',
            roster_updated_at = NOW()
          RETURNING (xmax = 0) AS was_insert
        `;
        if (r[0]?.was_insert) inserted++; else updated++;
      } catch (err) {
        skipped++;
        if (skipped <= 5) console.error(`  err ${p.name} @ ${p.school}:`, err instanceof Error ? err.message.slice(0, 140) : err);
      }
    }
    if ((i + BATCH) % 2000 === 0 || i + BATCH >= rosters.length) {
      console.log(`  progress ${Math.min(i + BATCH, rosters.length)}/${rosters.length} · inserted=${inserted} updated=${updated} skipped=${skipped}`);
    }
  }

  // Final tally
  const [{ total }] = await sql`SELECT COUNT(*)::int as total FROM perform_players`;
  const [{ college }] = await sql`SELECT COUNT(*)::int as college FROM perform_players WHERE level = 'college'`;
  const [{ pro }] = await sql`SELECT COUNT(*)::int as pro FROM perform_players WHERE level != 'college' OR level IS NULL`;

  console.log(`\nDone. inserted=${inserted} updated=${updated} skipped=${skipped}`);
  console.log(`Neon perform_players now: total=${total} · college=${college} · pro/other=${pro}`);
  await sql.end();
}

main().catch(async e => { console.error(e); await sql.end(); process.exit(1); });
