/**
 * Zod runtime schemas for PMO data.
 * Used by webhook handlers, API routes, and migration verifiers.
 */

import { z } from 'zod';

export const AgentClassSchema = z.enum([
  'avva_noon',
  'acheevy',
  'boomer_ang',
  'chicken_hawk',
  'lil_hawk',
  'sqwaadrun',
  'specialist',
  'pmo',
  'tps_ang',
]);

export const AgentRankSchema = z.enum([
  'trainee',
  'junior',
  'senior',
  'lead',
  'c_suite',
  'ceo',
  'evaluator',
  '2ic',
  'platform_brain',
]);

export const MissionStatusSchema = z.enum([
  'drafted',
  'running',
  'completed',
  'failed',
  'cancelled',
]);

export const MissionEventTypeSchema = z.enum([
  'tool_call',
  'decision',
  'blocker',
  'progress',
  'cost',
  'reasoning',
  'consult',
  'handoff',
]);

export const ClassificationSchema = z.enum([
  'example_leader',
  'development_partner',
  'pip',
  'pei',
]);

export const MissionBriefSchema = z.object({
  scope: z.string().min(1),
  vision: z.string().min(1),
  expectedOutcome: z.string().min(1),
  kpis: z.record(z.string(), z.unknown()).optional(),
  resources: z.record(z.string(), z.unknown()).optional(),
});

export const MissionOutcomeSchema = z.object({
  report: z.string().min(1),
  actual: z.record(z.string(), z.unknown()).optional(),
  costUsd: z.number().nonnegative().optional(),
  tokens: z.number().int().nonnegative().optional(),
  durationMs: z.number().int().nonnegative().optional(),
});

export const ReasoningEntrySchema = z.object({
  ts: z.string().datetime(),
  agentId: z.string(),
  thought: z.string(),
  decision: z.string().optional(),
  pondering: z.string().optional(),
});

export const FitIndexScoresSchema = z.object({
  empathy: z.union([z.literal(-1), z.literal(0), z.literal(1)]).optional(),
  vision: z.union([z.literal(-1), z.literal(0), z.literal(1)]).optional(),
  problemSolving: z.union([z.literal(-1), z.literal(0), z.literal(1)]).optional(),
  passion: z.union([z.literal(-1), z.literal(0), z.literal(1)]).optional(),
  reliability: z.union([z.literal(-1), z.literal(0), z.literal(1)]).optional(),
  collaboration: z.union([z.literal(-1), z.literal(0), z.literal(1)]).optional(),
  clientCentricity: z.union([z.literal(-1), z.literal(0), z.literal(1)]).optional(),
  workKsa: z.union([z.literal(-1), z.literal(0), z.literal(1)]).optional(),
  workRoles: z.union([z.literal(-1), z.literal(0), z.literal(1)]).optional(),
  workEnjoys: z.union([z.literal(-1), z.literal(0), z.literal(1)]).optional(),
  cultural: z.union([z.literal(-1), z.literal(0), z.literal(1)]).optional(),
  performance: z.union([z.literal(-3), z.literal(-2), z.literal(0), z.literal(1), z.literal(2)]).optional(),
  keeperHireToday: z.union([z.literal(-1), z.literal(0), z.literal(2)]).optional(),
  keeperFightToKeep: z.union([z.literal(-1), z.literal(0), z.literal(2)]).optional(),
});

export const KpiOkrScoresSchema = z.object({
  qualityOfWork: z.number().int().min(1).max(5).optional(),
  timeliness: z.number().int().min(1).max(5).optional(),
  creativity: z.number().int().min(1).max(5).optional(),
  teamwork: z.number().int().min(1).max(5).optional(),
  communication: z.number().int().min(1).max(5).optional(),
  professionalism: z.number().int().min(1).max(5).optional(),
});

export const VibeScoresSchema = z.object({
  verifiable: z.number().min(0).max(1).optional(),
  idempotent: z.number().min(0).max(1).optional(),
  bounded: z.number().min(0).max(1).optional(),
  evident: z.number().min(0).max(1).optional(),
});

// ─── Composite classifier ────────────────────────────────────────────

/**
 * Compute classification from a completed three-layer evaluation.
 * Per project_betty_anne_ang_character_bible.md composite rules:
 *   Example Leader: Fit ≥ +12 AND KPI ≥ 24 AND V.I.B.E. ≥ 0.90
 *   Development Partner: Fit +4 to +11 OR KPI 18-23
 *   PIP: Fit 0 to +3 OR KPI 12-17
 *   PEI: Fit < 0 OR KPI < 12 OR V.I.B.E. < 0.85
 */
export function classifyEvaluation(args: {
  fitTotal: number;
  kpiTotal: number;
  vibeScore: number;
}): 'example_leader' | 'development_partner' | 'pip' | 'pei' {
  const { fitTotal, kpiTotal, vibeScore } = args;

  // PEI takes precedence — any single layer below floor
  if (fitTotal < 0 || kpiTotal < 12 || vibeScore < 0.85) return 'pei';

  // Example Leader requires ALL three layers strong
  if (fitTotal >= 12 && kpiTotal >= 24 && vibeScore >= 0.9) return 'example_leader';

  // Development Partner = strong on at least one layer
  if (fitTotal >= 4 || kpiTotal >= 18) return 'development_partner';

  // Otherwise PIP
  return 'pip';
}
