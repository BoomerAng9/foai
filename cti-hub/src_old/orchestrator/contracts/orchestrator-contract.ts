import { z } from "zod";

export const OrchestratorRequestSchema = z.object({
  requestId: z.string().min(1),
  sessionId: z.string().min(1),
  userInput: z.string().min(1),
  modality: z.enum(["text", "voice", "vision"]),
  preferredAgentId: z.string().optional()
});

export const OrchestratorResponseSchema = z.object({
  requestId: z.string(),
  sessionId: z.string(),
  selectedAgent: z.string(),
  selectedTools: z.array(z.string()),
  plan: z.array(z.string()),
  resultPayload: z.record(z.any()),
  policyDecisions: z.array(z.string()),
  auditMetadata: z.object({
    timestamp: z.string(),
    riskProfile: z.string()
  })
});

export type OrchestratorRequest = z.infer<typeof OrchestratorRequestSchema>;
export type OrchestratorResponse = z.infer<typeof OrchestratorResponseSchema>;
