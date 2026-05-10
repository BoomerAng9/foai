/**
 * Gate 7 — Picker_Ang IIR scoring unit tests.
 *
 * Validates the pure scoring logic without a database:
 *   - Weighted formula: 0.45·Impact + 0.35·Integration + 0.20·(1−Risk)
 *   - Internal-only tools are scored-down when includeInternal=false
 *   - Capability-match dominates impact over bare priority
 *   - License preferences override default license fit
 *
 * Run: npm test  (inside aims-tools/picker-ang)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreTool, rankTools } from '../scoring.ts';
import type { Tool } from '@aims/tool-warehouse';
import type { IntakeBrief } from '../schema.ts';

function baseBrief(overrides: Partial<IntakeBrief> = {}): IntakeBrief {
  return {
    engagementId: 'test-engagement',
    rawCtqs: ['smoke'],
    securityTier: 'mid',
    includeInternal: false,
    maxEntries: 10,
    ...overrides,
  };
}

function mkTool(overrides: Partial<Tool>): Tool {
  return {
    id: 'tool_x',
    name: 'Tool X',
    tier: 'utility',
    category: 'test',
    description: '',
    license: 'mit',
    vendor: 'test',
    priority: 'medium',
    status: 'active',
    capabilities: [],
    costModel: { type: 'free' },
    addedToWarehouse: '2026-04-18',
    internalOnly: false,
    customerSafeLabel: null,
    repoUrl: null,
    stars: null,
    homepageUrl: null,
    circuitBreakerId: null,
    healthEndpoint: null,
    ownerAng: null,
    metadata: {},
    ...overrides,
  } as Tool;
}

test('weighted score equals 0.45·impact + 0.35·integration + 0.20·(1−risk)', () => {
  const tool = mkTool({
    priority: 'high',
    license: 'mit',
    status: 'active',
    capabilities: ['cap_a', 'cap_b'],
    stars: 1000,
    ownerAng: null,
    costModel: { type: 'free' },
  });
  const brief = baseBrief({ securityTier: 'mid' });
  const { score } = scoreTool(tool, brief, ['cap_a', 'cap_b']);
  const expected =
    0.45 * score.impact + 0.35 * score.integrationFit + 0.2 * (1 - score.risk);
  assert.ok(
    Math.abs(score.weighted - Math.min(1, Math.max(0, expected))) < 1e-9,
    `weighted ${score.weighted} vs expected ${expected}`,
  );
});

test('capability match dominates impact over bare priority', () => {
  // Tool A: perfect capability match, medium priority
  const matching = mkTool({
    id: 'match',
    priority: 'medium',
    capabilities: ['cap_a', 'cap_b'],
  });
  // Tool B: high priority but zero match
  const missing = mkTool({
    id: 'miss',
    priority: 'high',
    capabilities: ['cap_z'],
  });
  const brief = baseBrief();
  const matchScore = scoreTool(matching, brief, ['cap_a', 'cap_b']).score;
  const missScore = scoreTool(missing, brief, ['cap_a', 'cap_b']).score;
  assert.ok(
    matchScore.impact > missScore.impact,
    `match ${matchScore.impact} should beat miss ${missScore.impact}`,
  );
});

test('internal-only tool is unpickable when includeInternal=false (risk pinned to 1)', () => {
  const manusLike = mkTool({
    id: 'manus_ai',
    internalOnly: true,
    customerSafeLabel: 'External Tool Coordination',
    priority: 'critical',
    capabilities: ['goal_decomposition', 'multi_tool'],
  });
  const brief = baseBrief({ includeInternal: false });
  const { score } = scoreTool(manusLike, brief, ['goal_decomposition']);
  assert.equal(score.risk, 1, 'internal-only + excluded should pin risk to 1.0');
});

test('internal-only tool is scorable when includeInternal=true', () => {
  const manusLike = mkTool({
    id: 'manus_ai',
    internalOnly: true,
    priority: 'critical',
    capabilities: ['goal_decomposition'],
  });
  const brief = baseBrief({ includeInternal: true });
  const { score } = scoreTool(manusLike, brief, ['goal_decomposition']);
  assert.ok(score.risk < 1, 'internal-only + included should score normally');
});

test('license preferences override default license-fit', () => {
  const gpl = mkTool({ id: 'gpl_tool', license: 'gpl' });
  const briefPreferGpl = baseBrief({ licensePreferences: ['gpl'] });
  const briefPreferMit = baseBrief({ licensePreferences: ['mit'] });
  const inGpl = scoreTool(gpl, briefPreferGpl, ['smoke']).score;
  const inMit = scoreTool(gpl, briefPreferMit, ['smoke']).score;
  assert.ok(
    inGpl.integrationFit > inMit.integrationFit,
    `gpl-preference ${inGpl.integrationFit} should beat mit-only ${inMit.integrationFit}`,
  );
});

test('House of ANG bonus boosts integration fit when ownerAng is set', () => {
  const base = { license: 'mit' as const, status: 'active' as const };
  const housed = mkTool({ id: 'housed', ownerAng: 'Iller_Ang', ...base });
  const orphan = mkTool({ id: 'orphan', ownerAng: null, ...base });
  const brief = baseBrief();
  const housedScore = scoreTool(housed, brief, ['smoke']).score;
  const orphanScore = scoreTool(orphan, brief, ['smoke']).score;
  assert.ok(
    housedScore.integrationFit > orphanScore.integrationFit,
    `housed ${housedScore.integrationFit} should beat orphan ${orphanScore.integrationFit}`,
  );
});

test('rankTools sorts descending on weighted score', () => {
  const tools = [
    mkTool({ id: 'low', priority: 'low', status: 'experimental', license: 'gpl' }),
    mkTool({ id: 'high', priority: 'critical', status: 'active', license: 'mit' }),
    mkTool({ id: 'mid', priority: 'medium', status: 'active', license: 'apache_2_0' }),
  ];
  const ranked = rankTools(tools, baseBrief(), ['smoke']);
  assert.equal(ranked[0].tool.id, 'high', 'critical+active+mit should rank first');
  for (let i = 0; i < ranked.length - 1; i++) {
    assert.ok(
      ranked[i].score.weighted >= ranked[i + 1].score.weighted,
      `rank ${i} weighted ${ranked[i].score.weighted} should ≥ ${ranked[i + 1].score.weighted}`,
    );
  }
});

test('defense_grade tier punishes experimental tools harder than entry tier', () => {
  const experimental = mkTool({ id: 'xp', status: 'experimental' });
  const defenseBrief = baseBrief({ securityTier: 'defense_grade' });
  const entryBrief = baseBrief({ securityTier: 'entry' });
  const defRisk = scoreTool(experimental, defenseBrief, ['smoke']).score.risk;
  const entRisk = scoreTool(experimental, entryBrief, ['smoke']).score.risk;
  assert.ok(
    defRisk > entRisk,
    `defense-grade risk ${defRisk} should exceed entry risk ${entRisk} for experimental tool`,
  );
});
