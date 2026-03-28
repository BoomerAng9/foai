import type { AgentContract } from "../../agents/contracts/agent-contract";
import { assertToolAllowed } from "../../orchestrator/policy/tool-policy";
import { ToolRegistry } from "../registry/tool-registry";

export class ToolRunner {
  constructor(private readonly registry: ToolRegistry) {}

  async run(agent: AgentContract, toolId: string, input: Record<string, unknown>) {
    assertToolAllowed(agent, toolId);
    const tool = this.registry.get(toolId);
    if (!tool) throw new Error(`Tool ${toolId} not found`);
    return tool.execute(input);
  }
}
