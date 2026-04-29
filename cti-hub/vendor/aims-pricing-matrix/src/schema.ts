/**
 * Zod runtime schemas for the A.I.M.S. Pricing Matrix.
 * Used by:
 *  - Loader (validate seed data + Neon-loaded rows on the way in)
 *  - Webhook handlers (validate Paperform-submitted rows)
 *  - API routes (validate user-facing matrix queries)
 */

import { z } from 'zod';

export const RowTypeSchema = z.enum([
  'model',
  'plan',
  'bundle',
  'service',
  'pillar',
  'compliance',
]);

export const SectorSchema = z.enum([
  'llm',
  'image',
  'video',
  'audio',
  'tts',
  'stt',
  'embed',
  'storage',
  'compute',
  'mcp',
  'plan',
  'pillar',
  'compliance',
  'workforce',
]);

export const TierSchema = z.enum([
  'open-source',
  'free',
  'fast',
  'standard',
  'premium',
  'flagship',
]);

export const LicenseSchema = z.enum(['open-source', 'proprietary', 'mixed']);

export const CapabilitySchema = z.enum([
  'coding',
  'long-horizon',
  'reasoning',
  'vision',
  'function-calling',
  'multimodal',
  'realtime',
  'streaming',
  'tool-use',
  'cloning',
  'voice',
  'agentic',
  'design',
  'presentation',
  'document',
  'webpage',
  'social-graphic',
  'diagram',
  'vector',
  'page-builder',
]);

export const FrequencySchema = z.enum(['3-month', '6-month', '9-month', 'ppu']);

export const VibeGroupSchema = z.enum(['individual', 'family', 'team', 'enterprise']);

export const CurrencySchema = z.enum(['USD', 'SAR', 'AED', 'QAR', 'OMR', 'GBP', 'EUR']);

export const PriceByCurrencySchema = z.object({
  USD: z.number().nonnegative().optional(),
  SAR: z.number().nonnegative().optional(),
  AED: z.number().nonnegative().optional(),
  QAR: z.number().nonnegative().optional(),
  OMR: z.number().nonnegative().optional(),
  GBP: z.number().nonnegative().optional(),
  EUR: z.number().nonnegative().optional(),
});

export const CompetitorRefSchema = z.object({
  name: z.string(),
  price: z.number().nonnegative(),
  currency: CurrencySchema,
  source: z.string().optional(),
  notes: z.string().optional(),
});

export const BenchmarkScoresSchema = z.record(z.string(), z.number().optional());

export const PricingRowSchema = z.object({
  id: z.string().min(1),
  rowType: RowTypeSchema,
  sector: SectorSchema,
  topic: z.string().min(1),
  description: z.string().optional(),

  providerId: z.string().optional(),
  providerName: z.string().optional(),
  routeId: z.string().optional(),
  license: LicenseSchema.optional(),

  capabilities: z.array(CapabilitySchema),
  contextWindow: z.number().int().positive().optional(),

  tier: TierSchema.optional(),
  unlockedAt: z.array(FrequencySchema),
  vibeGroups: z.array(VibeGroupSchema),

  inputPer1M: z.number().nonnegative().optional(),
  outputPer1M: z.number().nonnegative().optional(),
  unitPrice: z.number().nonnegative().optional(),
  unit: z
    .enum(['per_image', 'per_second', 'per_minute', 'per_gb_month', 'per_request', 'per_seat_month'])
    .optional(),

  multiCurrency: PriceByCurrencySchema.optional(),
  ppuMultiplier: z.number().positive().default(1.4),

  confidenceUplift: z.number().nonnegative().optional(),
  convenienceUplift: z.number().nonnegative().optional(),
  securityUplift: z.number().nonnegative().optional(),

  competitor: CompetitorRefSchema.optional(),
  demand: z.enum(['High', 'Moderate', 'Medium', 'Low']).optional(),
  importance: z.enum(['Essential', 'High', 'Medium', 'Low']).optional(),

  prerequisites: z.array(z.string()).optional(),
  outcomes: z.array(z.string()).optional(),
  certLevel: z.enum(['Basic', 'Intermediate', 'Advanced']).optional(),
  accreditation: z.string().optional(),
  sourceUrl: z.string().url().optional(),

  benchmarks: BenchmarkScoresSchema.optional(),

  lastVerified: z.string().datetime(),
  active: z.boolean(),
  notes: z.string().optional(),

  supersededBy: z.string().optional(),
  isLatest: z.boolean().optional(),

  routingPriority: z.number().int().nonnegative().optional(),
  vendorRank: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
});

export const BundleRowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  memberIds: z.array(z.string()).min(1),
  bundlePriceUsd: z.number().nonnegative().optional(),
  savingsVsSumUsd: z.number().optional(),
  vibeGroups: z.array(VibeGroupSchema),
  active: z.boolean(),
  notes: z.string().optional(),
});

export const TaskMultiplierSchema = z.object({
  taskType: z.enum([
    'code-generation',
    'code-review',
    'workflow-automation',
    'security-audit',
    'architecture-planning',
    'business-intelligence',
    'deployment',
    'multi-agent',
    'full-autonomous',
  ]),
  label: z.string(),
  multiplier: z.number().positive(),
  description: z.string(),
});

export const AimsPricingMatrixSchema = z.object({
  rows: z.array(PricingRowSchema),
  bundles: z.array(BundleRowSchema),
  taskMultipliers: z.array(TaskMultiplierSchema),
  generatedAt: z.string().datetime(),
  version: z.string(),
});

// Convenience inference helpers
export type PricingRowZ = z.infer<typeof PricingRowSchema>;
export type BundleRowZ = z.infer<typeof BundleRowSchema>;
export type AimsPricingMatrixZ = z.infer<typeof AimsPricingMatrixSchema>;
