/**
 * scripts/seed-teams.ts
 * =======================
 * Seeds perform_teams from the JSON files at perform/data/{nfl,nba,mlb}-teams/.
 * Idempotent — uses ON CONFLICT (sport, abbreviation) so re-runs update.
 *
 * NFL: 32 individual files (kansas-city-chiefs.json etc.) + nfl-teams-2026.json
 * NBA: nba-teams-2026.json (array)
 * MLB: mlb-teams-2026.json (array)
 * CFB: derived from DISTINCT school in perform_players (no JSON source needed)
 *
 * Run: npx tsx scripts/seed-teams.ts
 */

import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';
import { schoolSlug } from '../src/lib/schools/school-slug';

const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
}

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 4 });

interface NflTeamFile {
  team: string;
  abbreviation: string;
  conference: string;
  division: string;
  ownership?: Record<string, unknown>;
  gm?: Record<string, unknown>;
  head_coach?: Record<string, unknown>;
  decision_makers?: Record<string, unknown>;
  draft_capital_2026?: Record<string, unknown>;
  needs?: Array<Record<string, unknown>>;
  roster_2026?: Record<string, unknown>;
}

interface NbaMlbTeam {
  team: string;
  abbreviation: string;
  conference?: string;
  division?: string;
  league?: string;
  owner?: Record<string, unknown>;
  gm?: Record<string, unknown>;
  coach?: Record<string, unknown>;
  decision_chain?: string;
  window?: string;
  key_storylines?: string[];
}

async function seedNfl(): Promise<{ inserted: number; updated: number }> {
  const dir = path.join(process.cwd(), 'data', 'nfl-teams');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'nfl-teams-2026.json' && f !== 'team-needs-2026.json');
  let inserted = 0;
  let updated = 0;

  for (const file of files) {
    const filePath = path.join(dir, file);
    let data: NflTeamFile;
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as NflTeamFile;
    } catch (err) {
      console.error(`[seed-teams] skip ${file} — JSON parse error:`, err instanceof Error ? err.message : err);
      continue;
    }
    if (!data.team || !data.abbreviation) {
      console.error(`[seed-teams] skip ${file} — missing team/abbreviation`);
      continue;
    }

    const result = await sql`
      INSERT INTO perform_teams (
        sport, league, abbreviation, full_name, short_name,
        conference, division,
        ownership, general_manager, head_coach, decision_chain,
        draft_capital_2026, team_needs, key_storylines,
        data_source, slug
      ) VALUES (
        'nfl', 'NFL', ${data.abbreviation}, ${data.team},
        ${data.team.split(' ').slice(-1)[0]},
        ${data.conference ?? null}, ${data.division ?? null},
        ${data.ownership ? JSON.stringify(data.ownership) : '{}'}::jsonb,
        ${data.gm ? JSON.stringify(data.gm) : '{}'}::jsonb,
        ${data.head_coach ? JSON.stringify(data.head_coach) : '{}'}::jsonb,
        ${typeof data.decision_makers?.primary === 'string' ? data.decision_makers.primary : null},
        ${data.draft_capital_2026 ? JSON.stringify(data.draft_capital_2026) : '{}'}::jsonb,
        ${data.needs ? JSON.stringify(data.needs) : '[]'}::jsonb,
        ${data.roster_2026 ? JSON.stringify([data.roster_2026]) : '[]'}::jsonb,
        ${file},
        ${schoolSlug(data.team)}
      )
      ON CONFLICT (sport, abbreviation) DO UPDATE SET
        full_name        = EXCLUDED.full_name,
        conference       = EXCLUDED.conference,
        division         = EXCLUDED.division,
        ownership        = EXCLUDED.ownership,
        general_manager  = EXCLUDED.general_manager,
        head_coach       = EXCLUDED.head_coach,
        decision_chain   = EXCLUDED.decision_chain,
        draft_capital_2026 = EXCLUDED.draft_capital_2026,
        team_needs       = EXCLUDED.team_needs,
        key_storylines   = EXCLUDED.key_storylines,
        data_source      = EXCLUDED.data_source,
        slug             = EXCLUDED.slug,
        updated_at       = NOW()
      RETURNING (xmax = 0) AS was_insert
    `;
    if (result[0]?.was_insert) inserted++; else updated++;
  }
  return { inserted, updated };
}

async function seedFromArray(file: string, sport: string, league: string): Promise<{ inserted: number; updated: number }> {
  const filePath = path.join(process.cwd(), 'data', `${sport}-teams`, file);
  if (!fs.existsSync(filePath)) {
    console.error(`[seed-teams] ${sport}: ${filePath} not found, skipping`);
    return { inserted: 0, updated: 0 };
  }
  let teams: NbaMlbTeam[];
  try {
    teams = JSON.parse(fs.readFileSync(filePath, 'utf8')) as NbaMlbTeam[];
  } catch (err) {
    console.error(`[seed-teams] ${sport}: JSON parse failed:`, err instanceof Error ? err.message : err);
    return { inserted: 0, updated: 0 };
  }
  if (!Array.isArray(teams)) {
    console.error(`[seed-teams] ${sport}: file is not an array, got ${typeof teams}`);
    return { inserted: 0, updated: 0 };
  }

  let inserted = 0;
  let updated = 0;

  for (const t of teams) {
    if (!t.team || !t.abbreviation) {
      console.warn(`[seed-teams] ${sport}: skip team missing name/abbreviation:`, t);
      continue;
    }
    const result = await sql`
      INSERT INTO perform_teams (
        sport, league, abbreviation, full_name, short_name,
        conference, division,
        ownership, general_manager, head_coach,
        decision_chain, key_storylines, window_state,
        data_source, slug
      ) VALUES (
        ${sport}, ${league}, ${t.abbreviation}, ${t.team},
        ${t.team.split(' ').slice(-1)[0]},
        ${t.conference ?? null}, ${t.division ?? null},
        ${t.owner ? JSON.stringify(t.owner) : '{}'}::jsonb,
        ${t.gm ? JSON.stringify(t.gm) : '{}'}::jsonb,
        ${t.coach ? JSON.stringify(t.coach) : '{}'}::jsonb,
        ${t.decision_chain ?? null},
        ${t.key_storylines ? JSON.stringify(t.key_storylines) : '[]'}::jsonb,
        ${t.window ?? null},
        ${file},
        ${schoolSlug(t.team)}
      )
      ON CONFLICT (sport, abbreviation) DO UPDATE SET
        full_name      = EXCLUDED.full_name,
        conference     = EXCLUDED.conference,
        division       = EXCLUDED.division,
        ownership      = EXCLUDED.ownership,
        general_manager = EXCLUDED.general_manager,
        head_coach     = EXCLUDED.head_coach,
        decision_chain = EXCLUDED.decision_chain,
        key_storylines = EXCLUDED.key_storylines,
        window_state   = EXCLUDED.window_state,
        data_source    = EXCLUDED.data_source,
        slug           = EXCLUDED.slug,
        updated_at     = NOW()
      RETURNING (xmax = 0) AS was_insert
    `;
    if (result[0]?.was_insert) inserted++; else updated++;
  }
  return { inserted, updated };
}

async function seedCfbFromPlayers(): Promise<{ inserted: number; updated: number }> {
  // Derive CFB teams from DISTINCT school in perform_players (where level='college')
  const schools = await sql<{ school: string; conference: string | null; player_count: number }[]>`
    SELECT school,
           MAX(conference) AS conference,
           COUNT(*)::int AS player_count
    FROM perform_players
    WHERE school IS NOT NULL
      AND level = 'college'
      AND sport = 'football'
    GROUP BY school
    ORDER BY school
  `;
  console.log(`[seed-teams] cfb: derived ${schools.length} distinct schools from perform_players`);

  let inserted = 0;
  let updated = 0;

  for (const s of schools) {
    if (!s.school || s.school.length === 0) continue;

    // Deterministic CFB identity: slug derived from full school name.
    // Kills the Michigan State / Mississippi State / etc. collision that
    // initials-based abbreviations produced (silent merge via ON CONFLICT).
    const slug = schoolSlug(s.school);
    if (!slug) continue;

    const result = await sql`
      INSERT INTO perform_teams (
        sport, league, abbreviation, full_name, short_name,
        conference, data_source, slug
      ) VALUES (
        'cfb',
        'CFB',
        ${slug},
        ${s.school},
        ${s.school},
        ${s.conference ?? null},
        'derived_from_perform_players',
        ${slug}
      )
      ON CONFLICT (sport, abbreviation) DO UPDATE SET
        full_name  = EXCLUDED.full_name,
        conference = EXCLUDED.conference,
        slug       = EXCLUDED.slug,
        updated_at = NOW()
      RETURNING (xmax = 0) AS was_insert
    `;
    if (result[0]?.was_insert) inserted++; else updated++;
  }
  return { inserted, updated };
}

(async () => {
  const start = Date.now();

  console.log('[seed-teams] seeding NFL teams from per-team JSON files...');
  const nfl = await seedNfl();
  console.log(`[seed-teams] nfl: inserted=${nfl.inserted} updated=${nfl.updated}`);

  console.log('[seed-teams] seeding NBA teams from nba-teams-2026.json...');
  const nba = await seedFromArray('nba-teams-2026.json', 'nba', 'NBA');
  console.log(`[seed-teams] nba: inserted=${nba.inserted} updated=${nba.updated}`);

  console.log('[seed-teams] seeding MLB teams from mlb-teams-2026.json...');
  const mlb = await seedFromArray('mlb-teams-2026.json', 'mlb', 'MLB');
  console.log(`[seed-teams] mlb: inserted=${mlb.inserted} updated=${mlb.updated}`);

  console.log('[seed-teams] deriving CFB teams from perform_players...');
  const cfb = await seedCfbFromPlayers();
  console.log(`[seed-teams] cfb: inserted=${cfb.inserted} updated=${cfb.updated}`);

  const [{ total }] = await sql<{ total: number }[]>`SELECT COUNT(*)::int AS total FROM perform_teams`;
  console.log(`\n[seed-teams] perform_teams total = ${total}`);
  console.log(`[seed-teams] elapsed = ${((Date.now() - start) / 1000).toFixed(1)}s`);

  await sql.end();
})();
