export type MemoryEntryType =
  | "session_note"
  | "user_preference"
  | "change_order"
  | "approval"
  | "rejected_idea"
  | "data_source_selection";

export type MemoryEntry = {
  sessionId: string;
  type: MemoryEntryType;
  content: string;
  timestamp: string;
};

export class MemoryStore {
  private readonly entries: MemoryEntry[] = [];

  add(entry: Omit<MemoryEntry, "timestamp">): MemoryEntry {
    const saved = { ...entry, timestamp: new Date().toISOString() };
    this.entries.push(saved);
    return saved;
  }

  findBySession(sessionId: string): MemoryEntry[] {
    return this.entries.filter((e) => e.sessionId === sessionId);
  }

  findByType(sessionId: string, type: MemoryEntryType): MemoryEntry[] {
    return this.entries.filter((e) => e.sessionId === sessionId && e.type === type);
  }
}
