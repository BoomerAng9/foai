import type { AgentContract } from "../contracts/agent-contract";

export const supportAgent: AgentContract = {
  id: "agent.support",
  name: "Support Agent",
  version: "1.0.0",
  description: "Handles support and troubleshooting tasks",
  capabilities: ["troubleshooting", "tool-use"],
  toolWhitelist: ["tool.echo"],
  riskProfile: "low",
  modalitiesSupported: ["text", "voice"],
  memoryPolicy: {
    retainSessionNotes: true,
    retainPreferences: true,
    retainChangeOrders: true
  }
};
