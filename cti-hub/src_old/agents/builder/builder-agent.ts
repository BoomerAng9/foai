import type { AgentContract } from "../contracts/agent-contract";

export const builderAgent: AgentContract = {
  id: "agent.builder",
  name: "Builder Agent",
  version: "1.0.0",
  description: "Builds and refines plug workflows",
  capabilities: ["planning", "scaffolding", "tool-use"],
  toolWhitelist: ["tool.echo"],
  riskProfile: "medium",
  modalitiesSupported: ["text", "voice", "vision"],
  memoryPolicy: {
    retainSessionNotes: true,
    retainPreferences: true,
    retainChangeOrders: true
  }
};
