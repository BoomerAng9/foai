'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Wifi, WifiOff, Zap, Clock, Activity, Coins, Server, Users } from 'lucide-react';

const STATE_ENGINE_URL = 'wss://live-look-in-state-939270059361.us-central1.run.app/ws';
const STATE_HTTP_URL = 'https://live-look-in-state-939270059361.us-central1.run.app/state';
const LUC_METRICS_URL = process.env.NEXT_PUBLIC_LUC_URL || '';

interface AgentState {
  name: string;
  status: string;
  currentTask?: string;
  lastUpdated?: string;
}

interface ServiceState {
  url: string;
  status: string;
  http_code: number | null;
}

interface WorldState {
  agents: Record<string, AgentState>;
  services: Record<string, ServiceState>;
  metrics: { total_revenue: number; enrollment_count: number; open_seats_tracked: number };
  jobs_log: Array<{ agent: string; task: string; status: string; timestamp: string }>;
  last_poll: string | null;
}

interface LucMetrics {
  total_spend_usd: number;
  daily_spend_usd: number;
  daily_budget_usd: number;
  daily_remaining_usd: number;
  total_events: number;
  total_tokens_in: number;
  total_tokens_out: number;
  cost_by_model: Record<string, number>;
  cost_by_service: Record<string, number>;
}

const STATUS_COLORS: Record<string, string> = {
  healthy: '#22c55e', online: '#22c55e', active: '#3b82f6', monitoring: '#3b82f6',
  directive_received: '#f59e0b', unhealthy: '#ef4444', unreachable: '#ef4444',
  offline: '#6b7280', no_data: '#6b7280',
};

function statusColor(s: string) { return STATUS_COLORS[s] || '#6b7280'; }

// PMO Department layout
const DEPARTMENTS = [
  { id: 'PMO-ECHO', name: 'Engineering', agents: ['API_Ang', 'UI_Ang', 'SME_Ang', 'Flow_Ang', 'Design_Ang', 'Content_Ang'], hawks: ['Lil_TRAE_Hawk', 'Lil_Coding_Hawk', 'Lil_Viz_Hawk', 'Lil_Blend_Hawk'], color: '#3b82f6' },
  { id: 'PMO-PULSE', name: 'Data Ops', agents: ['Data_Ang', 'Scout_Ang'], hawks: ['Lil_Agent_Hawk', 'Lil_Deep_Hawk'], color: '#22c55e' },
  { id: 'PMO-LAUNCH', name: 'Deployment', agents: ['Deploy_Ang', 'Edu_Ang', 'Biz_Ang'], hawks: ['Lil_Flow_Hawk', 'Lil_Back_Hawk'], color: '#f59e0b' },
  { id: 'PMO-LENS', name: 'QA & Review', agents: ['QA_Ang'], hawks: ['Lil_Deep_Hawk'], color: '#a855f7' },
  { id: 'PMO-SHIELD', name: 'Security', agents: ['Crypt_Ang'], hawks: ['Lil_Sand_Hawk'], color: '#ef4444' },
];

const COMMAND = { name: 'Command', members: ['ACHEEVY', 'Chicken Hawk', 'Hermes'], color: '#00A3FF' };

export default function OperationsFloor() {
  const [state, setState] = useState<WorldState | null>(null);
  const [lucMetrics, setLucMetrics] = useState<LucMetrics | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(STATE_ENGINE_URL);
      wsRef.current = ws;
      ws.onopen = () => setConnected(true);
      ws.onmessage = (e) => { const msg = JSON.parse(e.data); if (msg.type === 'full' || msg.type === 'diff') setState(msg.data); };
      ws.onclose = () => { setConnected(false); reconnectRef.current = setTimeout(connect, 3000); };
      ws.onerror = () => ws.close();
    } catch { reconnectRef.current = setTimeout(connect, 3000); }
  }, []);

  useEffect(() => {
    fetch(STATE_HTTP_URL).then(r => r.json()).then(d => setState(d)).catch(() => {});
    connect();
    // Poll LUC metrics
    const lucInterval = setInterval(() => {
      if (LUC_METRICS_URL) {
        fetch(`${LUC_METRICS_URL}/metrics`).then(r => r.json()).then(d => setLucMetrics(d)).catch(() => {});
      }
    }, 10000);
    return () => { clearTimeout(reconnectRef.current); wsRef.current?.close(); clearInterval(lucInterval); };
  }, [connect]);

  const agents = state?.agents || {};
  const services = state?.services || {};
  const metrics = state?.metrics || { total_revenue: 0, enrollment_count: 0, open_seats_tracked: 0 };
  const jobsLog = state?.jobs_log || [];
  const healthyCount = Object.values(services).filter(s => s.status === 'healthy').length;
  const totalServices = Object.keys(services).length;

  function getAgentStatus(name: string): string {
    return agents[name]?.status || 'idle';
  }

  function getAgentTask(name: string): string {
    return agents[name]?.currentTask || 'Standing by';
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#00A3FF]/10 flex items-center justify-center text-[#00A3FF]">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Operations Floor</h1>
            <p className="text-sm text-slate-500">Real-time agent fleet, services, and cost tracking</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
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

      {/* Top Metrics Row */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { label: 'Revenue', value: `$${metrics.total_revenue.toFixed(2)}` },
          { label: 'Enrollments', value: metrics.enrollment_count },
          { label: 'Open Seats', value: metrics.open_seats_tracked },
          { label: 'Fleet', value: `${healthyCount}/${totalServices}` },
          { label: 'Tokens Today', value: lucMetrics ? (lucMetrics.total_tokens_in + lucMetrics.total_tokens_out).toLocaleString() : '—' },
          { label: 'Spend Today', value: lucMetrics ? `$${lucMetrics.daily_spend_usd.toFixed(4)}` : '—' },
        ].map(m => (
          <div key={m.label} className="bg-white border border-slate-200 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-slate-900">{m.value}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Floor Plan */}
      <div className="grid grid-cols-3 gap-4">
        {/* Command Center */}
        <div className="bg-white border-2 border-[#00A3FF]/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: COMMAND.color }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: COMMAND.color }}>Command</span>
          </div>
          <div className="space-y-2">
            {COMMAND.members.map(name => {
              const status = getAgentStatus(name);
              return (
                <div key={name} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                  <div className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[8px] font-black">
                    {name === 'ACHEEVY' ? 'A' : name === 'Chicken Hawk' ? 'CH' : 'H'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-900 truncate">{name}</p>
                    <p className="text-[9px] text-slate-500 truncate">{getAgentTask(name)}</p>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor(status) }} />
                </div>
              );
            })}
          </div>
        </div>

        {/* PMO Departments */}
        {DEPARTMENTS.map(dept => (
          <div key={dept.id} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dept.color }} />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: dept.color }}>{dept.name}</span>
              <span className="text-[9px] text-slate-400 ml-auto">{dept.id}</span>
            </div>

            {/* Boomer_Angs */}
            <div className="space-y-1.5 mb-3">
              {dept.agents.map(name => {
                const status = getAgentStatus(name);
                const isActive = status === 'active' || status === 'monitoring';
                return (
                  <div key={name} className={`flex items-center gap-2 p-1.5 rounded-lg transition-all ${isActive ? 'bg-blue-50 border border-blue-100' : 'hover:bg-slate-50'}`}>
                    <span className="text-[10px]">🪃</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-slate-800 truncate">{name}</p>
                      {isActive && <p className="text-[8px] text-blue-600 truncate">{getAgentTask(name)}</p>}
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: statusColor(status) }} />
                  </div>
                );
              })}
            </div>

            {/* Lil_Hawks */}
            {dept.hawks.length > 0 && (
              <div className="border-t border-slate-100 pt-2">
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Hawks</p>
                <div className="flex flex-wrap gap-1">
                  {dept.hawks.map(hawk => (
                    <span key={hawk} className="text-[8px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">
                      {hawk.replace('Lil_', '').replace('_Hawk', '')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Services */}
        <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Server className="w-3.5 h-3.5" /> Services ({totalServices})
          </h2>
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
            {Object.entries(services).map(([name, svc]) => (
              <div key={name} className="flex items-center gap-3 px-4 py-2.5">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: statusColor(svc.status) }} />
                <span className="text-xs font-bold text-slate-800 flex-1">{name}</span>
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: statusColor(svc.status) + '15', color: statusColor(svc.status) }}>
                  {svc.status}
                </span>
              </div>
            ))}
            {totalServices === 0 && <p className="text-xs text-slate-400 text-center py-6">Waiting for data...</p>}
          </div>
        </div>

        {/* Jobs Log */}
        <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" /> Recent Activity
          </h2>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {jobsLog.length > 0 ? (
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {jobsLog.slice(-15).reverse().map((job, i) => (
                  <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                    <span className="text-[10px]">🪃</span>
                    <span className="text-[10px] font-bold text-slate-800 w-20 shrink-0 truncate">{job.agent}</span>
                    <span className="text-[10px] text-slate-500 flex-1 truncate">{job.task}</span>
                    <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1 shrink-0">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(job.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">No activity yet</p>
            )}
          </div>
        </div>
      </div>

      {/* LUC Cost Breakdown */}
      {lucMetrics && (
        <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Coins className="w-3.5 h-3.5" /> Cost Breakdown
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">By Service</p>
              <div className="space-y-2">
                {Object.entries(lucMetrics.cost_by_service).map(([svc, cost]) => (
                  <div key={svc} className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">{svc}</span>
                    <span className="text-xs font-mono font-bold text-slate-900">${cost.toFixed(4)}</span>
                  </div>
                ))}
                {Object.keys(lucMetrics.cost_by_service).length === 0 && (
                  <p className="text-[10px] text-slate-400">No usage recorded</p>
                )}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Budget</p>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-slate-500">Daily spend</span>
                    <span className="font-bold text-slate-900">${lucMetrics.daily_spend_usd.toFixed(4)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min((lucMetrics.daily_spend_usd / lucMetrics.daily_budget_usd) * 100, 100)}%`,
                        backgroundColor: lucMetrics.daily_spend_usd > lucMetrics.daily_budget_usd * 0.8 ? '#ef4444' : '#22c55e',
                      }} />
                  </div>
                  <p className="text-[9px] text-slate-400 mt-1">${lucMetrics.daily_remaining_usd.toFixed(4)} remaining of ${lucMetrics.daily_budget_usd.toFixed(2)} budget</p>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Total events</span>
                  <span className="font-bold text-slate-900">{lucMetrics.total_events}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
