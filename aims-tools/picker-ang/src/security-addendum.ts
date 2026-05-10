/**
 * Derive the Security Addendum from a selected BoM + customer tier.
 *
 * Security tier drives which scan profiles are required. Every tool in
 * the BoM earns a threat-model mention if it carries risky capabilities.
 * Farmer certification requirement scales with the security tier.
 */

import type { Tool } from '@aims/tool-warehouse';
import type { BomEntry, SecurityAddendum } from '@aims/contracts';
import type { IntakeBrief } from './schema.js';
import type { ScoredTool } from './scoring.js';

const TIER_SCAN_PROFILES: Record<
  'entry' | 'mid' | 'superior' | 'defense_grade',
  Array<'SBOM' | 'SAST' | 'DAST' | 'OPA_Rego' | 'Performance'>
> = {
  entry: ['SBOM'],
  mid: ['SBOM', 'SAST'],
  superior: ['SBOM', 'SAST', 'DAST', 'OPA_Rego'],
  defense_grade: ['SBOM', 'SAST', 'DAST', 'OPA_Rego', 'Performance'],
};

const RISKY_CAPABILITIES = new Set([
  'browser_automation',
  'code_execution',
  'file_system',
  'multi_tool',
  'goal_decomposition',
]);

function classifyTool(tool: Tool): string {
  if (tool.capabilities.some((c) => RISKY_CAPABILITIES.has(c))) {
    return `${tool.name}: executes actions on user systems; requires sandbox + audit hooks.`;
  }
  if (tool.license === 'gpl') {
    return `${tool.name}: GPL-licensed — review distribution implications.`;
  }
  if (tool.status === 'experimental') {
    return `${tool.name}: status=experimental — monitor stability in production.`;
  }
  return `${tool.name}: standard supervision — no unusual threat vectors.`;
}

export function deriveSecurityAddendum(
  bom: BomEntry[],
  brief: IntakeBrief,
): SecurityAddendum {
  const scanProfiles = TIER_SCAN_PROFILES[brief.securityTier];
  const tierRequiresFarmer = brief.securityTier !== 'entry';

  const threatModelLines: string[] = [];
  const controlsRequired = new Set<string>(['audit_log', 'secret_manager']);

  for (const entry of bom) {
    threatModelLines.push(`[${entry.toolId}] ${entry.rationale}`);
  }

  if (brief.securityTier === 'superior' || brief.securityTier === 'defense_grade') {
    controlsRequired.add('runtime_attestation');
    controlsRequired.add('opa_rego_policy');
  }
  if (brief.securityTier === 'defense_grade') {
    controlsRequired.add('air_gapped_processing');
    controlsRequired.add('fips_140_compliance');
  }

  return {
    threatModel: threatModelLines.join('\n'),
    controlsRequired: [...controlsRequired],
    scanProfiles,
    farmerCertificationRequired: tierRequiresFarmer,
  };
}

/** Convert scored tool selections into the Ledger BoM shape. */
export function scoredToolsToBom(selected: ScoredTool[], catalogSnapshot: string): {
  bom: BomEntry[];
  snapshot: string;
} {
  const bom: BomEntry[] = selected.map((s) => ({
    toolId: s.tool.id,
    toolName: s.tool.name,
    version: undefined,
    tier: 'all_tiers',                                    // placeholder — warehouse tier is different from pricing tier
    rating: s.tool.rating ?? undefined,
    classification: s.tool.category,
    license: s.tool.license,
    dependencies: [],
    securityAddons: [],
    iir: {
      impact: s.score.impact,
      integrationFit: s.score.integrationFit,
      risk: s.score.risk,
    },
    rationale: classifyTool(s.tool),
  }));
  return { bom, snapshot: catalogSnapshot };
}
