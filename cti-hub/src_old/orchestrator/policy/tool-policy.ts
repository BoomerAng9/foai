import type { AgentContract } from "../../agents/contracts/agent-contract";

export function assertToolAllowed(agent: AgentContract, toolId: string): void {
  if (!agent.toolWhitelist.includes(toolId)) {
    throw new Error(`Tool ${toolId} is not allowed for agent ${agent.id}`);
  }
}
