export type AuditEvent = { type: string; message: string; timestamp: string };

export class AuditLog {
  private readonly events: AuditEvent[] = [];

  add(type: string, message: string): void {
    this.events.push({ type, message, timestamp: new Date().toISOString() });
  }

  list(): AuditEvent[] {
    return [...this.events];
  }
}
