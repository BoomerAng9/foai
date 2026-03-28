import { describe, expect, it } from "vitest";
import { handleRequest } from "../../src/orchestrator/orchestrator";

describe("orchestration slice", () => {
  it("runs text -> orchestrator -> agent -> tool -> response", async () => {
    const response = await handleRequest({
      requestId: "req-1",
      sessionId: "session-1",
      userInput: "build a webhook plug",
      modality: "text"
    });

    expect(response.selectedAgent).toBe("agent.builder");
    expect(response.selectedTools).toContain("tool.echo");
    expect(response.resultPayload.toolResult).toEqual({ echoed: "build a webhook plug" });
  });
});
