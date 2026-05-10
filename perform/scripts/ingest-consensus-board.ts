/**
 * scripts/ingest-consensus-board.ts
 * ===================================
 * Ingests data/consensus/consensus-board-2026.json into the new
 * perform_consensus_ranks table (migration 012).
 *
 * For each player that matches an existing perform_players row
 * (by name_normalized + school), inserts one row per source with
 * a non-null rank: drafttek, yahoo, ringer, plus consensus_avg
 * (sourced from the `avg` field).
 *
 * Idempotent via ON CONFLICT (player_id, source) DO UPDATE.
 *
 * Run: DATABASE_URL=$(grep DATABASE_URL .env.local | cut -d= -f2-) \
 *      npx tsx scripts/ingest-consensus-board.ts
 *
 * Honesty note: the JSON has DrafTek / Yahoo / Ringer only. PFF / ESPN /
 * NFL.com raw ranks require a separate scrape (post-draft ticket).
 */

import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';

const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
}

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 4 });

interface ConsensusRow {
  consensusRank: number;
  player: string;
  position: string;
  school: string;
  drafttek: number | null;
  yahoo: number | null;
  ringer: number | null;
  cbs?: number | null;
  espn?: number | null;
  si?: number | null;
  avg: number;
  partial: boolean;
}

interface ConsensusFile {
  generatedAt?: string;
  source?: string;
  methodology?: string;
  sources?: unknown[];
  consensusTop50?: ConsensusRow[];
  consensusTop100?: ConsensusRow[];
  consensusBoard?: ConsensusRow[];
  [key: string]: unknown;
}

(async () => {
  const start = Date.now();

  const jsonPath = path.join(process.cwd(), 'data', 'consensus', 'consensus-board-2026.json');
  if (!fs.existsSync(jsonPath)) {
    console.error(`[ingest] ${jsonPath} not found`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as ConsensusFile;

  // Gather all consensus rows regardless of which key they live under
  const allRows: ConsensusRow[] = [];
  for (const key of ['consensusTop50', 'consensusTop100', 'consensusBoard']) {
    const arr = (raw as Record<string, unknown>)[key];
    if (Array.isArray(arr)) allRows.push(...(arr as ConsensusRow[]));
  }

  // Dedupe by (player, school) — take highest-ranked (lowest consensusRank)
  const dedup = new Map<string, ConsensusRow>();
  for (const r of allRows) {
    if (!r.player || !r.school) continue;
    const key = `${r.player.trim().toLowerCase()}|${r.school.trim()}`;
    const existing = dedup.get(key);
    if (!existing || (r.consensusRank ?? 9999) < (existing.consensusRank ?? 9999)) {
      dedup.set(key, r);
    }
  }
  const rows = [...dedup.values()];
  console.log(`[ingest] loaded ${rows.length} unique consensus rows from ${jsonPath}`);

  // Index DB players by name_normalized + school
  const dbPlayers = await sql<{ id: number; name_normalized: string; school: string }[]>`
    SELECT id, name_normalized, school
    FROM perform_players
    WHERE name_normalized IS NOT NULL
  `;
  const dbIndex = new Map<string, number>();
  for (const p of dbPlayers) {
    dbIndex.set(`${p.name_normalized}|${p.school}`, p.id);
  }
  console.log(`[ingest] indexed ${dbPlayers.length} DB players`);

  let matched = 0;
  let unmatched = 0;
  let inserted = 0;
  const unmatchedSamples: string[] = [];

  type SourceKey = 'drafttek' | 'yahoo' | 'ringer' | 'espn' | 'cbs' | 'si';
  const SCRAPED_SOURCES: SourceKey[] = ['drafttek', 'yahoo', 'ringer'];

  for (const r of rows) {
    const key = `${r.player.trim().toLowerCase()}|${r.school.trim()}`;
    const playerId = dbIndex.get(key);
    if (!playerId) {
      unmatched++;
      if (unmatchedSamples.length < 20) {
        unmatchedSamples.push(`  ${r.player} @ ${r.school} (consensus #${r.consensusRank})`);
      }
      continue;
    }
    matched++;

    // Per-source rows
    for (const src of SCRAPED_SOURCES) {
      const rank = r[src as keyof ConsensusRow] as number | null | undefined;
      if (rank == null) continue;
      await sql`
        INSERT INTO perform_consensus_ranks (player_id, source, rank, ingested_at)
        VALUES (${playerId}, ${src}, ${rank}, NOW())
        ON CONFLICT (player_id, source) DO UPDATE SET
          rank = EXCLUDED.rank,
          ingested_at = NOW()
      `;
      inserted++;
    }

    // Aggregate consensus_avg row (round to integer rank)
    if (typeof r.avg === 'number' && !Number.isNaN(r.avg)) {
      await sql`
        INSERT INTO perform_consensus_ranks (player_id, source, rank, raw_grade, ingested_at)
        VALUES (${playerId}, 'consensus_avg', ${Math.round(r.avg)}, ${r.avg}, NOW())
        ON CONFLICT (player_id, source) DO UPDATE SET
          rank = EXCLUDED.rank,
          raw_grade = EXCLUDED.raw_grade,
          ingested_at = NOW()
      `;
      inserted++;
    }
  }

  console.log(`\n[ingest] matched=${matched} unmatched=${unmatched} inserted_rows=${inserted}`);
  if (unmatchedSamples.length > 0) {
    console.log('[ingest] sample unmatched (first 20):');
    for (const s of unmatchedSamples) console.log(s);
    console.log(`\n[ingest] write full unmatched list: check dbIndex keys vs source player|school — likely name spelling drift`);
  }

  // Per-source counts
  const sourceCounts = await sql<{ source: string; n: number }[]>`
    SELECT source, COUNT(*)::int AS n
    FROM perform_consensus_ranks
    GROUP BY source
    ORDER BY source
  `;
  console.log('\n[ingest] perform_consensus_ranks by source:');
  for (const s of sourceCounts) console.log(`  ${s.source.padEnd(15)} ${s.n}`);

  console.log(`\n[ingest] elapsed = ${((Date.now() - start) / 1000).toFixed(1)}s`);
  await sql.end();
})();
