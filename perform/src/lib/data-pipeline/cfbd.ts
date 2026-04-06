/**
 * CFBD API v2 Client — College Football Data
 * $5/mo Patreon tier (30K calls/month)
 * https://api.collegefootballdata.com
 *
 * Pulls real player stats, team data, and recruiting rankings
 * to feed the TIE grading engine with actual production numbers.
 */

const CFBD_KEY = process.env.CFBD_API_KEY || '';
const BASE = 'https://api.collegefootballdata.com';

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${CFBD_KEY}`,
    Accept: 'application/json',
  };
}

async function cfbdFetch<T>(path: string, params?: Record<string, string>): Promise<T | null> {
  if (!CFBD_KEY) return null;
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  try {
    const res = await fetch(`${BASE}${path}${qs}`, {
      headers: headers(),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/* ── Player Stats ── */

export interface PlayerSeasonStats {
  playerId: number;
  player: string;
  team: string;
  conference: string;
  category: string;
  statType: string;
  stat: number;
}

export async function getPlayerSeasonStats(
  year: number,
  team?: string,
  category?: string,
): Promise<PlayerSeasonStats[]> {
  const params: Record<string, string> = { year: String(year) };
  if (team) params.team = team;
  if (category) params.category = category;
  return await cfbdFetch<PlayerSeasonStats[]>('/stats/player/season', params) ?? [];
}

/* ── Player Search ── */

export interface PlayerSearchResult {
  id: number;
  firstName: string;
  lastName: string;
  team: string;
  weight: number;
  height: number;
  jersey: number;
  position: string;
  hometown: string;
  state: string;
}

export async function searchPlayer(
  searchTerm: string,
  year?: number,
  team?: string,
): Promise<PlayerSearchResult[]> {
  const params: Record<string, string> = { searchTerm };
  if (year) params.year = String(year);
  if (team) params.team = team;
  return await cfbdFetch<PlayerSearchResult[]>('/player/search', params) ?? [];
}

/* ── Team Stats ── */

export interface TeamSeasonStats {
  team: string;
  conference: string;
  statName: string;
  statValue: number;
}

export async function getTeamStats(year: number, team?: string): Promise<TeamSeasonStats[]> {
  const params: Record<string, string> = { year: String(year) };
  if (team) params.team = team;
  return await cfbdFetch<TeamSeasonStats[]>('/stats/season', params) ?? [];
}

/* ── Recruiting Rankings ── */

export interface Recruit {
  id: number;
  athleteId: number;
  recruitType: string;
  year: number;
  ranking: number;
  name: string;
  school: string;
  committedTo: string;
  position: string;
  height: number;
  weight: number;
  stars: number;
  rating: number;
  city: string;
  stateProvince: string;
}

export async function getRecruits(
  year: number,
  classification?: 'HighSchool' | 'JUCO' | 'PrepSchool',
  position?: string,
  team?: string,
): Promise<Recruit[]> {
  const params: Record<string, string> = { year: String(year) };
  if (classification) params.classification = classification;
  if (position) params.position = position;
  if (team) params.team = team;
  return await cfbdFetch<Recruit[]>('/recruiting/players', params) ?? [];
}

/* ── Transfer Portal ── */

export interface PortalEntry {
  firstName: string;
  lastName: string;
  position: string;
  origin: string;
  destination: string;
  transferDate: string;
  rating: number;
  stars: number;
  eligibility: string;
}

export async function getTransferPortal(year: number): Promise<PortalEntry[]> {
  return await cfbdFetch<PortalEntry[]>('/player/portal', { year: String(year) }) ?? [];
}

/* ── Draft Picks (Historical) ── */

export interface DraftPick {
  collegeAthleteId: number;
  nflAthleteId: number;
  collegeName: string;
  collegeTeam: string;
  nflTeam: string;
  year: number;
  overall: number;
  round: number;
  pick: number;
  name: string;
  position: string;
  height: number;
  weight: number;
  preDraftRanking: number;
  preDraftPositionRanking: number;
  preDraftGrade: number;
}

export async function getDraftPicks(year: number, team?: string): Promise<DraftPick[]> {
  const params: Record<string, string> = { year: String(year) };
  if (team) params.nflTeam = team;
  return await cfbdFetch<DraftPick[]>('/draft/picks', params) ?? [];
}

/* ── Ratings (SP+, Elo, FPI) ── */

export interface TeamRating {
  year: number;
  team: string;
  conference: string;
  elo: number;
  fpi: number;
  spOverall: number;
  spOffense: number;
  spDefense: number;
}

export async function getTeamRatings(year: number): Promise<TeamRating[]> {
  return await cfbdFetch<TeamRating[]>('/ratings/sp', { year: String(year) }) ?? [];
}

/* ── Aggregate: Get all stats for a specific player ── */

export interface PlayerStatsSummary {
  name: string;
  team: string;
  position: string;
  stats: Record<string, number>;
  recruiting?: { stars: number; rating: number; ranking: number };
}

export async function getPlayerFullStats(
  playerName: string,
  team: string,
  year: number = 2025,
): Promise<PlayerStatsSummary | null> {
  // Search for player
  const results = await searchPlayer(playerName, year, team);
  if (results.length === 0) return null;

  const player = results[0];

  // Get their season stats across all categories
  const categories = ['passing', 'rushing', 'receiving', 'defensive', 'kicking', 'punting'];
  const allStats: Record<string, number> = {};

  for (const cat of categories) {
    const stats = await getPlayerSeasonStats(year, team, cat);
    const playerStats = stats.filter(
      s => s.player.toLowerCase().includes(playerName.split(' ').pop()?.toLowerCase() ?? ''),
    );
    for (const s of playerStats) {
      allStats[`${s.category}_${s.statType}`] = s.stat;
    }
  }

  // Get recruiting data
  const recruits = await getRecruits(year - 3, 'HighSchool', undefined, team);
  const recruitMatch = recruits.find(
    r => r.name.toLowerCase().includes(playerName.split(' ').pop()?.toLowerCase() ?? ''),
  );

  return {
    name: `${player.firstName} ${player.lastName}`,
    team: player.team,
    position: player.position,
    stats: allStats,
    recruiting: recruitMatch
      ? { stars: recruitMatch.stars, rating: recruitMatch.rating, ranking: recruitMatch.ranking }
      : undefined,
  };
}

/* ── Batch: Enrich multiple prospects ── */

export async function enrichProspects(
  prospects: { name: string; school: string }[],
  year: number = 2025,
): Promise<Map<string, PlayerStatsSummary>> {
  const results = new Map<string, PlayerStatsSummary>();

  // Process in batches of 5 to avoid rate limits
  for (let i = 0; i < prospects.length; i += 5) {
    const batch = prospects.slice(i, i + 5);
    const promises = batch.map(async (p) => {
      const stats = await getPlayerFullStats(p.name, p.school, year);
      if (stats) results.set(p.name, stats);
    });
    await Promise.all(promises);

    // Small delay between batches
    if (i + 5 < prospects.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  return results;
}

/** Check if CFBD API is configured */
export function isCFBDConfigured(): boolean {
  return CFBD_KEY.length > 0;
}
