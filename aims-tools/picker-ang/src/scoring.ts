/**
 * IIR scoring — Impact / Integration-fit / Risk.
 *
 * Deterministic, rule-based scoring. Each axis returns [0,1].
 * Weights are canon-aligned per the arbitration but tunable via
 * `ScoringWeights`.
 */

import type { Tool } from '@aims/tool-warehouse';
import type { IntakeBrief, IirScore, ScoringWeights } from './schema.js';

const PRIORITY_WEIGHT: Record<string, number> = {
  critical: 1.0,
  high: 0.8,
  medium: 0.5,
  low: 0.3,
};

const LICENSE_FIT: Record<string, number> = {
  mit: 1.0,
  apache_2_0: 1.0,
  bsd: 0.95,
  freemium: 0.85,
  proprietary: 0.7,
  commercial: 0.65,
  gpl: 0.55,
  unknown: 0.4,
};

const STATUS_RISK: Record<string, number> = {
  active: 0.15,
  standby: 0.4,
  experimental: 0.7,
  deprecated: 0.95,
};

const TIER_RISK_TOLERANCE: Record<string, number> = {
  entry: 0.6,                                             // more tolerant of experimental
  mid: 0.45,
  superior: 0.25,
  defense_grade: 0.1,                                     // only rock-solid tools
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Impact: how strongly this tool advances the customer's CTQs.
 *   - 60% comes from tool priority
 *   - 40% comes from the fraction of requested capabilities the tool provides
 */
function scoreImpact(tool: Tool, requestedCapabilities: string[]): number {
  const priorityComponent = PRIORITY_WEIGHT[tool.priority] ?? 0.5;

  const toolCaps = new Set(tool.capabilities);
  let hits = 0;
  for (const c of requestedCapabilities) {
    if (toolCaps.has(c)) hits += 1;
  }
  const matchComponent = requestedCapabilities.length
    ? hits / requestedCapabilities.length
    : 0.5;

  return clamp01(0.6 * priorityComponent + 0.4 * matchComponent);
}

/**
 * Integration fit: license compatibility + tier gating + cost envelope
 * signals. The 17 House of ANG specialists (owner_ang set) get a boost
 * because they're already wired into the platform.
 */
function scoreIntegrationFit(tool: Tool, brief: IntakeBrief): number {
  const licenseFit = LICENSE_FIT[tool.license] ?? 0.5;

  // License preferences override (customer explicitly narrowed)
  let licenseComponent = licenseFit;
  if (brief.licensePreferences && brief.licensePreferences.length > 0) {
    licenseComponent = brief.licensePreferences.includes(tool.license as never)
      ? 1.0
      : 0.3;
  }

  // House of ANG bonus — already wired into the platform
  const housedBonus = tool.ownerAng ? 0.1 : 0;

  // Cost-model sniff (best-effort — unknown costs don't penalize)
  let costFit = 0.85;
  if (tool.costModel && typeof tool.costModel === 'object') {
    const cm = tool.costModel as Record<string, unknown>;
    if (cm.type === 'free') costFit = 1.0;
    else if (cm.type === 'freemium') costFit = 0.9;
    else if (cm.type === 'usage') costFit = 0.7;
    else if (cm.type === 'commercial') costFit = 0.6;
  }

  return clamp01(0.55 * licenseComponent + 0.3 * costFit + housedBonus);
}

/**
 * Risk: inverse of how settled the tool is. Heavier weight on status
 * (experimental = high risk) + tier tolerance. Returns the RISK itself
 * in [0,1] (NOT the inverse) — the weighted combiner inverts later.
 */
function scoreRisk(tool: Tool, brief: IntakeBrief): number {
  const statusRisk = STATUS_RISK[tool.status] ?? 0.5;
  const tolerance = TIER_RISK_TOLERANCE[brief.securityTier] ?? 0.5;

  // Stars as proxy for ecosystem maturity (log-scaled)
  const stars = Math.max(0, tool.stars ?? 0);
  const starsFactor = stars === 0 ? 0.6 : Math.max(0.1, 1 - Math.log10(stars + 1) / 5);

  // If tool is internal_only and caller excluded internal, mark it
  // unpickable by pushing risk to 1.0. If caller explicitly included
  // internal, internal_only does not penalize.
  const internalPenalty = tool.internalOnly && !brief.includeInternal ? 1.0 : 0;

  const raw = 0.5 * statusRisk + 0.3 * starsFactor + 0.2 * (1 - tolerance) + internalPenalty;
  return clamp01(raw);
}

export interface ScoredTool {
  tool: Tool;
  score: IirScore;
}

export function scoreTool(
  tool: Tool,
  brief: IntakeBrief,
  requestedCapabilities: string[],
  weights: ScoringWeights = { impact: 0.45, integrationFit: 0.35, risk: 0.2 },
): ScoredTool {
  const impact = scoreImpact(tool, requestedCapabilities);
  const integrationFit = scoreIntegrationFit(tool, brief);
  const risk = scoreRisk(tool, brief);

  const weighted = clamp01(
    weights.impact * impact +
      weights.integrationFit * integrationFit +
      weights.risk * (1 - risk),                          // low risk → high contribution
  );

  return {
    tool,
    score: { impact, integrationFit, risk, weighted },
  };
}

export function rankTools(
  tools: Tool[],
  brief: IntakeBrief,
  requestedCapabilities: string[],
  weights?: ScoringWeights,
): ScoredTool[] {
  return tools
    .map((t) => scoreTool(t, brief, requestedCapabilities, weights))
    .sort((a, b) => b.score.weighted - a.score.weighted);
}
