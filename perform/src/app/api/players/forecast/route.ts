import { NextRequest, NextResponse } from 'next/server';
import { gradeAllProspects } from '@/lib/draft/open-mind-grader';
import {
  renderCareerArcChart,
  renderPillarRadarChart,
  renderMedicalTimelineChart,
  renderCompOverlayChart,
  vizAvailable,
  vizMode,
} from '@/lib/viz/gemini-viz';

/* ──────────────────────────────────────────────────────────────
 *  GET /api/players/forecast?name=<player>
 *  Returns the full Per|Form forecast payload:
 *    - dual grade (clean vs actual) + medical delta
 *    - three-pillar breakdown (actual + clean)
 *    - medical flag with historical comps
 *    - longevity forecast with upside/baseline/downside comps
 *    - optional C1 Thesys visualizations (if key present)
 *
 *  Query:
 *    name=<player>       — required
 *    viz=1               — include C1 Thesys visualizations
 * ────────────────────────────────────────────────────────────── */

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const name = url.searchParams.get('name');
  const includeViz = url.searchParams.get('viz') === '1';

  if (!name) {
    return NextResponse.json({ error: 'name query param required' }, { status: 400 });
  }

  const graded = gradeAllProspects();
  const player = graded.find(
    p => p.name.toLowerCase() === name.toLowerCase(),
  );

  if (!player) {
    return NextResponse.json({ error: `Player "${name}" not found` }, { status: 404 });
  }

  const payload = {
    identity: {
      name: player.name,
      position: player.position,
      school: player.school,
      performRank: player.performRank,
      consensusRank: player.consensusRank,
      positionRank: player.positionRank,
      projectedRound: player.projectedRound,
    },
    grade: {
      actual: {
        score: player.grade,
        letter: player.gradeLetter,
        icon: player.gradeIcon,
        label: player.gradeLabel,
        projection: player.gradeProjection,
      },
      clean: {
        score: player.gradeClean,
        letter: player.gradeLetterClean,
        icon: player.gradeIconClean,
      },
      medicalDelta: player.medicalDelta,
    },
    pillars: {
      actual: {
        gamePerformance: player.gamePerformance,
        athleticism: player.athleticism,
        intangibles: player.intangibles,
        multiPositionBonus: player.multiPositionBonus,
      },
      clean: {
        gamePerformance: player.gamePerformanceClean,
        athleticism: player.athleticismClean,
        intangibles: player.intangiblesClean,
      },
    },
    medical: player.medicalFlag ?? null,
    longevity: player.longevity,
    trend: player.trend,
    primeSubTags: player.primeSubTags,
  };

  // Optional Vega-Lite visualization specs (Gemini-generated)
  let visualizations = null;
  if (includeViz) {
    if (!vizAvailable()) {
      visualizations = { error: 'GEMINI_API_KEY not set — cannot generate viz specs' };
    } else {
      const comps = [
        player.longevity.comps.upside,
        player.longevity.comps.baseline,
        player.longevity.comps.downside,
      ].filter((c): c is NonNullable<typeof c> => c !== null);

      const [careerArc, pillarRadar, medicalTimeline, compOverlay] = await Promise.all([
        renderCareerArcChart({
          playerName: player.name,
          position: player.position,
          expectedCareerYears: player.longevity.expectedCareerYears,
          peakWindow: player.longevity.peakWindowYears,
          comps: comps.map(c => ({
            name: c.name,
            careerYears: c.careerYears,
            peakYears: c.peakYears,
            outcome: c.outcome,
          })),
        }),
        renderPillarRadarChart({
          playerName: player.name,
          actualPillars: {
            gamePerformance: player.gamePerformance,
            athleticism: player.athleticism,
            intangibles: player.intangibles,
          },
          cleanPillars: {
            gamePerformance: player.gamePerformanceClean,
            athleticism: player.athleticismClean,
            intangibles: player.intangiblesClean,
          },
        }),
        player.medicalFlag
          ? renderMedicalTimelineChart({
              playerName: player.name,
              events: [
                {
                  year: player.medicalFlag.year,
                  event: player.medicalFlag.injuryTypes.join(', '),
                  severity: player.medicalFlag.severity,
                  recovered: player.medicalFlag.currentStatus === 'clean',
                },
              ],
              currentStatus: player.medicalFlag.currentStatus,
            })
          : null,
        renderCompOverlayChart({
          playerName: player.name,
          playerGrade: player.grade,
          comps: comps.map(c => ({
            name: c.name,
            peakGrade: 85 + c.peakYears * 1.5, // rough peak grade proxy
            careerYears: c.careerYears,
            outcome: c.outcome,
          })),
        }),
      ]);

      visualizations = {
        engine: 'gemini-vega-lite',
        authMode: vizMode(),
        careerArc,
        pillarRadar,
        medicalTimeline,
        compOverlay,
      };
    }
  }

  return NextResponse.json({ player: payload, visualizations });
}
