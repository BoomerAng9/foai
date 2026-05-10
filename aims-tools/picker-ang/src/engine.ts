/**
 * Picker_Ang engine — runPickerAngScan orchestrator.
 *
 * End-to-end: derive requirements → query warehouse → score IIR →
 * select top N → emit BoM + Security Addendum → write to Ledger →
 * append ICAR entry at stage='commercial_proposal'.
 */

import { appendLedgerEntry, type Stage } from '@aims/contracts';
import {
  searchTools,
  filterForCustomerCopy,
  type Tool,
} from '@aims/tool-warehouse';
import { getSql } from './client.js';
import { deriveRequirements } from './requirements.js';
import { rankTools, type ScoredTool } from './scoring.js';
import {
  deriveSecurityAddendum,
  scoredToolsToBom,
} from './security-addendum.js';
import {
  IntakeBriefSchema,
  type IntakeBrief,
  type ScanResult,
  type ScoringWeights,
} from './schema.js';

const COMMERCIAL_PROPOSAL_STAGE: Stage = 'commercial_proposal';

export interface RunPickerAngScanInput {
  brief: IntakeBrief;
  weights?: ScoringWeights;
  /** Override the catalog snapshot identifier written to the BoM. */
  catalogSnapshot?: string;
}

export async function runPickerAngScan(
  input: RunPickerAngScanInput,
): Promise<ScanResult> {
  const brief = IntakeBriefSchema.parse(input.brief);

  // 1. Derive capability requirements (either from overrides or free text).
  const capabilities = brief.derivedCapabilities?.length
    ? brief.derivedCapabilities
    : deriveRequirements(brief.rawCtqs).capabilities;

  // 2. Query the warehouse. We fetch broadly and let scoring do the filter.
  const candidates: Tool[] = await searchTools({
    capabilities,
    includeInternal: brief.includeInternal,
  });

  // 3. Score + rank.
  const ranked: ScoredTool[] = rankTools(candidates, brief, capabilities, input.weights);
  const selected = ranked.slice(0, brief.maxEntries);

  // 4. Emit BoM (internal-full) + customer-safe copy.
  const snapshot = input.catalogSnapshot ?? `warehouse-${new Date().toISOString().slice(0, 10)}`;
  const { bom: bomInternal } = scoredToolsToBom(selected, snapshot);

  // Customer-safe copy: relabel internal_only tools through the warehouse filter
  const selectedToolsForCustomer = filterForCustomerCopy(
    selected.map((s) => s.tool),
    'relabel',
  );
  const customerSafeSelected: ScoredTool[] = selected.map((s, i) => ({
    tool: selectedToolsForCustomer[i],
    score: s.score,
  }));
  const { bom: bomCustomerSafe } = scoredToolsToBom(customerSafeSelected, snapshot);

  // 5. Security Addendum.
  const addendum = deriveSecurityAddendum(bomInternal, brief);

  const generatedAt = new Date().toISOString();

  // 6. Persist to Ledger.
  const sql = getSql();
  await sql`
    UPDATE ledgers SET
      picker_ang_bom = ${sql.json({
        generatedAt,
        catalogSnapshot: snapshot,
        entries: bomInternal,
        totalSelected: bomInternal.length,
      })},
      picker_ang_security_addendum = ${sql.json(addendum)},
      picker_ang_iir_score = ${sql.json({
        ranked: ranked.length,
        selected: selected.length,
        averageWeighted: ranked.length
          ? ranked.reduce((sum, s) => sum + s.score.weighted, 0) / ranked.length
          : 0,
        topWeighted: selected.map((s) => ({ toolId: s.tool.id, weighted: s.score.weighted })),
      })}
     WHERE id = ${brief.engagementId}
  `;

  // 7. Append ICAR entry (audit — survives even if the update above noop'd).
  await appendLedgerEntry(brief.engagementId, {
    entryType: 'ICAR',
    stage: COMMERCIAL_PROPOSAL_STAGE,
    intent: 'Pick tools for Commercial Proposal',
    context: `Capabilities: ${capabilities.join(', ')}; security_tier: ${brief.securityTier}`,
    action: `Scanned ${candidates.length} warehouse candidates; selected ${selected.length}`,
    result: `BoM + Security Addendum written to ledger for engagement ${brief.engagementId}`,
    confidence: selected.length ? selected[0].score.weighted : 0,
    owner: 'Picker_Ang',
    payload: {
      catalogSnapshot: snapshot,
      topToolId: selected[0]?.tool.id,
    },
  });

  return {
    engagementId: brief.engagementId,
    generatedAt,
    catalogSnapshot: snapshot,
    scoredCandidates: ranked.length,
    selected: selected.length,
    bomInternal: bomInternal as unknown as Array<Record<string, unknown>>,
    bomCustomerSafe: bomCustomerSafe as unknown as Array<Record<string, unknown>>,
    securityAddendum: addendum as unknown as Record<string, unknown>,
  };
}
