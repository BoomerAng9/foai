import { describe, expect, it } from "vitest";
import { selectAgent } from "../../src/orchestrator/router/router";
import { builderAgent } from "../../src/agents/builder/builder-agent";
import { supportAgent } from "../../src/agents/support/support-agent";
import { assertToolAllowed } from "../../src/orchestrator/policy/tool-policy";

describe("routing and policy", () => {
  it("routes build requests to builder", () => {
    const selected = selectAgent(
      { requestId: "1", sessionId: "1", userInput: "build me a plug", modality: "text" },
      [builderAgent, supportAgent]
    );
    expect(selected.id).toBe("agent.builder");
  });

  it("rejects unauthorized tool", () => {
    expect(() => assertToolAllowed(supportAgent, "tool.secret")).toThrowError();
  });
});
