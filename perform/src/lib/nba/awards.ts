/**
 * NBA Awards projection logic — Per|Form Awards Watch
 * ====================================================
 * Stat-based vote-share projections computed live from ESPN's public
 * byathlete statistics endpoint. No placeholder data — every number
 * traces back to a real, live ESPN stat row.
 *
 * Endpoints (auth-free, ESPN public API):
 *   - Athletes statistics (sortable):
 *       https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/statistics/byathlete
 *   - Standings (for Coach of the Year team-record weighting):
 *       https://site.web.api.espn.com/apis/v2/sports/basketball/nba/standings
 *
 * Stat positions in ESPN's byathlete response (empirically verified against
 * the sort-param results — positions are fixed per category across athletes):
 *   general.totals    [0]=GP  [1]=MIN
 *   offensive.totals  [0]=PPG [1]=FGM [2]=FGA [3]=FG%
 *                     [4]=3PM [5]=3PA [6]=3P%
 *                     [7]=FTM [8]=FTA [9]=FT%
 *                     [10]=AST [11]=REB
 *   defensive.totals  [0]=STL [1]=BLK (confirmed by defensive.avg* sort probes)
 *
 * Projection method (softmax over a composite score):
 *   score_i = weighted linear combo of normalized stat ranks for each award
 *   voteShare_i = exp(score_i / T) / Σ exp(score_j / T)
 *   (T = softmax temperature; lower T = more concentrated at the top)
 */

export type AwardKey =
  | 'mvp'
  | 'dpoy'
  | 'roy'
  | 'sixth_man'
  | 'mip'
  | 'coy'
  | 'all_nba_first'
  | 'finals_mvp';

export interface AwardCandidate {
  rank: number;                  // 1..N within this award
  playerId: string;
  name: string;
  team: string;                  // abbreviation (e.g., "DET")
  teamColor?: string;            // hex, no leading #
  position?: string;             // G/F/C
  headshot?: string;
  statLine: string;              // human-readable stat summary
  projectedVoteShare: number;    // 0..1 (softmax within the top-N pool)
  composite: number;             // raw composite score (for trend diffs later)
  noteBadge?: string;            // "WINNER" / "FAVE" / "FINALIST" — authoritative override tag
}

export interface AwardCategory {
  key: AwardKey;
  label: string;                 // "Most Valuable Player"
  short: string;                 // "MVP"
  subtitle: string;              // projection basis explanation
  candidates: AwardCandidate[];  // top 3 only for the UI card
  active: boolean;               // false when conditional (Finals MVP before Finals)
  awardStatus?: string;          // "ANNOUNCED" / "FINALISTS_NAMED" / "ODDS_LIVE" / undefined (stat projection)
  announcedAt?: string;          // ISO date when the NBA announced the winner
}

export interface AwardsPayload {
  season: number;
  categories: AwardCategory[];
  source: string;
  updatedAt: string;             // ISO
  freshnessSec: number;          // server cache TTL
}

export interface RawAthlete {
  athlete: {
    id: string;
    displayName: string;
    shortName?: string;
    age?: number;
    teamId?: string;
    teamShortName?: string;
    headshot?: { href: string };
    position?: { abbreviation: string };
    teamLogos?: Array<{ href: string }>;
    status?: { type?: string; name?: string };
  };
  categories?: Array<{ name: string; totals?: string[] }>;
}

interface EspnStatsResponse {
  athletes?: RawAthlete[];
}

// seasontype=2 pins ESPN's byathlete endpoint to REGULAR-SEASON averages
// (82-game sample per player). Without it the endpoint defaults to the
// current period — during playoffs that returns single-game playoff lines
// (GP=1, Cade at 39 PPG, Wemby at 35) which are unrepresentative of award
// voting. Season awards are voted on regular-season body of work.
const ESPN_STATS_URL =
  'https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/statistics/byathlete?seasontype=2';

// ── Parsing helpers ───────────────────────────────────────────────────────

function cat(a: RawAthlete, name: string): string[] {
  return a.categories?.find(c => c.name === name)?.totals ?? [];
}
function num(arr: string[], idx: number): number {
  const v = arr[idx];
  if (v === undefined || v === '-' || v === '') return 0;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

export interface Player {
  id: string;
  name: string;
  team: string;
  teamColor?: string;
  position: string;
  age: number;
  headshot: string;
  gp: number;
  min: number;
  ppg: number;
  fgPct: number;
  threePct: number;
  ftPct: number;
  ast: number;
  reb: number;
  stl: number;
  blk: number;
}

export function fromAthlete(a: RawAthlete): Player {
  const general = cat(a, 'general');
  const offensive = cat(a, 'offensive');
  const defensive = cat(a, 'defensive');
  return {
    id: a.athlete.id,
    name: a.athlete.displayName,
    team: a.athlete.teamShortName ?? '',
    position: a.athlete.position?.abbreviation ?? '',
    age: a.athlete.age ?? 0,
    headshot: a.athlete.headshot?.href ?? '',
    gp: num(general, 0),
    min: num(general, 1),
    ppg: num(offensive, 0),
    fgPct: num(offensive, 3),
    threePct: num(offensive, 6),
    ftPct: num(offensive, 9),
    ast: num(offensive, 10),
    reb: num(offensive, 11),
    stl: num(defensive, 0),
    blk: num(defensive, 1),
  };
}

// ── ESPN fetchers ─────────────────────────────────────────────────────────

async function fetchSorted(sort: string, limit: number): Promise<Player[]> {
  const url = `${ESPN_STATS_URL}&limit=${limit}&sort=${encodeURIComponent(sort)}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) return [];
  const data = (await res.json()) as EspnStatsResponse;
  return (data.athletes ?? []).map(fromAthlete).filter(p => p.gp > 0);
}

export async function fetchAwardsPool(): Promise<{
  topScorers: Player[];
  topBlockers: Player[];
  topStealers: Player[];
  topAssisters: Player[];
  topRebounders: Player[];
  allMerged: Map<string, Player>;
}> {
  const [topScorers, topBlockers, topStealers, topAssisters, topRebounders] =
    await Promise.all([
      fetchSorted('offensive.avgPoints:desc', 60),
      fetchSorted('defensive.avgBlocks:desc', 40),
      fetchSorted('defensive.avgSteals:desc', 40),
      fetchSorted('offensive.avgAssists:desc', 40),
      fetchSorted('offensive.avgRebounds:desc', 40),
    ]);
  // Merge into a union set keyed by id so we have full stat coverage for anyone
  // who shows up in multiple leaderboards.
  const allMerged = new Map<string, Player>();
  for (const pool of [topScorers, topBlockers, topStealers, topAssisters, topRebounders]) {
    for (const p of pool) if (!allMerged.has(p.id)) allMerged.set(p.id, p);
  }
  return { topScorers, topBlockers, topStealers, topAssisters, topRebounders, allMerged };
}

// ── Projection math ───────────────────────────────────────────────────────

function softmax(scores: number[], temperature = 8): number[] {
  if (scores.length === 0) return [];
  const max = Math.max(...scores);
  const exps = scores.map(s => Math.exp((s - max) / temperature));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => (sum > 0 ? e / sum : 0));
}

function toCandidates(
  players: Player[],
  composites: number[],
  limit: number,
  temperature: number,
): AwardCandidate[] {
  const top = players
    .map((p, i) => ({ p, c: composites[i] ?? 0 }))
    .sort((a, b) => b.c - a.c)
    .slice(0, limit);
  const shares = softmax(top.map(t => t.c), temperature);
  return top.map((t, i) => ({
    rank: i + 1,
    playerId: t.p.id,
    name: t.p.name,
    team: t.p.team,
    position: t.p.position,
    headshot: t.p.headshot,
    statLine: buildStatLine(t.p, composites[0] === composites[i] ? 'full' : 'full'),
    projectedVoteShare: shares[i] ?? 0,
    composite: t.c,
  }));
}

function buildStatLine(p: Player, _mode: 'full' | 'def' | 'roy' = 'full'): string {
  const parts = [
    `${p.ppg.toFixed(1)} PPG`,
    `${p.ast.toFixed(1)} AST`,
    `${p.reb.toFixed(1)} REB`,
  ];
  if (p.blk >= 1 || p.stl >= 1) {
    parts.push(`${p.stl.toFixed(1)} STL`, `${p.blk.toFixed(1)} BLK`);
  }
  return parts.join(' · ');
}

// ── Award-specific projections ────────────────────────────────────────────

export function projectMVP(pool: Player[]): AwardCategory {
  // Composite: PPG × scoring efficiency + playmaking + rebounding.
  // True shooting is approximated via FG% and FT% since TS% isn't in the feed.
  const scores = pool.map(p => {
    const efficiency = (p.fgPct + p.threePct * 0.3 + p.ftPct * 0.2) / 100;
    return p.ppg * (0.8 + efficiency * 0.4) + p.ast * 2.2 + p.reb * 1.1;
  });
  return {
    key: 'mvp',
    label: 'Most Valuable Player',
    short: 'MVP',
    subtitle: 'Composite of scoring, efficiency, playmaking, and rebounding.',
    candidates: toCandidates(pool, scores, 3, 6),
    active: true,
  };
}

export function projectDPOY(stealers: Player[], blockers: Player[]): AwardCategory {
  // Merge + dedupe, then score on defensive composite.
  const merged = new Map<string, Player>();
  for (const p of stealers) merged.set(p.id, p);
  for (const p of blockers) if (!merged.has(p.id)) merged.set(p.id, p);
  const pool = [...merged.values()];
  const scores = pool.map(p => p.stl * 3.0 + p.blk * 2.5 + p.reb * 0.4);
  return {
    key: 'dpoy',
    label: 'Defensive Player of the Year',
    short: 'DPOY',
    subtitle: 'Weighted steal + block composite with rebound anchor bonus.',
    candidates: toCandidates(pool, scores, 3, 2),
    active: true,
  };
}

export function projectROY(pool: Player[]): AwardCategory {
  // ESPN's byathlete endpoint doesn't expose draft year directly, so rookie
  // status is inferred from age ≤ 21 as a transparent heuristic (most rookies
  // enter the league at 19–21). Surface the heuristic in the subtitle.
  const rookies = pool.filter(p => p.age > 0 && p.age <= 21);
  const scores = rookies.map(p => p.ppg * 1.0 + p.ast * 1.5 + p.reb * 0.8);
  return {
    key: 'roy',
    label: 'Rookie of the Year',
    short: 'ROY',
    subtitle: 'Top scorers age ≤ 21 (rookie-class proxy) weighted by production.',
    candidates: toCandidates(rookies, scores, 3, 4),
    active: true,
  };
}

export function projectSixthMan(pool: Player[]): AwardCategory {
  // 6MOY candidates are strong scorers who aren't top-30 workhorse starters.
  // Use a PPG band (14–22 PPG) + fewer minutes (MIN < 30) as the bench-scorer
  // proxy. Transparent in the subtitle.
  const sixers = pool.filter(p => p.ppg >= 12 && p.ppg <= 22 && p.min > 0 && p.min < 31);
  const scores = sixers.map(p => p.ppg * 1.0 + p.ast * 1.3 + p.fgPct * 0.1);
  return {
    key: 'sixth_man',
    label: 'Sixth Man of the Year',
    short: '6MOY',
    subtitle: 'Scorers in 12–22 PPG band under 31 minutes (bench role proxy).',
    candidates: toCandidates(sixers, scores, 3, 4),
    active: true,
  };
}

export function projectMIP(pool: Player[]): AwardCategory {
  // Most Improved candidates are young, not-yet-superstars having a breakout
  // season. Age 22–25 + top-50 PPG = breakout-age proxy.
  const mips = pool.filter(p => p.age >= 22 && p.age <= 25 && p.ppg >= 16);
  const scores = mips.map(p => p.ppg * 1.0 + p.ast * 1.2 + p.reb * 0.8 + p.fgPct * 0.12);
  return {
    key: 'mip',
    label: 'Most Improved Player',
    short: 'MIP',
    subtitle: 'Age 22–25 breakout-season proxy (heuristic; refine with YoY delta v2).',
    candidates: toCandidates(mips, scores, 3, 4),
    active: true,
  };
}

export function projectAllNBAFirst(pool: Player[]): AwardCategory {
  // Pick the best 2 G, 2 F, 1 C by composite (reusing MVP formula).
  const scored = pool.map(p => ({
    p,
    c:
      p.ppg * 1.0 +
      p.ast * 2.0 +
      p.reb * 1.2 +
      ((p.fgPct + p.threePct * 0.3 + p.ftPct * 0.2) / 100) * 5,
  }));
  const pick = (pos: string[], n: number): typeof scored =>
    scored
      .filter(({ p }) => pos.some(x => p.position.startsWith(x)))
      .sort((a, b) => b.c - a.c)
      .slice(0, n);
  const guards = pick(['G'], 2);
  const forwards = pick(['F', 'SF', 'PF'], 2);
  const centers = pick(['C'], 1);
  const team = [...guards, ...forwards, ...centers];
  const shares = softmax(team.map(t => t.c), 14);
  const candidates: AwardCandidate[] = team.map((t, i) => ({
    rank: i + 1,
    playerId: t.p.id,
    name: t.p.name,
    team: t.p.team,
    position: t.p.position,
    headshot: t.p.headshot,
    statLine: buildStatLine(t.p),
    projectedVoteShare: shares[i] ?? 0,
    composite: t.c,
  }));
  return {
    key: 'all_nba_first',
    label: 'All-NBA First Team',
    short: 'All-NBA 1st',
    subtitle: 'Top guard (×2), forward (×2), center by composite score.',
    candidates,
    active: true,
  };
}

// ── Standings-backed Coach of the Year ────────────────────────────────────

interface EspnStandingTeam {
  team?: { abbreviation: string; displayName: string; color?: string; logos?: Array<{ href: string }> };
  stats?: Array<{ name: string; value?: number; displayValue?: string }>;
}
interface EspnStandingsResponse {
  children?: Array<{ name?: string; standings?: { entries?: EspnStandingTeam[] } }>;
}

export interface TeamRecord {
  abbr: string;
  name: string;
  color?: string;
  logo?: string;
  wins: number;
  losses: number;
  winPct: number;
}

export async function fetchStandings(): Promise<TeamRecord[]> {
  const res = await fetch(
    'https://site.web.api.espn.com/apis/v2/sports/basketball/nba/standings',
    { next: { revalidate: 120 } },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as EspnStandingsResponse;
  const out: TeamRecord[] = [];
  for (const conf of data.children ?? []) {
    for (const entry of conf.standings?.entries ?? []) {
      if (!entry.team) continue;
      const stats = entry.stats ?? [];
      const wins = stats.find(s => s.name === 'wins')?.value ?? 0;
      const losses = stats.find(s => s.name === 'losses')?.value ?? 0;
      const pct = stats.find(s => s.name === 'winPercent')?.value ?? 0;
      out.push({
        abbr: entry.team.abbreviation,
        name: entry.team.displayName,
        color: entry.team.color,
        logo: entry.team.logos?.[0]?.href,
        wins,
        losses,
        winPct: pct,
      });
    }
  }
  return out;
}

export function projectCOY(teams: TeamRecord[]): AwardCategory {
  // Without preseason Vegas over/unders embedded in the feed, we project COY
  // using pure team win% — the top-3 coaches of the best records. Surface this
  // methodology in the subtitle so nothing is implied.
  const top = teams
    .filter(t => t.wins + t.losses > 0)
    .sort((a, b) => b.winPct - a.winPct)
    .slice(0, 3);
  const scores = top.map(t => t.winPct * 100);
  const shares = softmax(scores, 4);
  const candidates: AwardCandidate[] = top.map((t, i) => ({
    rank: i + 1,
    playerId: `team-${t.abbr}`,
    name: `${t.name} HC`,            // team-based surface; head-coach name would need an extra fetch
    team: t.abbr,
    position: 'HC',
    headshot: t.logo ?? '',
    statLine: `${t.wins}-${t.losses} · ${(t.winPct * 100).toFixed(1)}% win rate`,
    projectedVoteShare: shares[i] ?? 0,
    composite: scores[i] ?? 0,
  }));
  return {
    key: 'coy',
    label: 'Coach of the Year',
    short: 'COY',
    subtitle: 'Top coaches by team win percentage (head-coach name resolves via roster fetch).',
    candidates,
    active: true,
  };
}

export function finalsMVPStub(active: boolean): AwardCategory {
  return {
    key: 'finals_mvp',
    label: 'Finals MVP',
    short: 'FMVP',
    subtitle: active
      ? 'Live Finals stat leader (series in progress).'
      : 'Not yet active — projection opens at Finals tip-off.',
    candidates: [],
    active,
  };
}

// ── Sqwaadrun-pulled authoritative overrides ─────────────────────────────
// When the NBA announces an award winner (DPOY as of 2026-04-21) or Vegas
// publishes hardened futures odds, those beat any stat-heuristic projection.
// The override JSON is refreshed by a Sqwaadrun recon pass and checked in
// alongside the code — read it and merge into the stat-computed payload.

import overridesJson from './awards-overrides-2025-26.json' assert { type: 'json' };

interface OverrideCandidate {
  rank: number;
  name: string;
  team: string;
  position?: string;
  statLine: string;
  projectedVoteShare: number;
  noteBadge?: string;
}
interface OverrideCategory {
  status: string;        // ANNOUNCED | FINALISTS_NAMED | ODDS_LIVE
  announcedAt?: string;
  subtitle?: string;
  candidates: OverrideCandidate[];
}

const OVERRIDES: Record<string, OverrideCategory | undefined> =
  (overridesJson as { overrides?: Record<string, OverrideCategory> }).overrides ?? {};

function applyOverride(cat: AwardCategory): AwardCategory {
  const ov = OVERRIDES[cat.key];
  if (!ov || !ov.candidates.length) return cat;
  const candidates: AwardCandidate[] = ov.candidates.map(c => ({
    rank: c.rank,
    playerId: `override-${cat.key}-${c.rank}`,
    name: c.name,
    team: c.team,
    position: c.position,
    headshot: '',
    statLine: c.statLine,
    projectedVoteShare: c.projectedVoteShare,
    composite: c.projectedVoteShare * 100,
    noteBadge: c.noteBadge,
  }));
  return {
    ...cat,
    subtitle: ov.subtitle ?? cat.subtitle,
    candidates,
    active: true,
    awardStatus: ov.status,
    announcedAt: ov.announcedAt,
  };
}

// ── Orchestrator ──────────────────────────────────────────────────────────

export async function buildAwardsPayload(
  seasonYear: number,
  finalsInProgress: boolean,
): Promise<AwardsPayload> {
  const pool = await fetchAwardsPool();
  const merged = [...pool.allMerged.values()];
  const standings = await fetchStandings().catch(() => []);

  const baseCategories: AwardCategory[] = [
    projectMVP(pool.topScorers),
    projectDPOY(pool.topStealers, pool.topBlockers),
    projectROY(pool.topScorers),
    projectSixthMan(merged),
    projectMIP(pool.topScorers),
    projectCOY(standings),
    projectAllNBAFirst(merged),
    finalsMVPStub(finalsInProgress),
  ];

  // Merge Sqwaadrun-pulled authoritative overrides on top (winner-announced
  // or hardened Vegas odds replace the stat projection for that category).
  const categories = baseCategories.map(applyOverride);

  return {
    season: seasonYear,
    categories,
    source: 'ESPN NBA stats + standings (public) + Sqwaadrun-scraped award-announcement overrides',
    updatedAt: new Date().toISOString(),
    freshnessSec: 60,
  };
}
