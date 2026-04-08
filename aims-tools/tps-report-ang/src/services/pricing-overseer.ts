/**
 * TPS_Report_Ang — Pricing Overseer service core
 * ===============================================
 * The actual computation methods that the HTTP routes wrap.
 * Pure functions, no Express dependency. This makes the same
 * methods callable from:
 *   - The HTTP service (this package)
 *   - An MCP tool wrapping for Port Authority
 *   - Inside SmelterOS as direct imports
 *   - From a CLI for offline simulation
 *
 * Backed by @aims/pricing-matrix sync getMatrix() for now. When
 * Phase 2 (PR #76) lands and getMatrixAsync() is on main, swap
 * to that for live Neon backing.
 */

import {
  getMatrix,
  getRowById,
  getRowsBySector,
  getRowsByCapability,
  getPlanForFrequencyAndGroup,
  getPillarsByType,
  getDesignToolsByPriority,
  effectiveMultiplier,
  getFreeTierModels,
  type PricingRow,
  type Frequency,
  type VibeGroup,
  type Capability,
  type TaskType,
} from '@aims/pricing-matrix';

// ─── Plan recommendation from a free-text prompt ────────────────────

export interface PromptToPlanInput {
  prompt: string;
  budgetUsdMonthly?: number;
  knownTaskMix?: Partial<Record<TaskType, number>>;
}

export interface PromptToPlanResult {
  recommendedFrequency: Frequency;
  recommendedGroup: VibeGroup;
  recommendedTools: PricingRow[];
  effectiveMultiplier: number;
  estimatedMonthlyTokens: number;
  reasoning: string[];
}

/**
 * Heuristic prompt-to-plan recommender. The free LLM TPS_Report_Ang
 * is backed by would normally make this smarter — this is the
 * deterministic baseline.
 */
export function promptToPlan(input: PromptToPlanInput): PromptToPlanResult {
  const reasoning: string[] = [];
  const lower = input.prompt.toLowerCase();

  // Pick frequency from prompt cues
  let frequency: Frequency = '6-month';
  if (/(?:try|test|sample|short|month)/i.test(lower)) {
    frequency = '3-month';
    reasoning.push('Prompt suggests a trial/test commitment → 3-month');
  } else if (/(?:long|annual|year|commit|forever|enterprise)/i.test(lower)) {
    frequency = '9-month';
    reasoning.push('Prompt suggests long-term commitment → 9-month (pay 9 get 12)');
  } else {
    reasoning.push('No commitment cue → defaulting to 6-month (axis of balance)');
  }

  // Pick V.I.B.E. group from prompt cues
  let group: VibeGroup = 'individual';
  if (/(?:family|household|kids|spouse|partner)/i.test(lower)) {
    group = 'family';
    reasoning.push('Family cue detected → Family group');
  } else if (/(?:team|company|startup|coworkers|colleagues|10\s*(?:people|seats|users))/i.test(lower)) {
    group = 'team';
    reasoning.push('Team cue detected → Team group (5–20 seats)');
  } else if (/(?:enterprise|department|division|hundreds|fortune|corporation)/i.test(lower)) {
    group = 'enterprise';
    reasoning.push('Enterprise cue detected → Enterprise (custom quote)');
  } else {
    reasoning.push('No team cue → defaulting to Individual');
  }

  // Pick tools from capability cues
  const recommendedTools: PricingRow[] = [];
  const capabilities: Capability[] = [];

  if (/(?:code|coding|dev|develop|programming|swe)/i.test(lower)) {
    capabilities.push('coding');
    reasoning.push('Coding cue → adding coding capability');
  }
  if (/(?:design|brand|logo|graphic|ui|ux|landing|deck|brochure|pitch|present)/i.test(lower)) {
    capabilities.push('design');
    reasoning.push('Design cue → adding design tools (C1 Thesys priority chain)');
  }
  if (/(?:vision|image|photo|picture)/i.test(lower)) capabilities.push('vision');
  if (/(?:voice|audio|tts|speak|narrat)/i.test(lower)) capabilities.push('voice');
  if (/(?:long|hours|autonomous|agent|swarm)/i.test(lower)) capabilities.push('long-horizon');

  // For each capability, pick the top-priority tool
  for (const cap of capabilities) {
    const tools = getRowsByCapability(cap);
    const sorted = [...tools].sort(
      (a, b) => (a.routingPriority ?? 999) - (b.routingPriority ?? 999),
    );
    if (sorted[0]) recommendedTools.push(sorted[0]);
  }

  // Always include the open-source LLM tier as the baseline (free fallback)
  const openSource = getFreeTierModels();
  for (const r of openSource.slice(0, 2)) {
    if (!recommendedTools.find((x) => x.id === r.id)) {
      recommendedTools.push(r);
    }
  }

  // Compute effective multiplier from task mix (default 60/25/15 if not given)
  const mix = input.knownTaskMix ?? {
    'code-generation': 0.6,
    'workflow-automation': 0.25,
    'multi-agent': 0.15,
  };
  const eff = effectiveMultiplier(mix);
  reasoning.push(
    `Effective task multiplier ${eff.toFixed(2)}× from mix ${JSON.stringify(mix)}`,
  );

  // Estimate monthly tokens from the picked plan
  const plan = getPlanForFrequencyAndGroup(frequency, group);
  const tokens = plan?.tokenAllocation ?? 100_000;

  return {
    recommendedFrequency: frequency,
    recommendedGroup: group,
    recommendedTools,
    effectiveMultiplier: eff,
    estimatedMonthlyTokens: tokens,
    reasoning,
  };
}

// ─── What-if simulator ──────────────────────────────────────────────

export interface WhatIfInput {
  frequency: Frequency;
  group: VibeGroup;
  toolIds: string[];
  taskMix?: Partial<Record<TaskType, number>>;
  pillars?: {
    confidence?: 'standard' | 'verified' | 'guaranteed';
    convenience?: 'standard' | 'priority' | 'instant';
    security?: 'essential' | 'professional' | 'fortress';
  };
}

export interface WhatIfResult {
  plan: PricingRow | undefined;
  tools: PricingRow[];
  effectiveMultiplier: number;
  pillarUpliftTotal: number;
  notes: string[];
}

const PILLAR_UPLIFTS: Record<string, number> = {
  'confidence:standard': 0,
  'confidence:verified': 0.15,
  'confidence:guaranteed': 0.35,
  'convenience:standard': 0,
  'convenience:priority': 0.20,
  'convenience:instant': 0.45,
  'security:essential': 0,
  'security:professional': 0.25,
  'security:fortress': 0.50,
};

export function whatIf(input: WhatIfInput): WhatIfResult {
  const notes: string[] = [];

  const plan = getPlanForFrequencyAndGroup(input.frequency, input.group);
  if (!plan) notes.push(`No plan found for ${input.frequency} × ${input.group}`);

  const tools = input.toolIds
    .map((id) => getRowById(id))
    .filter((r): r is PricingRow => r !== undefined);

  if (tools.length !== input.toolIds.length) {
    const missing = input.toolIds.filter((id) => !getRowById(id));
    notes.push(`Missing tool ids: ${missing.join(', ')}`);
  }

  const eff = effectiveMultiplier(input.taskMix ?? {});

  let pillarUpliftTotal = 0;
  if (input.pillars?.confidence) {
    pillarUpliftTotal += PILLAR_UPLIFTS[`confidence:${input.pillars.confidence}`] ?? 0;
  }
  if (input.pillars?.convenience) {
    pillarUpliftTotal += PILLAR_UPLIFTS[`convenience:${input.pillars.convenience}`] ?? 0;
  }
  if (input.pillars?.security) {
    pillarUpliftTotal += PILLAR_UPLIFTS[`security:${input.pillars.security}`] ?? 0;
  }

  notes.push(`Pillar uplift total: +${(pillarUpliftTotal * 100).toFixed(0)}%`);

  return {
    plan,
    tools,
    effectiveMultiplier: eff,
    pillarUpliftTotal,
    notes,
  };
}

// ─── Visualize ──────────────────────────────────────────────────────

export interface VisualizeOptions {
  sector?: string;
  tier?: string;
  preferDesign?: boolean;
}

export function visualize(opts: VisualizeOptions = {}): {
  rows: PricingRow[];
  totalCount: number;
  bySector: Record<string, number>;
} {
  const matrix = getMatrix();
  let rows = matrix.rows;

  if (opts.sector) rows = rows.filter((r) => r.sector === opts.sector);
  if (opts.tier) rows = rows.filter((r) => r.tier === opts.tier);
  if (opts.preferDesign) {
    rows = getDesignToolsByPriority();
  }

  const bySector = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.sector] = (acc[r.sector] ?? 0) + 1;
    return acc;
  }, {});

  return { rows, totalCount: rows.length, bySector };
}

// ─── Explain a single row ───────────────────────────────────────────

export function explain(rowId: string):
  | { ok: true; row: PricingRow; humanSummary: string }
  | { ok: false; error: string } {
  const row = getRowById(rowId);
  if (!row) return { ok: false, error: `No row found with id '${rowId}'` };

  const lines: string[] = [];
  lines.push(`${row.topic} (${row.sector}, ${row.tier ?? 'no tier'})`);
  if (row.description) lines.push(row.description);
  if (row.providerName) lines.push(`Provider: ${row.providerName}`);
  if (row.routeId) lines.push(`Route: ${row.routeId}`);
  if (row.contextWindow) lines.push(`Context: ${row.contextWindow.toLocaleString()} tokens`);
  if (row.inputPer1M !== undefined) lines.push(`Input: $${row.inputPer1M}/1M`);
  if (row.outputPer1M !== undefined) lines.push(`Output: $${row.outputPer1M}/1M`);
  if (row.unitPrice !== undefined && row.unit) lines.push(`Price: $${row.unitPrice} ${row.unit}`);
  if (row.capabilities.length > 0) lines.push(`Capabilities: ${row.capabilities.join(', ')}`);
  if (row.unlockedAt.length > 0) lines.push(`Unlocked at: ${row.unlockedAt.join(', ')}`);
  if (row.routingPriority !== undefined) lines.push(`Routing priority: ${row.routingPriority}`);
  if (row.notes) lines.push(`Notes: ${row.notes}`);

  return { ok: true, row, humanSummary: lines.join('\n') };
}

// ─── Stub: Lil_Hawk team token monitoring ───────────────────────────

export interface TokenBalance {
  userId: string;
  currentTokens: number;
  burnRatePerDay: number;
  daysRemaining: number;
  warningLevel: 'green' | 'yellow' | 'red';
}

/**
 * Stub for the Lil_Hawk fee-watcher team. Real implementation will
 * query the user's billing tables (separate Neon schema, TBD).
 */
export function tokenBalance(userId: string): TokenBalance {
  // Stub — to be replaced with real billing query
  return {
    userId,
    currentTokens: 0,
    burnRatePerDay: 0,
    daysRemaining: 0,
    warningLevel: 'green',
  };
}
