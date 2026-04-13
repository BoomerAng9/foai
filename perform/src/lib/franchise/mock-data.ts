/**
 * Mock data for Franchise Simulator.
 * Used as fallback when API routes are not yet available.
 */

import type { Player, StaffMember, Sport } from './types';

function id() { return Math.random().toString(36).slice(2, 10); }

// ---------- NFL Mock Players ----------
const NFL_FREE_AGENTS: Player[] = [
  { id: id(), name: 'Marcus Williams', position: 'S', age: 28, overallRating: 82, available: true, contract: { years: 0, perYear: 0, guaranteed: 0 } },
  { id: id(), name: 'Jadeveon Clowney', position: 'DE', age: 31, overallRating: 78, available: true },
  { id: id(), name: 'Odell Beckham Jr.', position: 'WR', age: 33, overallRating: 74, available: true },
  { id: id(), name: 'Dalvin Cook', position: 'RB', age: 30, overallRating: 76, available: true },
  { id: id(), name: 'Patrick Peterson', position: 'CB', age: 34, overallRating: 72, available: true },
  { id: id(), name: 'Cam Robinson', position: 'OT', age: 29, overallRating: 79, available: true, contract: { years: 0, perYear: 0, guaranteed: 0 } },
  { id: id(), name: 'Sheldon Rankins', position: 'DT', age: 30, overallRating: 75, available: true },
  { id: id(), name: 'Joe Thuney', position: 'OL', age: 31, overallRating: 84, available: true },
  { id: id(), name: 'Quandre Diggs', position: 'S', age: 32, overallRating: 77, available: true },
  { id: id(), name: 'Emmanuel Sanders', position: 'WR', age: 33, overallRating: 70, available: true },
  { id: id(), name: 'Yannick Ngakoue', position: 'DE', age: 29, overallRating: 80, available: true },
  { id: id(), name: 'Johnathan Abram', position: 'S', age: 28, overallRating: 71, available: true },
  { id: id(), name: 'Riley Reiff', position: 'OT', age: 34, overallRating: 73, available: true },
  { id: id(), name: 'Stephon Gilmore', position: 'CB', age: 33, overallRating: 76, available: true },
  { id: id(), name: 'Carlos Dunlap', position: 'DE', age: 34, overallRating: 71, available: true },
];

const NFL_ROSTER_PLAYERS: Player[] = [
  // Example team (DAL) starters
  { id: id(), name: 'Dak Prescott', position: 'QB', team: 'DAL', age: 31, overallRating: 88, available: false, contract: { years: 4, perYear: 60, guaranteed: 231 } },
  { id: id(), name: 'Ezekiel Elliott', position: 'RB', team: 'DAL', age: 30, overallRating: 78, available: false, contract: { years: 2, perYear: 5, guaranteed: 6 } },
  { id: id(), name: 'CeeDee Lamb', position: 'WR', team: 'DAL', age: 27, overallRating: 95, available: false, contract: { years: 4, perYear: 34, guaranteed: 100 } },
  { id: id(), name: 'Jake Ferguson', position: 'TE', team: 'DAL', age: 26, overallRating: 82, available: false, contract: { years: 3, perYear: 12, guaranteed: 24 } },
  { id: id(), name: 'Brandin Cooks', position: 'WR', team: 'DAL', age: 32, overallRating: 79, available: false },
  { id: id(), name: 'Jalen Tolbert', position: 'WR', team: 'DAL', age: 26, overallRating: 74, available: false },
  { id: id(), name: 'Tyler Smith', position: 'OT', team: 'DAL', age: 24, overallRating: 83, available: false },
  { id: id(), name: 'Zack Martin', position: 'OL', team: 'DAL', age: 34, overallRating: 92, available: false },
  { id: id(), name: 'Brock Hoffman', position: 'OL', team: 'DAL', age: 27, overallRating: 72, available: false },
  { id: id(), name: 'Micah Parsons', position: 'DE', team: 'DAL', age: 25, overallRating: 97, available: false, contract: { years: 4, perYear: 34, guaranteed: 102 } },
  { id: id(), name: 'DeMarcus Lawrence', position: 'DE', team: 'DAL', age: 32, overallRating: 83, available: false },
  { id: id(), name: 'Osa Odighizuwa', position: 'DT', team: 'DAL', age: 26, overallRating: 80, available: false },
  { id: id(), name: 'Mazi Smith', position: 'DT', team: 'DAL', age: 24, overallRating: 68, available: false },
  { id: id(), name: 'Eric Kendricks', position: 'LB', team: 'DAL', age: 33, overallRating: 77, available: false },
  { id: id(), name: 'DaRon Bland', position: 'CB', team: 'DAL', age: 25, overallRating: 86, available: false },
  { id: id(), name: 'Trevon Diggs', position: 'CB', team: 'DAL', age: 27, overallRating: 84, available: false },
  { id: id(), name: 'Malik Hooker', position: 'S', team: 'DAL', age: 28, overallRating: 80, available: false },
  { id: id(), name: 'Jayron Kearse', position: 'S', team: 'DAL', age: 30, overallRating: 76, available: false },
  { id: id(), name: 'Brandon Aubrey', position: 'K', team: 'DAL', age: 29, overallRating: 90, available: false },
  { id: id(), name: 'Bryan Anger', position: 'P', team: 'DAL', age: 35, overallRating: 78, available: false },
];

// ---------- NBA Mock Players ----------
const NBA_FREE_AGENTS: Player[] = [
  { id: id(), name: 'DeMar DeRozan', position: 'SF', age: 36, overallRating: 83, available: true },
  { id: id(), name: 'Russell Westbrook', position: 'PG', age: 37, overallRating: 74, available: true },
  { id: id(), name: 'Blake Griffin', position: 'PF', age: 37, overallRating: 68, available: true },
  { id: id(), name: 'Montrezl Harrell', position: 'C', age: 31, overallRating: 73, available: true },
  { id: id(), name: 'Dennis Schroder', position: 'PG', age: 32, overallRating: 76, available: true },
  { id: id(), name: 'Markelle Fultz', position: 'PG', age: 27, overallRating: 72, available: true },
  { id: id(), name: 'Reggie Bullock', position: 'SG', age: 33, overallRating: 70, available: true },
  { id: id(), name: 'Thaddeus Young', position: 'PF', age: 37, overallRating: 69, available: true },
];

const NBA_ROSTER_PLAYERS: Player[] = [
  { id: id(), name: 'Luka Doncic', position: 'PG', team: 'DAL', age: 27, overallRating: 96, available: false, contract: { years: 5, perYear: 46, guaranteed: 215 } },
  { id: id(), name: 'Kyrie Irving', position: 'SG', team: 'DAL', age: 34, overallRating: 88, available: false, contract: { years: 3, perYear: 41, guaranteed: 123 } },
  { id: id(), name: 'P.J. Washington', position: 'PF', team: 'DAL', age: 26, overallRating: 80, available: false },
  { id: id(), name: 'Daniel Gafford', position: 'C', team: 'DAL', age: 26, overallRating: 78, available: false },
  { id: id(), name: 'Derrick Jones Jr.', position: 'SF', team: 'DAL', age: 27, overallRating: 75, available: false },
];

// ---------- MLB Mock Players ----------
const MLB_FREE_AGENTS: Player[] = [
  { id: id(), name: 'Carlos Correa', position: 'SS', age: 31, overallRating: 85, available: true },
  { id: id(), name: 'J.D. Martinez', position: 'DH', age: 38, overallRating: 78, available: true },
  { id: id(), name: 'Craig Kimbrel', position: 'CL', age: 37, overallRating: 72, available: true },
  { id: id(), name: 'Matt Chapman', position: '3B', age: 32, overallRating: 82, available: true },
  { id: id(), name: 'Jordan Montgomery', position: 'SP', age: 32, overallRating: 79, available: true },
  { id: id(), name: 'Cody Bellinger', position: 'CF', age: 30, overallRating: 80, available: true },
];

const MLB_ROSTER_PLAYERS: Player[] = [
  { id: id(), name: 'Shohei Ohtani', position: 'DH', team: 'LAD', age: 31, overallRating: 99, available: false, contract: { years: 10, perYear: 70, guaranteed: 700 } },
  { id: id(), name: 'Mookie Betts', position: 'RF', team: 'LAD', age: 33, overallRating: 92, available: false },
  { id: id(), name: 'Freddie Freeman', position: '1B', team: 'LAD', age: 36, overallRating: 90, available: false },
];

// ---------- Staff ----------
const NFL_STAFF: StaffMember[] = [
  { id: id(), name: 'Bill Belichick', title: 'Head Coach', role: 'head_coach', scheme: 'Multiple', philosophy: 'Defensive-minded, adaptable scheme', record: { wins: 302, losses: 165 }, trackRecord: '6x Super Bowl Champion', available: true },
  { id: id(), name: 'Sean Payton', title: 'Head Coach', role: 'head_coach', team: 'DEN', scheme: 'West Coast', philosophy: 'Pass-heavy, creative play design', record: { wins: 161, losses: 98 }, available: false },
  { id: id(), name: 'Jim Harbaugh', title: 'Head Coach', role: 'head_coach', team: 'LAC', scheme: 'Pro-Style', philosophy: 'Run-first, physical', record: { wins: 49, losses: 22 }, available: false },
  { id: id(), name: 'Matt Eberflus', title: 'Defensive Coordinator', role: 'defensive_coordinator', scheme: 'Tampa 2', philosophy: 'Zone coverage, takeaway-focused', record: { wins: 14, losses: 32 }, available: true },
  { id: id(), name: 'Kellen Moore', title: 'Offensive Coordinator', role: 'offensive_coordinator', scheme: 'Spread', philosophy: 'RPO-heavy, tempo', available: true },
  { id: id(), name: 'Joe Brady', title: 'Offensive Coordinator', role: 'offensive_coordinator', scheme: 'Spread', philosophy: 'Quick passing game, motion', available: true },
  { id: id(), name: 'Ejiro Evero', title: 'Defensive Coordinator', role: 'defensive_coordinator', scheme: 'Fangio Tree', philosophy: '3-4 base, zone blitz', available: true },
  { id: id(), name: 'Dave Canales', title: 'Head Coach', role: 'head_coach', team: 'CAR', scheme: 'West Coast', philosophy: 'QB development, run-pass balance', record: { wins: 5, losses: 12 }, available: false },
];

const NBA_STAFF: StaffMember[] = [
  { id: id(), name: 'Doc Rivers', title: 'Head Coach', role: 'head_coach', scheme: 'Motion Offense', philosophy: 'Veteran management, championship DNA', record: { wins: 1098, losses: 781 }, available: true },
  { id: id(), name: 'Mike Budenholzer', title: 'Head Coach', role: 'head_coach', scheme: 'Drop Coverage', philosophy: 'Pace & space, 3-point focused', record: { wins: 435, losses: 322 }, available: true },
  { id: id(), name: 'Monty Williams', title: 'Head Coach', role: 'head_coach', scheme: 'Modern Motion', philosophy: 'Player development', record: { wins: 194, losses: 184 }, available: true },
];

const MLB_STAFF: StaffMember[] = [
  { id: id(), name: 'Dusty Baker', title: 'Manager', role: 'head_coach', scheme: 'Traditional', philosophy: 'Veteran-led, steady hand', record: { wins: 2093, losses: 1790 }, trackRecord: '2022 World Series Champion', available: true },
  { id: id(), name: 'Buck Showalter', title: 'Manager', role: 'head_coach', scheme: 'Fundamentals', philosophy: 'Old school, attention to detail', record: { wins: 1551, losses: 1517 }, available: true },
  { id: id(), name: 'Joe Girardi', title: 'Manager', role: 'head_coach', scheme: 'Analytics-balanced', philosophy: 'Pitching-first', record: { wins: 1132, losses: 1068 }, available: true },
];

export function getMockFreeAgents(sport: Sport): Player[] {
  switch (sport) {
    case 'nfl': return NFL_FREE_AGENTS;
    case 'nba': return NBA_FREE_AGENTS;
    case 'mlb': return MLB_FREE_AGENTS;
  }
}

export function getMockRosterPlayers(sport: Sport, teamAbbr: string): Player[] {
  switch (sport) {
    case 'nfl': return NFL_ROSTER_PLAYERS.filter(p => !teamAbbr || p.team === teamAbbr);
    case 'nba': return NBA_ROSTER_PLAYERS.filter(p => !teamAbbr || p.team === teamAbbr);
    case 'mlb': return MLB_ROSTER_PLAYERS.filter(p => !teamAbbr || p.team === teamAbbr);
  }
}

export function getMockStaff(sport: Sport): StaffMember[] {
  switch (sport) {
    case 'nfl': return NFL_STAFF;
    case 'nba': return NBA_STAFF;
    case 'mlb': return MLB_STAFF;
  }
}
