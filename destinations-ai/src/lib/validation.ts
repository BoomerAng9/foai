/**
 * Destinations AI — Zod validation schemas.
 *
 * Single source of truth for request/response shapes. API routes parse
 * inputs with these; clients infer types with z.infer<typeof X>.
 *
 * Keep these aligned with the SQL migrations in /migrations.
 */

import { z } from 'zod';

// ─── Primitives ─────────────────────────────────────────────────────

export const HexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'must be a six-digit hex color like #FF6B00');

export const CoordinateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type Coordinate = z.infer<typeof CoordinateSchema>;

export const StateCodeSchema = z.string().length(2).regex(/^[A-Z]{2}$/);

// ─── Enums ──────────────────────────────────────────────────────────

export const DestinationStatus = z.enum(['live', 'coming_soon', 'archived']);
export type DestinationStatusT = z.infer<typeof DestinationStatus>;

export const DataSource = z.enum([
  'curated',
  'mls',
  'partner',
  'census',
  'walkscore',
  'greatschools',
]);
export type DataSourceT = z.infer<typeof DataSource>;

// ─── Pulse ──────────────────────────────────────────────────────────

export const PulseSchema = z.object({
  walkScore: z.number().int().min(0).max(100).nullable(),
  noiseDbRange: z
    .tuple([z.number().int().min(0).max(120), z.number().int().min(0).max(120)])
    .nullable()
    .refine((v) => v === null || v[1] >= v[0], 'noiseDbMax must be >= noiseDbMin'),
  schoolRating: z.number().int().min(0).max(10).nullable(),
  vibeDescriptors: z.array(z.string().min(1).max(64)).max(20),
  ambientColor: HexColorSchema,
});
export type Pulse = z.infer<typeof PulseSchema>;

// ─── Destination ────────────────────────────────────────────────────

export const DestinationSchema = z.object({
  destinationId: z.string().min(1).max(64),
  name: z.string().min(1).max(128),
  region: z.string().min(1).max(64),
  state: StateCodeSchema,
  coordinates: CoordinateSchema,
  medianHomePrice: z.number().int().nonnegative().nullable(),
  listingCount: z.number().int().nonnegative(),
  pulse: PulseSchema,
  heroText: z.string().max(500).nullable(),
  summary: z.string().max(2000).nullable(),
});
export type Destination = z.infer<typeof DestinationSchema>;

// ─── Coming Soon ────────────────────────────────────────────────────

export const QuarterSchema = z
  .string()
  .regex(/^Q[1-4] \d{4}$/, 'must be format "Q3 2026"');

export const ComingSoonRegionSchema = z.object({
  regionId: z.string().min(1).max(64),
  name: z.string().min(1).max(128),
  geographicArea: z.string().min(1).max(200),
  centerCoordinates: CoordinateSchema,
  ambientPalette: z.tuple([HexColorSchema, HexColorSchema, HexColorSchema]),
  destinationCount: z.number().int().min(0).max(100),
  estimatedUnlockQuarter: QuarterSchema,
  flagshipDestinations: z.array(z.string().min(1).max(128)).max(20),
  regionVibe: z.array(z.string().min(1).max(64)).max(20),
  waitlistCount: z.number().int().nonnegative(),
  summary: z.string().max(2000).nullable(),
  displayOrder: z.number().int().min(0).max(1000).default(0),
});
export type ComingSoonRegion = z.infer<typeof ComingSoonRegionSchema>;

// ─── Waitlist ───────────────────────────────────────────────────────

export const WaitlistPostSchema = z.object({
  regionId: z.string().min(1).max(64),
  email: z.string().email().max(254),
  source: z.string().max(64).optional(),
});
export type WaitlistPost = z.infer<typeof WaitlistPostSchema>;

// ─── User state ─────────────────────────────────────────────────────

export const IntentionSchema = z.object({
  intentionId: z.string().uuid().optional(),
  phrase: z.string().min(1).max(200),
  weight: z.number().min(0).max(1),
  displayOrder: z.number().int().min(0).max(100).default(0),
});
export type Intention = z.infer<typeof IntentionSchema>;

export const IntentionSetSchema = z.object({
  intentions: z.array(IntentionSchema).max(50),
});
export type IntentionSet = z.infer<typeof IntentionSetSchema>;

export const ShortlistMutationSchema = z.object({
  destinationId: z.string().min(1).max(64),
  note: z.string().max(500).optional(),
});
export type ShortlistMutation = z.infer<typeof ShortlistMutationSchema>;

// ─── Response envelope ──────────────────────────────────────────────

export type ApiError = { error: string; detail?: unknown };
export type ApiResult<T> = { data: T } | ApiError;
