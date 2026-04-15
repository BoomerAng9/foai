/**
 * Zod runtime schemas for the TIE Matrix.
 * Loader validates all seed data at boot. Fail loud on malformed input.
 */

import { z } from 'zod';

export const TIETierSchema = z.enum([
  'PRIME',
  'A_PLUS',
  'A',
  'A_MINUS',
  'B_PLUS',
  'B',
  'B_MINUS',
  'C_PLUS',
  'C',
]);

export const VerticalSchema = z.enum([
  'SPORTS',
  'WORKFORCE',
  'STUDENT',
  'CONTRACTOR',
  'FOUNDER',
  'CREATIVE',
]);

export const PrimeSubTagSchema = z.enum([
  'franchise_cornerstone',
  'talent_character_concerns',
  'nil_ready',
  'quiet_but_elite',
  'ultra_competitive',
]);

export const VersatilityFlexSchema = z.enum([
  'none',
  'situational',
  'two_way',
  'unicorn',
]);

export const GradeBandSchema = z.object({
  tier: TIETierSchema,
  grade: z.string().min(1),
  badgeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  icon: z.string().min(1),
  min: z.number(),
  max: z.number(),
});

export const VerticalConfigSchema = z.object({
  id: VerticalSchema,
  displayName: z.string().min(1),
  scoreNoun: z.string().min(1),
  subjectNoun: z.string().min(1),
  datasetNamespace: z.string().min(1),
  allowedSourceModules: z.array(z.string()),
});

export const VerticalTierLabelSchema = z.object({
  label: z.string().min(1),
  context: z.string().min(1),
  projection: z.string().optional(),
});

export const PrimeSubTagDefSchema = z.object({
  id: PrimeSubTagSchema,
  icon: z.string().min(1),
  label: z.string().min(1),
  meaning: z.string().min(1),
});

export const VersatilityBonusSchema = z.object({
  flex: VersatilityFlexSchema,
  bonus: z.number().min(0).max(20),
  description: z.string().min(1),
});

export const TIEComponentsSchema = z.object({
  performance: z.number(),
  attributes: z.number(),
  intangibles: z.number(),
});

export const TIEResultSchema = z.object({
  vertical: VerticalSchema,
  score: z.number(),
  grade: z.string(),
  tier: TIETierSchema,
  label: z.string(),
  context: z.string(),
  projection: z.string().optional(),
  badgeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  icon: z.string(),
  components: TIEComponentsSchema,
  primeSubTags: z.array(PrimeSubTagSchema).optional(),
});

export const TIEMatrixSchema = z.object({
  grades: z.array(GradeBandSchema).min(1),
  verticals: z.record(VerticalSchema, VerticalConfigSchema),
  labelsByVertical: z.record(
    VerticalSchema,
    z.record(TIETierSchema, VerticalTierLabelSchema),
  ),
  primeSubTags: z.record(PrimeSubTagSchema, PrimeSubTagDefSchema),
  versatilityBonuses: z.record(VersatilityFlexSchema, VersatilityBonusSchema),
  generatedAt: z.string(),
  version: z.string(),
});
