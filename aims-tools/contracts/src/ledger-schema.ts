/**
 * Zod schemas for the Ledger — internal audit artifact.
 *
 * Source: docs/canon/ACHEEVY_Agent_Logic_Final.md +
 *         docs/canon/sivis_governance.md +
 *         docs/canon/Universal-Tool-Warehouse-Glossary-2025.md (ICAR, ACP)
 *
 * Everything here is INTERNAL ONLY. Provider costs, margins, tool names,
 * Picker_Ang rationale, rationale, risk premium adjustments, Melanium
 * splits. If a field would be safe to show a customer, it belongs in
 * `charter-schema.ts` instead.
 */

import { z } from 'zod';
import { StageSchema } from './charter-schema.js';

// ── Cost breakdown ──────────────────────────────────────────────────

export const CostBreakdownSchema = z.object({
  providerCost: z.number().nonnegative(),
  achievemorMargin: z.number().nonnegative(),
  subtotal: z.number().nonnegative(),
  digitalMaintenanceFee: z.number().nonnegative().default(0.99),
  totalCustomerCharge: z.number().nonnegative(),
  currency: z.string().default('USD'),
});

export const MelaniumAllocationSchema = z.object({
  transactionId: z.string(),
  digitalFeeTotal: z.number().nonnegative(),
  achievemorVaultAmount: z.number().nonnegative(),       // 70% → Melanium vault
  customerBalanceAmount: z.number().nonnegative(),        // 30% → customer platform currency
  vaultId: z.string(),
  customerId: z.string(),
  customerBalanceAfter: z.number().nonnegative(),
  timestamp: z.string().datetime(),
});

export const RiskPremiumAdjustmentSchema = z.object({
  stage: StageSchema,
  reason: z.string(),
  percentageUplift: z.number(),
  rationale: z.string(),
  appliedAt: z.string().datetime(),
});

// ── Picker_Ang outputs (emitted at Step 3 Commercial Proposal) ───────

export const BomEntrySchema = z.object({
  toolId: z.string(),
  toolName: z.string(),                                   // internal name, never surfaced
  version: z.string().optional(),
  tier: z.enum(['all_tiers', 'entry_plus', 'mid_plus', 'superior']),
  rating: z.string().optional(),                          // '⭐⭐⭐⭐⭐' etc.
  classification: z.string(),
  license: z.string().optional(),
  dependencies: z.array(z.string()).default([]),
  securityAddons: z.array(z.string()).default([]),
  iir: z.object({
    impact: z.number().min(0).max(1),
    integrationFit: z.number().min(0).max(1),
    risk: z.number().min(0).max(1),
  }),
  rationale: z.string(),
});

export const PickerAngBomSchema = z.object({
  generatedAt: z.string().datetime(),
  catalogSnapshot: z.string(),                            // version/hash of tool warehouse
  entries: z.array(BomEntrySchema),
  totalSelected: z.number().int().nonnegative(),
});

export const SecurityAddendumSchema = z.object({
  threatModel: z.string(),
  controlsRequired: z.array(z.string()),
  scanProfiles: z.array(z.enum(['SBOM', 'SAST', 'DAST', 'OPA_Rego', 'Performance'])),
  farmerCertificationRequired: z.boolean(),
});

// ── Rationale entries (decision log, not full ICAR) ─────────────────

export const RationaleEntrySchema = z.object({
  stage: StageSchema,
  decision: z.string(),
  reasoning: z.string(),
  alternativesConsidered: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
  owner: z.string(),
  timestamp: z.string().datetime(),
});

// ── TTD-DR cycles (diffusion-loop research evidence) ────────────────

export const TtdDrCycleSchema = z.object({
  stage: StageSchema,
  cycleIndex: z.number().int().nonnegative(),             // k in 0..K
  think: z.record(z.string(), z.unknown()),               // Context Pack + task plan
  test: z.record(z.string(), z.unknown()),                // Source-grounded assertions
  decide: z.record(z.string(), z.unknown()),              // Option matrix + choice
  doResult: z.record(z.string(), z.unknown()),            // Tool-call outputs
  review: z.object({
    passed: z.boolean(),
    confidencePre: z.number().min(0).max(1),
    confidencePost: z.number().min(0).max(1),
    evidence: z.array(z.string()),
    fdhTicketOpened: z.boolean().default(false),
  }),
  timestamp: z.string().datetime(),
});

// ── Ledger entry types (ICAR + ACP + FDH + HITL) ────────────────────

export const LedgerEntryTypeSchema = z.enum(['ICAR', 'ACP_Biz', 'ACP_Tech', 'FDH', 'HITL']);

export const IcarEntrySchema = z.object({
  entryType: z.literal('ICAR'),
  stage: StageSchema,
  intent: z.string(),
  context: z.string(),
  action: z.string(),
  result: z.string(),
  confidence: z.number().min(0).max(1),
  owner: z.string(),
  sourceAttribution: z
    .array(
      z.object({
        sourceId: z.string(),
        url: z.string().optional(),
        hash: z.string().optional(),
      }),
    )
    .optional(),
  timestamp: z.string().datetime(),
});

export const AcpBizEntrySchema = z.object({
  entryType: z.literal('ACP_Biz'),
  stage: StageSchema,
  event: z.enum([
    'proposal_emitted',
    'quote_emitted',
    'po_received',
    'sow_approved',
    'invoice_sent',
    'payment_received',
    'refund_issued',
    'change_order',
  ]),
  payload: z.record(z.string(), z.unknown()),
  owner: z.string(),
  timestamp: z.string().datetime(),
});

export const AcpTechEntrySchema = z.object({
  entryType: z.literal('ACP_Tech'),
  stage: StageSchema,
  event: z.enum([
    'milestone_reached',
    'test_passed',
    'test_failed',
    'security_audit_started',
    'security_audit_completed',
    'delivery_confirmed',
    'rollback_triggered',
  ]),
  payload: z.record(z.string(), z.unknown()),
  owner: z.string(),
  timestamp: z.string().datetime(),
});

export const FdhEntrySchema = z.object({
  entryType: z.literal('FDH'),
  stage: StageSchema.optional(),
  trigger: z.enum([
    'low_confidence',
    'contradiction',
    'policy_exception',
    'adoption_lag',
    'kpi_miss',
    'ctq_change',
  ]),
  foster: z.string(),
  develop: z.string(),
  hone: z.string(),
  resolution: z.string(),
  owner: z.string(),
  timestamp: z.string().datetime(),
});

export const HitlEntrySchema = z.object({
  entryType: z.literal('HITL'),
  stage: StageSchema,
  approver: z.string(),
  decision: z.enum(['approved', 'rejected', 'escalated']),
  notes: z.string().optional(),
  timestamp: z.string().datetime(),
});

export const LedgerEntrySchema = z.discriminatedUnion('entryType', [
  IcarEntrySchema,
  AcpBizEntrySchema,
  AcpTechEntrySchema,
  FdhEntrySchema,
  HitlEntrySchema,
]);

// ── Full Ledger ─────────────────────────────────────────────────────

export const LedgerSchema = z.object({
  id: z.string().min(1),                                  // same as charters.id
  costBreakdown: CostBreakdownSchema.optional(),
  melaniumAllocations: z.array(MelaniumAllocationSchema).default([]),
  riskPremiumAdjustments: z.array(RiskPremiumAdjustmentSchema).default([]),
  rationaleEntries: z.array(RationaleEntrySchema).default([]),
  pickerAngBom: PickerAngBomSchema.optional(),
  pickerAngSecurityAddendum: SecurityAddendumSchema.optional(),
  pickerAngIirScore: z.record(z.string(), z.unknown()).optional(),
  ttdDrCycles: z.array(TtdDrCycleSchema).default([]),
  entries: z.array(LedgerEntrySchema).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Ledger = z.infer<typeof LedgerSchema>;
export type CostBreakdown = z.infer<typeof CostBreakdownSchema>;
export type MelaniumAllocation = z.infer<typeof MelaniumAllocationSchema>;
export type PickerAngBom = z.infer<typeof PickerAngBomSchema>;
export type BomEntry = z.infer<typeof BomEntrySchema>;
export type SecurityAddendum = z.infer<typeof SecurityAddendumSchema>;
export type RationaleEntry = z.infer<typeof RationaleEntrySchema>;
export type TtdDrCycle = z.infer<typeof TtdDrCycleSchema>;
export type LedgerEntry = z.infer<typeof LedgerEntrySchema>;
export type IcarEntry = z.infer<typeof IcarEntrySchema>;
