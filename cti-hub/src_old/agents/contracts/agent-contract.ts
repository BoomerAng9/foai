import { z } from "zod";

export const AgentContractSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().min(1),
  capabilities: z.array(z.string()).default([]),
  toolWhitelist: z.array(z.string()).default([]),
  riskProfile: z.enum(["low", "medium", "high"]),
  modalitiesSupported: z.array(z.enum(["text", "voice", "vision"])),
  memoryPolicy: z.object({
    retainSessionNotes: z.boolean(),
    retainPreferences: z.boolean(),
    retainChangeOrders: z.boolean()
  })
});

export type AgentContract = z.infer<typeof AgentContractSchema>;
