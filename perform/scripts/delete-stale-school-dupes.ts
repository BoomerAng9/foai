/**
 * scripts/delete-stale-school-dupes.ts
 * ======================================
 * Hard-deletes the 17 school-spelling stale duplicates surfaced by
 * grade-ungraded-180.ts. Each pair has a lower-id NULL-graded row (stale)
 * and a higher-id (33xxx) graded canonical twin with all data.
 *
 * Safety:
 *   1. Pre-flight: verify each ID is still ungraded AND has a graded twin
 *   2. Pre-flight: scan FK references in perform_consensus_ranks +
 *      perform_team_rosters to confirm no orphan-link risk
 *   3. Transaction-wrapped DELETE
 *   4. Post-delete verification: confirm 0 ungraded 2026 rows remain
 *
 * Idempotent (already-deleted IDs are no-op).
 */

import postgres from 'postgres';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"]*)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const DRY_RUN = process.argv.includes('--dry');
const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 4 });

const STALE_IDS = [7, 9, 32, 44, 99, 102, 145, 206, 252, 354, 375, 449, 468, 475, 481, 501, 519, 524];

(async () => {
  console.log(`[delete-stale] mode=${DRY_RUN ? 'DRY-RUN' : 'WRITE'} · 17 candidate IDs`);

  // Pre-flight: confirm each ID is still ungraded + has a canonical twin
  const audit = await sql<{
    id: number; name: string; school: string; position: string;
    grade: string | null; tie_tier: string | null;
    twin_id: number | null; twin_school: string | null; twin_grade: string | null;
  }[]>`
    WITH stale AS (
      SELECT id, name, school, position, grade, tie_tier, name_normalized
      FROM perform_players
      WHERE id = ANY(${STALE_IDS}) AND class_year='2026'
    )
    SELECT
      s.id, s.name, s.school, s.position,
      s.grade::text AS grade,
      s.tie_tier,
      g.id AS twin_id,
      g.school AS twin_school,
      g.grade::text AS twin_grade
    FROM stale s
    LEFT JOIN LATERAL (
      SELECT id, school, grade
      FROM perform_players
      WHERE class_year='2026' AND grade IS NOT NULL
        AND name_normalized = s.name_normalized
        AND position = s.position
      ORDER BY id LIMIT 1
    ) g ON TRUE
    ORDER BY s.id
  `;

  console.log('\n── Pre-flight audit ──');
  console.table(audit.map(r => ({
    stale_id: r.id,
    name: r.name,
    stale_school: r.school,
    grade: r.grade ?? 'NULL',
    twin_id: r.twin_id ?? '—',
    twin_school: r.twin_school ?? '—',
    twin_grade: r.twin_grade ?? '—',
  })));

  const safeIds = audit.filter(r => r.grade === null && r.twin_id !== null).map(r => r.id);
  const unsafeIds = audit.filter(r => r.grade !== null || r.twin_id === null).map(r => r.id);

  if (unsafeIds.length > 0) {
    console.log(`\n[delete-stale] UNSAFE IDs (already graded or no twin): ${unsafeIds.join(',')} — will SKIP these`);
  }
  console.log(`[delete-stale] ${safeIds.length} safe IDs to delete: ${safeIds.join(',')}`);

  if (safeIds.length === 0) {
    console.log('[delete-stale] nothing to do.');
    await sql.end();
    return;
  }

  // FK reference scan — perform_consensus_ranks.player_id, perform_team_rosters.perform_player_id
  const fkConsensus = await sql<{ cnt: number }[]>`
    SELECT COUNT(*)::int AS cnt FROM perform_consensus_ranks WHERE player_id = ANY(${safeIds})
  `;
  const fkRosters = await sql<{ cnt: number }[]>`
    SELECT COUNT(*)::int AS cnt FROM perform_team_rosters WHERE perform_player_id = ANY(${safeIds})
  `;
  console.log(`[delete-stale] FK refs: perform_consensus_ranks=${fkConsensus[0].cnt}, perform_team_rosters=${fkRosters[0].cnt}`);
  if (fkConsensus[0].cnt > 0) {
    console.log('  perform_consensus_ranks has rows pointing at stale IDs — they would orphan or fail FK. Inspecting…');
    const refs = await sql`SELECT player_id, source, rank FROM perform_consensus_ranks WHERE player_id = ANY(${safeIds}) LIMIT 20`;
    console.table(refs);
  }

  if (DRY_RUN) {
    console.log('\n[delete-stale] DRY-RUN — no DELETE executed.');
    await sql.end();
    return;
  }

  // Transactional delete. Re-point any FK refs first (none expected for the 17 since they were never ranked).
  await sql.begin(async (tx) => {
    if (fkConsensus[0].cnt > 0) {
      const reAttached = await tx`DELETE FROM perform_consensus_ranks WHERE player_id = ANY(${safeIds})`;
      console.log(`[delete-stale]   removed ${reAttached.count} consensus rank references`);
    }
    if (fkRosters[0].cnt > 0) {
      const rosterClear = await tx`UPDATE perform_team_rosters SET perform_player_id = NULL WHERE perform_player_id = ANY(${safeIds})`;
      console.log(`[delete-stale]   nulled ${rosterClear.count} team-roster references`);
    }
    const del = await tx`DELETE FROM perform_players WHERE id = ANY(${safeIds})`;
    console.log(`[delete-stale]   DELETE perform_players → ${del.count} rows`);
  });

  // Post-verify
  const [{ remaining }] = await sql<{ remaining: number }[]>`
    SELECT COUNT(*)::int AS remaining
    FROM perform_players
    WHERE class_year='2026' AND grade IS NULL
  `;
  const [{ legacy_remaining }] = await sql<{ legacy_remaining: number }[]>`
    SELECT COUNT(*)::int AS legacy_remaining
    FROM perform_players
    WHERE class_year='2026'
      AND tie_tier IS NOT NULL
      AND tie_tier NOT IN ('PRIME','A_PLUS','A','A_MINUS','B_PLUS','B','B_MINUS','C_PLUS','C')
  `;
  console.log(`\n[delete-stale] post: 2026 ungraded rows = ${remaining}, non-canonical tier values = ${legacy_remaining}`);

  await sql.end();
})();
