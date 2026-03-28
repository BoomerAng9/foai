import type { ToolRuntime } from "../contracts/tool-contract";

export class ToolRegistry {
  private readonly tools = new Map<string, ToolRuntime>();

  register(tool: ToolRuntime): void {
    this.tools.set(tool.contract.id, tool);
  }

  get(toolId: string): ToolRuntime | undefined {
    return this.tools.get(toolId);
  }
}
