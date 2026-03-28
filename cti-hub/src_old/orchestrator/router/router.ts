import type { AgentContract } from "../../agents/contracts/agent-contract";
import type { OrchestratorRequest } from "../contracts/orchestrator-contract";

export function selectAgent(request: OrchestratorRequest, agents: AgentContract[]): AgentContract {
  if (request.preferredAgentId) {
    const preferred = agents.find((a) => a.id === request.preferredAgentId);
    if (preferred) return preferred;
  }

  if (request.userInput.toLowerCase().includes("build")) {
    const builder = agents.find((a) => a.id === "agent.builder");
    if (builder) return builder;
  }

  const support = agents.find((a) => a.id === "agent.support");
  if (!support) throw new Error("No supported agent found");
  return support;
}
