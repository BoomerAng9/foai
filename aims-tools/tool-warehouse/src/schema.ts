/**
 * @aims/tool-warehouse — zod schemas.
 * Matches Neon column shapes in migrations/001_init.up.sql.
 */

import { z } from 'zod';

export const TOOL_TIERS = [
  'orchestration',
  'integration',
  'plug_factory',
  'voice_sdk',
  'agent_framework',
  'smelter_os_foundry',
  'persistence',
  'security',
  'external_integration',
] as const;

export const ToolTierSchema = z.enum(TOOL_TIERS);
export type ToolTier = z.infer<typeof ToolTierSchema>;

export const TIER_ORDINAL: Record<ToolTier, number> = {
  orchestration: 1,
  integration: 2,
  plug_factory: 3,
  voice_sdk: 4,
  agent_framework: 5,
  smelter_os_foundry: 6,
  persistence: 7,
  security: 8,
  external_integration: 9,
};

export const ToolStatusSchema = z.enum(['active', 'standby', 'deprecated', 'experimental']);
export const ToolPrioritySchema = z.enum(['critical', 'high', 'medium', 'low']);
export const ToolLicenseSchema = z.enum([
  'mit',
  'apache_2_0',
  'bsd',
  'gpl',
  'proprietary',
  'freemium',
  'commercial',
  'unknown',
]);

export const ToolSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tier: ToolTierSchema,
  tierOrdinal: z.number().int().min(1).max(9),
  category: z.string().min(1),
  description: z.string().min(1),

  internalOnly: z.boolean().default(false),
  customerSafeLabel: z.string().nullable().optional(),

  license: ToolLicenseSchema.default('unknown'),
  repoUrl: z.string().url().nullable().optional(),
  vendor: z.string().nullable().optional(),
  stars: z.number().int().nonnegative().nullable().optional(),
  homepageUrl: z.string().url().nullable().optional(),

  status: ToolStatusSchema.default('active'),
  priority: ToolPrioritySchema.default('medium'),
  rating: z.string().nullable().optional(),
  circuitBreakerId: z.string().nullable().optional(),
  healthEndpoint: z.string().nullable().optional(),

  ownerAng: z.string().nullable().optional(),

  costModel: z.record(z.string(), z.unknown()).nullable().optional(),
  capabilities: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),

  addedToWarehouse: z.string().date().nullable().optional(),
  lastVerified: z.string().datetime().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type Tool = z.infer<typeof ToolSchema>;

export const ToolSeedSchema = ToolSchema.omit({
  tierOrdinal: true,
  createdAt: true,
  updatedAt: true,
  lastVerified: true,
}).extend({
  // tierOrdinal derived from tier during insert
});
export type ToolSeed = z.infer<typeof ToolSeedSchema>;
