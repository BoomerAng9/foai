import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { gradeAllProspects } from '@/lib/draft/open-mind-grader';
import { safeCompare } from '@/lib/auth-guard';

/* ──────────────────────────────────────────────────────────────
 *  POST /api/seed/reseed
 *  NUCLEAR OPTION: Wipes all 2026 prospects and reseeds with the
 *  full 600-player DraftTek board graded by the CANONICAL 40/30/30
 *  Per|Form formula. Rankings by final grade, not consensus.
 * ────────────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const PIPELINE_KEY = process.env.PIPELINE_AUTH_KEY || '';
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!PIPELINE_KEY || !safeCompare(token, PIPELINE_KEY)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!sql) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

    // Ensure table + new columns for three-pillar breakdown
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
        overall_rank INTEGER,
        position_rank INTEGER,
        projected_round INTEGER,
        grade NUMERIC(5,1),
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
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(name, school, class_year)
      )
    `);

    // Add new three-pillar columns if they don't exist
    await sql.unsafe(`
      ALTER TABLE perform_players
        ADD COLUMN IF NOT EXISTS game_performance NUMERIC(4,1),
        ADD COLUMN IF NOT EXISTS athleticism NUMERIC(4,1),
        ADD COLUMN IF NOT EXISTS intangibles NUMERIC(4,1),
        ADD COLUMN IF NOT EXISTS multi_position_bonus NUMERIC(3,1),
        ADD COLUMN IF NOT EXISTS grade_letter TEXT,
        ADD COLUMN IF NOT EXISTS grade_icon TEXT,
        ADD COLUMN IF NOT EXISTS grade_label TEXT,
        ADD COLUMN IF NOT EXISTS grade_projection TEXT,
        ADD COLUMN IF NOT EXISTS prime_sub_tags TEXT
    `);

    // Dual-grade + longevity columns
    await sql.unsafe(`
      ALTER TABLE perform_players
        ADD COLUMN IF NOT EXISTS grade_clean NUMERIC(5,1),
        ADD COLUMN IF NOT EXISTS grade_letter_clean TEXT,
        ADD COLUMN IF NOT EXISTS grade_icon_clean TEXT,
        ADD COLUMN IF NOT EXISTS medical_delta NUMERIC(4,1) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS game_performance_clean NUMERIC(4,1),
        ADD COLUMN IF NOT EXISTS athleticism_clean NUMERIC(4,1),
        ADD COLUMN IF NOT EXISTS intangibles_clean NUMERIC(4,1),
        ADD COLUMN IF NOT EXISTS medical_severity TEXT,
        ADD COLUMN IF NOT EXISTS medical_current_status TEXT,
        ADD COLUMN IF NOT EXISTS medical_injury_types TEXT,
        ADD COLUMN IF NOT EXISTS medical_year INTEGER,
        ADD COLUMN IF NOT EXISTS medical_notes TEXT,
        ADD COLUMN IF NOT EXISTS medical_comps TEXT,
        ADD COLUMN IF NOT EXISTS longevity_expected_years INTEGER,
        ADD COLUMN IF NOT EXISTS longevity_peak_start INTEGER,
        ADD COLUMN IF NOT EXISTS longevity_peak_end INTEGER,
        ADD COLUMN IF NOT EXISTS longevity_decline_risk TEXT,
        ADD COLUMN IF NOT EXISTS longevity_outlook TEXT,
        ADD COLUMN IF NOT EXISTS longevity_upside_comp TEXT,
        ADD COLUMN IF NOT EXISTS longevity_baseline_comp TEXT,
        ADD COLUMN IF NOT EXISTS longevity_downside_comp TEXT,
        ADD COLUMN IF NOT EXISTS longevity_confidence NUMERIC(3,2)
    `);

    // Widen grade column to hold 101+ Prime Player scores
    await sql.unsafe(`
      ALTER TABLE perform_players
      ALTER COLUMN grade TYPE NUMERIC(5,1)
    `).catch(() => {/* already widened */});

    // Wipe all existing 2026 data
    const deleted = await sql`DELETE FROM perform_players WHERE class_year = '2026' RETURNING id`;

    // Grade all 600 prospects with canonical formula
    const graded = gradeAllProspects();

    let inserted = 0;
    const errors: string[] = [];
    for (const p of graded) {
      try {
        await sql`
          INSERT INTO perform_players (
            name, school, position, class_year,
            overall_rank, position_rank, projected_round,
            grade, tie_grade, tie_tier, trend, film_grade,
            game_performance, athleticism, intangibles, multi_position_bonus,
            grade_letter, grade_icon, grade_label, grade_projection, prime_sub_tags,
            grade_clean, grade_letter_clean, grade_icon_clean, medical_delta,
            game_performance_clean, athleticism_clean, intangibles_clean,
            medical_severity, medical_current_status, medical_injury_types,
            medical_year, medical_notes, medical_comps,
            longevity_expected_years, longevity_peak_start, longevity_peak_end,
            longevity_decline_risk, longevity_outlook,
            longevity_upside_comp, longevity_baseline_comp, longevity_downside_comp,
            longevity_confidence
          ) VALUES (
            ${p.name}, ${p.school}, ${p.position}, ${p.classYear},
            ${p.performRank}, ${p.positionRank}, ${p.projectedRound},
            ${p.grade}, ${p.gradeLetter}, ${p.gradeLabel}, ${p.trend}, ${p.gradeLetter},
            ${p.gamePerformance}, ${p.athleticism}, ${p.intangibles}, ${p.multiPositionBonus},
            ${p.gradeLetter}, ${p.gradeIcon}, ${p.gradeLabel}, ${p.gradeProjection},
            ${p.primeSubTags.join(',') || null},
            ${p.gradeClean}, ${p.gradeLetterClean}, ${p.gradeIconClean}, ${p.medicalDelta},
            ${p.gamePerformanceClean}, ${p.athleticismClean}, ${p.intangiblesClean},
            ${p.medicalFlag?.severity || null},
            ${p.medicalFlag?.currentStatus || null},
            ${p.medicalFlag?.injuryTypes.join(',') || null},
            ${p.medicalFlag?.year || null},
            ${p.medicalFlag?.notes || null},
            ${p.medicalFlag?.historicalComps?.join(',') || null},
            ${p.longevity.expectedCareerYears},
            ${p.longevity.peakWindowYears[0]},
            ${p.longevity.peakWindowYears[1]},
            ${p.longevity.declineRisk},
            ${p.longevity.careerOutlookLabel},
            ${p.longevity.comps.upside?.name || null},
            ${p.longevity.comps.baseline?.name || null},
            ${p.longevity.comps.downside?.name || null},
            ${p.longevity.confidence}
          )
          ON CONFLICT (name, school, class_year) DO UPDATE SET
            position = EXCLUDED.position,
            overall_rank = EXCLUDED.overall_rank,
            position_rank = EXCLUDED.position_rank,
            projected_round = EXCLUDED.projected_round,
            grade = EXCLUDED.grade,
            tie_grade = EXCLUDED.tie_grade,
            tie_tier = EXCLUDED.tie_tier,
            trend = EXCLUDED.trend,
            film_grade = EXCLUDED.film_grade,
            game_performance = EXCLUDED.game_performance,
            athleticism = EXCLUDED.athleticism,
            intangibles = EXCLUDED.intangibles,
            multi_position_bonus = EXCLUDED.multi_position_bonus,
            grade_letter = EXCLUDED.grade_letter,
            grade_icon = EXCLUDED.grade_icon,
            grade_label = EXCLUDED.grade_label,
            grade_projection = EXCLUDED.grade_projection,
            prime_sub_tags = EXCLUDED.prime_sub_tags,
            grade_clean = EXCLUDED.grade_clean,
            grade_letter_clean = EXCLUDED.grade_letter_clean,
            grade_icon_clean = EXCLUDED.grade_icon_clean,
            medical_delta = EXCLUDED.medical_delta,
            game_performance_clean = EXCLUDED.game_performance_clean,
            athleticism_clean = EXCLUDED.athleticism_clean,
            intangibles_clean = EXCLUDED.intangibles_clean,
            medical_severity = EXCLUDED.medical_severity,
            medical_current_status = EXCLUDED.medical_current_status,
            medical_injury_types = EXCLUDED.medical_injury_types,
            medical_year = EXCLUDED.medical_year,
            medical_notes = EXCLUDED.medical_notes,
            medical_comps = EXCLUDED.medical_comps,
            longevity_expected_years = EXCLUDED.longevity_expected_years,
            longevity_peak_start = EXCLUDED.longevity_peak_start,
            longevity_peak_end = EXCLUDED.longevity_peak_end,
            longevity_decline_risk = EXCLUDED.longevity_decline_risk,
            longevity_outlook = EXCLUDED.longevity_outlook,
            longevity_upside_comp = EXCLUDED.longevity_upside_comp,
            longevity_baseline_comp = EXCLUDED.longevity_baseline_comp,
            longevity_downside_comp = EXCLUDED.longevity_downside_comp,
            longevity_confidence = EXCLUDED.longevity_confidence,
            updated_at = NOW()
        `;
        inserted++;
      } catch (err) {
        errors.push(p.name);
      }
    }

    // Top 10 by Per|Form grade
    const top10 = graded.slice(0, 10).map(p => ({
      performRank: p.performRank,
      name: p.name,
      position: p.position,
      school: p.school,
      grade: p.grade,
      gradeDisplay: `${p.gradeLetter} ${p.gradeIcon}`,
      consensusRank: p.consensusRank,
      breakdown: {
        gamePerformance: p.gamePerformance,
        athleticism: p.athleticism,
        intangibles: p.intangibles,
        bonus: p.multiPositionBonus,
      },
      trend: p.trend,
    }));

    // Prime Players (101+)
    const primePlayers = graded
      .filter(p => p.grade >= 101)
      .map(p => ({
        name: p.name,
        position: p.position,
        grade: p.grade,
        subTags: p.primeSubTagIcons,
      }));

    // Biggest sleepers
    const sleepers = graded
      .filter(p => p.consensusRank - p.performRank > 30)
      .slice(0, 10)
      .map(p => ({
        name: p.name,
        position: p.position,
        consensus: p.consensusRank,
        perform: p.performRank,
        grade: p.grade,
        jump: p.consensusRank - p.performRank,
      }));

    return NextResponse.json({
      message: `Reseed complete. ${inserted} prospects graded using canonical 40/30/30 formula.${errors.length > 0 ? ` ${errors.length} failed.` : ''}`,
      deleted: deleted.length,
      inserted,
      failed: errors.length,
      failedNames: errors.slice(0, 10),
      top10,
      primePlayers,
      biggestSleepers: sleepers,
      formulaNote: 'Max grade is 100 base + 7 multi-position bonus = 107 ceiling. 101+ is Prime Player.',
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Reseed failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
