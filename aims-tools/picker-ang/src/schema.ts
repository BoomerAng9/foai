/**
 * @aims/picker-ang — zod schemas for Step-3 inputs + outputs.
 */

import { z } from 'zod';

export const SecurityTierSchema = z.enum(['entry', 'mid', 'superior', 'defense_grade']);

export const IntakeBriefSchema = z.object({
  engagementId: z.string().min(1),
  rawCtqs: z.array(z.string()).min(1),                    // Critical-to-Quality factors from intake
  derivedCapabilities: z.array(z.string()).optional(),    // override deriveRequirements
  securityTier: SecurityTierSchema.default('entry'),
  licensePreferences: z
    .array(
      z.enum(['mit', 'apache_2_0', 'bsd', 'gpl', 'proprietary', 'freemium', 'commercial']),
    )
    .optional(),
  budgetEnvelope: z
    .object({
      monthlyUsdMax: z.number().nonnegative().optional(),
      perBuildUsdMax: z.number().nonnegative().optional(),
    })
    .optional(),
  includeInternal: z.boolean().default(false),            // allow internal-only tools in BoM
  maxEntries: z.number().int().positive().default(10),
});
export type IntakeBrief = z.infer<typeof IntakeBriefSchema>;

export const ScoringWeightsSchema = z.object({
  impact: z.number().min(0).max(1).default(0.45),
  integrationFit: z.number().min(0).max(1).default(0.35),
  risk: z.number().min(0).max(1).default(0.20),
});
export type ScoringWeights = z.infer<typeof ScoringWeightsSchema>;

export const IirScoreSchema = z.object({
  impact: z.number().min(0).max(1),
  integrationFit: z.number().min(0).max(1),
  risk: z.number().min(0).max(1),
  weighted: z.number().min(0).max(1),
});
export type IirScore = z.infer<typeof IirScoreSchema>;

export const ScanResultSchema = z.object({
  engagementId: z.string().min(1),
  generatedAt: z.string().datetime(),
  catalogSnapshot: z.string(),
  scoredCandidates: z.number().int().nonnegative(),
  selected: z.number().int().nonnegative(),
  bomInternal: z.array(z.record(z.string(), z.unknown())),         // full-detail BoM with internal tools
  bomCustomerSafe: z.array(z.record(z.string(), z.unknown())),     // scrubbed for Charter
  securityAddendum: z.record(z.string(), z.unknown()),
});
export type ScanResult = z.infer<typeof ScanResultSchema>;
