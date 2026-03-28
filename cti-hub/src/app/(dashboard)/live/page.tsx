'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, Wifi, WifiOff, Bot, Zap, Clock } from 'lucide-react';

const STATE_ENGINE_URL = 'wss://live-look-in-state-939270059361.us-central1.run.app/ws';
const STATE_HTTP_URL = 'https://live-look-in-state-939270059361.us-central1.run.app/state';

interface AgentState {
  name: string;
  status: string;
  currentTask?: string;
  lastUpdated?: string;
  room?: string;
  department?: string;
  color?: string;
}

interface ServiceState {
  url: string;
  status: string;
  http_code: number | null;
}

interface WorldState {
  agents: Record<string, AgentState>;
  services: Record<string, ServiceState>;
  metrics: {
    total_revenue: number;
    enrollment_count: number;
    open_seats_tracked: number;
  };
  jobs_log: Array<{
    agent: string;
    task: string;
    status: string;
    timestamp: string;
  }>;
  last_poll: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  healthy: '#22c55e',
  online: '#22c55e',
  active: '#3b82f6',
  monitoring: '#3b82f6',
  directive_received: '#f59e0b',
  unhealthy: '#ef4444',
  unreachable: '#ef4444',
  offline: '#6b7280',
  no_data: '#6b7280',
};

function statusColor(status: string) {
  return STATUS_COLORS[status] || '#6b7280';
}

export default function LiveLookIn() {
  const [state, setState] = useState<WorldState | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(STATE_ENGINE_URL);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'full' || msg.type === 'diff') {
          setState(msg.data);
        }
      };
      ws.onclose = () => {
        setConnected(false);
        reconnectRef.current = setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();
    } catch {
      reconnectRef.current = setTimeout(connect, 3000);
    }
  }, []);

  useEffect(() => {
    // Try HTTP first for initial state, then connect WS
    fetch(STATE_HTTP_URL)
      .then(r => r.json())
      .then(data => setState(data))
      .catch(() => {});
    connect();
    return () => {
      clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const agents = state?.agents || {};
  const services = state?.services || {};
  const metrics = state?.metrics || { total_revenue: 0, enrollment_count: 0, open_seats_tracked: 0 };
  const jobsLog = state?.jobs_log || [];
  const healthyCount = Object.values(services).filter(s => s.status === 'healthy').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#00A3FF]/10 flex items-center justify-center text-[#00A3FF]">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Live Look In</h1>
            <p className="text-sm text-slate-500">Real-time agent fleet and service status</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {connected ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-bold text-emerald-700">LIVE</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200">
              <WifiOff className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs font-bold text-red-600">RECONNECTING</span>
            </div>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Revenue', value: `$${metrics.total_revenue.toFixed(2)}` },
          { label: 'Enrollments', value: metrics.enrollment_count },
          { label: 'Open Seats', value: metrics.open_seats_tracked },
          { label: 'Fleet Health', value: `${healthyCount}/${Object.keys(services).length}` },
        ].map(m => (
          <div key={m.label} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{m.value}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Agents */}
        <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Agents ({Object.keys(agents).length})</h2>
          <div className="space-y-2">
            {Object.entries(agents).map(([name, agent]) => (
              <div key={name} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full animate-pulse"
                    style={{ backgroundColor: statusColor(agent.status) }}
                  />
                  <Bot className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900">{name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{agent.currentTask || 'idle'}</p>
                </div>
                <span
                  className="text-[9px] font-bold uppercase px-2 py-1 rounded-lg"
                  style={{
                    backgroundColor: statusColor(agent.status) + '15',
                    color: statusColor(agent.status),
                  }}
                >
                  {agent.status}
                </span>
              </div>
            ))}
            {Object.keys(agents).length === 0 && (
              <p className="text-xs text-slate-400 text-center py-8">Waiting for agent data...</p>
            )}
          </div>
        </div>

        {/* Services */}
        <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Services ({Object.keys(services).length})</h2>
          <div className="space-y-2">
            {Object.entries(services).map(([name, svc]) => (
              <div key={name} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: statusColor(svc.status) }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900">{name}</p>
                  <p className="text-[10px] text-slate-500 font-mono truncate">{svc.url}</p>
                </div>
                <span
                  className="text-[9px] font-bold uppercase px-2 py-1 rounded-lg"
                  style={{
                    backgroundColor: statusColor(svc.status) + '15',
                    color: statusColor(svc.status),
                  }}
                >
                  {svc.status}
                </span>
              </div>
            ))}
            {Object.keys(services).length === 0 && (
              <p className="text-xs text-slate-400 text-center py-8">Waiting for service data...</p>
            )}
          </div>
        </div>
      </div>

      {/* Jobs Log */}
      <div>
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Recent Jobs</h2>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {jobsLog.length > 0 ? (
            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {jobsLog.slice(-20).reverse().map((job, i) => (
                <div key={i} className="px-4 py-3 flex items-center gap-3">
                  <Zap className="w-3.5 h-3.5 text-[#00A3FF] shrink-0" />
                  <span className="text-xs font-bold text-slate-900 w-24 shrink-0">{job.agent}</span>
                  <span className="text-xs text-slate-500 flex-1 truncate">{job.task}</span>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(job.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-8">No jobs recorded yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
