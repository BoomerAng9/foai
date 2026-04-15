/**
 * Featured Moments — season-aware algorithmic hero rotator
 *
 * Scores every event in the sports calendar against today's date and returns
 * them ranked. The top scorer becomes the hero; #2–#4 become secondary cards.
 *
 * Scoring: proximity_score * sport_in_season_boost * priority_tier
 */

export type Sport = 'nfl' | 'cfb' | 'nba' | 'cbb' | 'mlb' | 'cbaseball' | 'nhl';

export type EventKind =
  | 'draft'
  | 'playoffs'
  | 'championship'
  | 'season_start'
  | 'season_end'
  | 'signing_day'
  | 'combine'
  | 'bowl_games'
  | 'pro_days';

export interface MomentEvent {
  id: string;
  sport: Sport;
  kind: EventKind;
  name: string;           // 'NFL Draft', 'NBA Playoffs'
  /** ISO start (primary) */
  startIso: string;
  /** ISO end (if window) */
  endIso?: string;
  location?: string;
  /** 1 = tentpole (Super Bowl, Draft), 2 = major, 3 = ongoing */
  priority: 1 | 2 | 3;
  /** URL the hero CTA should link to */
  href: string;
  /** Short copy */
  tagline: string;
}

/**
 * 2026 calendar. Update this as dates are confirmed.
 * Keep ISO dates in -04:00 (ET) to match DRAFT_2026 convention.
 */
export const MOMENTS_2026: MomentEvent[] = [
  { id: 'nfl-draft-2026', sport: 'nfl', kind: 'draft', name: '2026 NFL Draft',
    startIso: '2026-04-23T20:00:00-04:00', endIso: '2026-04-25T23:59:00-04:00',
    location: 'Pittsburgh · Acrisure Stadium', priority: 1,
    href: '/draft/simulate', tagline: 'Simulate, scout, and run the war room.' },

  { id: 'nba-playoffs-2026', sport: 'nba', kind: 'playoffs', name: 'NBA Playoffs',
    startIso: '2026-04-18T00:00:00-04:00', endIso: '2026-06-22T23:59:00-04:00',
    priority: 2, href: '/basketball/nba', tagline: 'Bracket tracker and series breakdowns.' },

  { id: 'mlb-season-2026', sport: 'mlb', kind: 'season_start', name: 'MLB Season',
    startIso: '2026-03-27T00:00:00-04:00', endIso: '2026-09-28T23:59:00-04:00',
    priority: 3, href: '/baseball/mlb', tagline: 'Live standings, top prospects, transactions.' },

  { id: 'cws-2026', sport: 'cbaseball', kind: 'championship', name: 'College World Series',
    startIso: '2026-06-12T00:00:00-05:00', endIso: '2026-06-24T23:59:00-05:00',
    location: 'Omaha · Charles Schwab Field', priority: 1,
    href: '/baseball/college', tagline: 'Road to Omaha — bracket, teams, stars.' },

  { id: 'nba-draft-2026', sport: 'nba', kind: 'draft', name: '2026 NBA Draft',
    startIso: '2026-06-25T20:00:00-04:00', priority: 1,
    location: 'Brooklyn · Barclays Center',
    href: '/basketball/draft', tagline: 'Prospect board, team fits, mock draft.' },

  { id: 'cfb-signing-day-2026', sport: 'cfb', kind: 'signing_day', name: 'CFB Early Signing',
    startIso: '2026-12-03T00:00:00-05:00', endIso: '2026-12-05T23:59:00-05:00',
    priority: 1, href: '/recruiting/cfb', tagline: 'Recruiting class tracker, flips, commits.' },

  { id: 'cfb-season-2026', sport: 'cfb', kind: 'season_start', name: 'College Football Season',
    startIso: '2026-08-29T00:00:00-05:00', endIso: '2026-12-13T23:59:00-05:00',
    priority: 2, href: '/football/cfb', tagline: 'Every FBS and FCS team. Every snap.' },

  { id: 'nfl-season-2026', sport: 'nfl', kind: 'season_start', name: 'NFL Season',
    startIso: '2026-09-10T00:00:00-04:00', endIso: '2027-01-03T23:59:00-05:00',
    priority: 2, href: '/football/nfl', tagline: 'Live scores, transactions, film.' },

  { id: 'cfp-2026', sport: 'cfb', kind: 'championship', name: 'College Football Playoff',
    startIso: '2026-12-20T00:00:00-05:00', endIso: '2027-01-19T23:59:00-05:00',
    priority: 1, href: '/football/cfb/playoff', tagline: '12-team CFP bracket and breakdowns.' },

  { id: 'super-bowl-lx', sport: 'nfl', kind: 'championship', name: 'Super Bowl LX',
    startIso: '2027-02-14T18:30:00-05:00', priority: 1,
    location: "Santa Clara · Levi's Stadium",
    href: '/football/nfl/super-bowl', tagline: 'Conference championships → SB LX.' },

  { id: 'combine-2026', sport: 'nfl', kind: 'combine', name: 'NFL Combine',
    startIso: '2026-02-25T00:00:00-06:00', endIso: '2026-03-03T23:59:00-06:00',
    location: 'Indianapolis', priority: 2,
    href: '/draft/combine', tagline: 'Beast calibrated 40s, jumps, hands.' },

  { id: 'nhl-playoffs-2026', sport: 'nhl', kind: 'playoffs', name: 'NHL Playoffs',
    startIso: '2026-04-20T00:00:00-04:00', endIso: '2026-06-20T23:59:00-04:00',
    priority: 3, href: '/hockey/playoffs', tagline: 'Stanley Cup bracket.' },
];

export interface ScoredMoment extends MomentEvent {
  score: number;
  state: 'upcoming' | 'live' | 'past';
  daysAway: number;
}

/**
 * Score = proximity boost × priority multiplier × live/upcoming weight.
 * - Live events (now between start and end): very high boost (1000)
 * - Upcoming within 30 days: boost decays linearly 900 → 100
 * - Upcoming 30–120 days: small residual (100 → 20)
 * - Past within 14 days: tail (50 → 5)
 * Priority: tier 1 ×3, tier 2 ×2, tier 3 ×1
 */
export function scoreMoments(now: Date, moments: MomentEvent[] = MOMENTS_2026): ScoredMoment[] {
  const ts = now.getTime();
  return moments
    .map(m => {
      const start = new Date(m.startIso).getTime();
      const end = m.endIso ? new Date(m.endIso).getTime() : start + 4 * 3600 * 1000;
      const daysAway = Math.round((start - ts) / 86400000);

      let state: ScoredMoment['state'];
      let proximity: number;
      if (ts >= start && ts <= end) {
        state = 'live';
        proximity = 1000;
      } else if (ts < start) {
        state = 'upcoming';
        const dDays = (start - ts) / 86400000;
        if (dDays <= 30) proximity = 900 - (dDays / 30) * 800;       // 900→100
        else if (dDays <= 120) proximity = 100 - ((dDays - 30) / 90) * 80; // 100→20
        else proximity = Math.max(5, 20 - (dDays - 120) * 0.1);
      } else {
        state = 'past';
        const dDays = (ts - end) / 86400000;
        if (dDays <= 14) proximity = Math.max(5, 50 - (dDays / 14) * 45); // 50→5
        else proximity = 0;
      }

      const tier = m.priority === 1 ? 3 : m.priority === 2 ? 2 : 1;
      const score = proximity * tier;
      return { ...m, score, state, daysAway };
    })
    .sort((a, b) => b.score - a.score);
}

/** Month-based palette hint for the page wrapper (weather cue). */
export function seasonTint(now: Date = new Date()): {
  label: string;
  accent: string;
  accentDim: string;
  month: number;
} {
  const m = now.getMonth(); // 0-11
  // Winter: Jan, Feb, Dec  — NFL playoffs, SB, CFP
  if (m === 11 || m === 0 || m === 1) return { label: 'winter', accent: '#93C5FD', accentDim: 'rgba(147,197,253,0.08)', month: m };
  // Spring: Mar, Apr, May — NFL Draft, NBA/NHL playoffs, MLB opening
  if (m >= 2 && m <= 4) return { label: 'spring', accent: '#D4A853', accentDim: 'rgba(212,168,83,0.10)', month: m };
  // Summer: Jun, Jul, Aug — CWS, NBA Draft, MLB, CFB camps
  if (m >= 5 && m <= 7) return { label: 'summer', accent: '#F59E0B', accentDim: 'rgba(245,158,11,0.10)', month: m };
  // Fall: Sep, Oct, Nov — CFB + NFL peak
  return { label: 'fall', accent: '#EF4444', accentDim: 'rgba(239,68,68,0.08)', month: m };
}
