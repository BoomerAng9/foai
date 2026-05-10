'use client';

import { useEffect, useRef, useState } from 'react';
import { Activity, Pause, Play, Trash2, Loader2 } from 'lucide-react';

interface PlanEvent {
  id: string;
  ts: string;
  raw_event: string;
  data: Record<string, unknown>;
}

const STREAM_URL = '/api/gateway/api/chicken-hawk/live-plan';
const MAX_EVENTS = 200;

export default function LivePlanPanel() {
  const [events, setEvents] = useState<PlanEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const seqRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useRef(false);

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    function open() {
      const es = new EventSource(STREAM_URL, { withCredentials: true });
      esRef.current = es;
      es.onopen = () => { setConnected(true); setError(null); };
      es.onerror = () => { setConnected(false); };
      // The gateway emits typed SSE events ("connected", "task_update",
      // "task_started", "task_completed", "task_failed", etc.) — listen
      // generically through onmessage AND a few named handlers since
      // EventSource only fires onmessage for unnamed events.
      const onAny = (ev: MessageEvent) => {
        if (pausedRef.current) return;
        let data: Record<string, unknown> = {};
        try { data = JSON.parse(ev.data); } catch { data = { raw: ev.data }; }
        const seq = ++seqRef.current;
        const item: PlanEvent = {
          id: `${seq}`,
          ts: new Date().toISOString(),
          raw_event: ev.type || 'message',
          data,
        };
        setEvents((cur) => [...cur, item].slice(-MAX_EVENTS));
      };
      es.onmessage = onAny;
      ['connected', 'task_started', 'task_update', 'task_completed', 'task_failed', 'plan', 'heartbeat'].forEach((t) => {
        es.addEventListener(t, onAny as any);
      });
    }
    open();
    return () => { esRef.current?.close(); };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events.length]);

  function clear() { setEvents([]); seqRef.current = 0; }

  return (
    <>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Live Plan</h1>
          <p className="text-foai-muted mt-2">
            Real-time SSE stream from <code className="text-xs font-mono text-foai-gold">/api/chicken-hawk/live-plan</code> — every dispatch, escalation, and completion as it happens.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${connected ? 'bg-foai-cyan/15 text-foai-cyan' : 'bg-foai-gold/15 text-foai-gold'}`}>
            {connected ? <Activity className="size-3" /> : <Loader2 className="size-3 animate-spin" />}
            {connected ? 'Connected' : 'Connecting…'}
          </span>
        </div>
      </header>

      <section className="rounded-xl border border-foai-border bg-foai-surface/60 backdrop-blur overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-foai-border/60">
          <div className="text-xs uppercase tracking-wider text-foai-muted">Stream · last {MAX_EVENTS}</div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setPaused((p) => !p)}
              className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full text-foai-muted hover:text-foai-text hover:bg-white/5 transition-colors">
              {paused ? <Play className="size-3" /> : <Pause className="size-3" />}
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button type="button" onClick={clear}
              className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full text-foai-muted hover:text-foai-text hover:bg-white/5 transition-colors">
              <Trash2 className="size-3" /> Clear
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="max-h-[60vh] overflow-y-auto px-5 py-4 font-mono text-xs space-y-1.5">
          {error && <div className="text-foai-gold">{error}</div>}
          {events.length === 0 && (
            <div className="text-foai-muted text-center py-12">Waiting for the next event…</div>
          )}
          {events.map((e) => (
            <div key={e.id} className="grid grid-cols-[auto_auto_1fr] gap-3 items-baseline">
              <span className="text-[10px] text-foai-muted/70">{new Date(e.ts).toLocaleTimeString()}</span>
              <span className="text-[10px] uppercase tracking-wider text-foai-cyan">{e.raw_event}</span>
              <pre className="whitespace-pre-wrap break-all text-foai-text/90">{JSON.stringify(e.data)}</pre>
            </div>
          ))}
        </div>
      </section>

      <p className="text-xs text-foai-muted mt-4">
        Tip: the same stream powers the public-status indicator on chicken-hawk-hawk-ui. Pause to inspect a single event without losing scroll.
      </p>
    </>
  );
}
