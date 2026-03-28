import type { ToolRuntime } from "../contracts/tool-contract";

export const echoTool: ToolRuntime = {
  contract: {
    id: "tool.echo",
    name: "Echo Tool",
    version: "1.0.0",
    description: "Returns input as output",
    inputSchema: { message: "string" },
    outputSchema: { echoed: "string" },
    authRequirements: [],
    executionPolicy: { allowInProd: true, requiresApproval: false },
    timeoutMs: 1000,
    retryPolicy: { maxRetries: 0, backoffMs: 0 },
    idempotencySupport: true,
    structuredErrorSchema: { code: "string", message: "string" },
    sandboxProfile: "restricted"
  },
  async execute(input) {
    return { echoed: String(input.message ?? "") };
  }
};
