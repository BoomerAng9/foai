"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Live Task Plan — Real-time SSE viewer for Chicken Hawk orchestration.
 *
 * Subscribes to /api/chicken-hawk/live-plan and renders task plan events
 * as they stream in from the DeerFlow 2.0 orchestrator.
 */

interface TaskEvent {
  event_id: string;
  trace_id: string;
  task_name: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  hawk: string;
  detail: string;
  timestamp: number;
  metadata: Record<string, unknown>;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-zinc-800", text: "text-zinc-400", label: "Pending" },
  running: { bg: "bg-cyan-900/40", text: "text-cyan-400", label: "Running" },
  completed: { bg: "bg-emerald-900/40", text: "text-emerald-400", label: "Done" },
  failed: { bg: "bg-red-900/40", text: "text-red-400", label: "Failed" },
  skipped: { bg: "bg-zinc-700", text: "text-zinc-500", label: "Skipped" },
};

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function LiveTaskPlan({
  endpoint = "/api/chicken-hawk/live-plan",
  maxEvents = 100,
}: {
  endpoint?: string;
  maxEvents?: number;
}) {
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let es: EventSource | null = null;

    function connect() {
      es = new EventSource(endpoint);

      es.addEventListener("connected", () => {
        setConnected(true);
        setError(null);
      });

      es.onmessage = (e) => {
        try {
          const event: TaskEvent = JSON.parse(e.data);
          setEvents((prev) => {
            const next = [...prev, event];
            return next.length > maxEvents ? next.slice(-maxEvents) : next;
          });
        } catch {
          // Ignore malformed events
        }
      };

      es.onerror = () => {
        setConnected(false);
        setError("Connection lost. Reconnecting...");
        es?.close();
        setTimeout(connect, 3000);
      };
    }

    connect();
    return () => es?.close();
  }, [endpoint, maxEvents]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-zinc-200">
            Live Task Plan
          </h3>
          <span className="text-xs text-zinc-500">DeerFlow 2.0</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${
              connected ? "bg-emerald-500" : "bg-red-500"
            }`}
          />
          <span className="text-xs text-zinc-400">
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 bg-red-900/20 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Event list */}
      <div
        ref={scrollRef}
        className="max-h-96 overflow-y-auto divide-y divide-zinc-800"
      >
        {events.length === 0 ? (
          <div className="px-4 py-8 text-center text-zinc-500 text-sm">
            Waiting for task events...
          </div>
        ) : (
          events.map((evt) => {
            const style = STATUS_STYLES[evt.status] ?? STATUS_STYLES.pending;
            return (
              <div
                key={evt.event_id}
                className={`px-4 py-2.5 ${style.bg} transition-colors`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-mono px-1.5 py-0.5 rounded ${style.text} bg-zinc-800`}
                    >
                      {style.label}
                    </span>
                    <span className="text-sm text-zinc-200 font-medium">
                      {evt.task_name.replace(/_/g, " ")}
                    </span>
                    {evt.hawk && (
                      <span className="text-xs text-cyan-500">
                        {evt.hawk}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500 font-mono">
                    {formatTime(evt.timestamp)}
                  </span>
                </div>
                {evt.detail && (
                  <p className="mt-1 text-xs text-zinc-400 truncate">
                    {evt.detail}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer with event count */}
      <div className="px-4 py-2 border-t border-zinc-700 text-xs text-zinc-500">
        {events.length} event{events.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
