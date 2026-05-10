/**
 * Pure, DB-free customer-copy filter for the Tool Warehouse.
 *
 * Split out from `enforcement.ts` so that callers (including unit tests)
 * can consume the filter without transitively importing `postgres` via
 * `./queries.js`. The `assertNotSurfaceable` / `isInternalOnly` helpers
 * stay in `enforcement.ts` because they need DB access.
 */

import type { Tool } from './schema.js';

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
