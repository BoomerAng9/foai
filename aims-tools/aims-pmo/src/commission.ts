/**
 * @aims/pmo — Mission commissioning gate
 * ======================================
 * Per project_hr_pmo_office.md:
 *   "MCP tool pmo.commission(mission_brief) MUST return a mission_id
 *    BEFORE any other agent tool is callable. Port Authority rejects
 *    tool calls without an active mission_id."
 *
 * No HITL approval gate (per project_chain_of_command.md correction):
 *   Agents are commissioned, not approved. Submit plan and go.
 *   Evaluation happens after the work, by Betty-Anne_Ang.
 *
 * Chain of command (enforced here):
 *   - User dispatch → ACHEEVY only (rejected if targets anyone else)
 *   - ACHEEVY → Chicken Hawk OR any Boomer_Ang
 *   - Chicken Hawk → Lil_Hawks (NOT Boomer_Angs — peer not subordinate)
 *   - Boomer_Ang → PMO Office Supervisors OR Lil_Hawks in their dept
 *   - Betty-Anne_Ang → AVVA NOON (reports up)
 */

import { getSql } from './client.js';
import { MissionBriefSchema } from './schema.js';
import type { MissionBrief, AgentMission } from './types.js';

export interface CommissionInput {
  userId: string;
  commissionedBy: string;       // agent id of caller
  assignedAgent: string;        // agent id of assignee
  missionType: string;
  brief: MissionBrief;
}

export interface CommissionResult {
  ok: true;
  missionId: string;
  brief: MissionBrief;
}

export interface CommissionError {
  ok: false;
  error: string;
  code: 'INVALID_BRIEF' | 'CHAIN_OF_COMMAND_VIOLATION' | 'AGENT_NOT_FOUND' | 'DB_ERROR';
}

/**
 * Validate the chain-of-command for a commissioning call.
 * Returns null if valid, or an error code/string if invalid.
 */
async function validateChainOfCommand(
  commissionedBy: string,
  assignedAgent: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const sql = getSql();

  // Look up both agents
  const agents = await sql<
    Array<{ id: string; agentClass: string; rank: string; reportsTo: string | null }>
  >`
    SELECT id, agent_class, rank, reports_to
    FROM agent_roster
    WHERE id IN (${commissionedBy}, ${assignedAgent})
  `;

  const caller = agents.find((a) => a.id === commissionedBy);
  const assignee = agents.find((a) => a.id === assignedAgent);

  if (!caller) return { ok: false, reason: `commissionedBy agent '${commissionedBy}' not in roster` };
  if (!assignee) return { ok: false, reason: `assignedAgent '${assignedAgent}' not in roster` };

  // RULE: User commands ACHEEVY only — handled at API layer, not here.
  // Here we validate AGENT-to-AGENT delegation.

  // RULE: Chicken Hawk cannot delegate to Boomer_Angs (peers, not subordinates)
  if (caller.agentClass === 'chicken_hawk' && assignee.agentClass === 'boomer_ang') {
    return {
      ok: false,
      reason: 'Chicken Hawk cannot delegate to Boomer_Angs (C-suite peers, not subordinates)',
    };
  }

  // RULE: Lil_Hawks cannot delegate (they're the bottom of the executor chain)
  if (caller.agentClass === 'lil_hawk') {
    return {
      ok: false,
      reason: 'Lil_Hawks execute, they do not delegate. Use ACHEEVY/Chicken_Hawk/Boomer_Ang to commission.',
    };
  }

  // RULE: Betty-Anne_Ang cannot commission missions — she evaluates, not delegates execution
  if (caller.id === 'betty_anne_ang') {
    return {
      ok: false,
      reason: 'Betty-Anne_Ang evaluates, she does not commission missions. PMO is observation, not execution.',
    };
  }

  // RULE: AVVA NOON commissions ACHEEVY only (platform brain → customer-company CEO)
  if (caller.agentClass === 'avva_noon' && assignee.agentClass !== 'acheevy') {
    return {
      ok: false,
      reason: 'AVVA NOON commissions ACHEEVY only. ACHEEVY routes work to the rest of the org.',
    };
  }

  return { ok: true };
}

/**
 * Commission a new mission. Inserts the brief into agent_missions in
 * status='drafted', returns the mission_id. The agent then submits
 * outcome later via finishMission().
 *
 * NO HITL APPROVAL GATE — agents are commissioned, evaluated after.
 */
export async function commission(
  input: CommissionInput,
): Promise<CommissionResult | CommissionError> {
  // 1. Validate brief shape
  const parsed = MissionBriefSchema.safeParse(input.brief);
  if (!parsed.success) {
    return {
      ok: false,
      error: `Invalid brief: ${parsed.error.message}`,
      code: 'INVALID_BRIEF',
    };
  }

  // 2. Validate chain of command
  const chainCheck = await validateChainOfCommand(input.commissionedBy, input.assignedAgent);
  if (!chainCheck.ok) {
    return {
      ok: false,
      error: chainCheck.reason,
      code: 'CHAIN_OF_COMMAND_VIOLATION',
    };
  }

  // 3. Insert mission row
  try {
    const sql = getSql();
    const rows = await sql<Array<{ id: string }>>`
      INSERT INTO agent_missions (
        user_id, commissioned_by, assigned_agent, mission_type,
        brief_scope, brief_vision, brief_expected_outcome,
        brief_kpis, brief_resources, status
      )
      VALUES (
        ${input.userId},
        ${input.commissionedBy},
        ${input.assignedAgent},
        ${input.missionType},
        ${input.brief.scope},
        ${input.brief.vision},
        ${input.brief.expectedOutcome},
        ${input.brief.kpis ? sql.json(input.brief.kpis) : null},
        ${input.brief.resources ? sql.json(input.brief.resources) : null},
        'drafted'
      )
      RETURNING id
    `;

    const missionId = rows[0]?.id;
    if (!missionId) {
      return { ok: false, error: 'INSERT returned no id', code: 'DB_ERROR' };
    }

    return { ok: true, missionId, brief: input.brief };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      code: 'DB_ERROR',
    };
  }
}

/**
 * Mark a mission as running. Called when execution actually starts
 * after the brief is committed.
 */
export async function startMission(missionId: string): Promise<void> {
  const sql = getSql();
  await sql`
    UPDATE agent_missions
    SET status = 'running'
    WHERE id = ${missionId} AND status = 'drafted'
  `;
}

export interface FinishMissionInput {
  missionId: string;
  outcomeReport: string;
  outcomeActual?: Record<string, unknown>;
  outcomeCostUsd?: number;
  outcomeTokens?: number;
  outcomeDurationMs?: number;
  failed?: boolean;
}

/**
 * Submit the outcome report for a mission. Marks status 'completed' or
 * 'failed'. Triggers Betty-Anne_Ang's evaluation queue (TODO: separate
 * worker process polls for completed missions without evaluations).
 */
export async function finishMission(input: FinishMissionInput): Promise<void> {
  const sql = getSql();
  const status = input.failed ? 'failed' : 'completed';
  await sql`
    UPDATE agent_missions
    SET
      outcome_report       = ${input.outcomeReport},
      outcome_actual       = ${input.outcomeActual ? sql.json(input.outcomeActual) : null},
      outcome_cost_usd     = ${input.outcomeCostUsd ?? null},
      outcome_tokens       = ${input.outcomeTokens ?? null},
      outcome_duration_ms  = ${input.outcomeDurationMs ?? null},
      outcome_submitted_at = NOW(),
      status               = ${status},
      completed_at         = NOW()
    WHERE id = ${input.missionId}
  `;
}

/**
 * Append an event to the mission's streaming log.
 * These events feed the PiP reasoning window via SSE.
 */
export async function logEvent(
  missionId: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO agent_mission_events (mission_id, event_type, payload)
    VALUES (${missionId}, ${eventType}, ${sql.json(payload)})
  `;
}

/**
 * Has-active-mission check — used by Port Authority to gate tool calls.
 * Returns true if the agent has at least one mission in 'drafted' or
 * 'running' status. If false, the agent's tool calls should be REJECTED.
 */
export async function hasActiveMission(agentId: string): Promise<boolean> {
  const sql = getSql();
  const rows = await sql<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count
    FROM agent_missions
    WHERE assigned_agent = ${agentId}
      AND status IN ('drafted', 'running')
  `;
  return (rows[0]?.count ?? 0) > 0;
}
