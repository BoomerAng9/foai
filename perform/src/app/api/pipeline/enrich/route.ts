import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { isCFBDConfigured, getPlayerFullStats } from '@/lib/data-pipeline/cfbd';
import { buildTIEInputs } from '@/lib/data-pipeline/stats-bridge';
import { calculateTIE } from '@/lib/tie/engine';
import { generateScoutingReport } from '@/lib/data-pipeline/content-gen';
import { safeCompare } from '@/lib/auth-guard';

/* ──────────────────────────────────────────────────────────────
 *  POST /api/pipeline/enrich
 *  Enriches prospects with real stats from CFBD + generates
 *  scouting reports via LLM. Runs in batches.
 *
 *  Body: { limit?: number, offset?: number, generateReports?: boolean }
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

    const body = await req.json().catch(() => ({}));
    const limit = body.limit || 20;
    const offset = body.offset || 0;
    const generateReports = body.generateReports !== false;

    // Get prospects that need enrichment (missing scouting summary or stats)
    const prospects = await sql`
      SELECT id, name, school, position, grade, projected_round,
             height, weight, forty_time, vertical_jump, bench_reps,
             broad_jump, three_cone, shuttle, scouting_summary
      FROM perform_players
      WHERE class_year = '2026'
        AND (scouting_summary IS NULL OR scouting_summary = '')
      ORDER BY overall_rank ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const results = {
      processed: 0,
      statsEnriched: 0,
      reportsGenerated: 0,
      tieRecalculated: 0,
      errors: 0,
    };

    for (const p of prospects) {
      try {
        // 1. Pull real stats from CFBD if configured
        let tieScore = null;
        if (isCFBDConfigured()) {
          const fullStats = await getPlayerFullStats(p.name, p.school, 2025);
          if (fullStats && Object.keys(fullStats.stats).length > 0) {
            const inputs = buildTIEInputs(fullStats, p);
            const tie = calculateTIE(inputs.performance, inputs.attributes, inputs.intangibles);
            tieScore = tie.score;
            results.statsEnriched++;
          }
        }

        // 2. Generate scouting report via LLM
        if (generateReports) {
          const report = await generateScoutingReport(
            p.name, p.position, p.school,
            Number(p.grade), Number(p.projected_round),
          );

          if (report.scoutingSummary) {
            await sql`
              UPDATE perform_players SET
                scouting_summary = ${report.scoutingSummary},
                strengths = ${report.strengths},
                weaknesses = ${report.weaknesses},
                nfl_comparison = ${report.nflComparison},
                analyst_notes = ${report.analystNotes},
                grade = CASE WHEN ${tieScore}::numeric IS NOT NULL THEN ${tieScore} ELSE grade END,
                updated_at = NOW()
              WHERE id = ${p.id}
            `;
            results.reportsGenerated++;
          } else if (tieScore !== null) {
            await sql`
              UPDATE perform_players SET
                grade = ${tieScore},
                updated_at = NOW()
              WHERE id = ${p.id}
            `;
          }
        }

        results.processed++;
      } catch {
        results.errors++;
      }

      // Rate limit delay
      await new Promise(r => setTimeout(r, 500));
    }

    // Count remaining
    const remainingRow = await sql`
      SELECT COUNT(*)::int AS cnt FROM perform_players
      WHERE class_year = '2026'
        AND (scouting_summary IS NULL OR scouting_summary = '')
    `;
    const remaining = parseInt(remainingRow[0]?.cnt || '0', 10);

    return NextResponse.json({
      ...results,
      remaining,
      message: `Enriched ${results.processed} prospects. ${remaining} still need reports.`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Enrichment failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
