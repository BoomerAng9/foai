/**
 * Direct seed — 2,268 regraded prospects into Neon
 * Run: npx tsx scripts/seed-players.ts
 */
import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local manually
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

interface Prospect {
  name: string; position: string; school: string;
  beastRank: number | null; beastPositionRank: number | null;
  tieGrade: number; tieLabel: string; projectedRound: number;
  pillars: { gamePerformance: number; athleticism: number; intangibles: number; multiPositionBonus: number };
  athleticismSource: string; beastGrade: string | null;
  measurements: { height?: string; weight?: number; forty?: number; vertical?: number; broad?: string; arm?: string; wingspan?: string };
  performRank?: number;
}

function tieLabel(s: number) {
  if (s >= 101) return 'Prime Player'; if (s >= 90) return 'Elite Prospect';
  if (s >= 85) return 'First Round Lock'; if (s >= 80) return 'Day 1 Starter';
  if (s >= 75) return 'Quality Starter'; if (s >= 70) return 'Solid Contributor';
  if (s >= 65) return 'Developmental'; if (s >= 60) return 'Depth Player';
  return 'UDFA';
}
function tieTier(s: number) {
  if (s >= 90) return 'Tier 1'; if (s >= 85) return 'Tier 2'; if (s >= 80) return 'Tier 3';
  if (s >= 75) return 'Tier 4'; if (s >= 70) return 'Tier 5'; if (s >= 65) return 'Tier 6';
  return 'Tier 7';
}
function parseBroad(b?: string | number): number | null {
  if (b == null) return null;
  if (typeof b === 'number') return isFinite(b) ? b : null;
  const m = b.match(/(\d+)'(\d+)/);
  if (m) return parseInt(m[1]) * 12 + parseInt(m[2]);
  const n = parseFloat(b);
  return isNaN(n) ? null : n;
}
function num(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  const s = v.replace(/[()]/g, '').trim();
  if (!s || /dnp|did not/i.test(s)) return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

async function main() {
  const jsonPath = path.join(process.cwd(), 'src', 'lib', 'draft', 'regraded-prospects.json');
  if (!fs.existsSync(jsonPath)) throw new Error('regraded-prospects.json missing — run scripts/run-regrade.ts');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const prospects: Prospect[] = data.prospects || [];
  console.log(`Loaded ${prospects.length} prospects`);

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS perform_players (
      id SERIAL PRIMARY KEY, name TEXT NOT NULL, school TEXT NOT NULL, position TEXT NOT NULL,
      height TEXT, weight TEXT, class_year TEXT DEFAULT '2026',
      forty_time NUMERIC, vertical_jump NUMERIC, bench_reps NUMERIC, broad_jump NUMERIC,
      three_cone NUMERIC, shuttle NUMERIC, arm_length TEXT, wingspan TEXT,
      overall_rank INTEGER, position_rank INTEGER, projected_round INTEGER,
      grade NUMERIC(4,1), tie_grade TEXT, tie_tier TEXT, trend TEXT DEFAULT 'steady',
      key_stats TEXT, strengths TEXT, weaknesses TEXT, nfl_comparison TEXT,
      scouting_summary TEXT, analyst_notes TEXT, film_grade TEXT,
      beast_rank INTEGER, beast_grade TEXT, athleticism_source TEXT,
      pillar_game_performance NUMERIC(4,1), pillar_athleticism NUMERIC(4,1),
      pillar_intangibles NUMERIC(4,1), multi_position_bonus NUMERIC(3,1) DEFAULT 0,
      sport TEXT DEFAULT 'football',
      created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(name, school, class_year)
    )
  `);
  for (const col of [
    'arm_length TEXT', 'wingspan TEXT', 'beast_rank INTEGER', 'beast_grade TEXT',
    'athleticism_source TEXT', 'pillar_game_performance NUMERIC(4,1)',
    'pillar_athleticism NUMERIC(4,1)', 'pillar_intangibles NUMERIC(4,1)',
    'multi_position_bonus NUMERIC(3,1) DEFAULT 0', "sport TEXT DEFAULT 'football'",
  ]) {
    try { await sql.unsafe(`ALTER TABLE perform_players ADD COLUMN IF NOT EXISTS ${col}`); } catch {}
  }

  let inserted = 0, errors = 0;
  for (let i = 0; i < prospects.length; i++) {
    const p = prospects[i];
    try {
      const broadInches = parseBroad(p.measurements.broad);
      const performRank = p.performRank || i + 1;
      await sql`
        INSERT INTO perform_players (
          name, school, position, height, weight, class_year,
          forty_time, vertical_jump, broad_jump, arm_length, wingspan,
          overall_rank, position_rank, projected_round, grade,
          tie_grade, tie_tier, trend,
          beast_rank, beast_grade, athleticism_source,
          pillar_game_performance, pillar_athleticism, pillar_intangibles, multi_position_bonus,
          scouting_summary, sport
        ) VALUES (
          ${p.name}, ${p.school}, ${p.position},
          ${p.measurements.height || null}, ${p.measurements.weight ? String(p.measurements.weight) : null}, '2026',
          ${num(p.measurements.forty)}, ${num(p.measurements.vertical)},
          ${broadInches}, ${p.measurements.arm || null}, ${p.measurements.wingspan || null},
          ${performRank}, ${p.beastPositionRank || null}, ${p.projectedRound}, ${p.tieGrade},
          ${tieLabel(p.tieGrade)}, ${tieTier(p.tieGrade)}, 'steady',
          ${p.beastRank || null}, ${p.beastGrade || null}, ${p.athleticismSource},
          ${p.pillars.gamePerformance}, ${p.pillars.athleticism}, ${p.pillars.intangibles}, ${p.pillars.multiPositionBonus},
          ${p.beastRank ? `Beast #${p.beastRank} | ${p.tieLabel}` : p.tieLabel}, 'football'
        )
        ON CONFLICT (name, school, class_year) DO UPDATE SET
          position = EXCLUDED.position,
          height = COALESCE(EXCLUDED.height, perform_players.height),
          weight = COALESCE(EXCLUDED.weight, perform_players.weight),
          forty_time = COALESCE(EXCLUDED.forty_time, perform_players.forty_time),
          vertical_jump = COALESCE(EXCLUDED.vertical_jump, perform_players.vertical_jump),
          broad_jump = COALESCE(EXCLUDED.broad_jump, perform_players.broad_jump),
          arm_length = COALESCE(EXCLUDED.arm_length, perform_players.arm_length),
          wingspan = COALESCE(EXCLUDED.wingspan, perform_players.wingspan),
          overall_rank = EXCLUDED.overall_rank,
          position_rank = COALESCE(EXCLUDED.position_rank, perform_players.position_rank),
          projected_round = EXCLUDED.projected_round,
          grade = EXCLUDED.grade,
          tie_grade = EXCLUDED.tie_grade,
          tie_tier = EXCLUDED.tie_tier,
          beast_rank = COALESCE(EXCLUDED.beast_rank, perform_players.beast_rank),
          beast_grade = COALESCE(EXCLUDED.beast_grade, perform_players.beast_grade),
          athleticism_source = EXCLUDED.athleticism_source,
          pillar_game_performance = EXCLUDED.pillar_game_performance,
          pillar_athleticism = EXCLUDED.pillar_athleticism,
          pillar_intangibles = EXCLUDED.pillar_intangibles,
          multi_position_bonus = EXCLUDED.multi_position_bonus,
          sport = COALESCE(EXCLUDED.sport, perform_players.sport, 'football'),
          updated_at = NOW()
      `;
      inserted++;
      if (inserted % 200 === 0) console.log(`  ${inserted}/${prospects.length}`);
    } catch (err) {
      errors++;
      if (errors <= 5) console.error(`  error ${p.name}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\nDone: ${inserted} inserted, ${errors} errors`);
  console.log(`Round distribution:`);
  console.log(`  R1: ${prospects.filter(p => p.projectedRound === 1).length}`);
  console.log(`  R2: ${prospects.filter(p => p.projectedRound === 2).length}`);
  console.log(`  R3: ${prospects.filter(p => p.projectedRound === 3).length}`);
  console.log(`  R4-7: ${prospects.filter(p => p.projectedRound >= 4 && p.projectedRound <= 7).length}`);
  console.log(`  UDFA: ${prospects.filter(p => p.projectedRound === 8).length}`);
  await sql.end();
}

main().catch(async e => { console.error(e); await sql.end(); process.exit(1); });
