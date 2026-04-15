/**
 * lib/api/players.ts
 * ===================
 * Client-side fetch helpers for the /api/players endpoint.
 *
 * One shared call site means every page rendering the same player row
 * sees the same fields in the same shape. If a page renders `grade`
 * differently from another, it's a rendering bug — not a data bug.
 *
 * Prefer these helpers over inline fetch('/api/players?...').
 */

export type Sort =
  | 'overall_rank:asc'
  | 'overall_rank:desc'
  | 'grade:asc'
  | 'grade:desc'
  | 'position_rank:asc'
  | 'name:asc'
  | 'school:asc'
  | 'projected_round:asc';

export interface PlayerDTO {
  id: number;
  name: string;
  school: string;
  position: string;
  sport?: string;
  class_year?: string | null;
  height?: string | null;
  weight?: string | number | null;
  overall_rank?: number | null;
  position_rank?: number | null;
  projected_round?: number | null;
  grade?: number | null;
  tie_grade?: string | null;
  tie_tier?: string | null;
  vertical?: string | null;
  beast_rank?: number | null;
  beast_grade?: string | null;
  prime_sub_tags?: string[] | null;
  trend?: string | null;
  strengths?: string | null;
  weaknesses?: string | null;
  nfl_comparison?: string | null;
  scouting_summary?: string | null;
  analyst_notes?: string | null;
}

export interface PlayersResponse {
  players: PlayerDTO[];
  total?: number;
  limit?: number;
  offset?: number;
}

export interface FetchPlayersOptions {
  limit?: number;
  offset?: number;
  position?: string;
  school?: string;
  sport?: string;
  search?: string;
  sort?: Sort;
  signal?: AbortSignal;
}

function qs(opts: FetchPlayersOptions): string {
  const params = new URLSearchParams();
  if (opts.limit)    params.set('limit',    String(opts.limit));
  if (opts.offset)   params.set('offset',   String(opts.offset));
  if (opts.position) params.set('position', opts.position);
  if (opts.school)   params.set('school',   opts.school);
  if (opts.sport)    params.set('sport',    opts.sport);
  if (opts.search)   params.set('search',   opts.search);
  if (opts.sort)     params.set('sort',     opts.sort);
  const s = params.toString();
  return s ? `?${s}` : '';
}

export async function fetchPlayers(opts: FetchPlayersOptions = {}): Promise<PlayersResponse> {
  const res = await fetch(`/api/players${qs(opts)}`, { signal: opts.signal });
  if (!res.ok) {
    throw new Error(`fetchPlayers failed: ${res.status}`);
  }
  return (await res.json()) as PlayersResponse;
}

/** Convenience: top N by overall_rank. */
export function fetchRanked(limit = 100, extra: Omit<FetchPlayersOptions, 'limit' | 'sort'> = {}) {
  return fetchPlayers({ ...extra, limit, sort: 'overall_rank:asc' });
}

/** Convenience: by position. */
export function fetchByPosition(position: string, limit = 100) {
  return fetchPlayers({ position, limit, sort: 'position_rank:asc' });
}
