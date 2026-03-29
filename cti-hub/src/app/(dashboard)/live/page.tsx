'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Wifi, WifiOff, Activity } from 'lucide-react';

const STATE_ENGINE_URL = 'wss://live-look-in-state-939270059361.us-central1.run.app/ws';
const STATE_HTTP_URL = 'https://live-look-in-state-939270059361.us-central1.run.app/state';
const LUC_METRICS_URL = process.env.NEXT_PUBLIC_LUC_URL || '';

interface AgentState { name: string; status: string; currentTask?: string; }
interface ServiceState { url: string; status: string; http_code: number | null; }
interface WorldState {
  agents: Record<string, AgentState>;
  services: Record<string, ServiceState>;
  metrics: { total_revenue: number; enrollment_count: number; open_seats_tracked: number };
  jobs_log: Array<{ agent: string; task: string; status: string; timestamp: string }>;
  last_poll: string | null;
}
interface LucMetrics {
  total_spend_usd: number; daily_spend_usd: number; daily_budget_usd: number;
  daily_remaining_usd: number; total_events: number;
  total_tokens_in: number; total_tokens_out: number;
  cost_by_model: Record<string, number>; cost_by_service: Record<string, number>;
}

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  healthy: { color: 'bg-signal-live', label: 'LIVE' },
  online: { color: 'bg-signal-live', label: 'LIVE' },
  active: { color: 'bg-signal-info', label: 'ACTIVE' },
  monitoring: { color: 'bg-signal-info', label: 'WATCH' },
  directive_received: { color: 'bg-signal-warn', label: 'RECV' },
  unhealthy: { color: 'bg-signal-error', label: 'DOWN' },
  unreachable: { color: 'bg-signal-error', label: 'FAIL' },
  offline: { color: 'bg-fg-ghost', label: 'OFF' },
};

function statusInfo(s: string) { return STATUS_MAP[s] || { color: 'bg-fg-ghost', label: s.toUpperCase() }; }

const PMO_OFFICES = [
  { id: 'TECH', name: 'Technology', super: 'CTO_Ang', managers: ['Architecture_Ang', 'Engineering_Ang', 'Infrastructure_Ang'], hawks: ['TRAE', 'Coding', 'Back'] },
  { id: 'FIN', name: 'Finance', super: 'CFO_Ang', managers: ['Receivables_Ang', 'Bookkeeping_Ang', 'Pricing_Ang'], hawks: [] },
  { id: 'OPS', name: 'Operations', super: 'COO_Ang', managers: ['Workflow_Ang', 'Capacity_Ang', 'Quality_Ang'], hawks: ['Flow', 'Agent'] },
  { id: 'MKT', name: 'Marketing', super: 'CMO_Ang', managers: ['Growth_Ang', 'Campaign_Ang', 'Partnerships_Ang'], hawks: ['Deep'] },
  { id: 'DSN', name: 'Design', super: 'CDO_Ang', managers: ['UX_Ang', 'Brand_Ang', 'Interface_Ang'], hawks: ['Viz', 'Blend'] },
  { id: 'PRD', name: 'Product', super: 'CPO_Ang', managers: ['Product_Ang', 'Publications_Ang', 'Documentation_Ang'], hawks: [] },
  { id: 'HR', name: 'Human Resources', super: 'Betty-Ann_Ang', managers: ['Aria_Ang', 'Rumi_Ang', 'Eamon_Ang'], hawks: [] },
  { id: 'DT', name: 'Digital Transform', super: 'Astra_Ang', managers: ['Atlas_Ang', 'Blueprint_Ang', 'Sentinel_Ang'], hawks: ['Sand', 'Memory', 'Graph'] },
];

export default function OperationsFloor() {
  const [state, setState] = useState<WorldState | null>(null);
  const [lucMetrics, setLucMetrics] = useState<LucMetrics | null>(null);
  const [connected, setConnected] = useState(false);
  const [offline, setOffline] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const retriesRef = useRef(0);
  const MAX_RETRIES = 3;

  const connect = useCallback(() => {
    if (retriesRef.current >= MAX_RETRIES) {
      setOffline(true);
      return;
    }
    try {
      const ws = new WebSocket(STATE_ENGINE_URL);
      wsRef.current = ws;
      ws.onopen = () => { setConnected(true); retriesRef.current = 0; setOffline(false); };
      ws.onmessage = (e) => { const msg = JSON.parse(e.data); if (msg.type === 'full' || msg.type === 'diff') setState(msg.data); };
      ws.onclose = () => { setConnected(false); retriesRef.current++; if (retriesRef.current < MAX_RETRIES) { reconnectRef.current = setTimeout(connect, 3000); } else { setOffline(true); } };
      ws.onerror = () => ws.close();
    } catch { retriesRef.current++; if (retriesRef.current < MAX_RETRIES) { reconnectRef.current = setTimeout(connect, 3000); } else { setOffline(true); } }
  }, []);

  useEffect(() => {
    fetch(STATE_HTTP_URL).then(r => r.json()).then(d => setState(d)).catch(() => {});
    connect();
    const lucInterval = setInterval(() => {
      if (LUC_METRICS_URL) fetch(`${LUC_METRICS_URL}/metrics`).then(r => r.json()).then(d => setLucMetrics(d)).catch(() => {});
    }, 10000);
    return () => { clearTimeout(reconnectRef.current); wsRef.current?.close(); clearInterval(lucInterval); };
  }, [connect]);

  const agents = state?.agents || {};
  const services = state?.services || {};
  const metrics = state?.metrics || { total_revenue: 0, enrollment_count: 0, open_seats_tracked: 0 };
  const jobsLog = state?.jobs_log || [];
  const healthyCount = Object.values(services).filter(s => s.status === 'healthy').length;
  const totalServices = Object.keys(services).length;

  function getStatus(name: string) { return agents[name]?.status || 'idle'; }
  function getTask(name: string) { return agents[name]?.currentTask || '—'; }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Activity className="w-5 h-5 text-fg-tertiary" />
            <h1 className="text-2xl font-light tracking-tight">
              Operations <span className="font-bold">Floor</span>
            </h1>
          </div>
          <p className="label-mono">Real-time fleet monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          {connected ? (
            <div className="flex items-center gap-2 px-3 py-1.5 border border-signal-live">
              <Wifi className="w-3.5 h-3.5 text-signal-live" />
              <span className="font-mono text-[10px] font-bold text-signal-live">CONNECTED</span>
            </div>
          ) : (
            <div className={`flex items-center gap-2 px-3 py-1.5 border ${offline ? 'border-fg-ghost' : 'border-signal-error'}`}>
              <WifiOff className={`w-3.5 h-3.5 ${offline ? 'text-fg-ghost' : 'text-signal-error'}`} />
              <span className={`font-mono text-[10px] font-bold ${offline ? 'text-fg-ghost' : 'text-signal-error'}`}>{offline ? 'OFFLINE' : 'RECONNECTING'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-6 gap-px bg-border">
        {[
          { label: 'Revenue', value: `$${metrics.total_revenue.toFixed(2)}` },
          { label: 'Enrollments', value: metrics.enrollment_count },
          { label: 'Open Seats', value: metrics.open_seats_tracked },
          { label: 'Fleet', value: `${healthyCount}/${totalServices}` },
          { label: 'Tokens', value: lucMetrics ? (lucMetrics.total_tokens_in + lucMetrics.total_tokens_out).toLocaleString() : '—' },
          { label: 'Spend', value: lucMetrics ? `$${lucMetrics.daily_spend_usd.toFixed(4)}` : '—' },
        ].map(m => (
          <div key={m.label} className="bg-bg-surface p-4 text-center">
            <p className="text-lg font-mono font-bold">{m.value}</p>
            <p className="label-mono mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Command + PMO Grid */}
      <div className="grid grid-cols-3 gap-px bg-border">
        {/* Command Center */}
        <div className="bg-bg-surface p-5">
          <p className="label-mono mb-3">Command</p>
          {['ACHEEVY', 'Chicken Hawk'].map(name => {
            const s = statusInfo(getStatus(name));
            return (
              <div key={name} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <span className={`led ${s.color}`} />
                <span className="font-mono text-xs font-bold flex-1">{name}</span>
                <span className="font-mono text-[10px] text-fg-tertiary">{s.label}</span>
              </div>
            );
          })}
        </div>

        {/* PMO Offices */}
        {PMO_OFFICES.map(office => (
          <div key={office.id} className="bg-bg-surface p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="label-mono">{office.name}</p>
              <span className="font-mono text-[9px] text-fg-ghost">{office.id}</span>
            </div>

            {/* Supervisor */}
            <div className="flex items-center gap-2 py-1.5 mb-2 border-b border-border">
              <span className={`led ${statusInfo(getStatus(office.super)).color}`} />
              <span className="font-mono text-[11px] font-bold flex-1">{office.super}</span>
              <span className="font-mono text-[9px] text-fg-ghost">SUP</span>
            </div>

            {/* Managers */}
            {office.managers.map(name => {
              const s = statusInfo(getStatus(name));
              const task = getTask(name);
              return (
                <div key={name} className="flex items-center gap-2 py-1 group">
                  <span className={`led ${s.color}`} />
                  <span className="font-mono text-[10px] text-fg-secondary flex-1 truncate group-hover:text-fg transition-colors">
                    {name}
                  </span>
                  {task !== '—' && (
                    <span className="font-mono text-[9px] text-signal-info truncate max-w-[80px]">{task}</span>
                  )}
                </div>
              );
            })}

            {/* Hawks */}
            {office.hawks.length > 0 && (
              <div className="flex gap-1.5 mt-2 pt-2 border-t border-border">
                {office.hawks.map(h => (
                  <span key={h} className="font-mono text-[9px] text-fg-ghost px-1.5 py-0.5 border border-border">
                    {h}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Services + Activity */}
      <div className="grid grid-cols-2 gap-px bg-border">
        <div className="bg-bg-surface p-5">
          <p className="label-mono mb-3">Services ({totalServices})</p>
          <div className="space-y-0">
            {Object.entries(services).map(([name, svc]) => {
              const s = statusInfo(svc.status);
              return (
                <div key={name} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <span className={`led ${s.color}`} />
                  <span className="text-xs font-medium flex-1">{name}</span>
                  <span className="font-mono text-[10px] text-fg-tertiary">{s.label}</span>
                </div>
              );
            })}
            {totalServices === 0 && <p className="label-mono py-6 text-center">Waiting for data</p>}
          </div>
        </div>

        <div className="bg-bg-surface p-5">
          <p className="label-mono mb-3">Recent Activity</p>
          <div className="space-y-0 max-h-72 overflow-y-auto">
            {jobsLog.slice(-15).reverse().map((job, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <span className="font-mono text-[10px] font-bold w-20 shrink-0 truncate">{job.agent}</span>
                <span className="text-[11px] text-fg-secondary flex-1 truncate">{job.task}</span>
                <span className="font-mono text-[9px] text-fg-ghost shrink-0">
                  {new Date(job.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            {jobsLog.length === 0 && <p className="label-mono py-6 text-center">No activity</p>}
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      {lucMetrics && (
        <div className="grid grid-cols-2 gap-px bg-border">
          <div className="bg-bg-surface p-5">
            <p className="label-mono mb-3">Cost by Service</p>
            {Object.entries(lucMetrics.cost_by_service).map(([svc, cost]) => (
              <div key={svc} className="flex items-center justify-between py-1.5">
                <span className="text-xs text-fg-secondary">{svc}</span>
                <span className="font-mono text-xs font-bold">${cost.toFixed(4)}</span>
              </div>
            ))}
            {Object.keys(lucMetrics.cost_by_service).length === 0 && (
              <p className="label-mono py-4 text-center">No usage</p>
            )}
          </div>
          <div className="bg-bg-surface p-5">
            <p className="label-mono mb-3">Budget</p>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between font-mono text-[11px] mb-1.5">
                  <span className="text-fg-secondary">Daily spend</span>
                  <span className="font-bold">${lucMetrics.daily_spend_usd.toFixed(4)}</span>
                </div>
                <div className="h-1.5 bg-bg-elevated overflow-hidden">
                  <div className="h-full transition-all"
                    style={{
                      width: `${Math.min((lucMetrics.daily_spend_usd / lucMetrics.daily_budget_usd) * 100, 100)}%`,
                      background: lucMetrics.daily_spend_usd > lucMetrics.daily_budget_usd * 0.8 ? 'var(--signal-error)' : 'var(--signal-live)',
                    }} />
                </div>
                <p className="font-mono text-[10px] text-fg-ghost mt-1">
                  ${lucMetrics.daily_remaining_usd.toFixed(4)} remaining of ${lucMetrics.daily_budget_usd.toFixed(2)}
                </p>
              </div>
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-fg-secondary">Total events</span>
                <span className="font-bold">{lucMetrics.total_events}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
