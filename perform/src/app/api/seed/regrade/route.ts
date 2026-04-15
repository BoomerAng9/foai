import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { safeCompare } from '@/lib/auth-guard';
import * as fs from 'fs';
import * as path from 'path';

/**
 * POST /api/seed/regrade — Seed ALL 2,268 regraded prospects into the database
 * =============================================================================
 * Sources: Beast 2026 measurements + TIE regrade engine v3.1 output
 * Includes: combine data, Beast rank, TIE grade, projected round
 *
 * Auth: requires PIPELINE_AUTH_KEY bearer token
 *
 * This replaces the old seed-board route which only handled 240 prospects.
 * Now seeds 2,268 players with real combine measurements.
 */

interface RegradedProspect {
  name: string;
  position: string;
  school: string;
  beastRank: number | null;
  beastPositionRank: number | null;
  tieGrade: number;
  tieLabel: string;
  projectedRound: number;
  pillars: {
    gamePerformance: number;
    athleticism: number;
    intangibles: number;
    multiPositionBonus: number;
  };
  athleticismSource: string;
  beastGrade: string | null;
  measurements: {
    height?: string;
    weight?: number;
    forty?: number;
    vertical?: number;
    broad?: string;
    arm?: string;
    wingspan?: string;
  };
  performRank?: number;
}

function loadRegraded(): RegradedProspect[] {
  const jsonPath = path.join(process.cwd(), 'src', 'lib', 'draft', 'regraded-prospects.json');
  if (!fs.existsSync(jsonPath)) throw new Error('regraded-prospects.json not found — run scripts/run-regrade.ts first');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  return data.prospects || [];
}

function tieLabel(score: number): string {
  if (score >= 101) return 'Prime Player';
  if (score >= 90) return 'Elite Prospect';
  if (score >= 85) return 'First Round Lock';
  if (score >= 80) return 'Day 1 Starter';
  if (score >= 75) return 'Quality Starter';
  if (score >= 70) return 'Solid Contributor';
  if (score >= 65) return 'Developmental';
  if (score >= 60) return 'Depth Player';
  return 'UDFA';
}

function tieTier(score: number): string {
  if (score >= 90) return 'Tier 1';
  if (score >= 85) return 'Tier 2';
  if (score >= 80) return 'Tier 3';
  if (score >= 75) return 'Tier 4';
  if (score >= 70) return 'Tier 5';
  if (score >= 65) return 'Tier 6';
  return 'Tier 7';
}

function parseBroad(broad: string | undefined): number | null {
  if (!broad) return null;
  const m = broad.match(/(\d+)'(\d+)/);
  if (m) return parseInt(m[1]) * 12 + parseInt(m[2]);
  const inches = parseFloat(broad);
  return isNaN(inches) ? null : inches;
}

export async function POST(req: NextRequest) {
  try {
    const PIPELINE_KEY = process.env.PIPELINE_AUTH_KEY || '';
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!PIPELINE_KEY || !safeCompare(token, PIPELINE_KEY)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!sql) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    // Ensure table has combine columns (add if missing)
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS perform_players (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        school TEXT NOT NULL,
        position TEXT NOT NULL,
        height TEXT,
        weight TEXT,
        class_year TEXT DEFAULT '2026',
        forty_time NUMERIC,
        vertical_jump NUMERIC,
        bench_reps NUMERIC,
        broad_jump NUMERIC,
        three_cone NUMERIC,
        shuttle NUMERIC,
        arm_length TEXT,
        wingspan TEXT,
        overall_rank INTEGER,
        position_rank INTEGER,
        projected_round INTEGER,
        grade NUMERIC(4,1),
        tie_grade TEXT,
        tie_tier TEXT,
        trend TEXT DEFAULT 'steady',
        key_stats TEXT,
        strengths TEXT,
        weaknesses TEXT,
        nfl_comparison TEXT,
        scouting_summary TEXT,
        analyst_notes TEXT,
        film_grade TEXT,
        beast_rank INTEGER,
        beast_grade TEXT,
        athleticism_source TEXT,
        pillar_game_performance NUMERIC(4,1),
        pillar_athleticism NUMERIC(4,1),
        pillar_intangibles NUMERIC(4,1),
        multi_position_bonus NUMERIC(3,1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(name, school, class_year)
      )
    `);

    // Add new columns if they don't exist (for existing tables)
    const newCols = [
      'arm_length TEXT', 'wingspan TEXT', 'beast_rank INTEGER', 'beast_grade TEXT',
      'athleticism_source TEXT', 'pillar_game_performance NUMERIC(4,1)',
      'pillar_athleticism NUMERIC(4,1)', 'pillar_intangibles NUMERIC(4,1)',
      'multi_position_bonus NUMERIC(3,1) DEFAULT 0',
    ];
    for (const col of newCols) {
      const [colName] = col.split(' ');
      try {
        await sql.unsafe(`ALTER TABLE perform_players ADD COLUMN IF NOT EXISTS ${col}`);
      } catch { /* column may already exist */ }
    }

    const prospects = loadRegraded();
    let inserted = 0;
    let errors = 0;
    const BATCH_SIZE = 50;

    for (let i = 0; i < prospects.length; i += BATCH_SIZE) {
      const batch = prospects.slice(i, i + BATCH_SIZE);

      for (const p of batch) {
        try {
          const broadInches = parseBroad(p.measurements.broad);
          const performRank = (p as any).performRank || i + batch.indexOf(p) + 1;

          await sql`
            INSERT INTO perform_players (
              name, school, position, height, weight, class_year,
              forty_time, vertical_jump, broad_jump, arm_length, wingspan,
              overall_rank, position_rank, projected_round, grade,
              tie_grade, tie_tier, trend,
              beast_rank, beast_grade, athleticism_source,
              pillar_game_performance, pillar_athleticism, pillar_intangibles, multi_position_bonus,
              scouting_summary
            ) VALUES (
              ${p.name}, ${p.school}, ${p.position},
              ${p.measurements.height || null}, ${p.measurements.weight ? String(p.measurements.weight) : null}, '2026',
              ${p.measurements.forty || null}, ${p.measurements.vertical || null},
              ${broadInches || null}, ${p.measurements.arm || null}, ${p.measurements.wingspan || null},
              ${performRank}, ${p.beastPositionRank || null}, ${p.projectedRound}, ${p.tieGrade},
              ${tieLabel(p.tieGrade)}, ${tieTier(p.tieGrade)}, 'steady',
              ${p.beastRank || null}, ${p.beastGrade || null}, ${p.athleticismSource},
              ${p.pillars.gamePerformance}, ${p.pillars.athleticism}, ${p.pillars.intangibles}, ${p.pillars.multiPositionBonus},
              ${p.beastRank ? `Beast #${p.beastRank} | ${p.tieLabel}` : p.tieLabel}
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
              scouting_summary = CASE
                WHEN perform_players.scouting_summary IS NOT NULL AND LENGTH(perform_players.scouting_summary) > 50
                THEN perform_players.scouting_summary
                ELSE EXCLUDED.scouting_summary
              END,
              updated_at = NOW()
          `;
          inserted++;
        } catch (err) {
          errors++;
          if (errors <= 5) console.error(`[seed/regrade] Error for ${p.name}:`, err);
        }
      }
    }

    return NextResponse.json({
      inserted,
      errors,
      total: prospects.length,
      message: `Regraded ${inserted} of ${prospects.length} prospects. ${errors} errors.`,
      gradeDistribution: {
        r1: prospects.filter(p => p.projectedRound === 1).length,
        r2: prospects.filter(p => p.projectedRound === 2).length,
        r3: prospects.filter(p => p.projectedRound === 3).length,
        r4_7: prospects.filter(p => p.projectedRound >= 4 && p.projectedRound <= 7).length,
        udfa: prospects.filter(p => p.projectedRound === 8).length,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Regrade seed failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
