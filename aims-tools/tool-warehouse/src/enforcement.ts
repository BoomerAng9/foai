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
export { filterForCustomerCopy } from './filter-customer-copy.js';

export class CustomerCopyLeakError extends Error {
  readonly toolId: string;
  readonly surface: string;
  constructor(toolId: string, surface: string) {
    super(
      `[@aims/tool-warehouse] Tool '${toolId}' is marked internal_only and ` +
        `cannot appear in customer-facing surface '${surface}'. ` +
        `Use the tool's customer_safe_label, or swap for a surfaceable alternative.`,
    );
    this.name = 'CustomerCopyLeakError';
    this.toolId = toolId;
    this.surface = surface;
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

// filterForCustomerCopy is re-exported from `./filter-customer-copy.js`
// to keep it consumable without a postgres dependency (pure module).
