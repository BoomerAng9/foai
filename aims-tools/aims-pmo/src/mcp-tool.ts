/**
 * pmo.commission() — MCP tool spec + Port Authority middleware
 * =============================================================
 * Roadmap item #5: structurally enforce the commissioning gate.
 *
 * Per project_hr_pmo_office.md:
 *   "MCP tool pmo.commission(mission_brief) MUST return a mission_id
 *    BEFORE any other agent tool is callable. Port Authority rejects
 *    tool calls without an active mission_id."
 *
 * This module exposes the existing commission() function as an MCP
 * tool that the Port Authority (UEF Gateway) can dispatch to, plus
 * a `requireActiveMission()` middleware that any other tool can use
 * to enforce the gate at call time.
 *
 * INTENDED CONSUMER: the Port Authority. The dispatcher should:
 *   1. On every incoming agent tool call, look up the caller's
 *      agent_id from the request context
 *   2. If the requested tool is `pmo.commission`, dispatch directly
 *      (no gate — this IS the gate-acquiring call)
 *   3. Otherwise, call requireActiveMission(callerAgentId).
 *      If it throws, reject the tool call with 403.
 *      If it succeeds, dispatch normally.
 *
 * The MCP_TOOL_SPEC export is the JSON Schema-shaped descriptor a
 * standard MCP server (e.g. @modelcontextprotocol/sdk) can register.
 */

import { commission, hasActiveMission, type CommissionInput, type CommissionResult, type CommissionError } from './commission.js';

// ─── MCP tool spec ──────────────────────────────────────────────────

export interface McpToolSpec {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

/**
 * MCP tool descriptor for pmo.commission(). Register this with any
 * standard MCP server library to expose the commissioning gate to
 * agents calling through Port Authority.
 *
 * Example wiring with @modelcontextprotocol/sdk:
 *   server.tool(PMO_COMMISSION_MCP_TOOL.name, PMO_COMMISSION_MCP_TOOL, callPmoCommission);
 */
export const PMO_COMMISSION_MCP_TOOL: McpToolSpec = {
  name: 'pmo.commission',
  description:
    'Commission a new mission for an agent. Validates the chain of command, ' +
    'inserts a mission row in the agent_missions table, and returns a mission_id. ' +
    'This MUST be called BEFORE any other agent tool. Other tool calls without ' +
    'an active mission are rejected by the Port Authority.',
  inputSchema: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'The end-user (customer or owner) on whose behalf the mission runs.',
      },
      commissionedBy: {
        type: 'string',
        description:
          'agent_id of the caller — the agent commissioning the mission. Must be ' +
          'in the agent_roster. Subject to chain-of-command validation: Lil_Hawks ' +
          'cannot commission, Betty-Anne_Ang cannot commission, AVVA NOON commissions ' +
          'ACHEEVY only, Chicken Hawk cannot delegate to Boomer_Angs (peers).',
      },
      assignedAgent: {
        type: 'string',
        description: 'agent_id of the assignee who will execute the mission.',
      },
      missionType: {
        type: 'string',
        description: 'Free-form classification, e.g. web_research, code_gen, design.',
      },
      brief: {
        type: 'object',
        description: 'The mission brief — scope + vision + expected outcome + KPIs + resources.',
        properties: {
          scope: { type: 'string', description: 'What is in scope.' },
          vision: { type: 'string', description: 'The desired end state.' },
          expectedOutcome: { type: 'string', description: 'Concrete deliverables.' },
          kpis: { type: 'object', description: 'Optional KPI targets (numeric or boolean).' },
          resources: { type: 'object', description: 'Optional resource requests.' },
        },
        required: ['scope', 'vision', 'expectedOutcome'],
      },
    },
    required: ['userId', 'commissionedBy', 'assignedAgent', 'missionType', 'brief'],
  },
};

/**
 * The MCP tool handler. Port Authority dispatches here when the
 * caller invokes 'pmo.commission'. Returns a CommissionResult on
 * success or a CommissionError on failure (chain-of-command violation,
 * invalid brief, DB error).
 */
export async function callPmoCommission(
  args: CommissionInput,
): Promise<CommissionResult | CommissionError> {
  return commission(args);
}

// ─── Port Authority middleware ──────────────────────────────────────

export class NoActiveMissionError extends Error {
  readonly code = 'NO_ACTIVE_MISSION';
  readonly httpStatus = 403;
  constructor(public readonly agentId: string) {
    super(
      `[port-authority] Agent '${agentId}' has no active mission. ` +
        `Call pmo.commission() to acquire one before invoking other tools.`,
    );
  }
}

/**
 * Port Authority middleware: throws NoActiveMissionError if the caller
 * doesn't have an active mission. Use this on every tool dispatch
 * EXCEPT pmo.commission itself.
 *
 * Usage in a UEF Gateway tool dispatcher:
 *
 *   if (toolName === 'pmo.commission') {
 *     return callPmoCommission(args);
 *   }
 *   try {
 *     await requireActiveMission(callerAgentId);
 *   } catch (e) {
 *     if (e instanceof NoActiveMissionError) {
 *       return { error: e.message, code: e.code, status: e.httpStatus };
 *     }
 *     throw e;
 *   }
 *   // ... dispatch normally
 *
 * The whitelist param allows specific tool names to bypass the gate
 * (e.g. read-only tools that don't need a mission). Empty by default.
 */
export async function requireActiveMission(
  callerAgentId: string,
  whitelist: ReadonlyArray<string> = [],
  toolName?: string,
): Promise<void> {
  if (toolName && whitelist.includes(toolName)) return;
  const active = await hasActiveMission(callerAgentId);
  if (!active) {
    throw new NoActiveMissionError(callerAgentId);
  }
}

/**
 * Default whitelist of tool names that DO NOT require an active mission.
 * These are read-only or commissioning-related tools that need to work
 * before a mission exists.
 *
 * Port Authority should pass this to requireActiveMission().
 */
export const DEFAULT_TOOL_WHITELIST: ReadonlyArray<string> = [
  'pmo.commission',           // the commissioning call itself
  'pmo.hasActiveMission',     // gate inspection
  'pmo.listMissions',         // read-only
  'pmo.getMission',           // read-only
  'pricing.visualize',        // pricing matrix browsing
  'pricing.explain',          // pricing matrix browsing
  'pricing.promptToPlan',     // TPS_Report_Ang prompt-to-plan (pre-commit)
  'roster.list',              // roster browsing
  'health.ping',              // infra health
];

/**
 * Convenience wrapper: dispatches a tool call through the gate.
 * Port Authority can call this directly:
 *
 *   const result = await dispatchWithGate({
 *     callerAgentId: ctx.agentId,
 *     toolName: req.tool,
 *     args: req.args,
 *     handler: lookupHandler(req.tool),
 *     whitelist: DEFAULT_TOOL_WHITELIST,
 *   });
 */
export interface DispatchInput<T = unknown, R = unknown> {
  callerAgentId: string;
  toolName: string;
  args: T;
  handler: (args: T) => Promise<R>;
  whitelist?: ReadonlyArray<string>;
}

export interface DispatchResult<R = unknown> {
  ok: true;
  result: R;
}

export interface DispatchError {
  ok: false;
  error: string;
  code: string;
  status: number;
}

export async function dispatchWithGate<T = unknown, R = unknown>(
  input: DispatchInput<T, R>,
): Promise<DispatchResult<R> | DispatchError> {
  // pmo.commission is its own escape — never gate the gate-acquiring call
  if (input.toolName === 'pmo.commission') {
    try {
      const result = await input.handler(input.args);
      return { ok: true, result };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        code: 'COMMISSION_FAILED',
        status: 500,
      };
    }
  }

  // Gate every other tool
  try {
    await requireActiveMission(input.callerAgentId, input.whitelist ?? DEFAULT_TOOL_WHITELIST, input.toolName);
  } catch (e) {
    if (e instanceof NoActiveMissionError) {
      return { ok: false, error: e.message, code: e.code, status: e.httpStatus };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      code: 'GATE_ERROR',
      status: 500,
    };
  }

  // Gate passed — dispatch
  try {
    const result = await input.handler(input.args);
    return { ok: true, result };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      code: 'TOOL_ERROR',
      status: 500,
    };
  }
}
