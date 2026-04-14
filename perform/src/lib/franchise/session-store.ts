import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth-guard';
import type { SimulationMode, SimulationProjection } from './simulation';
import type { Sport } from './types';

export type SimulationSource = 'managed_agents' | 'messages_fallback';
export type FranchiseSimulationStatus = 'streaming' | 'complete' | 'error';

type SessionResultsRecord = {
  status?: FranchiseSimulationStatus;
  source?: SimulationSource;
  narrative?: string;
  projection?: SimulationProjection | null;
  error?: string | null;
  completed_at?: string;
  request?: {
    modifications_count?: number;
  };
};

type SimulationSessionRow = {
  id: string;
  sport: Sport;
  mode: SimulationMode;
  team_abbr: string;
  modifications: unknown;
  results: SessionResultsRecord | null;
  managed_agent_session_id: string | null;
  tokens_used: number | null;
  created_at: string | Date;
};

export interface FranchiseSimulationHistoryItem {
  id: string;
  sport: Sport;
  mode: SimulationMode;
  teamAbbr: string;
  createdAt: string;
  completedAt?: string;
  status: FranchiseSimulationStatus;
  source?: SimulationSource;
  narrative?: string;
  projection?: SimulationProjection | null;
  error?: string | null;
  managedAgentSessionId?: string | null;
  tokensUsed: number;
  modificationsCount: number;
}

function asIsoString(value: string | Date | null | undefined): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  return value.toISOString();
}

function countModifications(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function isSimulationStatus(value: unknown): value is FranchiseSimulationStatus {
  return value === 'streaming' || value === 'complete' || value === 'error';
}

function isSimulationSource(value: unknown): value is SimulationSource {
  return value === 'managed_agents' || value === 'messages_fallback';
}

function mapSessionRow(row: SimulationSessionRow): FranchiseSimulationHistoryItem {
  const results = row.results ?? {};
  const requestModifications = typeof results.request?.modifications_count === 'number'
    ? results.request.modifications_count
    : undefined;

  return {
    id: row.id,
    sport: row.sport,
    mode: row.mode,
    teamAbbr: row.team_abbr,
    createdAt: asIsoString(row.created_at) ?? new Date().toISOString(),
    completedAt: typeof results.completed_at === 'string' ? results.completed_at : undefined,
    status: isSimulationStatus(results.status) ? results.status : 'streaming',
    source: isSimulationSource(results.source) ? results.source : undefined,
    narrative: typeof results.narrative === 'string' ? results.narrative : undefined,
    projection: results.projection ?? null,
    error: typeof results.error === 'string' ? results.error : null,
    managedAgentSessionId: row.managed_agent_session_id,
    tokensUsed: row.tokens_used ?? 0,
    modificationsCount: requestModifications ?? countModifications(row.modifications),
  };
}

export function decodeJwtPayload(token: string): { sub?: string; user_id?: string } | null {
  const segment = token.split('.')[1];
  if (!segment) return null;

  try {
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as { sub?: string; user_id?: string };
  } catch {
    return null;
  }
}

export function getSimulationUserId(req: NextRequest): string {
  const authToken = req.cookies.get('firebase-auth-token')?.value;
  if (authToken) {
    const payload = decodeJwtPayload(authToken);
    if (payload) {
      if (typeof payload.sub === 'string' && payload.sub) return payload.sub;
      if (typeof payload.user_id === 'string' && payload.user_id) return payload.user_id;
    }
  }

  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || req.headers.get('x-real-ip') || 'anonymous';
  return `anon_${ip}`;
}

export async function resolveAuthenticatedUserId(req: NextRequest): Promise<string> {
  if (!req.cookies.get('firebase-auth-token')?.value) {
    return getSimulationUserId(req);
  }

  try {
    const auth = await requireAuth(req);
    if (auth.ok) {
      return auth.userId;
    }
  } catch {
    // Fall through to unsigned identity.
  }

  return getSimulationUserId(req);
}

export async function createSimulationSessionRecord(
  req: NextRequest,
  body: Record<string, unknown>,
): Promise<string | null> {
  if (!sql) return null;

  try {
    const userId = await resolveAuthenticatedUserId(req);
    const modifications = Array.isArray(body.modifications) ? body.modifications : [];
    const rows = await sql<{ id: string }[]>`
      INSERT INTO franchise.simulation_sessions (user_id, sport, mode, team_abbr, modifications, results)
      VALUES (
        ${userId},
        ${String(body.sport)},
        ${String(body.mode)},
        ${String(body.team_abbr)},
        ${JSON.stringify(modifications)}::jsonb,
        ${JSON.stringify({ status: 'streaming', started_at: new Date().toISOString() })}::jsonb
      )
      RETURNING id
    `;
    return rows[0]?.id ?? null;
  } catch (error) {
    console.warn('Unable to create franchise simulation session record.', error);
    return null;
  }
}

export async function updateSimulationSessionRecord(
  sessionId: string | null,
  payload: Record<string, unknown>,
): Promise<void> {
  if (!sql || !sessionId) return;

  try {
    await sql`
      UPDATE franchise.simulation_sessions
      SET results = ${JSON.stringify(payload)}::jsonb,
          managed_agent_session_id = ${typeof payload.managed_agent_session_id === 'string' ? payload.managed_agent_session_id : null},
          tokens_used = ${typeof payload.tokens_used === 'number' ? payload.tokens_used : 0}
      WHERE id = ${sessionId}
    `;
  } catch (error) {
    console.warn('Unable to update franchise simulation session record.', error);
  }
}

export async function listSimulationSessions(
  req: NextRequest,
  filters: {
    sport?: Sport;
    mode?: SimulationMode;
    teamAbbr?: string;
    limit?: number;
  },
): Promise<FranchiseSimulationHistoryItem[]> {
  if (!sql) return [];

  const userId = await resolveAuthenticatedUserId(req);
  const limit = Math.min(Math.max(filters.limit ?? 5, 1), 12);

  try {
    const rows = await sql<SimulationSessionRow[]>`
      SELECT id, sport, mode, team_abbr, modifications, results, managed_agent_session_id, tokens_used, created_at
      FROM franchise.simulation_sessions
      WHERE user_id = ${userId}
        ${filters.sport ? sql`AND sport = ${filters.sport}` : sql``}
        ${filters.mode ? sql`AND mode = ${filters.mode}` : sql``}
        ${filters.teamAbbr ? sql`AND team_abbr = ${filters.teamAbbr.toUpperCase()}` : sql``}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return rows.map(mapSessionRow);
  } catch (error) {
    console.warn('Unable to list franchise simulation sessions.', error);
    return [];
  }
}