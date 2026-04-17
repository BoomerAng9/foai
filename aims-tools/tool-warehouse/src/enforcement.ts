/**
 * Internal-only enforcement for the Tool Warehouse.
 *
 * `feedback_manus_reference_internal_only.md` (standing memory rule) says
 * Manus AI — and any other tool with `internal_only = true` — must never
 * appear in customer-facing surfaces: Charter rows, UI copy, marketing
 * pages, ACHEEVY's user-facing responses, or any BoM surfaced to the
 * customer.
 *
 * These helpers enforce the rule at call sites. Catch the error and
 * substitute a generic label (`customer_safe_label` if set) when
 * rendering customer copy.
 */

import { getToolById } from './queries.js';
import type { Tool } from './schema.js';

export class CustomerCopyLeakError extends Error {
  constructor(
    public toolId: string,
    public surface: string,
  ) {
    super(
      `[@aims/tool-warehouse] Tool '${toolId}' is marked internal_only and ` +
        `cannot appear in customer-facing surface '${surface}'. ` +
        `Use the tool's customer_safe_label, or swap for a surfaceable alternative.`,
    );
    this.name = 'CustomerCopyLeakError';
  }
}

/** Cheap boolean check. Use when you need a predicate. */
export async function isInternalOnly(toolId: string): Promise<boolean> {
  const tool = await getToolById(toolId);
  return tool?.internalOnly ?? false;
}

/**
 * Throws if the named tool is internal_only. Call this at every
 * Charter write + customer-UI render + marketing copy site.
 */
export async function assertNotSurfaceable(
  toolId: string,
  surface: 'charter' | 'customer_ui' | 'marketing' | 'acheevy_reply' | 'bom_customer',
): Promise<void> {
  const tool = await getToolById(toolId);
  if (!tool) return;                                      // unknown tools aren't blocked here
  if (tool.internalOnly) {
    throw new CustomerCopyLeakError(toolId, surface);
  }
}

/**
 * Returns a filtered copy of a tool list with every internal_only row
 * removed — or replaced by a stub carrying the customer_safe_label only.
 *
 * @param mode `'strip'` removes internal tools entirely, `'relabel'`
 *             keeps them with the customer_safe_label applied and all
 *             other fields scrubbed.
 */
export function filterForCustomerCopy(
  tools: Tool[],
  mode: 'strip' | 'relabel' = 'strip',
): Tool[] {
  if (mode === 'strip') {
    return tools.filter((t) => !t.internalOnly);
  }
  return tools.map((t) => {
    if (!t.internalOnly) return t;
    return {
      ...t,
      name: t.customerSafeLabel ?? 'External Tool Coordination',
      description: 'Platform-delegated workflow',
      repoUrl: null,
      vendor: null,
      stars: null,
      homepageUrl: null,
      circuitBreakerId: null,
      healthEndpoint: null,
      ownerAng: null,
      capabilities: [],
      metadata: {},
    } as Tool;
  });
}
