import { describe, expect, it } from "vitest";
import { MemoryStore } from "../../src/platform/memory/memory-store";
import { PrototypeStore } from "../../src/ui/prototypes/prototype-store";

describe("memory and ascii workflow", () => {
  it("stores change orders in memory", () => {
    const mem = new MemoryStore();
    mem.add({ sessionId: "s1", type: "change_order", content: "add data source selector" });
    expect(mem.findByType("s1", "change_order")).toHaveLength(1);
  });

  it("stores ascii prototype artifacts", () => {
    const store = new PrototypeStore();
    store.create({
      taskId: "task-chat",
      screenName: "chat-shell",
      assumptions: ["preserve theme"],
      asciiBody: "+--+",
      revision: 1,
      approved: false
    });
    expect(store.listByTask("task-chat")).toHaveLength(1);
  });
});
