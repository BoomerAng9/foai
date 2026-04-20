/**
 * scripts/cleanup-stale-cfb-teams.ts
 * ====================================
 * One-shot cleanup: removes CFB rows from perform_teams that were created
 * by the pre-slug initials-based seed (seed-teams.ts prior to the slug fix).
 *
 * Those rows have slug IS NULL because the re-seed with schoolSlug() created
 * NEW rows (the ON CONFLICT (sport, abbreviation) key changed from 'MS' →
 * 'michigan-state') instead of updating the old ones. Result pre-cleanup:
 * 401 stale initials rows + 669 new slug rows = 1070 CFB rows where there
 * should only be ~672.
 *
 * Safe because:
 *   - Old CFB rows have no foreign-key dependents (perform_team_rosters is
 *     empty for CFB — CFB rosters come from perform_players.school)
 *   - slug IS NULL is a deterministic filter introduced only by this plan
 *
 * Run: npx tsx scripts/cleanup-stale-cfb-teams.ts
 */

import postgres from 'postgres';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
}

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 2 });

(async () => {
  const [{ before }] = await sql<{ before: number }[]>`
    SELECT COUNT(*)::int AS before FROM perform_teams WHERE sport='cfb'
  `;
  const [{ stale }] = await sql<{ stale: number }[]>`
    SELECT COUNT(*)::int AS stale FROM perform_teams WHERE sport='cfb' AND slug IS NULL
  `;
  console.log(`[cleanup] cfb rows before: ${before}, stale (slug IS NULL): ${stale}`);

  if (stale === 0) {
    console.log('[cleanup] nothing to clean');
    await sql.end();
    return;
  }

  // Sample of what will be deleted, for audit
  const samples = await sql<{ abbreviation: string; full_name: string }[]>`
    SELECT abbreviation, full_name FROM perform_teams
    WHERE sport='cfb' AND slug IS NULL
    ORDER BY abbreviation ASC
    LIMIT 10
  `;
  console.log('[cleanup] sample stale rows:');
  for (const s of samples) console.log(`  abbrev='${s.abbreviation}' name='${s.full_name}'`);

  const result = await sql`DELETE FROM perform_teams WHERE sport='cfb' AND slug IS NULL`;
  console.log(`[cleanup] deleted ${result.count} stale rows`);

  const [{ after }] = await sql<{ after: number }[]>`
    SELECT COUNT(*)::int AS after FROM perform_teams WHERE sport='cfb'
  `;
  const [{ collisions }] = await sql<{ collisions: number }[]>`
    SELECT COUNT(*)::int AS collisions FROM (
      SELECT slug FROM perform_teams WHERE sport='cfb' GROUP BY slug HAVING COUNT(*) > 1
    ) g
  `;
  console.log(`[cleanup] cfb rows after: ${after}, slug collisions remaining: ${collisions} (expected 0)`);

  // Spot-check the class of names that caused the original bug
  const spotCheck = await sql`
    SELECT slug, full_name FROM perform_teams
    WHERE sport='cfb' AND full_name IN ('Michigan State', 'Mississippi State', 'Miami (FL)', 'Miami', 'North Carolina A&T', 'Texas A&M')
    ORDER BY full_name
  `;
  console.log('[cleanup] spot-check (collision-prone names):');
  for (const r of spotCheck) console.log(`  ${(r.full_name as string).padEnd(24)} → slug='${r.slug}'`);

  await sql.end();
})();
