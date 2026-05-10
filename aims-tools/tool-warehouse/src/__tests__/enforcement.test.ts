/**
 * Gate 7 — Tool Warehouse enforcement unit tests.
 *
 * Proves that internal-only tools (Manus AI) never leak to customer
 * surfaces. The enforcement.ts module is the single choke-point for
 * Charter writes, customer UI renders, marketing copy, and ACHEEVY
 * user-facing replies.
 *
 * Run: npm test  (inside aims-tools/tool-warehouse)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterForCustomerCopy } from '../filter-customer-copy.ts';
import type { Tool } from '../schema.ts';

const manus: Tool = {
  id: 'manus_ai',
  name: 'Manus AI',
  tier: 'integration',
  category: 'Autonomous General Intelligence (INTERNAL ONLY)',
  description: 'Internal ACHEEVY/Buildsmith workflow engine',
  license: 'commercial',
  vendor: 'Manus AI',
  priority: 'critical',
  status: 'active',
  capabilities: ['goal_decomposition', 'multi_tool'],
  costModel: { type: 'usage' },
  addedToWarehouse: '2026-04-17',
  internalOnly: true,
  customerSafeLabel: 'External Tool Coordination',
  repoUrl: null,
  stars: null,
  homepageUrl: null,
  circuitBreakerId: 'CB_MANUS_AI',
  healthEndpoint: null,
  ownerAng: null,
  metadata: {},
} as Tool;

const suna: Tool = {
  id: 'suna_ai',
  name: 'Suna AI',
  tier: 'integration',
  category: 'Autonomous Intelligence',
  description: 'External automation agent',
  license: 'apache_2_0',
  vendor: 'Suna',
  priority: 'high',
  status: 'active',
  capabilities: ['browser_automation', 'agent_workflows'],
  costModel: { type: 'freemium' },
  addedToWarehouse: '2026-04-17',
  internalOnly: false,
  customerSafeLabel: null,
  repoUrl: null,
  stars: 2400,
  homepageUrl: null,
  circuitBreakerId: 'CB_SUNA_AI',
  healthEndpoint: null,
  ownerAng: null,
  metadata: {},
} as Tool;

test('filter strip mode removes internal-only tools entirely', () => {
  const out = filterForCustomerCopy([manus, suna], 'strip');
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'suna_ai');
});

test('filter relabel mode preserves length but scrubs internal-only fields', () => {
  const out = filterForCustomerCopy([manus, suna], 'relabel');
  assert.equal(out.length, 2);

  const manusRelabeled = out.find((t) => t.id === 'manus_ai')!;
  assert.equal(manusRelabeled.name, 'External Tool Coordination');
  assert.equal(manusRelabeled.description, 'Platform-delegated workflow');
  assert.equal(manusRelabeled.vendor, null);
  assert.equal(manusRelabeled.repoUrl, null);
  assert.deepEqual(manusRelabeled.capabilities, []);
  assert.deepEqual(manusRelabeled.metadata, {});

  const sunaUntouched = out.find((t) => t.id === 'suna_ai')!;
  assert.equal(sunaUntouched.name, 'Suna AI');
  assert.equal(sunaUntouched.vendor, 'Suna');
});

test('relabel never exposes "Manus" in any customer-visible field', () => {
  // The `id` field is preserved by design (internal Charter audit
  // references tools by id). The leak surface is display-only fields:
  // name, description, vendor, category. Those MUST be scrubbed.
  const out = filterForCustomerCopy([manus], 'relabel');
  const customerVisible = [
    out[0].name,
    out[0].description,
    out[0].vendor,
    out[0].category,
  ];
  for (const field of customerVisible) {
    if (field == null) continue;
    assert.ok(
      !String(field).toLowerCase().includes('manus'),
      `customer-visible field "${field}" should not contain "manus"`,
    );
  }
});

test('relabel falls back to generic label when customerSafeLabel is absent', () => {
  const noLabel: Tool = { ...manus, customerSafeLabel: null };
  const out = filterForCustomerCopy([noLabel], 'relabel');
  assert.equal(out[0].name, 'External Tool Coordination');
});

test('empty list is a no-op', () => {
  assert.deepEqual(filterForCustomerCopy([], 'strip'), []);
  assert.deepEqual(filterForCustomerCopy([], 'relabel'), []);
});
