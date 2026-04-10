/**
 * Per|Form Career Projection Engine
 * ===================================
 * Real data-driven career projections using nfl_draft_picks + nfl_combine
 * historical data (12,666 draft picks 1980-2025, 8,958 combine entries 2000-2025).
 *
 * Replaces the hardcoded longevity-model.ts comp database with actual
 * historical outcomes from nflverse data stored in Neon.
 *
 * Match scoring weights:
 *   - Draft position similarity: 30%
 *   - Measurables similarity:    25%
 *   - Recency (draft decade):    20%
 *   - Position match:            15% (exact = full, positional family = partial)
 *   - College conference:        10%
 */

import { sql } from '@/lib/db';

/* ── Position family mapping ──
 * NFL positions in our tables don't always match 1:1.
 * nfl_draft_picks uses: QB, RB, WR, TE, T, G, C, DE, DT, LB, CB, S, K, P
 * perform_players uses: QB, RB, WR, TE, OT, IOL, EDGE, DL, LB, CB, S, K, P
 * We normalize to families for flexible matching.
 */
const POSITION_FAMILIES: Record<string, string[]> = {
  QB: ['QB'],
  RB: ['RB', 'FB'],
  WR: ['WR'],
  TE: ['TE'],
  OT: ['T', 'OT', 'OL'],
  IOL: ['G', 'C', 'OG', 'OL', 'IOL'],
  EDGE: ['DE', 'EDGE', 'OLB', 'LB'],
  DL: ['DT', 'NT', 'DL', 'DE'],
  LB: ['LB', 'ILB', 'OLB'],
  CB: ['CB', 'DB'],
  S: ['S', 'SS', 'FS', 'DB'],
  K: ['K'],
  P: ['P'],
};

/** Map a position to its canonical family key */
function getPositionFamily(pos: string): string {
  const upper = pos.toUpperCase().trim();
  for (const [family, members] of Object.entries(POSITION_FAMILIES)) {
    if (members.includes(upper)) return family;
  }
  return upper;
}

/** Get all position variants for DB querying */
function getPositionVariants(pos: string): string[] {
  const family = getPositionFamily(pos);
  return POSITION_FAMILIES[family] || [pos.toUpperCase()];
}

/* ── Power 5 / Group of 5 conference buckets for matching ── */
const POWER_CONFERENCES = new Set([
  'Alabama', 'Auburn', 'Florida', 'Georgia', 'LSU', 'Tennessee', 'Texas A&M',
  'Arkansas', 'Kentucky', 'Mississippi', 'Mississippi State', 'Missouri',
  'South Carolina', 'Vanderbilt', 'Oklahoma', 'Texas',
  // Big Ten
  'Ohio State', 'Michigan', 'Penn State', 'Wisconsin', 'Iowa', 'Minnesota',
  'Illinois', 'Indiana', 'Maryland', 'Michigan State', 'Nebraska', 'Northwestern',
  'Purdue', 'Rutgers', 'Oregon', 'Washington', 'UCLA', 'USC',
  // ACC
  'Clemson', 'Florida State', 'Miami (FL)', 'North Carolina', 'NC State',
  'Virginia', 'Virginia Tech', 'Boston College', 'Duke', 'Georgia Tech',
  'Louisville', 'Pittsburgh', 'Syracuse', 'Wake Forest',
  // Big 12
  'Baylor', 'Iowa State', 'Kansas', 'Kansas State', 'Oklahoma State',
  'TCU', 'Texas Tech', 'West Virginia', 'BYU', 'Cincinnati', 'Houston', 'UCF',
  // Pac-12 remnants
  'Stanford', 'California', 'Arizona', 'Arizona State', 'Colorado', 'Utah',
  'Oregon State', 'Washington State',
  // Notre Dame
  'Notre Dame',
]);

function isPowerSchool(school: string | null): boolean {
  if (!school) return false;
  return POWER_CONFERENCES.has(school);
}

/* ── Interfaces ── */

export interface HistoricalComp {
  name: string;
  season: number;
  round: number;
  pick: number;
  team: string;
  college: string;
  games: number;
  seasonsStarted: number;
  probowls: number;
  allpro: number;
  careerAV: number;
  hof: boolean;
  passYards?: number;
  passTDs?: number;
  rushYards?: number;
  rushTDs?: number;
  recYards?: number;
  recTDs?: number;
  defSacks?: number;
  defInts?: number;
  forty?: number;
  weight?: number;
  matchScore: number;
}

export interface CareerProjection {
  prospect: {
    name: string;
    position: string;
    school: string;
    projectedRound: number;
  };
  comps: HistoricalComp[];
  upside: HistoricalComp;
  baseline: HistoricalComp;
  downside: HistoricalComp;
  projection: {
    expectedGames: number;
    expectedSeasons: number;
    probowlProbability: number;
    allproProbability: number;
    bustProbability: number;
    expectedCareerAV: number;
  };
}

/* ── Match scoring helpers ── */

/** Score draft position similarity (0-100). Same pick = 100, 7 rounds apart = 0. */
function draftPositionScore(prospectRound: number, compRound: number, compPick: number): number {
  const roundDiff = Math.abs(prospectRound - compRound);
  if (roundDiff === 0) return 100;
  if (roundDiff === 1) return 70;
  if (roundDiff === 2) return 40;
  if (roundDiff === 3) return 20;
  return 0;
}

/** Score measurables similarity (0-100). Uses forty and weight when available. */
function measurablesScore(
  prospectForty: number | null | undefined,
  compForty: number | null | undefined,
  prospectWeight: number | null | undefined,
  compWeight: number | null | undefined,
): number {
  let score = 50; // Default when no measurables available
  let factors = 0;
  let total = 0;

  if (prospectForty && compForty && prospectForty > 0 && compForty > 0) {
    const fortyDiff = Math.abs(prospectForty - compForty);
    // 0.00 diff = 100, 0.15 diff = 50, 0.30+ diff = 0
    const fortySc = Math.max(0, 100 - (fortyDiff / 0.30) * 100);
    total += fortySc;
    factors++;
  }

  if (prospectWeight && compWeight && prospectWeight > 0 && compWeight > 0) {
    const weightDiff = Math.abs(prospectWeight - compWeight);
    // 0 diff = 100, 20 diff = 50, 40+ diff = 0
    const weightSc = Math.max(0, 100 - (weightDiff / 40) * 100);
    total += weightSc;
    factors++;
  }

  if (factors > 0) {
    score = total / factors;
  }

  return score;
}

/** Score college conference similarity (0-100). */
function conferenceScore(prospectSchool: string | null, compSchool: string | null): number {
  if (!prospectSchool || !compSchool) return 30;
  if (prospectSchool === compSchool) return 100;
  const bothPower = isPowerSchool(prospectSchool) && isPowerSchool(compSchool);
  if (bothPower) return 70;
  const neitherPower = !isPowerSchool(prospectSchool) && !isPowerSchool(compSchool);
  if (neitherPower) return 60;
  return 30;
}

/** Score recency of draft season (0-100). Heavily favors recent decades. */
function recencyScore(draftSeason: number): number {
  if (draftSeason >= 2015) return 100;  // 2015-2025: full weight
  if (draftSeason >= 2005) return 70;   // 2005-2014: 70%
  if (draftSeason >= 1995) return 40;   // 1995-2004: 40%
  return 15;                             // Before 1995: 15%
}

/** Composite match score with the 30/25/20/15/10 weighting. */
function computeMatchScore(
  prospectRound: number,
  compRound: number,
  compPick: number,
  prospectForty: number | null | undefined,
  compForty: number | null | undefined,
  prospectWeight: number | null | undefined,
  compWeight: number | null | undefined,
  prospectSchool: string | null,
  compSchool: string | null,
  positionExact: boolean,
  compSeason: number,
): number {
  const draftSc = draftPositionScore(prospectRound, compRound, compPick);
  const measSc = measurablesScore(prospectForty, compForty, prospectWeight, compWeight);
  const posSc = positionExact ? 100 : 60; // Family match gets 60
  const confSc = conferenceScore(prospectSchool, compSchool);
  const recSc = recencyScore(compSeason);

  return Math.round(
    draftSc * 0.30 + measSc * 0.25 + recSc * 0.20 + posSc * 0.15 + confSc * 0.10
  );
}

/* ── Core query: fetch historical comps from DB ── */

/**
 * Get historical comparable players from nfl_draft_picks + nfl_combine.
 *
 * @param position - Prospect position (e.g. 'QB', 'EDGE', 'OT')
 * @param round - Projected draft round (1-7)
 * @param weight - Prospect weight in lbs (optional, for measurables matching)
 * @param forty - Prospect 40-yard dash time (optional)
 * @param school - Prospect college (optional, for conference matching)
 * @param limit - Max comps to return (default 25, scored and trimmed to top 5 by caller)
 */
export async function getHistoricalComps(
  position: string,
  round: number,
  weight?: number,
  forty?: number,
  school?: string,
  limit: number = 25,
): Promise<HistoricalComp[]> {
  if (!sql) throw new Error('Database not configured');

  const posVariants = getPositionVariants(position);
  const roundLow = Math.max(1, round - 1);
  const roundHigh = Math.min(7, round + 1);

  // Build measurables filter clauses for combine join
  const fortyLow = forty ? forty - 0.15 : null;
  const fortyHigh = forty ? forty + 0.15 : null;
  const weightLow = weight ? weight - 20 : null;
  const weightHigh = weight ? weight + 20 : null;

  // Single query: LEFT JOIN combine data onto draft picks.
  // Filter by position family + round range.
  // When measurables are provided, prefer matches but don't exclude non-combine players.
  // Only include players drafted 1980-2023 so we have career outcome data (min 2 seasons).
  const rows = await sql.unsafe(`
    SELECT
      d.player_name,
      d.season,
      d.round,
      d.pick,
      d.team,
      d.college,
      COALESCE(d.games, 0) as games,
      COALESCE(d.seasons_started, 0) as seasons_started,
      COALESCE(d.probowls, 0) as probowls,
      COALESCE(d.allpro, 0) as allpro,
      COALESCE(d.career_av, 0) as career_av,
      COALESCE(d.hof, false) as hof,
      d.pass_yards,
      d.pass_tds,
      d.rush_yards,
      d.rush_tds,
      d.rec_yards,
      d.rec_tds,
      d.def_sacks,
      d.def_ints,
      c.forty,
      c.weight as combine_weight
    FROM nfl_draft_picks d
    LEFT JOIN nfl_combine c
      ON d.pfr_id = c.pfr_id
    WHERE d.position = ANY($1)
      AND d.round BETWEEN $2 AND $3
      AND d.season BETWEEN 1980 AND 2023
    ORDER BY d.career_av DESC NULLS LAST
    LIMIT $4
  `, [posVariants, roundLow, roundHigh, limit * 4]);

  // Score each comp
  const comps: HistoricalComp[] = rows.map((r: Record<string, unknown>) => {
    const compForty = r.forty ? Number(r.forty) : undefined;
    const compWeight = r.combine_weight ? Number(r.combine_weight) : undefined;

    const matchScore = computeMatchScore(
      round,
      Number(r.round),
      Number(r.pick),
      forty ?? null,
      compForty ?? null,
      weight ?? null,
      compWeight ?? null,
      school ?? null,
      r.college as string | null,
      posVariants[0] === String(r.position) || getPositionFamily(String(r.position || position)) === getPositionFamily(position),
      Number(r.season),
    );

    return {
      name: String(r.player_name || ''),
      season: Number(r.season),
      round: Number(r.round),
      pick: Number(r.pick),
      team: String(r.team || ''),
      college: String(r.college || ''),
      games: Number(r.games),
      seasonsStarted: Number(r.seasons_started),
      probowls: Number(r.probowls),
      allpro: Number(r.allpro),
      careerAV: Number(r.career_av),
      hof: Boolean(r.hof),
      passYards: r.pass_yards ? Number(r.pass_yards) : undefined,
      passTDs: r.pass_tds ? Number(r.pass_tds) : undefined,
      rushYards: r.rush_yards ? Number(r.rush_yards) : undefined,
      rushTDs: r.rush_tds ? Number(r.rush_tds) : undefined,
      recYards: r.rec_yards ? Number(r.rec_yards) : undefined,
      recTDs: r.rec_tds ? Number(r.rec_tds) : undefined,
      defSacks: r.def_sacks ? Number(r.def_sacks) : undefined,
      defInts: r.def_ints ? Number(r.def_ints) : undefined,
      forty: compForty,
      weight: compWeight,
      matchScore,
    };
  });

  // Sort by match score descending, return top N
  comps.sort((a, b) => b.matchScore - a.matchScore);
  return comps.slice(0, limit);
}

/* ── Projection calculator ── */

function computeProjection(comps: HistoricalComp[]): CareerProjection['projection'] {
  if (comps.length === 0) {
    return {
      expectedGames: 0,
      expectedSeasons: 0,
      probowlProbability: 0,
      allproProbability: 0,
      bustProbability: 0,
      expectedCareerAV: 0,
    };
  }

  const n = comps.length;
  const totalGames = comps.reduce((s, c) => s + c.games, 0);
  const totalSeasons = comps.reduce((s, c) => s + c.seasonsStarted, 0);
  const totalAV = comps.reduce((s, c) => s + c.careerAV, 0);
  const probowlCount = comps.filter(c => c.probowls > 0).length;
  const allproCount = comps.filter(c => c.allpro > 0).length;
  const bustCount = comps.filter(c => c.seasonsStarted < 3).length;

  return {
    expectedGames: Math.round(totalGames / n),
    expectedSeasons: Math.round((totalSeasons / n) * 10) / 10,
    probowlProbability: Math.round((probowlCount / n) * 100),
    allproProbability: Math.round((allproCount / n) * 100),
    bustProbability: Math.round((bustCount / n) * 100),
    expectedCareerAV: Math.round(totalAV / n),
  };
}

/** Pick upside / baseline / downside from a sorted comp list */
function pickScenarios(comps: HistoricalComp[]): {
  upside: HistoricalComp;
  baseline: HistoricalComp;
  downside: HistoricalComp;
} {
  // Sort by career AV descending for scenario selection
  const byAV = [...comps].sort((a, b) => b.careerAV - a.careerAV);

  const upside = byAV[0]; // Best career outcome
  const downside = byAV[byAV.length - 1]; // Worst career outcome
  const medianIdx = Math.floor(byAV.length / 2);
  const baseline = byAV[medianIdx]; // Median career outcome

  return { upside, baseline, downside };
}

/* ── Main entry: project career for a named prospect ── */

/**
 * Generate a full career projection for a prospect from perform_players.
 * Looks up the prospect, finds historical comps from real NFL data,
 * and returns scenarios + statistical projections.
 */
export async function projectCareer(playerName: string): Promise<CareerProjection> {
  if (!sql) throw new Error('Database not configured');

  // Look up the prospect in perform_players
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();

  const target = normalize(playerName);

  const prospects = await sql.unsafe(`
    SELECT name, position, school, projected_round, weight,
           forty_time, height
    FROM perform_players
    WHERE LOWER(REPLACE(name, '-', ' ')) LIKE $1
    LIMIT 3
  `, [`%${target}%`]);

  if (prospects.length === 0) {
    throw new Error(`Prospect "${playerName}" not found in perform_players`);
  }

  const prospect = prospects[0];
  const position = String(prospect.position || 'QB');
  const projectedRound = Number(prospect.projected_round) || 3;
  const prospectWeight = prospect.weight ? Number(prospect.weight) : undefined;
  const prospectForty = prospect.forty_time ? Number(prospect.forty_time) : undefined;
  const school = String(prospect.school || '');

  // Fetch historical comps (get a broad pool, then trim to top 5)
  const allComps = await getHistoricalComps(
    position,
    projectedRound,
    prospectWeight,
    prospectForty,
    school,
    50, // Fetch more to get a good statistical sample
  );

  // Use the broader pool for statistical projections
  const projection = computeProjection(allComps);

  // Top 5 for display
  const top5 = allComps.slice(0, 5);

  if (top5.length === 0) {
    throw new Error(`No historical comps found for ${position} round ${projectedRound}`);
  }

  const { upside, baseline, downside } = pickScenarios(top5);

  return {
    prospect: {
      name: String(prospect.name),
      position,
      school,
      projectedRound,
    },
    comps: top5,
    upside,
    baseline,
    downside,
    projection,
  };
}
