/**
 * Zod runtime schemas for Spinner.
 * Used by API handlers, message validation, and inter-package contracts.
 */

import { z } from 'zod';

export const ChatSurfaceSchema = z.enum([
  'deploy',
  'aims-core',
  'cti-hub',
  'perform',
  'smelteros',
  'sqwaadrun',
  'tps-report-ang',
]);

export const IntentCategorySchema = z.enum([
  'conversation',
  'question',
  'simple-task',
  'build-intent',
  'pricing-question',
  'status-check',
  'larger-project',
]);

export const IntentClassificationSchema = z.object({
  category: IntentCategorySchema,
  confidence: z.number().min(0).max(1),
  triggerWords: z.array(z.string()),
  recommendedAction: z.union([
    z.object({ type: z.literal('continue-chat') }),
    z.object({ type: z.literal('execute-simple'), description: z.string() }),
    z.object({ type: z.literal('transition-guide-me'), suggestedScope: z.string() }),
    z.object({ type: z.literal('transition-manage-it'), suggestedScope: z.string() }),
    z.object({ type: z.literal('handoff-tps-report-ang'), pricingQuery: z.string() }),
    z.object({ type: z.literal('handoff-pmo'), missionId: z.string().optional() }),
    z.object({ type: z.literal('spawn-three-consultant'), suggestedScope: z.string() }),
  ]),
  reasoning: z.string(),
});

export const ChatEngineIdSchema = z.enum([
  'glm-5.1',
  'gemini-3.1-flash-live',
  'claude-haiku-4.5',
  'gemini-3-flash',
]);

export const ComputerUseEngineIdSchema = z.enum([
  'glm-turbo',
  'claude-sonnet-4.5-computer-use',
  'gemini-3-pro-vision',
]);

export const EngineConfigSchema = z.object({
  primary: ChatEngineIdSchema,
  multimodalUpgrade: ChatEngineIdSchema.optional(),
  fallback: ChatEngineIdSchema.optional(),
  computerUse: ComputerUseEngineIdSchema.optional(),
  computerUseFallback: ComputerUseEngineIdSchema.optional(),
});

export const SpinnerJobSchema = z.object({
  id: z.string(),
  surface: ChatSurfaceSchema,
  userId: z.string(),
  userMessage: z.string(),
  classification: IntentClassificationSchema,
  status: z.enum([
    'idle',
    'classifying',
    'executing',
    'streaming',
    'awaiting-handoff',
    'completed',
    'failed',
  ]),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  error: z.string().optional(),
  pipStreamId: z.string().optional(),
  liveLookInSessionId: z.string().optional(),
  missionId: z.string().optional(),
});
