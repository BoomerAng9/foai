"use client";
import * as React from "react";

type Event = {
  event_type?: string;
  ts?: number;
  created_at?: string;
  source_id?: string;
  payload?: unknown;
};

type StripeEvent = { id: string; type: string; created: number };

export function ActivityTab() {
  const [events, setEvents] = React.useState<Event[]>([]);
  const [stripeEvents, setStripeEvents] = React.useState<StripeEvent[]>([]);
  const [filter, setFilter] = React.useState<string>("");
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    const fetchActivity = async () => {
      try {
        const r = await fetch("/api/v1/owner/activity?include_stripe=true", { credentials: "include" });
        if (!r.ok) { setErr(`status ${r.status}`); return; }
        const data = await r.json();
        if (!mounted) return;
        setEvents(data.events ?? []);
        setStripeEvents(data.stripe_events ?? []);
        setErr(null);
      } catch (e) {
        if (mounted) setErr(String(e));
      }
    };
    fetchActivity();
    const id = setInterval(fetchActivity, 3000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const visible = filter ? events.filter((e) => e.event_type === filter) : events;
  const eventTypes = Array.from(new Set(events.map((e) => e.event_type).filter(Boolean))) as string[];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border bg-background px-2 py-1 text-sm"
        >
          <option value="">All event types</option>
          {eventTypes.map((t) => (<option key={t} value={t}>{t}</option>))}
        </select>
        {err && <span className="text-destructive text-xs">{err}</span>}
        <span className="text-xs text-muted-foreground ml-auto">{visible.length} audit · {stripeEvents.length} stripe</span>
      </div>

      <table className="w-full text-sm">
        <thead className="border-b border-border text-xs uppercase tracking-widest text-muted-foreground">
          <tr><th className="text-left py-2">When</th><th className="text-left py-2">Type</th><th className="text-left py-2">Source</th><th className="text-left py-2">Detail</th></tr>
        </thead>
        <tbody>
          {visible.map((e, i) => (
            <tr key={i} className="border-b border-border/30 hover:bg-muted/30">
              <td className="py-1 font-mono text-xs">{e.created_at || (e.ts ? new Date(Number(e.ts) * 1000).toISOString() : "—")}</td>
              <td className="py-1 font-mono text-xs">{e.event_type || "—"}</td>
              <td className="py-1 font-mono text-xs">{e.source_id || "—"}</td>
              <td className="py-1 text-xs text-muted-foreground truncate max-w-md">{typeof e.payload === "string" ? e.payload : JSON.stringify(e.payload)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {stripeEvents.length > 0 && (
        <details>
          <summary className="text-xs uppercase tracking-widest text-muted-foreground cursor-pointer">Stripe events ({stripeEvents.length})</summary>
          <table className="mt-2 w-full text-sm">
            <tbody>
              {stripeEvents.map((s) => (
                <tr key={s.id} className="border-b border-border/30">
                  <td className="py-1 font-mono text-xs">{new Date(s.created * 1000).toISOString()}</td>
                  <td className="py-1 font-mono text-xs">{s.type}</td>
                  <td className="py-1 font-mono text-xs text-muted-foreground">{s.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}
