import { NextRequest, NextResponse } from 'next/server';
import { gradeAllProspects } from '@/lib/draft/open-mind-grader';
import { getPlayerHeadshot } from '@/lib/players/headshots';
import { requireAuth } from '@/lib/auth-guard';
import {
  renderCareerArcChart,
  renderPillarRadarChart,
  renderMedicalTimelineChart,
  renderCompOverlayChart,
  vizAvailable,
  vizMode,
} from '@/lib/viz/gemini-viz';
import { generatePlayerCardSpec, c1Available } from '@/lib/viz/thesys-c1';

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
  const wantsViz = url.searchParams.get('viz') === '1';
  const wantsC1 = url.searchParams.get('c1') === '1';

  // Viz and C1 flags trigger paid LLM / Thesys API calls. Gate those behind
  // auth to prevent anonymous cost abuse. Base forecast payload stays public.
  let includeViz = false;
  let useC1 = false;
  if (wantsViz || wantsC1) {
    const auth = await requireAuth(req);
    if (!auth.ok) {
      return NextResponse.json(
        { error: 'Authentication required for viz/c1 rendering' },
        { status: 401 },
      );
    }
    includeViz = wantsViz;
    useC1 = wantsC1;
  }

  if (!name) {
    return NextResponse.json({ error: 'name query param required' }, { status: 400 });
  }

  // Normalize slug-style URLs ("jeremiyah-love") and spaced ("Jeremiyah Love")
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  const target = normalize(name);

  const graded = gradeAllProspects();
  const player = graded.find(p => normalize(p.name) === target)
    // Fallback: partial match (handles "jeremiyah-love" vs "Jeremiyah J. Love")
    ?? graded.find(p => normalize(p.name).includes(target))
    ?? graded.find(p => target.includes(normalize(p.name)));

  if (!player) {
    return NextResponse.json({ error: `Player "${name}" not found` }, { status: 404 });
  }

  // Resolve player headshot + top 5 headshots in parallel (ESPN lookups are cached)
  const top5Source = graded.slice(0, 5);
  const [headshotResult, ...topHeadshots] = await Promise.all([
    getPlayerHeadshot(player.name, player.school).catch(() => ({ url: null })),
    ...top5Source.map(p => getPlayerHeadshot(p.name, p.school).catch(() => ({ url: null }))),
  ]);
  const headshotUrl: string | null = headshotResult.url || null;
  const top5 = top5Source.map((p, i) => ({
    rank: p.performRank,
    name: p.name,
    position: p.position,
    school: p.school,
    grade: p.grade,
    gradeLetter: p.gradeLetter,
    headshotUrl: topHeadshots[i]?.url || null,
  }));

  const payload = {
    identity: {
      name: player.name,
      position: player.position,
      school: player.school,
      performRank: player.performRank,
      consensusRank: player.consensusRank,
      positionRank: player.positionRank,
      projectedRound: player.projectedRound,
      headshotUrl,
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

      // Serialize the 4 viz calls so we never burst past the RPM cap.
      // 250ms stagger between calls is well under any paid tier limit.
      const stagger = (ms: number) => new Promise(r => setTimeout(r, ms));

      const careerArc = await renderCareerArcChart({
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
      });
      await stagger(250);

      const pillarRadar = await renderPillarRadarChart({
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
      });
      await stagger(250);

      const medicalTimeline = player.medicalFlag
        ? await renderMedicalTimelineChart({
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
        : null;
      if (medicalTimeline) await stagger(250);

      const compOverlay = await renderCompOverlayChart({
        playerName: player.name,
        playerGrade: player.grade,
        comps: comps.map(c => ({
          name: c.name,
          peakGrade: 85 + c.peakYears * 1.5,
          careerYears: c.careerYears,
          outcome: c.outcome,
        })),
      });

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

  // C1 Thesys generative card spec — portable JSON for web/mobile/NFT/marketplace
  let c1Card = null;
  if (useC1) {
    if (!c1Available()) {
      c1Card = { error: 'C1_API_KEY not set', spec: null };
    } else {
      const result = await generatePlayerCardSpec({
        name: player.name,
        position: player.position,
        school: player.school,
        performRank: player.performRank,
        consensusRank: player.consensusRank,
        projectedRound: player.projectedRound,
        trend: player.trend,
        gradeActual: player.grade,
        gradeLetter: player.gradeLetter,
        gradeClean: player.gradeClean,
        medicalDelta: player.medicalDelta,
        pillars: {
          gp: player.gamePerformance,
          ath: player.athleticism,
          int: player.intangibles,
        },
        pillarsClean: {
          gp: player.gamePerformanceClean,
          ath: player.athleticismClean,
          int: player.intangiblesClean,
        },
        medical: player.medicalFlag
          ? {
              severity: player.medicalFlag.severity,
              currentStatus: player.medicalFlag.currentStatus,
              notes: player.medicalFlag.notes,
              comps: player.medicalFlag.historicalComps,
            }
          : null,
        longevity: {
          expectedYears: player.longevity.expectedCareerYears,
          peakWindow: player.longevity.peakWindowYears,
          declineRisk: player.longevity.declineRisk,
          outlook: player.longevity.careerOutlookLabel,
          upside: player.longevity.comps.upside,
          baseline: player.longevity.comps.baseline,
          downside: player.longevity.comps.downside,
        },
      });
      c1Card = result ? { spec: result.spec, model: 'c1/anthropic/claude-sonnet-4.5' } : { error: 'C1 generation failed', spec: null };
    }
  }

  return NextResponse.json({ player: payload, visualizations, c1Card, top5 });
}
