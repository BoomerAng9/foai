import { z } from "zod";

export const ToolContractSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().min(1),
  inputSchema: z.record(z.any()),
  outputSchema: z.record(z.any()),
  authRequirements: z.array(z.string()),
  executionPolicy: z.object({
    allowInProd: z.boolean(),
    requiresApproval: z.boolean()
  }),
  timeoutMs: z.number().int().positive(),
  retryPolicy: z.object({
    maxRetries: z.number().int().min(0),
    backoffMs: z.number().int().min(0)
  }),
  idempotencySupport: z.boolean(),
  structuredErrorSchema: z.record(z.any()),
  sandboxProfile: z.enum(["none", "restricted", "isolated"])
});

export type ToolContract = z.infer<typeof ToolContractSchema>;

export type ToolRuntime = {
  contract: ToolContract;
  execute: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
};
