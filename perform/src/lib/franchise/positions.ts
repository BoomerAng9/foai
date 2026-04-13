/**
 * Position layouts for each sport's roster board.
 */

import type { RosterSlot, OrgChartNode, Sport, StaffRole } from './types';

// NFL Roster Layout
export const NFL_ROSTER: RosterSlot[] = [
  // Offense
  { position: 'QB', label: 'Quarterback', group: 'offense' },
  { position: 'RB', label: 'Running Back', group: 'offense' },
  { position: 'WR1', label: 'Wide Receiver 1', group: 'offense' },
  { position: 'WR2', label: 'Wide Receiver 2', group: 'offense' },
  { position: 'WR3', label: 'Wide Receiver 3', group: 'offense' },
  { position: 'TE', label: 'Tight End', group: 'offense' },
  { position: 'LT', label: 'Left Tackle', group: 'offense' },
  { position: 'LG', label: 'Left Guard', group: 'offense' },
  { position: 'C', label: 'Center', group: 'offense' },
  { position: 'RG', label: 'Right Guard', group: 'offense' },
  { position: 'RT', label: 'Right Tackle', group: 'offense' },
  // Defense
  { position: 'DE1', label: 'Defensive End', group: 'defense' },
  { position: 'DE2', label: 'Defensive End', group: 'defense' },
  { position: 'DT1', label: 'Defensive Tackle', group: 'defense' },
  { position: 'DT2', label: 'Defensive Tackle', group: 'defense' },
  { position: 'LB1', label: 'Linebacker', group: 'defense' },
  { position: 'LB2', label: 'Linebacker', group: 'defense' },
  { position: 'LB3', label: 'Linebacker', group: 'defense' },
  { position: 'CB1', label: 'Cornerback 1', group: 'defense' },
  { position: 'CB2', label: 'Cornerback 2', group: 'defense' },
  { position: 'S1', label: 'Safety', group: 'defense' },
  { position: 'S2', label: 'Safety', group: 'defense' },
  // Special Teams
  { position: 'K', label: 'Kicker', group: 'special_teams' },
  { position: 'P', label: 'Punter', group: 'special_teams' },
  { position: 'LS', label: 'Long Snapper', group: 'special_teams' },
];

// NBA Roster Layout
export const NBA_ROSTER: RosterSlot[] = [
  // Starting 5
  { position: 'PG', label: 'Point Guard', group: 'starters' },
  { position: 'SG', label: 'Shooting Guard', group: 'starters' },
  { position: 'SF', label: 'Small Forward', group: 'starters' },
  { position: 'PF', label: 'Power Forward', group: 'starters' },
  { position: 'C', label: 'Center', group: 'starters' },
  // Bench
  { position: 'BENCH6', label: '6th Man', group: 'bench' },
  { position: 'BENCH7', label: 'Bench 7', group: 'bench' },
  { position: 'BENCH8', label: 'Bench 8', group: 'bench' },
  { position: 'BENCH9', label: 'Bench 9', group: 'bench' },
  { position: 'BENCH10', label: 'Bench 10', group: 'bench' },
  { position: 'BENCH11', label: 'Bench 11', group: 'bench' },
  { position: 'BENCH12', label: 'Bench 12', group: 'bench' },
];

// MLB Roster Layout
export const MLB_ROSTER: RosterSlot[] = [
  // Starting Lineup
  { position: 'C', label: 'Catcher', group: 'starters' },
  { position: '1B', label: 'First Base', group: 'starters' },
  { position: '2B', label: 'Second Base', group: 'starters' },
  { position: 'SS', label: 'Shortstop', group: 'starters' },
  { position: '3B', label: 'Third Base', group: 'starters' },
  { position: 'LF', label: 'Left Field', group: 'starters' },
  { position: 'CF', label: 'Center Field', group: 'starters' },
  { position: 'RF', label: 'Right Field', group: 'starters' },
  { position: 'DH', label: 'Designated Hitter', group: 'starters' },
  // Starting Rotation
  { position: 'SP1', label: 'Starter 1 (Ace)', group: 'rotation' },
  { position: 'SP2', label: 'Starter 2', group: 'rotation' },
  { position: 'SP3', label: 'Starter 3', group: 'rotation' },
  { position: 'SP4', label: 'Starter 4', group: 'rotation' },
  { position: 'SP5', label: 'Starter 5', group: 'rotation' },
  // Bullpen
  { position: 'CL', label: 'Closer', group: 'bullpen' },
  { position: 'SU', label: 'Setup', group: 'bullpen' },
  { position: 'RP1', label: 'Reliever', group: 'bullpen' },
  { position: 'RP2', label: 'Reliever', group: 'bullpen' },
  { position: 'RP3', label: 'Reliever', group: 'bullpen' },
];

export function getRosterLayout(sport: Sport): RosterSlot[] {
  switch (sport) {
    case 'nfl': return NFL_ROSTER.map(s => ({ ...s }));
    case 'nba': return NBA_ROSTER.map(s => ({ ...s }));
    case 'mlb': return MLB_ROSTER.map(s => ({ ...s }));
  }
}

export function getPositionFilters(sport: Sport): string[] {
  switch (sport) {
    case 'nfl': return ['ALL', 'QB', 'RB', 'WR', 'TE', 'OL', 'DE', 'DT', 'LB', 'CB', 'S', 'K', 'P'];
    case 'nba': return ['ALL', 'PG', 'SG', 'SF', 'PF', 'C'];
    case 'mlb': return ['ALL', 'C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'DH', 'SP', 'RP', 'CL'];
  }
}

// Org Chart structure (same across sports with minor label differences)
export function getOrgChart(sport: Sport): OrgChartNode[] {
  const nodes: OrgChartNode[] = [
    { role: 'owner', label: 'Owner', level: 0 },
    { role: 'gm', label: 'General Manager', level: 1, parentRole: 'owner' },
    { role: 'scouting_director', label: 'Dir. of Scouting', level: 2, parentRole: 'gm' },
    { role: 'head_coach', label: sport === 'mlb' ? 'Manager' : 'Head Coach', level: 2, parentRole: 'gm' },
  ];

  if (sport === 'nfl') {
    nodes.push(
      { role: 'offensive_coordinator', label: 'Off. Coordinator', level: 3, parentRole: 'head_coach' },
      { role: 'defensive_coordinator', label: 'Def. Coordinator', level: 3, parentRole: 'head_coach' },
      { role: 'special_teams_coordinator', label: 'ST Coordinator', level: 3, parentRole: 'head_coach' },
      { role: 'qb_coach', label: 'QB Coach', level: 4, parentRole: 'offensive_coordinator' },
      { role: 'rb_coach', label: 'RB Coach', level: 4, parentRole: 'offensive_coordinator' },
      { role: 'wr_coach', label: 'WR Coach', level: 4, parentRole: 'offensive_coordinator' },
      { role: 'ol_coach', label: 'OL Coach', level: 4, parentRole: 'offensive_coordinator' },
      { role: 'dl_coach', label: 'DL Coach', level: 4, parentRole: 'defensive_coordinator' },
      { role: 'lb_coach', label: 'LB Coach', level: 4, parentRole: 'defensive_coordinator' },
      { role: 'db_coach', label: 'DB Coach', level: 4, parentRole: 'defensive_coordinator' },
    );
  } else if (sport === 'nba') {
    nodes.push(
      { role: 'offensive_coordinator', label: 'Asst. Coach (Off)', level: 3, parentRole: 'head_coach' },
      { role: 'defensive_coordinator', label: 'Asst. Coach (Def)', level: 3, parentRole: 'head_coach' },
    );
  } else {
    nodes.push(
      { role: 'offensive_coordinator', label: 'Bench Coach', level: 3, parentRole: 'head_coach' },
      { role: 'defensive_coordinator', label: 'Pitching Coach', level: 3, parentRole: 'head_coach' },
    );
  }

  return nodes;
}

export const GROUP_LABELS: Record<string, string> = {
  offense: 'OFFENSE',
  defense: 'DEFENSE',
  special_teams: 'SPECIAL TEAMS',
  starters: 'STARTERS',
  bench: 'BENCH',
  rotation: 'ROTATION',
  bullpen: 'BULLPEN',
};
