'use client';

/**
 * LiveLookIn — streaming event viewer for a plug run
 * ======================================================
 * Polls /api/aiplug/runs/[runId] every 2 seconds and renders the
 * event stream + current status. Stops polling once the run
 * reaches a terminal state (succeeded, failed, canceled,
 * waiting_for_user).
 *
 * Ships in I-2 with polling. I-2b+ can upgrade to SSE or
 * WebSockets if the polling volume becomes a concern.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Zap,
  Pause,
} from 'lucide-react';
import type { PlugRunRow, PlugRunEventRow, PlugRunStatus } from '@/lib/aiplug/types';

interface LiveLookInProps {
  runId: string;
}

const TERMINAL_STATUSES: PlugRunStatus[] = [
  'succeeded',
  'failed',
  'canceled',
  'waiting_for_user',
];

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour12: false });
}

function eventIcon(kind: string) {
  switch (kind) {
    case 'heartbeat':
      return <Activity className="w-3 h-3 text-signal-live" />;
    case 'stage':
      return <Zap className="w-3 h-3 text-accent" />;
    case 'output':
      return <CheckCircle2 className="w-3 h-3 text-signal-live" />;
    case 'error':
      return <AlertCircle className="w-3 h-3 text-signal-error" />;
    default:
      return <Clock className="w-3 h-3 text-fg-tertiary" />;
  }
}

function statusBadge(status: PlugRunStatus) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    queued: {
      label: 'Queued',
      cls: 'bg-bg-elevated text-fg-tertiary',
      icon: <Clock className="w-3 h-3" />,
    },
    running: {
      label: 'Running',
      cls: 'bg-signal-live/15 text-signal-live',
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
    },
    succeeded: {
      label: 'Complete',
      cls: 'bg-signal-live/15 text-signal-live',
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    failed: {
      label: 'Failed',
      cls: 'bg-signal-error/15 text-signal-error',
      icon: <AlertCircle className="w-3 h-3" />,
    },
    canceled: {
      label: 'Canceled',
      cls: 'bg-bg-elevated text-fg-tertiary',
      icon: <Pause className="w-3 h-3" />,
    },
    waiting_for_user: {
      label: 'Waiting',
      cls: 'bg-accent/15 text-accent',
      icon: <Pause className="w-3 h-3" />,
    },
  };
  const entry = map[status] || map.queued;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[9px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded ${entry.cls}`}
    >
      {entry.icon}
      {entry.label}
    </span>
  );
}

export default function LiveLookIn({ runId }: LiveLookInProps) {
  const [run, setRun] = useState<PlugRunRow | null>(null);
  const [events, setEvents] = useState<PlugRunEventRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<boolean>(true);

  const fetchRun = useCallback(async () => {
    try {
      const res = await fetch(`/api/aiplug/runs/${runId}`, { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { run: PlugRunRow; events: PlugRunEventRow[] };
      setRun(data.run);
      setEvents(data.events || []);
      setError(null);

      if (TERMINAL_STATUSES.includes(data.run.status)) {
        pollingRef.current = false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch run');
    }
  }, [runId]);

  useEffect(() => {
    pollingRef.current = true;
    fetchRun();
    const interval = setInterval(() => {
      if (pollingRef.current) {
        fetchRun();
      } else {
        clearInterval(interval);
      }
    }, 2000);
    return () => {
      pollingRef.current = false;
      clearInterval(interval);
    };
  }, [runId, fetchRun]);

  return (
    <div className="border border-border bg-bg-surface rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-elevated">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-accent" />
          <span className="text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-fg">
            Live Look In
          </span>
        </div>
        {run && statusBadge(run.status)}
      </div>

      {error && (
        <div className="p-3 bg-signal-error/10 border-b border-signal-error/40 text-[11px] font-mono text-signal-error">
          {error}
        </div>
      )}

      <div className="max-h-80 overflow-y-auto p-2 space-y-1">
        {events.length === 0 && (
          <div className="py-6 text-center text-[11px] font-mono text-fg-tertiary">
            Waiting for first event…
          </div>
        )}
        {events.map(evt => (
          <div
            key={evt.id}
            className="flex items-start gap-2 px-2 py-1.5 rounded hover:bg-bg-elevated"
          >
            <div className="shrink-0 mt-0.5">{eventIcon(evt.kind)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-[9px] font-mono font-bold tracking-wider uppercase text-fg-tertiary">
                  {evt.stage || evt.kind}
                </span>
                <span className="text-[9px] font-mono text-fg-tertiary opacity-60">
                  {formatTime(evt.created_at)}
                </span>
              </div>
              <div className="text-[11px] text-fg leading-snug break-words">
                {evt.message}
              </div>
            </div>
          </div>
        ))}
      </div>

      {run?.status === 'succeeded' && run.outputs && Object.keys(run.outputs).length > 0 && (
        <div className="border-t border-border p-3 bg-bg-elevated">
          <div className="text-[10px] font-mono font-bold tracking-wider uppercase text-fg-tertiary mb-2">
            Outputs
          </div>
          <div className="space-y-2">
            {Object.entries(run.outputs).map(([key, value]) => {
              if (key.endsWith('_model') || key.endsWith('_raw')) return null;
              const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
              return (
                <details key={key} className="text-[11px]">
                  <summary className="cursor-pointer font-mono font-bold text-fg tracking-wide uppercase">
                    {key.replace(/_/g, ' ')}
                  </summary>
                  <pre className="mt-1 p-2 bg-bg border border-border rounded text-[10px] font-mono text-fg-secondary whitespace-pre-wrap max-h-64 overflow-y-auto">
                    {text}
                  </pre>
                </details>
              );
            })}
          </div>
          <div className="mt-2 text-[9px] font-mono text-fg-tertiary">
            Tokens: {run.cost_tokens ?? 0}
          </div>
        </div>
      )}

      {run?.status === 'failed' && (
        <div className="border-t border-border p-3 bg-signal-error/5">
          <div className="text-[10px] font-mono font-bold tracking-wider uppercase text-signal-error mb-1">
            Error
          </div>
          <div className="text-[11px] text-fg">{run.error_message || 'Unknown error'}</div>
        </div>
      )}
    </div>
  );
}
