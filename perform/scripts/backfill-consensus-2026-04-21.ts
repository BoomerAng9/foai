/**
 * scripts/backfill-consensus-2026-04-21.ts
 * ==========================================
 * Ingests fresh consensus ranks from ESPN Scouts Inc. (Top 25) and NFL.com
 * Daniel Jeremiah (Top 50) into perform_consensus_ranks for 2026 prospects.
 * Then recomputes each affected player's consensus_avg across every non-null
 * source on file (drafttek, yahoo, ringer, espn, nflcom, + pff when ingested).
 *
 * Source data (pre-extracted via Sqwaadrun scrape):
 *   - C:/Users/rishj/espn-top25.json   — ESPN Scouts Inc. 2026 top 25
 *   - C:/Users/rishj/nfl-top50-parsed.json  — NFL.com DJ top 50
 *
 * Match rule:
 *   Per|Form's perform_players.school_normalized (migration 013 alias map)
 *   + LOWER(TRIM(name)). Unmatched players are logged, not upserted.
 *
 * Writes:
 *   perform_consensus_ranks — UPSERT on (player_id, source)
 *
 * Recompute:
 *   For each player that now has >= 2 source rows, compute avg rank across
 *   all non-null sources and UPSERT a row with source='consensus_avg'.
 *
 * Safe to re-run. Transaction-wrapped.
 */

import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';

const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
}

const DRY_RUN = process.argv.includes('--dry');
const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 4 });

interface ScrapedProspect {
  rank: number;
  name: string;
  school: string;
  pos: string;
}

// Mirror of migration 013's school alias map so we can normalize scraped
// school names before the DB lookup. Extra entries here (Boston College,
// Texas Christian, etc.) are safe — missed aliases fall through to the raw
// LOWER+TRIM, which still catches most cases via the GENERATED column.
function normalizeSchool(raw: string): string {
  const s = raw.toLowerCase().trim();
  const aliases: Record<string, string> = {
    'miami': 'miami_fl',
    'miami (fl)': 'miami_fl',
    'miami fl': 'miami_fl',
    'university of miami': 'miami_fl',
    'miami (oh)': 'miami_oh',
    'miami (ohio)': 'miami_oh',
    'cal': 'california',
    'california': 'california',
    'uc berkeley': 'california',
    'usf': 'south_florida',
    'south florida': 'south_florida',
    'pitt': 'pittsburgh',
    'pittsburgh': 'pittsburgh',
    'tcu': 'texas_christian',
    'texas christian': 'texas_christian',
    'sfa': 'stephen_f_austin',
    'stephen f austin': 'stephen_f_austin',
    'stephen f. austin': 'stephen_f_austin',
  };
  if (aliases[s]) return aliases[s];
  return s.replace(/\s+/g, '_').replace(/[().]/g, '');
}

function normalizeName(raw: string): string {
  return raw.toLowerCase().trim().replace(/\s+/g, ' ');
}

async function matchPlayerId(
  name: string,
  school: string,
): Promise<number | null> {
  const nameNorm = normalizeName(name);
  const schoolNorm = normalizeSchool(school);
  // Try the exact normalized match first (school_normalized is GENERATED).
  const rows = await sql<Array<{ id: number }>>`
    SELECT id
    FROM perform_players
    WHERE LOWER(TRIM(name)) = ${nameNorm}
      AND (school_normalized = ${schoolNorm} OR LOWER(TRIM(school)) = ${school.toLowerCase().trim()})
      AND class_year = '2026'
    ORDER BY id
    LIMIT 1
  `;
  if (rows.length > 0) return rows[0].id;
  // Relaxed match — drop school constraint, just normalized name
  const relaxed = await sql<Array<{ id: number; school: string }>>`
    SELECT id, school
    FROM perform_players
    WHERE LOWER(TRIM(name)) = ${nameNorm}
      AND class_year = '2026'
    ORDER BY id
    LIMIT 3
  `;
  if (relaxed.length === 1) return relaxed[0].id;
  return null;
}

async function upsertRank(playerId: number, source: string, rank: number): Promise<void> {
  if (DRY_RUN) {
    console.log(`[dry] upsert player_id=${playerId} source=${source} rank=${rank}`);
    return;
  }
  await sql`
    INSERT INTO perform_consensus_ranks (player_id, source, rank, ingested_at)
    VALUES (${playerId}, ${source}, ${rank}, NOW())
    ON CONFLICT (player_id, source) DO UPDATE
    SET rank = EXCLUDED.rank,
        ingested_at = EXCLUDED.ingested_at
  `;
}

async function recomputeConsensusAvg(playerId: number): Promise<number | null> {
  const rows = await sql<Array<{ source: string; rank: number }>>`
    SELECT source, rank
    FROM perform_consensus_ranks
    WHERE player_id = ${playerId}
      AND source != 'consensus_avg'
      AND rank IS NOT NULL
  `;
  if (rows.length < 2) return null;
  const avg = Math.round(rows.reduce((a, r) => a + r.rank, 0) / rows.length);
  if (!DRY_RUN) {
    await sql`
      INSERT INTO perform_consensus_ranks (player_id, source, rank, ingested_at)
      VALUES (${playerId}, 'consensus_avg', ${avg}, NOW())
      ON CONFLICT (player_id, source) DO UPDATE
      SET rank = EXCLUDED.rank,
          ingested_at = EXCLUDED.ingested_at
    `;
  }
  return avg;
}

async function ingestSource(
  label: string,
  sourceKey: string,
  jsonPath: string,
): Promise<Set<number>> {
  console.log(`\n[${label}] loading ${jsonPath}`);
  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as ScrapedProspect[];
  console.log(`[${label}] ${raw.length} prospects`);
  const touched = new Set<number>();
  let matched = 0;
  const unmatched: string[] = [];
  for (const p of raw) {
    const playerId = await matchPlayerId(p.name, p.school);
    if (playerId == null) {
      unmatched.push(`#${p.rank} ${p.name} (${p.school})`);
      continue;
    }
    await upsertRank(playerId, sourceKey, p.rank);
    touched.add(playerId);
    matched++;
  }
  console.log(`[${label}] matched ${matched}/${raw.length}`);
  if (unmatched.length) {
    console.log(`[${label}] unmatched:`);
    for (const u of unmatched) console.log(`  - ${u}`);
  }
  return touched;
}

(async () => {
  const t0 = Date.now();
  console.log(`[backfill] ${DRY_RUN ? 'DRY RUN' : 'LIVE'} starting`);

  const espnTouched = await ingestSource(
    'ESPN',
    'espn',
    path.resolve(process.env.HOME || 'C:/Users/rishj', 'espn-top25.json'),
  );
  const nflTouched = await ingestSource(
    'NFL.com',
    'nflcom',
    path.resolve(process.env.HOME || 'C:/Users/rishj', 'nfl-top50-parsed.json'),
  );

  const unionTouched = new Set<number>([...espnTouched, ...nflTouched]);
  console.log(`\n[consensus_avg] recomputing for ${unionTouched.size} unique players`);

  let recomputed = 0;
  for (const pid of unionTouched) {
    const avg = await recomputeConsensusAvg(pid);
    if (avg != null) recomputed++;
  }
  console.log(`[consensus_avg] wrote ${recomputed} avg rows`);

  // Sanity check — show a few high-profile players
  const spots = ['Jeremiyah Love', 'Fernando Mendoza', 'Caleb Downs', 'Mansoor Delane'];
  console.log('\n[verify] post-backfill snapshot:');
  for (const name of spots) {
    const row = await sql<Array<{ id: number; name: string; overall_rank: number | null; grade: string | null }>>`
      SELECT id, name, overall_rank, grade FROM perform_players
      WHERE LOWER(TRIM(name)) = ${name.toLowerCase()} AND class_year='2026' LIMIT 1
    `;
    if (!row[0]) { console.log(`  ${name}: NOT IN DB`); continue; }
    const ranks = await sql<Array<{ source: string; rank: number }>>`
      SELECT source, rank FROM perform_consensus_ranks
      WHERE player_id = ${row[0].id}
      ORDER BY source
    `;
    const byKey = Object.fromEntries(ranks.map(r => [r.source, r.rank]));
    console.log(`  ${name.padEnd(22)} perform_rank=${row[0].overall_rank} grade=${row[0].grade} | drafttek=${byKey.drafttek ?? '-'} yahoo=${byKey.yahoo ?? '-'} ringer=${byKey.ringer ?? '-'} espn=${byKey.espn ?? '-'} nflcom=${byKey.nflcom ?? '-'} AVG=${byKey.consensus_avg ?? '-'}`);
  }

  console.log(`\n[backfill] done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  await sql.end();
})().catch(e => { console.error(e); process.exit(1); });
