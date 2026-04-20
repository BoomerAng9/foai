/**
 * scripts/dedupe-case-collisions.ts
 * ===================================
 * Merges case-collision duplicate pairs in perform_players.
 *
 * Background: Two seed sources (seed-players.ts → Title Case, seed-cfb-rosters.ts
 * → UPPERCASE) targeted the same logical players with different name casing.
 * The legacy ON CONFLICT (name, school, class_year) was case-sensitive, so each
 * top-300 player landed twice. Migration 010 added a name_normalized column and
 * a non-unique dedupe_key index. This script:
 *
 *   1. Finds every (name_normalized, school, class_year, sport) collision group
 *   2. Picks a keeper per group:
 *        prefer the Title Case row (it carries grade/rank/scouting from prospect seed)
 *        if neither was Title Case, prefer row with grade, then overall_rank, then newest
 *   3. Merges non-null fields FROM retired rows INTO keeper:
 *        identity (name) keeper wins
 *        grading (grade, tie_tier, tie_grade, overall_rank, etc.) keeper wins
 *        roster fields (height, weight, jersey_number, conference, birthplace,
 *                      unit, season, roster_source, roster_updated_at) retired wins
 *          → because retired row is the newer sqwaadrun scrape with fresh data
 *   4. Normalizes keeper.name to Title Case (preserves dots, suffixes, apostrophes)
 *   5. Deletes retired rows
 *   6. Promotes perform_players_dedupe_key_idx to UNIQUE
 *
 * Idempotent: rerunning on a clean DB reports zero collisions and exits 0.
 *
 * Run: npx tsx scripts/dedupe-case-collisions.ts
 *      Add --dry-run to print actions without applying.
 */

import postgres from 'postgres';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
}

const DRY_RUN = process.argv.includes('--dry-run');
const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 4 });

/** Title Case that preserves dots, apostrophes, hyphens, common suffixes (II/III/IV/JR/SR). */
function toTitleCase(input: string): string {
  if (!input) return input;
  const SUFFIX_KEEPS = new Set(['II', 'III', 'IV', 'V', 'JR', 'SR', 'JR.', 'SR.']);
  return input
    .split(/(\s+)/)
    .map(token => {
      if (/^\s+$/.test(token)) return token;
      const upper = token.toUpperCase();
      if (SUFFIX_KEEPS.has(upper)) return upper.replace('JR', 'Jr').replace('SR', 'Sr').replace('II', 'II').replace('III', 'III').replace('IV', 'IV').replace('V', 'V');
      // handle dotted initials: A.J., O.J., D'ANGELO, etc.
      // split on dots and apostrophes/hyphens, capitalize each segment
      return token
        .split(/([.'\-])/)
        .map(seg => {
          if (/^[.'\-]$/.test(seg)) return seg;
          if (!seg) return seg;
          return seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase();
        })
        .join('');
    })
    .join('');
}

interface PlayerRow {
  id: number;
  name: string;
  school: string;
  class_year: string;
  sport: string;
  name_normalized: string;
  player_external_id: string;
  // grading fields (keeper wins)
  grade: number | null;
  tie_grade: string | null;
  tie_tier: string | null;
  overall_rank: number | null;
  position_rank: number | null;
  projected_round: number | null;
  strengths: string | null;
  weaknesses: string | null;
  nfl_comparison: string | null;
  scouting_summary: string | null;
  analyst_notes: string | null;
  film_grade: string | null;
  // roster fields (retired/sqwaadrun wins)
  height: string | null;
  weight: string | null;
  jersey_number: number | null;
  conference: string | null;
  birthplace: string | null;
  unit: string | null;
  season: string | null;
  roster_source: string | null;
  roster_updated_at: Date | null;
  // shared / metadata
  position: string | null;
  forty_time: number | null;
  vertical_jump: number | null;
  bench_reps: number | null;
  broad_jump: number | null;
  three_cone: number | null;
  shuttle: number | null;
  trend: string | null;
  key_stats: string | null;
  level: string | null;
  beast_rank: number | null;
  beast_grade: string | null;
  prime_sub_tags: string[] | null;
  vertical: string | null;
  pillar_athleticism: number | null;
  pillar_game_performance: number | null;
  pillar_intangibles: number | null;
  updated_at: Date;
  created_at: Date;
}

function pickKeeper(rows: PlayerRow[]): { keeper: PlayerRow; retired: PlayerRow[] } {
  // Score each row; highest score = keeper.
  const scored = rows.map(r => {
    let score = 0;
    if (r.grade != null) score += 100;
    if (r.overall_rank != null) score += 50;
    if (r.tie_tier != null) score += 25;
    if (r.scouting_summary) score += 10;
    if (r.strengths) score += 5;
    // prefer Title Case (not all-uppercase) — likely from the prospect seed
    if (r.name && r.name !== r.name.toUpperCase()) score += 30;
    // tie-breaker: newer updated_at adds tiny weight
    score += new Date(r.updated_at).getTime() / 1e13;
    return { row: r, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return { keeper: scored[0].row, retired: scored.slice(1).map(s => s.row) };
}

/** Merge values from retired rows into keeper. Returns the patch object for UPDATE. */
function buildMergePatch(keeper: PlayerRow, retired: PlayerRow[]): Record<string, unknown> {
  const patch: Record<string, unknown> = {};

  // Identity: normalize keeper.name to Title Case
  const titleName = toTitleCase(keeper.name);
  if (titleName !== keeper.name) patch.name = titleName;

  // Roster fields: retired row's value wins if keeper is null AND retired has value
  // (retired = newer sqwaadrun scrape, fresher roster info)
  const ROSTER_FIELDS: (keyof PlayerRow)[] = [
    'height', 'weight', 'jersey_number', 'conference', 'birthplace',
    'unit', 'season', 'roster_source', 'roster_updated_at', 'level',
  ];

  for (const field of ROSTER_FIELDS) {
    if (keeper[field] == null) {
      // Find first non-null in retired set
      for (const r of retired) {
        if (r[field] != null) {
          patch[field as string] = r[field];
          break;
        }
      }
    }
  }

  // Grading fields: only fill from retired if keeper is null
  // (keeper was selected because it likely has grading; this is defensive)
  const GRADING_FILL: (keyof PlayerRow)[] = [
    'grade', 'tie_grade', 'tie_tier', 'overall_rank', 'position_rank',
    'projected_round', 'strengths', 'weaknesses', 'nfl_comparison',
    'scouting_summary', 'analyst_notes', 'film_grade',
    'forty_time', 'vertical_jump', 'bench_reps', 'broad_jump',
    'three_cone', 'shuttle', 'beast_rank', 'beast_grade',
    'pillar_athleticism', 'pillar_game_performance', 'pillar_intangibles',
  ];

  for (const field of GRADING_FILL) {
    if (keeper[field] == null) {
      for (const r of retired) {
        if (r[field] != null) {
          patch[field as string] = r[field];
          break;
        }
      }
    }
  }

  return patch;
}

(async () => {
  const startTotal = Date.now();
  console.log(`[dedupe] mode=${DRY_RUN ? 'DRY-RUN' : 'EXECUTE'}`);

  // ── Step 1: Find collision groups + fetch ALL collision rows in ONE query ──
  // Avoids N+1 round-trips to Neon. With 2,240 groups × 2 rows = 4,480 rows total,
  // a single SELECT WHERE (name_normalized, school, class_year, sport) IN (
  // collision_keys) is one trip, then group in memory.
  const collisionKeys = await sql<{ name_normalized: string; school: string; class_year: string; sport: string }[]>`
    SELECT name_normalized, school, class_year, sport
    FROM perform_players
    GROUP BY name_normalized, school, class_year, sport
    HAVING COUNT(*) > 1
  `;

  console.log(`[dedupe] collision_groups=${collisionKeys.length}`);

  if (collisionKeys.length === 0) {
    console.log('[dedupe] no collisions — promoting dedupe key to UNIQUE');
    if (!DRY_RUN) {
      try {
        await sql.unsafe(`
          DROP INDEX IF EXISTS perform_players_dedupe_key_idx;
          CREATE UNIQUE INDEX perform_players_dedupe_key_idx
            ON perform_players (name_normalized, school, class_year, sport);
        `);
        console.log('[dedupe] UNIQUE index promoted ✅');
      } catch (err) {
        console.error('[dedupe] index promotion failed:', err);
        process.exitCode = 1;
      }
    }
    await sql.end();
    return;
  }

  // Bulk-fetch every row that participates in a collision in one query.
  // Use a temp join: build a VALUES list and INNER JOIN on it.
  const allRows = await sql<PlayerRow[]>`
    SELECT p.*
    FROM perform_players p
    INNER JOIN (
      SELECT name_normalized, school, class_year, sport
      FROM perform_players
      GROUP BY name_normalized, school, class_year, sport
      HAVING COUNT(*) > 1
    ) g
    ON p.name_normalized = g.name_normalized
    AND p.school = g.school
    AND p.class_year = g.class_year
    AND p.sport = g.sport
  `;
  console.log(`[dedupe] collision_rows_fetched=${allRows.length}`);

  // Group rows in memory by composite key
  const groupMap = new Map<string, PlayerRow[]>();
  for (const r of allRows as PlayerRow[]) {
    const key = `${r.name_normalized}|${r.school}|${r.class_year}|${r.sport}`;
    let list = groupMap.get(key);
    if (!list) { list = []; groupMap.set(key, list); }
    list.push(r);
  }

  // ── Step 2: Process each group ────────────────────────────────────────
  let merged = 0;
  let deleted = 0;
  let renamed = 0;
  const sampleActions: string[] = [];
  const keeperUpdates: { id: number; patch: Record<string, unknown> }[] = [];
  const retireIds: number[] = [];

  for (const rows of groupMap.values()) {
    if (rows.length < 2) continue;
    const { keeper, retired } = pickKeeper(rows);
    const patch = buildMergePatch(keeper, retired);

    if (sampleActions.length < 8) {
      const variants = rows.map(r => r.name).join(' / ');
      sampleActions.push(`  keep id=${keeper.id} (${(patch.name as string) || keeper.name}) merge=${Object.keys(patch).length} retire_ids=[${retired.map(r => r.id).join(',')}] @ ${keeper.school} | variants: ${variants}`);
    }

    if (Object.keys(patch).length > 0) {
      keeperUpdates.push({ id: keeper.id, patch });
      if (patch.name) renamed++;
      merged++;
    }
    for (const r of retired) retireIds.push(r.id);
  }

  console.log('\n[dedupe] sample actions (first 8):');
  for (const a of sampleActions) console.log(a);
  console.log(`\n[dedupe] planned: merged=${merged} renamed=${renamed} delete=${retireIds.length}`);

  if (!DRY_RUN && keeperUpdates.length > 0) {
    console.log(`[dedupe] applying ${keeperUpdates.length} keeper UPDATEs (no-transaction, sequential)...`);
    // No transaction — keeper UPDATEs are independent and idempotent.
    // Easier to debug failures and avoids long-running tx on Neon.
    let appliedCount = 0;
    let lastErr: unknown = null;
    for (const { id, patch } of keeperUpdates) {
      const setClauses: string[] = [];
      const values: unknown[] = [];
      let idx = 0;
      for (const [k, v] of Object.entries(patch)) {
        idx++;
        setClauses.push(`${k} = $${idx}`);
        values.push(v);
      }
      idx++;
      values.push(id);
      try {
        await sql.unsafe(
          `UPDATE perform_players SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
          values as never[]
        );
        appliedCount++;
        if (appliedCount % 50 === 0) console.log(`[dedupe]   ${appliedCount}/${keeperUpdates.length} updates applied`);
      } catch (err) {
        lastErr = err;
        console.error(`[dedupe] UPDATE failed for keeper id=${id} patch keys=${Object.keys(patch).join(',')}:`, err instanceof Error ? err.message : err);
        if (appliedCount === 0) {
          // Bail early if EVERY update is failing
          console.error('[dedupe] aborting — first UPDATE failed, see error above');
          throw err;
        }
      }
    }
    console.log(`[dedupe] keeper UPDATEs done: applied=${appliedCount}/${keeperUpdates.length}`);
    if (lastErr && appliedCount < keeperUpdates.length) {
      console.error(`[dedupe] ${keeperUpdates.length - appliedCount} updates failed`);
    }
  }

  if (!DRY_RUN && retireIds.length > 0) {
    console.log('[dedupe] deleting retired rows...');
    // Single DELETE via ANY(int[])
    await sql`DELETE FROM perform_players WHERE id = ANY(${retireIds})`;
    deleted = retireIds.length;
    console.log(`[dedupe] deleted ${deleted} retired rows`);
  }

  console.log('\n[dedupe] sample actions (first 8):');
  for (const a of sampleActions) console.log(a);

  console.log(`\n[dedupe] groups_processed=${collisionKeys.length} merged=${merged} renamed=${renamed} deleted=${deleted}`);

  // ── Step 3: Verify zero collisions remain and promote unique index ────
  const [{ remaining }] = await sql<{ remaining: number }[]>`
    SELECT COUNT(*)::int AS remaining FROM (
      SELECT 1 FROM perform_players
      GROUP BY name_normalized, school, class_year, sport
      HAVING COUNT(*) > 1
    ) g
  `;
  console.log(`[dedupe] remaining_collisions=${remaining}`);

  if (!DRY_RUN && remaining === 0) {
    try {
      await sql.unsafe(`
        DROP INDEX IF EXISTS perform_players_dedupe_key_idx;
        CREATE UNIQUE INDEX perform_players_dedupe_key_idx
          ON perform_players (name_normalized, school, class_year, sport);
      `);
      console.log('[dedupe] UNIQUE index promoted ✅');
    } catch (err) {
      console.error('[dedupe] UNIQUE index promotion failed:', err);
      process.exitCode = 1;
    }
  } else if (remaining > 0) {
    console.error(`[dedupe] cannot promote to UNIQUE — ${remaining} collisions still present`);
    process.exitCode = 1;
  }

  const [{ total }] = await sql<{ total: number }[]>`SELECT COUNT(*)::int AS total FROM perform_players`;
  console.log(`[dedupe] perform_players total = ${total}`);
  console.log(`[dedupe] elapsed = ${((Date.now() - startTotal) / 1000).toFixed(1)}s`);

  await sql.end();
})();
