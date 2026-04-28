/**
 * Typed lookups against the in-memory matrix.
 * Used by AIMS backend, SmelterOS, perform, and TPS_Ang.
 */

import type {
  PricingRow,
  Sector,
  Tier,
  Frequency,
  VibeGroup,
  Capability,
  PlanRow,
  PillarRow,
  TaskType,
} from './types.js';
import { getMatrix } from './loader.js';

// ─── Row lookup ──────────────────────────────────────────────────────

export function getRowById(id: string): PricingRow | undefined {
  return getMatrix().rows.find((r) => r.id === id);
}

export function getRowByRouteId(routeId: string): PricingRow | undefined {
  return getMatrix().rows.find((r) => r.routeId === routeId);
}

export function getRowsBySector(sector: Sector): PricingRow[] {
  return getMatrix().rows.filter((r) => r.sector === sector);
}

export function getRowsByTier(tier: Tier): PricingRow[] {
  return getMatrix().rows.filter((r) => r.tier === tier);
}

export function getRowsByFrequency(frequency: Frequency): PricingRow[] {
  return getMatrix().rows.filter((r) => r.unlockedAt.includes(frequency));
}

export function getRowsByVibeGroup(group: VibeGroup): PricingRow[] {
  return getMatrix().rows.filter((r) => r.vibeGroups.includes(group));
}

export function getRowsByCapability(cap: Capability): PricingRow[] {
  return getMatrix().rows.filter((r) => r.capabilities.includes(cap));
}

export function getRowsByProvider(providerId: string): PricingRow[] {
  return getMatrix().rows.filter((r) => r.providerId === providerId);
}

// ─── Plan & pillar helpers ───────────────────────────────────────────

export function getPlanRows(): PlanRow[] {
  return getMatrix().rows.filter((r): r is PlanRow => r.rowType === 'plan');
}

export function getPlanForFrequencyAndGroup(
  frequency: Frequency,
  group: VibeGroup,
): PlanRow | undefined {
  return getPlanRows().find(
    (p) => p.frequency === frequency && p.vibeGroups.includes(group),
  );
}

export function getPillarRows(): PillarRow[] {
  return getMatrix().rows.filter((r): r is PillarRow => r.rowType === 'pillar');
}

export function getPillarsByType(
  pillarType: 'confidence' | 'convenience' | 'security',
): PillarRow[] {
  return getPillarRows().filter((p) => p.pillarType === pillarType);
}

// ─── Task multipliers ────────────────────────────────────────────────

export function getTaskMultiplier(taskType: TaskType): number {
  return getMatrix().taskMultipliers.find((t) => t.taskType === taskType)?.multiplier ?? 1.0;
}

/**
 * Compute weighted-average effective multiplier from a task mix.
 * Mix is { taskType: percentage }, percentages should sum to 1.
 */
export function effectiveMultiplier(mix: Partial<Record<TaskType, number>>): number {
  let total = 0;
  for (const [taskType, weight] of Object.entries(mix)) {
    if (!weight) continue;
    total += getTaskMultiplier(taskType as TaskType) * weight;
  }
  return total > 0 ? total : 1.0;
}

// ─── Free-tier filter (for the reasoning stream rule) ───────────────

export function getFreeTierModels(): PricingRow[] {
  return getMatrix().rows.filter(
    (r) =>
      r.rowType === 'model' &&
      r.sector === 'llm' &&
      (r.tier === 'free' || r.tier === 'open-source' || (r.inputPer1M ?? 0) === 0),
  );
}

// ─── Latest-only image/video enforcement check ───────────────────────

export function getLatestImageModels(): PricingRow[] {
  return getMatrix().rows.filter(
    (r) => r.sector === 'image' && r.isLatest === true,
  );
}

export function getLatestVideoModels(): PricingRow[] {
  return getMatrix().rows.filter(
    (r) => r.sector === 'video' && r.isLatest === true,
  );
}

// ─── Routing-priority queries ────────────────────────────────────────

/**
 * Sort by routingPriority (lower = higher priority). Rows without
 * a routingPriority are sorted last (treated as Number.MAX_SAFE_INTEGER).
 */
function sortByRoutingPriority(a: PricingRow, b: PricingRow): number {
  const ap = a.routingPriority ?? Number.MAX_SAFE_INTEGER;
  const bp = b.routingPriority ?? Number.MAX_SAFE_INTEGER;
  return ap - bp;
}

/**
 * Get all rows tagged with the 'design' capability, ordered by routingPriority.
 * Use this for ANY design task (page builder, deck, vector, diagram, layout).
 * Per Rish 2026-04-08: design tasks must use the SUPERIOR design tools
 * (C1 Thesys → Stitch MCP → Recraft → Ideogram → Gamma → Napkin) over
 * generic Gemini-based image generation.
 */
export function getDesignToolsByPriority(): PricingRow[] {
  return getMatrix()
    .rows.filter((r) => r.capabilities.includes('design'))
    .sort(sortByRoutingPriority);
}

/**
 * Get all rows tagged with a specific design capability, ordered by priority.
 * E.g. capability='presentation' → Gamma first.
 */
export function getDesignToolsForCapability(cap: Capability): PricingRow[] {
  return getMatrix()
    .rows.filter((r) => r.capabilities.includes(cap) && r.capabilities.includes('design'))
    .sort(sortByRoutingPriority);
}

/**
 * Get image rows ordered by vendor rank (Vertex first, then direct vendors,
 * then OpenRouter, then aggregators). For GENERAL image tasks.
 * For design tasks use getDesignToolsByPriority() instead.
 */
export function getImageModelsByVendorRank(): PricingRow[] {
  return getMatrix()
    .rows.filter((r) => r.sector === 'image' && r.isLatest === true)
    .sort((a, b) => {
      const ar = a.vendorRank ?? 99;
      const br = b.vendorRank ?? 99;
      if (ar !== br) return ar - br;
      return sortByRoutingPriority(a, b);
    });
}

/**
 * Get video rows ordered by vendor rank.
 */
export function getVideoModelsByVendorRank(): PricingRow[] {
  return getMatrix()
    .rows.filter((r) => r.sector === 'video' && r.isLatest === true)
    .sort((a, b) => {
      const ar = a.vendorRank ?? 99;
      const br = b.vendorRank ?? 99;
      if (ar !== br) return ar - br;
      return sortByRoutingPriority(a, b);
    });
}

/**
 * Pick the highest-priority tool for a given task type.
 * Returns undefined if no tool matches.
 */
export function pickToolForTask(opts: {
  capability?: Capability;
  sector?: Sector;
  preferDesign?: boolean;
}): PricingRow | undefined {
  if (opts.preferDesign && opts.capability) {
    const designTools = getDesignToolsForCapability(opts.capability);
    if (designTools.length > 0) return designTools[0];
  }
  if (opts.capability) {
    return getRowsByCapability(opts.capability).sort(sortByRoutingPriority)[0];
  }
  if (opts.sector) {
    return getRowsBySector(opts.sector).sort(sortByRoutingPriority)[0];
  }
  return undefined;
}
