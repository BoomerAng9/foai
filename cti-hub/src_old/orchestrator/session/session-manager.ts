import { MemoryStore } from "../../platform/memory/memory-store";

export class SessionManager {
  constructor(private readonly memory: MemoryStore) {}

  logChangeOrder(sessionId: string, detail: string): void {
    this.memory.add({ sessionId, type: "change_order", content: detail });
  }

  logPreference(sessionId: string, detail: string): void {
    this.memory.add({ sessionId, type: "user_preference", content: detail });
  }
}
