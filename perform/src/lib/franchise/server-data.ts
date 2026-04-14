import { sql } from '@/lib/db';
import { getMockFreeAgents, getMockRosterPlayers, getMockStaff } from './mock-data';
import { getOrgChart, getRosterLayout } from './positions';
import type { OrgChartNode, Player, RosterSlot, Sport, StaffMember, StaffRole } from './types';

type NflRosterRow = {
  id: number;
  team_abbrev: string;
  player_name: string;
  position: string;
  age: number | null;
  college: string | null;
  experience: number | null;
  cap_hit: number | string | null;
  stats_2025: Record<string, unknown> | null;
  depth_chart_rank: number | null;
  injury_status: string | null;
  contract_status: string | null;
};

type PersonnelRow = {
  id: number;
  sport: Sport;
  person_type: string;
  name: string;
  current_team: string | null;
  position: string | null;
  profile: Record<string, unknown> | null;
  available: boolean | null;
};

const ROLE_TITLES: Record<StaffRole, string> = {
  owner: 'Owner',
  gm: 'General Manager',
  head_coach: 'Head Coach',
  offensive_coordinator: 'Offensive Coordinator',
  defensive_coordinator: 'Defensive Coordinator',
  special_teams_coordinator: 'Special Teams Coordinator',
  qb_coach: 'QB Coach',
  rb_coach: 'RB Coach',
  wr_coach: 'WR Coach',
  ol_coach: 'OL Coach',
  dl_coach: 'DL Coach',
  lb_coach: 'LB Coach',
  db_coach: 'DB Coach',
  scouting_director: 'Director of Scouting',
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function toPlayerStats(value: unknown): Record<string, number | string> | undefined {
  const input = asRecord(value);
  const stats: Record<string, number | string> = {};

  for (const [key, entry] of Object.entries(input)) {
    if (typeof entry === 'number' || typeof entry === 'string') {
      stats[key] = entry;
    }
  }

  return Object.keys(stats).length > 0 ? stats : undefined;
}

function toPerYearMillions(capHit: number | undefined): number | undefined {
  if (capHit === undefined || capHit <= 0) return undefined;
  return capHit > 1000 ? Number((capHit / 1_000_000).toFixed(1)) : Number(capHit.toFixed(1));
}

function normalizePlayerPosition(sport: Sport, value: string): string {
  const position = value.trim().toUpperCase();

  if (sport === 'nfl') {
    switch (position) {
      case 'HB':
      case 'FB':
        return 'RB';
      case 'FS':
      case 'SS':
        return 'S';
      case 'NT':
      case 'IDL':
        return 'DT';
      case 'EDGE':
      case 'OLB':
      case 'ILB':
      case 'MLB':
        return 'LB';
      case 'CBK':
        return 'CB';
      default:
        return position;
    }
  }

  if (sport === 'mlb') {
    if (position === 'P') return 'RP';
    return position;
  }

  return position;
}

function slotMatches(sport: Sport, slotPosition: string, playerPosition: string): boolean {
  const normalizedPlayer = normalizePlayerPosition(sport, playerPosition);
  const exactSlot = slotPosition.toUpperCase();
  const baseSlot = exactSlot.replace(/[0-9]/g, '');

  if (normalizedPlayer === exactSlot || normalizedPlayer === baseSlot) {
    return true;
  }

  if (sport === 'nfl') {
    if (['LT', 'RT'].includes(baseSlot) && ['OT', 'T', 'OL'].includes(normalizedPlayer)) return true;
    if (['LG', 'RG'].includes(baseSlot) && ['G', 'OG', 'OL'].includes(normalizedPlayer)) return true;
    if (baseSlot === 'C' && ['C', 'OL'].includes(normalizedPlayer)) return true;
    if (baseSlot === 'DE' && ['DE', 'EDGE', 'LB'].includes(normalizedPlayer)) return true;
    if (baseSlot === 'DT' && ['DT', 'NT'].includes(normalizedPlayer)) return true;
    if (baseSlot === 'LB' && ['LB', 'EDGE'].includes(normalizedPlayer)) return true;
    if (baseSlot === 'S' && ['S', 'FS', 'SS'].includes(normalizedPlayer)) return true;
  }

  if (sport === 'nba' && baseSlot === 'BENCH') {
    return true;
  }

  if (sport === 'mlb') {
    if (baseSlot === 'SP' && normalizedPlayer === 'SP') return true;
    if (baseSlot === 'RP' && ['RP', 'SU', 'CL'].includes(normalizedPlayer)) return true;
    if (baseSlot === 'SU' && ['SU', 'RP', 'CL'].includes(normalizedPlayer)) return true;
    if (baseSlot === 'CL' && ['CL', 'RP', 'SU'].includes(normalizedPlayer)) return true;
  }

  return false;
}

function estimateNflOverall(row: NflRosterRow): number {
  const depthRank = Math.max(1, Number(row.depth_chart_rank ?? 1));
  const experience = Math.max(0, Number(row.experience ?? 0));
  const age = Number(row.age ?? 27);
  const base = 86 - (depthRank - 1) * 7 + Math.min(experience, 8) * 1.5;
  const ageAdjustment = age <= 24 ? 2 : age <= 29 ? 0 : age <= 32 ? -1 : -3;
  const injuryAdjustment = row.injury_status && row.injury_status !== 'healthy' ? -2 : 0;
  return clamp(Math.round(base + ageAdjustment + injuryAdjustment), 58, 97);
}

function mapNflRosterRow(row: NflRosterRow): Player {
  const capHit = asNumber(row.cap_hit);
  const contractPerYear = toPerYearMillions(capHit);

  return {
    id: `nfl-roster-${row.id}`,
    name: row.player_name,
    position: normalizePlayerPosition('nfl', row.position),
    team: row.team_abbrev,
    age: Number(row.age ?? 0),
    overallRating: estimateNflOverall(row),
    school: row.college ?? undefined,
    contract: contractPerYear
      ? {
          years: row.contract_status?.toLowerCase().includes('rookie') ? 2 : 1,
          perYear: contractPerYear,
          guaranteed: 0,
        }
      : undefined,
    stats: toPlayerStats(row.stats_2025),
    available: false,
  };
}

function inferStaffRole(sport: Sport, personType: string, position?: string | null): StaffRole {
  const type = personType.toLowerCase();
  const title = (position ?? '').toLowerCase();

  if (type === 'gm') return 'gm';
  if (type === 'manager') return 'head_coach';
  if (title.includes('owner')) return 'owner';
  if (title.includes('scouting')) return 'scouting_director';
  if (title.includes('head coach') || title === 'manager') return 'head_coach';
  if (title.includes('offensive coordinator') || title.includes('bench coach')) return 'offensive_coordinator';
  if (title.includes('defensive coordinator') || title.includes('pitching coach')) return 'defensive_coordinator';
  if (title.includes('special teams')) return 'special_teams_coordinator';
  if (title.includes('quarterback') || title.includes('qb coach')) return 'qb_coach';
  if (title.includes('running back') || title.includes('rb coach')) return 'rb_coach';
  if (title.includes('wide receiver') || title.includes('wr coach')) return 'wr_coach';
  if (title.includes('offensive line') || title.includes('ol coach')) return 'ol_coach';
  if (title.includes('defensive line') || title.includes('dl coach')) return 'dl_coach';
  if (title.includes('linebacker') || title.includes('lb coach')) return 'lb_coach';
  if (title.includes('defensive back') || title.includes('secondary') || title.includes('db coach')) return 'db_coach';
  if (type === 'coach') return 'head_coach';
  return sport === 'mlb' ? 'head_coach' : 'head_coach';
}

function defaultStaffTitle(sport: Sport, role: StaffRole): string {
  if (sport === 'mlb' && role === 'head_coach') return 'Manager';
  if (sport === 'nba' && role === 'offensive_coordinator') return 'Assistant Coach';
  return ROLE_TITLES[role];
}

function mapPersonnelRow(sport: Sport, row: PersonnelRow): StaffMember {
  const profile = asRecord(row.profile);
  const role = inferStaffRole(sport, row.person_type, row.position);
  const scheme = role === 'defensive_coordinator'
    ? typeof profile.scheme_defense === 'string'
      ? profile.scheme_defense
      : typeof profile.style === 'string'
        ? profile.style
        : undefined
    : typeof profile.scheme_offense === 'string'
      ? profile.scheme_offense
      : typeof profile.style === 'string'
        ? profile.style
        : undefined;
  const philosophy = typeof profile.philosophy === 'string'
    ? profile.philosophy
    : typeof profile.note === 'string'
      ? profile.note
      : undefined;

  return {
    id: `staff-${row.id}`,
    name: row.name,
    title: row.position || defaultStaffTitle(sport, role),
    role,
    team: row.current_team ?? undefined,
    tenure: asNumber(profile.tenure),
    scheme,
    philosophy,
    trackRecord: typeof profile.note === 'string' ? profile.note : undefined,
    available: Boolean(row.available),
  };
}

function buildOwnerFromProfile(sport: Sport, teamAbbr: string, profileValue: unknown): StaffMember | undefined {
  const profile = asRecord(profileValue);
  const ownership = asRecord(profile.ownership);
  if (typeof ownership.name !== 'string' || !ownership.name.trim()) {
    return undefined;
  }

  const style = typeof ownership.style === 'string'
    ? ownership.style
    : typeof ownership.archetype === 'string'
      ? ownership.archetype
      : undefined;

  return {
    id: `owner-${sport}-${teamAbbr}`,
    name: ownership.name,
    title: 'Owner',
    role: 'owner',
    team: teamAbbr,
    philosophy: style,
    available: false,
  };
}

function buildRosterSlots(sport: Sport, players: Player[]): { roster: RosterSlot[]; remaining: Player[] } {
  const remaining = [...players].sort((left, right) => right.overallRating - left.overallRating);
  const roster = getRosterLayout(sport).map((slot) => {
    const index = remaining.findIndex((player) => slotMatches(sport, slot.position, player.position));
    if (index === -1) return slot;

    const [player] = remaining.splice(index, 1);
    return { ...slot, player };
  });

  return { roster, remaining };
}

export async function loadFranchiseRosterPlayers(
  sport: Sport,
  teamAbbr: string
): Promise<{ players: Player[]; source: 'db' | 'mock' }> {
  const normalizedTeam = teamAbbr.toUpperCase();

  if (sql && sport === 'nfl') {
    try {
      const rows = await sql<NflRosterRow[]>`
        SELECT id, team_abbrev, player_name, position, age, college, experience, cap_hit, stats_2025, depth_chart_rank, injury_status, contract_status
        FROM nfl_rosters
        WHERE team_abbrev = ${normalizedTeam}
        ORDER BY depth_chart_rank NULLS LAST, position, player_name
      `;

      if (rows.length > 0) {
        return {
          players: rows.map(mapNflRosterRow),
          source: 'db',
        };
      }
    } catch {
      // Fall through to mock data.
    }
  }

  const teamSpecific = getMockRosterPlayers(sport, normalizedTeam);
  return {
    players: teamSpecific.length > 0 ? teamSpecific : getMockRosterPlayers(sport, ''),
    source: 'mock',
  };
}

export async function loadFranchiseRosterData(
  sport: Sport,
  teamAbbr: string
): Promise<{ roster: RosterSlot[]; pool: Player[]; source: { roster: 'db' | 'mock'; pool: 'mock' } }> {
  const { players, source } = await loadFranchiseRosterPlayers(sport, teamAbbr);
  const { roster, remaining } = buildRosterSlots(sport, players);

  return {
    roster,
    pool: [...getMockFreeAgents(sport), ...remaining],
    source: {
      roster: source,
      pool: 'mock',
    },
  };
}

export async function loadFranchiseStaffData(
  sport: Sport,
  teamAbbr: string
): Promise<{ org: OrgChartNode[]; pool: StaffMember[]; source: 'db' | 'mock' }> {
  const normalizedTeam = teamAbbr.toUpperCase();

  if (sql) {
    try {
      const [teamRow] = await sql<{ profile: Record<string, unknown> | null }[]>`
        SELECT profile
        FROM franchise.team_profiles
        WHERE sport = ${sport}
          AND abbreviation = ${normalizedTeam}
        LIMIT 1
      `;

      const assignedRows = await sql<PersonnelRow[]>`
        SELECT id, sport, person_type, name, current_team, position, profile, available
        FROM franchise.personnel_pool
        WHERE sport = ${sport}
          AND current_team = ${normalizedTeam}
        ORDER BY person_type, name
      `;

      const poolRows = await sql<PersonnelRow[]>`
        SELECT id, sport, person_type, name, current_team, position, profile, available
        FROM franchise.personnel_pool
        WHERE sport = ${sport}
          AND (current_team IS NULL OR current_team <> ${normalizedTeam})
        ORDER BY available DESC, person_type, name
      `;

      if (assignedRows.length > 0 || poolRows.length > 0 || teamRow?.profile) {
        const assignedStaff = assignedRows.map((row) => mapPersonnelRow(sport, row));
        const assignedByRole = new Map<StaffRole, StaffMember>();
        for (const staff of assignedStaff) {
          if (!assignedByRole.has(staff.role)) {
            assignedByRole.set(staff.role, staff);
          }
        }

        const owner = buildOwnerFromProfile(sport, normalizedTeam, teamRow?.profile);
        if (owner && !assignedByRole.has('owner')) {
          assignedByRole.set('owner', owner);
        }

        return {
          org: getOrgChart(sport).map((node) => ({
            ...node,
            staff: assignedByRole.get(node.role),
          })),
          pool: poolRows.map((row) => mapPersonnelRow(sport, row)),
          source: 'db',
        };
      }
    } catch {
      // Fall through to mock data.
    }
  }

  const allStaff = getMockStaff(sport);
  const assigned = allStaff.filter((staff) => staff.team === normalizedTeam);
  const assignedByRole = new Map<StaffRole, StaffMember>();
  for (const staff of assigned) {
    if (!assignedByRole.has(staff.role)) {
      assignedByRole.set(staff.role, staff);
    }
  }

  return {
    org: getOrgChart(sport).map((node) => ({
      ...node,
      staff: assignedByRole.get(node.role),
    })),
    pool: allStaff.filter((staff) => staff.team !== normalizedTeam),
    source: 'mock',
  };
}