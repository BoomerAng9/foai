import { describe, expect, it } from "vitest";
import { createChatShellState, toggleDataSource } from "../../src/ui/chat/chat-shell";

describe("chat shell state", () => {
  it("has required header and supports multi-select data sources", () => {
    const base = createChatShellState();
    expect(base.headerLabel).toBe("Chat w/ACHEEVY");

    const withA = toggleDataSource(base, "source-a");
    const withAB = toggleDataSource(withA, "source-b");
    expect(withAB.selectedDataSources).toEqual(["source-a", "source-b"]);
  });
});
