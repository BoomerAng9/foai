/**
 * load-digital-twin.mjs
 *
 * Phase 1 of PERFORM-FRAN-SIM-001
 * Creates franchise schema, loads 92 team profiles (NFL/NBA/MLB),
 * and populates the personnel pool from digital twin data.
 *
 * Usage: DATABASE_URL="..." node scripts/load-digital-twin.mjs
 */

import postgres from 'postgres';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const DATABASE_URL = process.env.DATABASE_URL || '';
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }

const sql = postgres(DATABASE_URL, { ssl: 'require', max: 5 });

// ── Schema creation ─────────────────────────────────────────────────────

async function createSchema() {
  console.log('Creating franchise schema and tables...');

  await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS franchise`);

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS franchise.team_profiles (
      id SERIAL PRIMARY KEY,
      sport TEXT NOT NULL,
      team_name TEXT NOT NULL,
      abbreviation TEXT NOT NULL,
      conference TEXT,
      division TEXT,
      profile JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(sport, abbreviation)
    )
  `);

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS franchise.personnel_pool (
      id SERIAL PRIMARY KEY,
      sport TEXT NOT NULL,
      person_type TEXT NOT NULL,
      name TEXT NOT NULL,
      current_team TEXT,
      position TEXT,
      stats JSONB DEFAULT '{}',
      contract JSONB DEFAULT '{}',
      profile JSONB DEFAULT '{}',
      available BOOLEAN DEFAULT true,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS franchise.simulation_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      sport TEXT NOT NULL,
      mode TEXT NOT NULL,
      team_abbr TEXT NOT NULL,
      modifications JSONB NOT NULL DEFAULT '{}',
      results JSONB,
      managed_agent_session_id TEXT,
      tokens_used INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_team_profiles_sport ON franchise.team_profiles(sport)`);
  await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_personnel_pool_sport ON franchise.personnel_pool(sport, person_type)`);
  await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_sim_sessions_user ON franchise.simulation_sessions(user_id)`);

  console.log('Schema and tables created.');
}

// ── Load team data files ────────────────────────────────────────────────

function loadJSON(relativePath) {
  return JSON.parse(readFileSync(resolve(root, relativePath), 'utf-8'));
}

// ── Upsert teams ────────────────────────────────────────────────────────

async function upsertTeams(sport, teams) {
  let count = 0;
  for (const team of teams) {
    const teamName = team.team;
    const abbr = team.abbreviation;
    const conference = team.conference || team.league || null;
    const division = team.division || null;

    await sql`
      INSERT INTO franchise.team_profiles (sport, team_name, abbreviation, conference, division, profile, updated_at)
      VALUES (${sport}, ${teamName}, ${abbr}, ${conference}, ${division}, ${JSON.stringify(team)}::jsonb, NOW())
      ON CONFLICT (sport, abbreviation)
      DO UPDATE SET
        team_name = EXCLUDED.team_name,
        conference = EXCLUDED.conference,
        division = EXCLUDED.division,
        profile = EXCLUDED.profile,
        updated_at = NOW()
    `;
    count++;
  }
  return count;
}

// ── Extract personnel ───────────────────────────────────────────────────

async function clearPersonnel() {
  await sql`DELETE FROM franchise.personnel_pool`;
}

async function insertPerson(sport, personType, name, currentTeam, position, profile, available) {
  await sql`
    INSERT INTO franchise.personnel_pool (sport, person_type, name, current_team, position, profile, available, updated_at)
    VALUES (${sport}, ${personType}, ${name}, ${currentTeam}, ${position}, ${JSON.stringify(profile)}::jsonb, ${available}, NOW())
  `;
}

// ── NFL personnel extraction ────────────────────────────────────────────

async function extractNFLPersonnel(teams) {
  let count = 0;

  for (const team of teams) {
    // GM
    if (team.gm?.name) {
      await insertPerson('nfl', 'gm', team.gm.name, team.abbreviation, 'General Manager', {
        tenure: team.gm.tenure,
        philosophy: team.gm.philosophy,
        analytics_approach: team.gm.analytics_approach,
      }, false);
      count++;
    }

    // Head Coach
    if (team.head_coach?.name) {
      await insertPerson('nfl', 'coach', team.head_coach.name, team.abbreviation, 'Head Coach', {
        tenure: team.head_coach.tenure,
        scheme_offense: team.head_coach.scheme_offense,
        scheme_defense: team.head_coach.scheme_defense,
        key_position_values: team.head_coach.key_position_values,
      }, false);
      count++;
    }
  }

  // Known available/fired NFL coaches and GMs (from research data — teams with new hires)
  const availableNFL = [
    { type: 'coach', name: 'John Harbaugh', position: 'Head Coach', profile: { note: 'Fired by Baltimore after 18 years, replaced by new HC in January 2026' } },
    { type: 'coach', name: 'Raheem Morris', position: 'Head Coach', profile: { note: 'Fired by LA Rams after 2025 season' } },
    { type: 'coach', name: 'Sean McDermott', position: 'Head Coach', profile: { note: 'Fired by Buffalo Bills' } },
    { type: 'gm', name: 'Kwesi Adofo-Mensah', position: 'General Manager', profile: { note: 'Fired by Minnesota Vikings' } },
    { type: 'coach', name: 'Kevin OConnell', position: 'Head Coach', profile: { note: 'Former Vikings HC, moved on after organizational overhaul' } },
    { type: 'gm', name: 'Ran Carthon', position: 'General Manager', profile: { note: 'Fired by Tennessee Titans during rebuild' } },
    { type: 'coach', name: 'Brian Callahan', position: 'Head Coach', profile: { note: 'Fired by Tennessee Titans after 1 season' } },
    { type: 'coach', name: 'Dennis Allen', position: 'Head Coach', profile: { note: 'Fired by New Orleans Saints midseason 2024' } },
    { type: 'gm', name: 'Terry Fontenot', position: 'General Manager', profile: { note: 'Former Atlanta Falcons GM, let go after rebuild' } },
    { type: 'coach', name: 'Dave Canales', position: 'Offensive Coordinator', profile: { note: 'Former Carolina Panthers HC candidate, experienced playcaller' } },
    { type: 'gm', name: 'Howie Roseman', position: 'General Manager', profile: { note: 'Longtime Eagles exec, potential availability after organizational changes' } },
    { type: 'coach', name: 'Antonio Pierce', position: 'Head Coach', profile: { note: 'Fired by Las Vegas Raiders after 2024 season' } },
    { type: 'gm', name: 'Tom Telesco', position: 'General Manager', profile: { note: 'Former Raiders GM, let go during front office overhaul' } },
  ];

  for (const p of availableNFL) {
    await insertPerson('nfl', p.type, p.name, null, p.position, p.profile, true);
    count++;
  }

  return count;
}

// ── NBA personnel extraction ────────────────────────────────────────────

async function extractNBAPersonnel(teams) {
  let count = 0;

  for (const team of teams) {
    // Coach
    if (team.coach?.name) {
      await insertPerson('nba', 'coach', team.coach.name, team.abbreviation, 'Head Coach', {
        style: team.coach.style,
      }, false);
      count++;
    }

    // GM / President of Basketball Ops
    if (team.gm?.name) {
      await insertPerson('nba', 'gm', team.gm.name, team.abbreviation, 'GM/President of Basketball Ops', {
        tenure: team.gm.tenure,
        philosophy: team.gm.philosophy,
      }, false);
      count++;
    }
  }

  // Known available/fired NBA coaches and GMs (from research data)
  const availableNBA = [
    { type: 'gm', name: 'Landry Fields', position: 'GM', profile: { note: 'Fired by Atlanta Hawks in April 2025' } },
    { type: 'gm', name: 'Arturas Karnisovas', position: 'President of Basketball Ops', profile: { note: 'Fired by Chicago Bulls in April 2026' } },
    { type: 'gm', name: 'Marc Eversley', position: 'GM', profile: { note: 'Fired by Chicago Bulls in April 2026' } },
    { type: 'gm', name: 'Nico Harrison', position: 'GM', profile: { note: 'Fired by Dallas Mavericks in November 2025' } },
    { type: 'coach', name: 'Michael Malone', position: 'Head Coach', profile: { note: 'Fired by Denver Nuggets in April 2025' } },
    { type: 'gm', name: 'Calvin Booth', position: 'GM', profile: { note: 'Fired by Denver Nuggets in April 2025' } },
    { type: 'coach', name: 'Willie Green', position: 'Head Coach', profile: { note: 'Fired by New Orleans Pelicans after 2-10 start in 2025-26' } },
    { type: 'gm', name: 'David Griffin', position: 'EVP Basketball Ops', profile: { note: 'Fired by New Orleans Pelicans' } },
    { type: 'coach', name: 'Tom Thibodeau', position: 'Head Coach', profile: { note: 'Fired by New York Knicks after 5 seasons, replaced by Mike Brown' } },
    { type: 'coach', name: 'Chauncey Billups', position: 'Head Coach', profile: { note: 'Former Portland Trail Blazers HC' } },
    { type: 'gm', name: 'Joe Cronin', position: 'GM', profile: { note: 'Former Portland Trail Blazers GM' } },
  ];

  for (const p of availableNBA) {
    await insertPerson('nba', p.type, p.name, null, p.position, p.profile, true);
    count++;
  }

  return count;
}

// ── MLB personnel extraction ────────────────────────────────────────────

async function extractMLBPersonnel(teams) {
  let count = 0;

  for (const team of teams) {
    // Manager
    if (team.manager?.name) {
      await insertPerson('mlb', 'manager', team.manager.name, team.abbreviation, 'Manager', {
        style: team.manager.style,
      }, false);
      count++;
    }

    // GM
    if (team.gm?.name) {
      await insertPerson('mlb', 'gm', team.gm.name, team.abbreviation, 'GM/President of Baseball Ops', {
        tenure: team.gm.tenure,
        philosophy: team.gm.philosophy,
      }, false);
      count++;
    }
  }

  // Known available/fired MLB managers and GMs (from research data)
  const availableMLB = [
    { type: 'manager', name: 'Pedro Grifol', position: 'Manager', profile: { note: 'Fired by Chicago White Sox, replaced by Will Venable' } },
    { type: 'manager', name: 'David Bell', position: 'Manager', profile: { note: 'Fired by Cincinnati Reds, replaced by Terry Francona' } },
    { type: 'manager', name: 'Derek Shelton', position: 'Manager', profile: { note: 'Fired by Pittsburgh Pirates in May 2025, replaced by Don Kelly' } },
    { type: 'gm', name: 'Farhan Zaidi', position: 'President of Baseball Ops', profile: { note: 'Fired by San Francisco Giants, replaced by Buster Posey' } },
    { type: 'gm', name: 'John Mozeliak', position: 'President of Baseball Ops', profile: { note: 'Replaced by Chaim Bloom at St. Louis Cardinals in October 2025' } },
    { type: 'gm', name: 'Mike Rizzo', position: 'GM/President of Baseball Ops', profile: { note: 'Fired by Washington Nationals in July 2025' } },
    { type: 'gm', name: 'Kim Ng', position: 'GM', profile: { note: 'Replaced by Peter Bendix as president of baseball operations at Miami' } },
    { type: 'manager', name: 'Brian Snitker', position: 'Manager', profile: { note: 'Replaced by Walt Weiss at Atlanta Braves after long tenure' } },
    { type: 'manager', name: 'Barry Larkin', position: 'Manager', profile: { note: 'Declined Cincinnati Reds managerial offer' } },
    { type: 'manager', name: 'Craig Albernaz', position: 'Manager', profile: { note: 'Former Guardians associate manager, now at Baltimore' } },
  ];

  for (const p of availableMLB) {
    await insertPerson('mlb', p.type, p.name, null, p.position, p.profile, true);
    count++;
  }

  return count;
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Per|Form Digital Twin Loader ===');
  console.log('PERFORM-FRAN-SIM-001 Phase 1\n');

  // Step 1: Create schema
  await createSchema();

  // Step 2: Load team data
  const nflData = loadJSON('data/nfl-teams/nfl-teams-2026.json');
  const nbaData = loadJSON('data/nba-teams/nba-teams-2026.json');
  const mlbData = loadJSON('data/mlb-teams/mlb-teams-2026.json');

  const nflTeams = nflData.teams; // NFL wraps in { meta, teams }
  const nbaTeams = nbaData;       // NBA is a flat array
  const mlbTeams = mlbData;       // MLB is a flat array

  console.log(`\nLoaded: NFL=${nflTeams.length}, NBA=${nbaTeams.length}, MLB=${mlbTeams.length}`);

  // Step 3: Upsert team profiles
  const nflCount = await upsertTeams('nfl', nflTeams);
  const nbaCount = await upsertTeams('nba', nbaTeams);
  const mlbCount = await upsertTeams('mlb', mlbTeams);

  console.log(`\nTeam profiles upserted:`);
  console.log(`  NFL: ${nflCount}`);
  console.log(`  NBA: ${nbaCount}`);
  console.log(`  MLB: ${mlbCount}`);
  console.log(`  Total: ${nflCount + nbaCount + mlbCount}`);

  // Step 4: Clear and rebuild personnel pool
  await clearPersonnel();

  const nflPersonnel = await extractNFLPersonnel(nflTeams);
  const nbaPersonnel = await extractNBAPersonnel(nbaTeams);
  const mlbPersonnel = await extractMLBPersonnel(mlbTeams);

  console.log(`\nPersonnel pool populated:`);
  console.log(`  NFL: ${nflPersonnel} (coaches + GMs + available)`);
  console.log(`  NBA: ${nbaPersonnel} (coaches + GMs + available)`);
  console.log(`  MLB: ${mlbPersonnel} (managers + GMs + available)`);
  console.log(`  Total: ${nflPersonnel + nbaPersonnel + mlbPersonnel}`);

  // Step 5: Verify counts
  const [teamCount] = await sql`SELECT COUNT(*) AS count FROM franchise.team_profiles`;
  const [personnelCount] = await sql`SELECT COUNT(*) AS count FROM franchise.personnel_pool`;
  const sportBreakdown = await sql`SELECT sport, COUNT(*) AS count FROM franchise.team_profiles GROUP BY sport ORDER BY sport`;
  const personnelBreakdown = await sql`SELECT sport, person_type, COUNT(*) AS count, SUM(CASE WHEN available THEN 1 ELSE 0 END) AS available_count FROM franchise.personnel_pool GROUP BY sport, person_type ORDER BY sport, person_type`;

  console.log(`\n=== Verification ===`);
  console.log(`Team profiles in DB: ${teamCount.count}`);
  for (const row of sportBreakdown) {
    console.log(`  ${row.sport}: ${row.count}`);
  }
  console.log(`\nPersonnel in DB: ${personnelCount.count}`);
  for (const row of personnelBreakdown) {
    console.log(`  ${row.sport} ${row.person_type}: ${row.count} (${row.available_count} available)`);
  }

  console.log('\nPhase 1 complete.');
  await sql.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
