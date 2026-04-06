/**
 * Per|Form Longevity Forecast Model
 * ===================================
 * Historical-comp-driven career projection for prospects with
 * medical history or high-wear-position profiles. This is the
 * Per|Form answer to Amazon Statcast / Microsoft Sports / Olocip —
 * grounding projections in real historical careers, not just
 * present-tense scouting.
 *
 * The model is intentionally simple and transparent — it's a
 * weighted average of comp careers, filtered by position and
 * injury profile, with a confidence score. Future version will
 * swap the rules engine for a trained ML model against the
 * nflverse historical dataset (combine → career outcomes).
 */

export type InjuryType =
  | 'knee_acl'       // ACL tear
  | 'knee_mcl'       // MCL sprain
  | 'knee_meniscus'  // Meniscus — the degenerative risk (Gurley)
  | 'knee_multi'     // Multiple knee events
  | 'shoulder'
  | 'ankle'
  | 'back'
  | 'head_concussion'
  | 'elbow_ucl'
  | 'hip'
  | 'foot'
  | 'clean';

export type CurrentStatus = 'clean' | 'recovering' | 'active_injury';

export interface HistoricalComp {
  name: string;
  position: string;
  careerYears: number;           // Total pro seasons
  peakYears: number;             // Seasons at All-Pro level
  proBowls: number;
  injuryProfile: InjuryType[];
  outcome: 'hall_of_fame' | 'pro_bowl' | 'starter' | 'rotational' | 'out_of_league_early';
  cautionaryTale: boolean;       // Served as a warning comp
  note: string;
}

/* ── Historical comp database ──
 * Curated set of careers that inform what a prospect with similar
 * profile can realistically expect. Weighted by relevance to the
 * query. This is NOT exhaustive — it's the canonical teaching set.
 */
export const HISTORICAL_COMPS: HistoricalComp[] = [
  /* ═══ RB — KNEE CAUTIONARY TALES ═══ */
  {
    name: 'Todd Gurley',
    position: 'RB',
    careerYears: 7,
    peakYears: 3,
    proBowls: 3,
    injuryProfile: ['knee_acl', 'knee_meniscus'],
    outcome: 'out_of_league_early',
    cautionaryTale: true,
    note: 'ACL pre-draft + arthritic knee ended his prime by age 25. The canonical warning for a RB with cartilage damage.',
  },
  {
    name: 'Gale Sayers',
    position: 'RB',
    careerYears: 7,
    peakYears: 4,
    proBowls: 4,
    injuryProfile: ['knee_multi'],
    outcome: 'hall_of_fame',
    cautionaryTale: true,
    note: 'HOF talent limited to 7 seasons by back-to-back knee injuries in a pre-arthroscopy era.',
  },
  {
    name: 'Knowshon Moreno',
    position: 'RB',
    careerYears: 6,
    peakYears: 1,
    proBowls: 0,
    injuryProfile: ['knee_acl', 'knee_mcl'],
    outcome: 'out_of_league_early',
    cautionaryTale: true,
    note: 'Multiple knee injuries derailed an otherwise promising career.',
  },

  /* ═══ RB — KNEE RECOVERY SUCCESS ═══ */
  {
    name: 'Adrian Peterson',
    position: 'RB',
    careerYears: 15,
    peakYears: 7,
    proBowls: 7,
    injuryProfile: ['knee_acl'],
    outcome: 'hall_of_fame',
    cautionaryTale: false,
    note: '2011 ACL → 2012 MVP. The gold-standard comeback. Freakish athlete profile made the recovery possible.',
  },
  {
    name: 'Marcus Allen',
    position: 'RB',
    careerYears: 16,
    peakYears: 5,
    proBowls: 6,
    injuryProfile: ['knee_mcl'],
    outcome: 'hall_of_fame',
    cautionaryTale: false,
    note: 'Managed MCL issues early, extended career through patience and running style.',
  },

  /* ═══ RB — CLEAN CAREERS ═══ */
  {
    name: 'Emmitt Smith',
    position: 'RB',
    careerYears: 15,
    peakYears: 8,
    proBowls: 8,
    injuryProfile: ['clean'],
    outcome: 'hall_of_fame',
    cautionaryTale: false,
    note: 'Durability the defining trait — rarely missed a game across 15 seasons.',
  },
  {
    name: 'Jim Brown',
    position: 'RB',
    careerYears: 9,
    peakYears: 9,
    proBowls: 9,
    injuryProfile: ['clean'],
    outcome: 'hall_of_fame',
    cautionaryTale: false,
    note: 'Never missed a game. Retired in prime.',
  },
  {
    name: 'LaDainian Tomlinson',
    position: 'RB',
    careerYears: 11,
    peakYears: 6,
    proBowls: 5,
    injuryProfile: ['clean'],
    outcome: 'hall_of_fame',
    cautionaryTale: false,
    note: 'Clean injury history enabled sustained elite production.',
  },

  /* ═══ EDGE — SHOULDER/ANKLE ═══ */
  {
    name: 'Jadeveon Clowney',
    position: 'EDGE',
    careerYears: 10,
    peakYears: 3,
    proBowls: 3,
    injuryProfile: ['knee_meniscus', 'shoulder'],
    outcome: 'pro_bowl',
    cautionaryTale: true,
    note: 'Elite talent, chronic injuries prevented consistent dominance.',
  },
  {
    name: 'Myles Garrett',
    position: 'EDGE',
    careerYears: 8,
    peakYears: 5,
    proBowls: 5,
    injuryProfile: ['ankle'],
    outcome: 'pro_bowl',
    cautionaryTale: false,
    note: 'Minor ankle issues, otherwise durable. Peak still active.',
  },

  /* ═══ LB — ACL ═══ */
  {
    name: 'Patrick Willis',
    position: 'ILB',
    careerYears: 8,
    peakYears: 7,
    proBowls: 7,
    injuryProfile: ['foot'],
    outcome: 'hall_of_fame',
    cautionaryTale: false,
    note: 'Foot issues shortened career but peak was pristine.',
  },
  {
    name: 'Jaylon Smith',
    position: 'ILB',
    careerYears: 8,
    peakYears: 2,
    proBowls: 1,
    injuryProfile: ['knee_multi'],
    outcome: 'rotational',
    cautionaryTale: true,
    note: 'Pre-draft knee nerve damage severely limited peak. Cautionary tale for LB knee injuries.',
  },

  /* ═══ QB — ELBOW ═══ */
  {
    name: 'Drew Brees',
    position: 'QB',
    careerYears: 20,
    peakYears: 12,
    proBowls: 13,
    injuryProfile: ['shoulder'],
    outcome: 'hall_of_fame',
    cautionaryTale: false,
    note: 'Post-shoulder labrum rehab became a 20-year career. Proof that proper rehab pays.',
  },
  {
    name: 'Jameis Winston',
    position: 'QB',
    careerYears: 11,
    peakYears: 1,
    proBowls: 0,
    injuryProfile: ['knee_acl'],
    outcome: 'rotational',
    cautionaryTale: true,
    note: 'Knee issues compounded inconsistency.',
  },

  /* ═══ WR — GENERAL WEAR ═══ */
  {
    name: 'Michael Thomas',
    position: 'WR',
    careerYears: 9,
    peakYears: 3,
    proBowls: 3,
    injuryProfile: ['ankle', 'foot'],
    outcome: 'pro_bowl',
    cautionaryTale: true,
    note: 'Chronic ankle/foot issues after a historic peak.',
  },
  {
    name: 'Julio Jones',
    position: 'WR',
    careerYears: 12,
    peakYears: 6,
    proBowls: 7,
    injuryProfile: ['foot'],
    outcome: 'hall_of_fame',
    cautionaryTale: false,
    note: 'Managed foot issues through career length.',
  },
];

/* ── Longevity forecast output ── */
export interface LongevityForecast {
  expectedCareerYears: number;           // Weighted average of comp careers
  peakWindowYears: [number, number];     // Year range of expected All-Pro level
  declineRisk: 'low' | 'moderate' | 'high' | 'severe';
  careerOutlookLabel: string;            // e.g. "Extended peak, managed decline"
  comps: {
    upside: HistoricalComp | null;       // Best-case comp
    baseline: HistoricalComp | null;     // Most-likely comp
    downside: HistoricalComp | null;     // Cautionary comp
  };
  confidence: number;                    // 0-1
  modelVersion: string;
}

/* ── Forecast function ── */
export function forecastLongevity(params: {
  position: string;
  injuries: InjuryType[];
  currentStatus: CurrentStatus;
  baseAthleticism: number;      // 0-99 — higher = faster recovery
  baseIntangibles: number;      // 0-99 — higher = better rehab work ethic
}): LongevityForecast {
  const { position, injuries, currentStatus, baseAthleticism, baseIntangibles } = params;
  const posKey = position.replace(/[0-9T]/g, '').replace('WRS', 'WR');

  // ── Filter comps by relevance ──
  // Match by injury FAMILY (knee, shoulder, etc.) not exact type, so a
  // meniscus prospect pulls ACL and multi-knee comps for upside/downside.
  const injuryFamily = (t: InjuryType): string =>
    t.startsWith('knee') ? 'knee' : t;

  const playerFamilies = new Set(injuries.filter(i => i !== 'clean').map(injuryFamily));

  const positionComps = HISTORICAL_COMPS.filter(c => c.position === posKey);
  const injuryMatched = positionComps.filter(c =>
    c.injuryProfile.some(i => playerFamilies.has(injuryFamily(i))),
  );

  const clean = injuries.every(i => i === 'clean');
  const hasKneeHistory = injuries.some(i => i.startsWith('knee'));
  const hasMultipleInjuries = injuries.filter(i => i !== 'clean').length > 1;

  // ── Pick upside, baseline, downside comps ──
  const relevantComps = clean
    ? positionComps.filter(c => !c.cautionaryTale)
    : injuryMatched.length > 0
    ? injuryMatched
    : positionComps;

  const sorted = [...relevantComps].sort((a, b) => b.careerYears - a.careerYears);
  // Prefer non-cautionary for upside, cautionary for downside, middle for baseline
  const upside =
    sorted.find(c => !c.cautionaryTale) || sorted[0] || null;
  const downside =
    sorted.slice().reverse().find(c => c.cautionaryTale) ||
    sorted[sorted.length - 1] ||
    null;
  const baseline =
    sorted.find(c => c !== upside && c !== downside) ||
    sorted[Math.floor(sorted.length / 2)] ||
    null;

  // ── Weighted career length ──
  // Base weight: intangibles (rehab work ethic) + athleticism (recovery capacity)
  const rehabFactor = (baseAthleticism * 0.5 + baseIntangibles * 0.5) / 100;

  let expectedYears: number;
  if (clean) {
    // Clean: weighted toward upside
    expectedYears = upside && baseline
      ? (upside.careerYears * 0.4 + baseline.careerYears * 0.6) * rehabFactor
      : 10 * rehabFactor;
  } else {
    // Injured: baseline-weighted with downside pull
    expectedYears = baseline && downside && upside
      ? (upside.careerYears * 0.2 + baseline.careerYears * 0.5 + downside.careerYears * 0.3) * rehabFactor
      : 7 * rehabFactor;
  }
  expectedYears = Math.round(Math.max(3, Math.min(20, expectedYears)));

  // ── Peak window ──
  const peakStart = clean ? 2 : hasKneeHistory ? 2 : 3;
  const peakEnd = clean ? 7 : hasMultipleInjuries ? 4 : 5;

  // ── Decline risk ──
  let declineRisk: LongevityForecast['declineRisk'];
  if (clean) declineRisk = 'low';
  else if (currentStatus === 'active_injury') declineRisk = 'severe';
  else if (hasMultipleInjuries) declineRisk = 'high';
  else if (hasKneeHistory && ['RB', 'CB', 'WR'].includes(posKey)) declineRisk = 'high';
  else if (hasKneeHistory) declineRisk = 'moderate';
  else declineRisk = 'moderate';

  // ── Outlook label ──
  const outlookLabel = clean
    ? 'Clean bill of health. Sustained prime projected.'
    : currentStatus === 'clean' && hasKneeHistory
    ? 'Historical knee concern, currently clean. Peak intact, decline curve steeper than a clean comp.'
    : currentStatus === 'recovering'
    ? 'Mid-recovery window. Slower start, peak delayed by one season.'
    : 'Active injury. Career arc significantly compressed.';

  // ── Confidence ──
  // Higher with more comps, lower with fewer or with recovering status
  const confidence = Math.min(
    0.95,
    0.3 +
      (relevantComps.length / 10) * 0.4 +
      (currentStatus === 'clean' ? 0.2 : 0) +
      (clean ? 0.1 : 0),
  );

  return {
    expectedCareerYears: expectedYears,
    peakWindowYears: [peakStart, peakEnd],
    declineRisk,
    careerOutlookLabel: outlookLabel,
    comps: { upside, baseline, downside },
    confidence: Math.round(confidence * 100) / 100,
    modelVersion: 'longevity-v1.0-rules',
  };
}
