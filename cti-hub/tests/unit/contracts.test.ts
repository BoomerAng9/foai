import { describe, expect, it } from "vitest";
import { AgentContractSchema } from "../../src/agents/contracts/agent-contract";
import { ToolContractSchema } from "../../src/tools/contracts/tool-contract";
import { OrchestratorRequestSchema } from "../../src/orchestrator/contracts/orchestrator-contract";

describe("schemas", () => {
  it("validates agent contract", () => {
    const parsed = AgentContractSchema.parse({
      id: "agent.support",
      name: "Support Agent",
      version: "1",
      description: "Support",
      capabilities: [],
      toolWhitelist: [],
      riskProfile: "low",
      modalitiesSupported: ["text"],
      memoryPolicy: { retainSessionNotes: true, retainPreferences: true, retainChangeOrders: true }
    });
    expect(parsed.id).toBe("agent.support");
  });

  it("validates tool contract", () => {
    const parsed = ToolContractSchema.parse({
      id: "tool.echo",
      name: "Echo",
      version: "1",
      description: "d",
      inputSchema: {},
      outputSchema: {},
      authRequirements: [],
      executionPolicy: { allowInProd: true, requiresApproval: false },
      timeoutMs: 100,
      retryPolicy: { maxRetries: 1, backoffMs: 10 },
      idempotencySupport: true,
      structuredErrorSchema: {},
      sandboxProfile: "restricted"
    });
    expect(parsed.sandboxProfile).toBe("restricted");
  });

  it("validates orchestrator request", () => {
    const parsed = OrchestratorRequestSchema.parse({
      requestId: "r1",
      sessionId: "s1",
      userInput: "help",
      modality: "text"
    });
    expect(parsed.sessionId).toBe("s1");
  });
});
