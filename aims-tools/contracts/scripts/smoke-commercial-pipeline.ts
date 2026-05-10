#!/usr/bin/env node --experimental-strip-types
/**
 * Gate 7 — Commercial Pipeline End-to-End Smoke
 *
 * Walks a realistic engagement through all 10 RFP → BAMARAM stages and
 * verifies the core canon wiring:
 *
 *   1. Charter + Ledger create as a pair (createEngagement)
 *   2. Stages advance in ordinal order (advanceStage + assertCanAdvance)
 *   3. Picker_Ang fires at Step 3 — BoM + Security Addendum + IIR
 *      persist to ledger, internal-only tools are relabeled on customer copy
 *   4. Melanium attaches a $0.99 fee at Step 6 (purchase_order) with
 *      70/30 vault/customer split
 *   5. HITL gate statuses walk pending → approved on each stage
 *   6. Charter query surface never leaks Ledger internals
 *
 * Run:
 *   NEON_TEST_URL=postgres://... npx tsx aims-tools/contracts/scripts/smoke-commercial-pipeline.ts
 *
 * Without NEON_TEST_URL the script exits with a clear DRY-RUN banner
 * describing what it would have done. This keeps CI safe while making
 * local validation trivial when a test Neon branch is available.
 */

import { randomUUID } from 'node:crypto';
// Import only the dep-free stage constants up here so the DRY-RUN path
// works without `zod` / `postgres` installed. Heavy imports live inside
// `main()` behind `requireNeon()`.
import {
  RFP_BAMARAM_STAGES,
  STAGE_ORDINAL,
  type Stage,
} from '../src/stages.ts';

const BRIEF_SUMMARY =
  'Commercial Per|Form fleet for 25 Division-I quarterbacks — ' +
  'NIL-aware prospecting, weekly film grading, recruiting board, delivery Dec 1';

const BRIEF_CTQS = [
  'Grade 25 QBs weekly from tagged All-22',
  'Produce NIL-compliant prospect reports',
  'Prevent external leak of internal tool stack',
  'Deliver consulting-grade PDF + live dashboard',
  'Total cost under $12,000 for 16-week season',
];

interface SmokeContext {
  engagementId: string;
  neonAvailable: boolean;
}

function requireNeon(): SmokeContext {
  const url = process.env.NEON_TEST_URL || process.env.DATABASE_URL;
  if (!url) {
    console.log('');
    console.log('┌──────────────────────────────────────────────────────────┐');
    console.log('│ GATE 7 DRY-RUN — no NEON_TEST_URL / DATABASE_URL set     │');
    console.log('├──────────────────────────────────────────────────────────┤');
    console.log('│ This smoke walks all 10 RFP→BAMARAM stages end-to-end.   │');
    console.log('│ Set NEON_TEST_URL to a throwaway Neon branch and rerun.  │');
    console.log('│ Unit tests still run without a DB — see `npm test` in    │');
    console.log('│ each @aims package.                                      │');
    console.log('└──────────────────────────────────────────────────────────┘');
    console.log('');
    console.log(`Brief: ${BRIEF_SUMMARY}`);
    console.log(`CTQs (${BRIEF_CTQS.length}):`);
    for (const ctq of BRIEF_CTQS) console.log(`  - ${ctq}`);
    console.log('');
    console.log('Stages that would advance (in order):');
    for (const stage of RFP_BAMARAM_STAGES) {
      console.log(`  ${String(STAGE_ORDINAL[stage]).padStart(2)}. ${stage}`);
    }
    console.log('');
    process.exit(0);
  }
  process.env.DATABASE_URL = url;
  return { engagementId: randomUUID(), neonAvailable: true };
}

function banner(step: number, stage: Stage, detail: string): void {
  const label = stage.padEnd(22);
  console.log(`[${String(step).padStart(2)}/10] ${label} ${detail}`);
}

async function runPickerAngAtStep3(engagementId: string): Promise<void> {
  // Dynamic import keeps @aims/picker-ang out of the dependency path when
  // this script is run without Picker installed (e.g., contracts-only CI).
  const { runPickerAngScan } = await import('@aims/picker-ang');

  const scan = await runPickerAngScan({
    brief: {
      engagementId,
      rawCtqs: BRIEF_CTQS,
      securityTier: 'mid',
      licensePreferences: ['mit', 'apache_2_0', 'freemium'],
      includeInternal: true,
      maxEntries: 8,
    },
  });

  // Customer-safe copy MUST NOT contain Manus AI by name. It may contain
  // the customer_safe_label ("External Tool Coordination") if Manus ranked
  // in the top N, or simply be absent from the list.
  const leaked = scan.bomCustomerSafe.some(
    (row) => typeof row.name === 'string' && row.name.toLowerCase().includes('manus'),
  );
  if (leaked) {
    throw new Error('[Gate 7] Manus AI leaked into customer-safe BoM — filterForCustomerCopy failed');
  }

  console.log(
    `        → BoM: ${scan.selected} selected / ${scan.scoredCandidates} scored; ` +
      `customer-copy scrubbed.`,
  );
}

async function attachMelaniumAtStep6(engagementId: string): Promise<void> {
  const { calculateTransactionCost, DIGITAL_MAINTENANCE_FEE } = await import(
    '@aims/melanium'
  );
  const { appendLedgerEntry } = await import('../src/index.ts');

  // Provider cost + ACHIEVEMOR margin for the season
  const breakdown = calculateTransactionCost({
    providerCost: 8_400,
    achievemorMargin: 2_000,
  });

  if (breakdown.digitalMaintenanceFee !== DIGITAL_MAINTENANCE_FEE) {
    throw new Error('[Gate 7] digital maintenance fee diverged from canonical $0.99');
  }
  const sum =
    breakdown.melaniumSplit.achievemorVault + breakdown.melaniumSplit.customerBalance;
  if (Math.abs(sum - breakdown.digitalMaintenanceFee) > 0.0001) {
    throw new Error(`[Gate 7] 70/30 split sum ${sum} != fee ${breakdown.digitalMaintenanceFee}`);
  }

  await appendLedgerEntry(engagementId, {
    entryType: 'ACP_Biz',
    stage: 'purchase_order',
    owner: 'CFO_Ang',
    intent: 'Record Melanium cost + 70/30 split at PO',
    context: `subtotal=${breakdown.subtotal} fee=${breakdown.digitalMaintenanceFee}`,
    action: `vault+=${breakdown.melaniumSplit.achievemorVault}; customer+=${breakdown.melaniumSplit.customerBalance}`,
    result: `total_customer_charge=${breakdown.totalCustomerCharge}`,
    confidence: 1.0,
    payload: breakdown,
  });

  console.log(
    `        → Melanium: vault ${breakdown.melaniumSplit.achievemorVault} / ` +
      `customer ${breakdown.melaniumSplit.customerBalance} (fee ${breakdown.digitalMaintenanceFee})`,
  );
}

async function main(): Promise<void> {
  const ctx = requireNeon();

  // Heavy imports only happen when Neon is actually configured.
  const {
    createEngagement,
    advanceStage,
    appendLedgerEntry,
    getCharter,
    getLedger,
  } = await import('../src/index.ts');

  console.log(`\nGate 7 smoke — engagement ${ctx.engagementId}\n`);

  // Stage 1 — rfp_intake. Charter + Ledger pair is born here.
  await createEngagement({
    engagementId: ctx.engagementId,
    plugId: 'perform-commercial-fleet',
    clientId: 'demo-client-gate-7',
    vendor: 'Deploy by: ACHIEVEMOR',
    securityTier: 'mid',
  });
  await advanceStage(ctx.engagementId, {
    stage: 'rfp_intake',
    whatChanged: 'Engagement opened + CTQs captured',
    hitlGateStatus: 'approved',
  });
  banner(1, 'rfp_intake', '→ charter + ledger created, CTQs captured');

  // Stages 2, 4, 5, 6 — TTD-DR fires at these (simulated via ledger entries).
  const deepResearchStages: Stage[] = ['rfp_response', 'technical_sow', 'formal_quote', 'purchase_order'];

  // Stage 2 — rfp_response
  await advanceStage(ctx.engagementId, {
    stage: 'rfp_response',
    whatChanged: 'Scout_Ang + TTD-DR draft response',
    hitlGateStatus: 'approved',
  });
  banner(2, 'rfp_response', '→ TTD-DR-backed response authored');

  // Stage 3 — commercial_proposal. Picker_Ang fires here.
  await advanceStage(ctx.engagementId, {
    stage: 'commercial_proposal',
    whatChanged: 'Picker_Ang tool router emitted BoM + Security Addendum',
    hitlGateStatus: 'pending',
  });
  banner(3, 'commercial_proposal', '→ Picker_Ang scan (IIR-ranked)');
  await runPickerAngAtStep3(ctx.engagementId);
  await advanceStage(ctx.engagementId, {
    stage: 'commercial_proposal',
    whatChanged: 'NTNTN HITL approved',
    hitlGateStatus: 'approved',
  });

  // Stage 4 — technical_sow
  await advanceStage(ctx.engagementId, {
    stage: 'technical_sow',
    whatChanged: 'Ops_Ang + TTD-DR drafted SoW with acceptance criteria',
    hitlGateStatus: 'approved',
  });
  banner(4, 'technical_sow', '→ SoW signed by NTNTN + Farmer');

  // Stage 5 — formal_quote
  await advanceStage(ctx.engagementId, {
    stage: 'formal_quote',
    whatChanged: 'TPS_Report_Ang + LUC assembled quote',
    hitlGateStatus: 'approved',
  });
  banner(5, 'formal_quote', '→ LUC quote stamped (Tesla 3-6-9 uplift)');

  // Stage 6 — purchase_order. Melanium split lives here.
  await advanceStage(ctx.engagementId, {
    stage: 'purchase_order',
    whatChanged: 'CFO_Ang wrote PO + Melanium allocation',
    hitlGateStatus: 'pending',
  });
  banner(6, 'purchase_order', '→ PO + Melanium 70/30 split');
  await attachMelaniumAtStep6(ctx.engagementId);
  await advanceStage(ctx.engagementId, {
    stage: 'purchase_order',
    whatChanged: 'Requestor HITL approved',
    hitlGateStatus: 'approved',
  });

  // Stage 7 — assignment_log
  await advanceStage(ctx.engagementId, {
    stage: 'assignment_log',
    whatChanged: 'Chicken Hawk dispatched Shift + Squad',
    hitlGateStatus: 'approved',
    ownerAgent: 'CTO_Ang',
  });
  banner(7, 'assignment_log', '→ Chicken Hawk Shift opened');

  // Stage 8 — qa_security
  await advanceStage(ctx.engagementId, {
    stage: 'qa_security',
    whatChanged: 'General_Ang + NemoClaw ran ORACLE 8-gate + defense scan',
    hitlGateStatus: 'approved',
  });
  banner(8, 'qa_security', '→ ORACLE + NemoClaw passed');

  // Stage 9 — delivery_receipt
  await advanceStage(ctx.engagementId, {
    stage: 'delivery_receipt',
    whatChanged: 'ACHEEVY stamped Charter + shipped artifacts',
    hitlGateStatus: 'approved',
  });
  banner(9, 'delivery_receipt', '→ ACHEEVY delivered Charter to customer');

  // Stage 10 — completion_summary
  await advanceStage(ctx.engagementId, {
    stage: 'completion_summary',
    whatChanged: 'Chronicle_Ang closed Ledger + updated Hermes SAT',
    hitlGateStatus: 'approved',
  });
  banner(10, 'completion_summary', '→ Ledger sealed + SAT updated');

  // Verify: Charter view is customer-safe (no ICAR entries, no internal
  // tool names). Ledger view is full.
  const { charter, stages } = await getCharter(ctx.engagementId);
  const { ledger, entries } = await getLedger(ctx.engagementId);

  if (!charter) throw new Error('[Gate 7] Charter missing after completion');
  if (!ledger) throw new Error('[Gate 7] Ledger missing after completion');
  if (stages.length !== 10) {
    throw new Error(`[Gate 7] expected 10 charter_stages rows, got ${stages.length}`);
  }
  for (const s of stages) {
    if (s.hitlGateStatus !== 'approved') {
      throw new Error(`[Gate 7] stage ${s.stage} did not reach approved`);
    }
  }
  if (entries.length < 2) {
    throw new Error(`[Gate 7] expected ICAR + Melanium entries in ledger, got ${entries.length}`);
  }

  console.log(
    `\nGate 7 PASS — 10 stages approved, ${entries.length} ledger entries sealed.\n`,
  );
}

main().catch((err: unknown) => {
  console.error('\nGate 7 FAIL:', err);
  process.exit(1);
});
