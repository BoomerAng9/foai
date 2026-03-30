'use client';

import { useState, useEffect, useCallback } from 'react';
import { Activity, RefreshCw, Users, MessageSquare, DollarSign, Database, Zap, Shield } from 'lucide-react';

interface AgentState { name: string; status: string; currentTask: string; }
interface ServiceState { url: string; status: string; http_code: number; }
interface BudgetState { starting: number; remaining: number; exhausted: boolean; }
interface TeamMember { email: string; role: string; is_active: boolean; }
interface JobLog { agent: string; task: string; status: string; timestamp: string; }

interface LiveState {
  agents: Record<string, AgentState>;
  services: Record<string, ServiceState>;
  metrics: {
    total_revenue: number;
    conversations: number;
    messages: number;
    active_users_24h: number;
    team_members: number;
    budget_remaining: number;
  };
  budget: BudgetState;
  team: TeamMember[];
  jobs_log: JobLog[];
  last_poll: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-signal-live',
  healthy: 'bg-signal-live',
  monitoring: 'bg-signal-info',
  idle: 'bg-fg-ghost',
  unhealthy: 'bg-signal-error',
};

const PMO_OFFICES = [
  { id: 'CMD', name: 'Command', agents: ['ACHEEVY', 'Chicken Hawk'], color: '#E8A020' },
  { id: 'OPS', name: 'Operations', agents: ['Scout_Ang', 'Edu_Ang'], color: '#3B82F6' },
  { id: 'ENG', name: 'Engineering', agents: ['Visual Engine', 'Money Engine'], color: '#22C55E' },
];

export default function OperationsFloor() {
  const [state, setState] = useState<LiveState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/live/state');
      if (!res.ok) {
        if (res.status === 403) { setError('Owner access required'); return; }
        throw new Error('Failed to load');
      }
      const data = await res.json();
      setState(data);
      setLastRefresh(new Date());
      setError('');
    } catch {
      setError('Failed to connect to state engine');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [fetchState]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Shield className="w-8 h-8 text-signal-error" />
        <p className="text-fg-secondary">{error}</p>
        <button onClick={fetchState} className="btn-bracket text-[10px]">RETRY</button>
      </div>
    );
  }

  if (!state) return null;

  const { agents, services, metrics, budget, team, jobs_log } = state;
  const healthyCount = Object.values(services).filter(s => s.status === 'healthy').length;
  const totalServices = Object.keys(services).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Activity className="w-5 h-5 text-accent" />
            <h1 className="text-2xl font-light tracking-tight">
              Live Look <span className="font-bold">In</span>
            </h1>
          </div>
          <p className="label-mono">Real-time platform monitoring — owner only</p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="font-mono text-[9px] text-fg-ghost">
              {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button onClick={fetchState} className="btn-bracket text-[10px] flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3" /> REFRESH
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 border border-signal-live">
            <span className="led bg-signal-live animate-pulse" />
            <span className="font-mono text-[10px] font-bold text-signal-live">LIVE</span>
          </div>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-px bg-border">
        {[
          { label: 'Budget', value: `$${metrics.budget_remaining.toFixed(2)}`, icon: DollarSign, color: metrics.budget_remaining > 10 ? 'text-signal-live' : metrics.budget_remaining > 3 ? 'text-signal-warn' : 'text-signal-error' },
          { label: 'Conversations', value: metrics.conversations, icon: MessageSquare, color: 'text-fg' },
          { label: 'Messages', value: metrics.messages.toLocaleString(), icon: Zap, color: 'text-fg' },
          { label: 'Active 24h', value: metrics.active_users_24h, icon: Users, color: 'text-fg' },
          { label: 'Team', value: metrics.team_members, icon: Users, color: 'text-fg' },
          { label: 'Services', value: `${healthyCount}/${totalServices}`, icon: Database, color: healthyCount === totalServices ? 'text-signal-live' : 'text-signal-warn' },
        ].map(m => (
          <div key={m.label} className="bg-bg-surface p-4 text-center">
            <m.icon className={`w-4 h-4 mx-auto mb-2 ${m.color}`} />
            <p className={`text-lg font-mono font-bold ${m.color}`}>{m.value}</p>
            <p className="label-mono mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Budget Bar */}
      <div className="bg-bg-surface p-4 border border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="label-mono">Platform Budget</span>
          <span className="font-mono text-xs font-bold">
            ${budget.remaining.toFixed(2)} / ${budget.starting.toFixed(2)}
          </span>
        </div>
        <div className="h-2 bg-bg-elevated overflow-hidden">
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${(budget.remaining / budget.starting) * 100}%`,
              background: budget.remaining > budget.starting * 0.5 ? 'var(--signal-live)' :
                         budget.remaining > budget.starting * 0.15 ? '#F59E0B' : 'var(--signal-error)',
            }}
          />
        </div>
        {budget.exhausted && (
          <p className="font-mono text-[10px] text-signal-error mt-2">BUDGET EXHAUSTED — All paid operations blocked</p>
        )}
      </div>

      {/* Agent Fleet + Services */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
        {PMO_OFFICES.map(office => (
          <div key={office.id} className="bg-bg-surface p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="label-mono">{office.name}</p>
              <span className="font-mono text-[9px] text-fg-ghost" style={{ color: office.color }}>{office.id}</span>
            </div>
            {office.agents.map(name => {
              const agent = agents[name];
              if (!agent) return null;
              const statusColor = STATUS_COLORS[agent.status] || 'bg-fg-ghost';
              return (
                <div key={name} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                  <span className={`led ${statusColor} mt-1 shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold">{name}</span>
                      <span className="font-mono text-[9px] text-fg-tertiary uppercase">{agent.status}</span>
                    </div>
                    <p className="font-mono text-[9px] text-fg-ghost truncate mt-0.5">{agent.currentTask}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Services + Activity + Team */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
        {/* Services */}
        <div className="bg-bg-surface p-5">
          <p className="label-mono mb-3">Services ({totalServices})</p>
          {Object.entries(services).map(([name, svc]) => {
            const color = STATUS_COLORS[svc.status] || 'bg-fg-ghost';
            return (
              <div key={name} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <span className={`led ${color}`} />
                <span className="text-xs font-medium flex-1">{name}</span>
                <span className="font-mono text-[10px] text-fg-tertiary">{svc.http_code}</span>
              </div>
            );
          })}
        </div>

        {/* Recent Activity */}
        <div className="bg-bg-surface p-5">
          <p className="label-mono mb-3">Recent Activity</p>
          <div className="space-y-0 max-h-72 overflow-y-auto">
            {jobs_log.length > 0 ? jobs_log.map((job, i) => (
              <div key={i} className="flex items-center gap-2 py-2 border-b border-border last:border-0">
                <span className="font-mono text-[10px] font-bold w-16 shrink-0 truncate text-accent">{job.agent}</span>
                <span className="text-[10px] text-fg-secondary flex-1 truncate">{job.task}</span>
                <span className="font-mono text-[9px] text-fg-ghost shrink-0">
                  {new Date(job.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )) : (
              <p className="label-mono py-6 text-center">No activity yet</p>
            )}
          </div>
        </div>

        {/* Team */}
        <div className="bg-bg-surface p-5">
          <p className="label-mono mb-3">Team ({team.length})</p>
          {team.length > 0 ? team.map((member, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
              <span className={`led ${member.is_active ? 'bg-signal-live' : 'bg-fg-ghost'}`} />
              <span className="text-xs flex-1 truncate">{member.email}</span>
              <span className="font-mono text-[9px] text-fg-tertiary uppercase">{member.role}</span>
            </div>
          )) : (
            <p className="label-mono py-6 text-center">No team members yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
