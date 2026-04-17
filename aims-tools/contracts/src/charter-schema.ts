/**
 * Zod schemas for the 11 non-negotiable Charter components.
 *
 * Source: docs/canon/Deploy-Charter-Template-3.1-UPDATED.md
 *
 * Every field here is CUSTOMER-SAFE. No internal margins, tool names,
 * model names, costs, agent identities, or pricing internals. If a field
 * would leak any of those, it belongs in `ledger-schema.ts` instead.
 */

import { z } from 'zod';
import { RFP_BAMARAM_STAGES } from './stages.js';

export const SecurityTierSchema = z.enum(['entry', 'mid', 'superior', 'defense_grade']);
export const ServiceStatusSchema = z.enum(['disabled', 'enabled', 'custom']);
export const HitlGateStatusSchema = z.enum(['pending', 'approved', 'rejected', 'escalated']);
export const StageSchema = z.enum(RFP_BAMARAM_STAGES);

// ── Component 1: Header Identity Block ─────────────────────────────

export const HeaderIdentitySchema = z.object({
  plugTitle: z.string().min(1),
  clientName: z.string().min(1),
  vendor: z.string().default('Deploy by: ACHIEVEMOR'),
  plugId: z.string().min(1),
  ledgerId: z.string().min(1),
  token: z.string().optional(),
  securityTier: SecurityTierSchema,
  voiceServicesStatus: ServiceStatusSchema,
  nftServicesStatus: ServiceStatusSchema,
  effectiveDate: z.string().datetime(),
});

// ── Component 2: Quote → PO Cost Summary ────────────────────────────

export const QuotePoCostSummarySchema = z.object({
  monthlySubscription: z.object({
    tierName: z.string(),
    monthlyFee: z.number().nonnegative(),
    tokenPool: z.number().int().nonnegative(),
    overageRatePer1k: z.number().nonnegative(),
  }),
  buildFee: z.object({
    baseFee: z.number().nonnegative(),
    securityMultiplier: z.number().positive(),
    finalFee: z.number().nonnegative(),
  }),
  voiceCosts: z
    .object({
      sttPerMinute: z.number().nonnegative().optional(),
      ttsPerMinute: z.number().nonnegative().optional(),
      voiceCloningOneTime: z.number().nonnegative().optional(),
    })
    .optional(),
  nftCosts: z
    .object({
      packageSize: z.enum(['10', '100', '1000']).optional(),
      customerPrice: z.number().nonnegative().optional(),
      deliveryDays: z.number().int().positive().optional(),
    })
    .optional(),
  refundableBuffer: z.object({
    percent: z.number().default(25),
    amount: z.number().nonnegative(),
  }),
  digitalMaintenanceFee: z
    .object({
      perTransaction: z.number().default(0.99),
      description: z.string().default('Platform infrastructure maintenance'),
    })
    .optional(),
  taxes: z.object({
    jurisdiction: z.string(),
    amount: z.number().nonnegative(),
  }),
  payment: z.object({
    poNumber: z.string().optional(),
    invoiceId: z.string().optional(),
    method: z.string().optional(),
    receiptUri: z.string().optional(),
  }),
});

// ── Component 3 lives in the `charter_stages` table (one row per stage) ─

export const TimestampedDeliverableSchema = z.object({
  stage: StageSchema,
  stageOrdinal: z.number().int().min(1).max(10),
  artifactUri: z.string().optional(),
  timestamp: z.string().datetime(),
  whatChanged: z.string().optional(),
  hitlGateStatus: HitlGateStatusSchema,
  ownerAgent: z.string().optional(),
});

// ── Component 4: Four-Question Lens + SWOT ──────────────────────────

export const FourQuestionLensSchema = z.object({
  rawIdea: z.string(),
  risksGapsMissing: z.object({
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    opportunities: z.array(z.string()),
    threats: z.array(z.string()),
  }),
  audienceResonance: z.string(),
  expertApproach: z.string(),
});

// ── Component 5: Five Use Cases Pack ────────────────────────────────

export const UseCaseSchema = z.object({
  title: z.string(),
  purpose: z.string(),
  audience: z.string(),
  howToImplement: z.array(z.string()),
  usageBands: z.object({
    high: z.string(),
    medium: z.string(),
    low: z.string(),
  }),
  successSignalsKpis: z.array(z.string()),
  risksConstraints: z.array(z.string()),
  grocRanking: z.object({
    goalFit: z.number().min(0).max(1),
    riskPosture: z.number().min(0).max(1),
    operationalValue: z.number().min(0).max(1),
    complexity: z.number().min(0).max(1),
    weightedScore: z.number(),
  }),
});

export const FiveUseCasesPackSchema = z.array(UseCaseSchema).length(5);

// ── Component 6: Technical Blueprint (customer-safe only) ───────────

export const TechnicalBlueprintSchema = z.object({
  pattern: z.literal('Picker_Ang → BuildSmith'),
  inputs: z.array(z.string()),
  outputs: z.array(z.string()),
  tests: z.array(z.string()),
  dependencies: z.array(z.string()),
  voiceInfrastructureSummary: z.string().optional(),
  nftInfrastructureSummary: z.string().optional(),
});

// ── Component 7: Security Level & Components ────────────────────────

export const SecurityLevelComponentsSchema = z.object({
  tier: SecurityTierSchema,
  controls: z.array(z.string()),
  approvals: z.array(
    z.object({
      approver: z.string(),
      role: z.string(),
      timestamp: z.string().datetime(),
    }),
  ),
  exceptions: z.array(z.string()).optional(),
  farmerSignoff: z.boolean(),
  unionSignoff: z.boolean(),
});

// ── Component 8: OKRs / KPIs ────────────────────────────────────────

export const OkrsKpisSchema = z.object({
  cadence: z.string(),
  objectives: z.array(
    z.object({
      objective: z.string(),
      keyResults: z.array(z.string()),
    }),
  ),
  kpis: z.array(
    z.object({
      name: z.string(),
      target: z.string(),
      measure: z.string(),
    }),
  ),
});

// ── Component 9: Runbook (hallucination-hardening) ──────────────────

export const RunbookSchema = z.object({
  preRun: z.array(z.string()),
  duringRun: z.array(z.string()),
  postRun: z.array(z.string()),
  schemaValidation: z.boolean().default(true),
  ntntnCritique: z.boolean().default(true),
  makerCheckerRequired: z.boolean().default(true),
  hitlEscalationPath: z.string(),
});

// ── Component 10: Legal & Data Rights ───────────────────────────────

export const LegalDataRightsSchema = z.object({
  voicePrivacy: z.object({
    dataRetentionDays: z.number().default(90),
    purgeOnRequest: z.boolean().default(true),
    encryptionAtRest: z.boolean().default(true),
  }),
  nftIp: z
    .object({
      ownership: z.literal('customer'),
      commercialRightsTransfer: z.literal('full'),
    })
    .optional(),
  storageRetention: z.string(),
  optOutTerms: z.string(),
});

// ── Component 11: Acceptance ────────────────────────────────────────

export const AcceptanceSchema = z.object({
  clientSignature: z
    .object({
      signerName: z.string(),
      signerRole: z.string(),
      timestamp: z.string().datetime(),
    })
    .nullable(),
  deploySignature: z
    .object({
      signerName: z.literal('Deploy by: ACHIEVEMOR'),
      timestamp: z.string().datetime(),
    })
    .nullable(),
  bamaramSignal: z.boolean().default(false),
});

// ── Full Charter (aggregates all 11 components) ─────────────────────

export const CharterSchema = z.object({
  id: z.string().min(1),
  headerIdentity: HeaderIdentitySchema,
  quotePoCostSummary: QuotePoCostSummarySchema.optional(),
  timestampedDeliverables: z.array(TimestampedDeliverableSchema),
  fourQuestionLens: FourQuestionLensSchema.optional(),
  fiveUseCasesPack: FiveUseCasesPackSchema.optional(),
  technicalBlueprint: TechnicalBlueprintSchema.optional(),
  securityLevelComponents: SecurityLevelComponentsSchema.optional(),
  okrsKpis: OkrsKpisSchema.optional(),
  runbook: RunbookSchema.optional(),
  legalDataRights: LegalDataRightsSchema.optional(),
  acceptance: AcceptanceSchema.optional(),
  bamaramSignal: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Charter = z.infer<typeof CharterSchema>;
export type HeaderIdentity = z.infer<typeof HeaderIdentitySchema>;
export type QuotePoCostSummary = z.infer<typeof QuotePoCostSummarySchema>;
export type TimestampedDeliverable = z.infer<typeof TimestampedDeliverableSchema>;
export type FourQuestionLens = z.infer<typeof FourQuestionLensSchema>;
export type UseCase = z.infer<typeof UseCaseSchema>;
export type TechnicalBlueprint = z.infer<typeof TechnicalBlueprintSchema>;
export type SecurityLevelComponents = z.infer<typeof SecurityLevelComponentsSchema>;
export type OkrsKpis = z.infer<typeof OkrsKpisSchema>;
export type Runbook = z.infer<typeof RunbookSchema>;
export type LegalDataRights = z.infer<typeof LegalDataRightsSchema>;
export type Acceptance = z.infer<typeof AcceptanceSchema>;
