'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Activity, RefreshCw, ChevronDown, ChevronRight, Zap, Clock, Shield } from 'lucide-react';
import { BoomerangLoader } from '@/components/branding/BoomerangLoader';
import type { AgentProfile, Department } from '@/lib/agents/registry';

interface AgentState extends AgentProfile {
  status: string;
  currentTask: string;
  lastActive: string | null;
}

interface AgentData {
  departments: Department[];
  agents: AgentState[];
  activity: Array<{ agent: string; action: string; target: string; message: string; timestamp: string }>;
  tasks: Array<{ agent: string; task: string; status: string; started_at: string }>;
  budget: { remaining: number; starting: number; exhausted: boolean };
  meta: { isOwner: boolean; tier: string; totalAgents: number; visibleAgents: number };
}

const STATUS_CONFIG: Record<string, { color: string; label: string; pulse: boolean }> = {
  active: { color: '#22C55E', label: 'ACTIVE', pulse: true },
  monitoring: { color: '#3B82F6', label: 'WATCHING', pulse: true },
  busy: { color: '#F59E0B', label: 'BUSY', pulse: true },
  idle: { color: '#6B7280', label: 'IDLE', pulse: false },
  offline: { color: '#374151', label: 'OFFLINE', pulse: false },
};

function AgentCard({ agent, onClick }: { agent: AgentState; onClick: () => void }) {
  const status = STATUS_CONFIG[agent.status] || STATUS_CONFIG.idle;
  return (
    <button
      id={agent.id}
      onClick={onClick}
      className="w-full text-left bg-bg border border-border hover:border-fg-ghost transition-all p-4 group"
    >
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={agent.avatar} alt="" className="w-10 h-10 rounded-full object-contain bg-bg-elevated border border-border shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-fg truncate">{agent.name}</span>
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${status.pulse ? 'animate-pulse' : ''}`}
              style={{ background: status.color }}
            />
          </div>
          <p className="font-mono text-[10px] text-fg-tertiary">{agent.role}</p>
          <p className="text-[10px] text-fg-ghost mt-1 truncate">{agent.currentTask}</p>
        </div>
        <div className="shrink-0">
          <span className="font-mono text-[8px] px-1.5 py-0.5 border border-border" style={{ color: status.color }}>
            {status.label}
          </span>
        </div>
      </div>
      {agent.capabilities.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {agent.capabilities.slice(0, 3).map(c => (
            <span key={c} className="font-mono text-[8px] text-fg-ghost px-1.5 py-0.5 bg-bg-elevated">
              {c}
            </span>
          ))}
          {agent.capabilities.length > 3 && (
            <span className="font-mono text-[8px] text-fg-ghost px-1.5 py-0.5 bg-bg-elevated">
              +{agent.capabilities.length - 3}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

function DepartmentSection({
  department,
  agents,
  expanded,
  onToggle,
  onAgentClick,
}: {
  department: Department;
  agents: AgentState[];
  expanded: boolean;
  onToggle: () => void;
  onAgentClick: (agent: AgentState) => void;
}) {
  const activeCount = agents.filter(a => a.status === 'active' || a.status === 'monitoring' || a.status === 'busy').length;

  return (
    <div className="border border-border">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 bg-bg-surface hover:bg-bg-elevated transition-colors"
      >
        <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: department.color }} />
        {expanded ? <ChevronDown className="w-3.5 h-3.5 text-fg-tertiary" /> : <ChevronRight className="w-3.5 h-3.5 text-fg-tertiary" />}
        <div className="flex-1 text-left">
          <span className="font-mono text-[11px] font-bold tracking-wide">{department.name}</span>
          <span className="font-mono text-[9px] text-fg-ghost ml-2">{department.id}</span>
        </div>
        <span className="font-mono text-[10px] text-fg-tertiary">{activeCount}/{agents.length} active</span>
      </button>

      {expanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border p-px">
          {agents.map(agent => (
            <AgentCard key={agent.id} agent={agent} onClick={() => onAgentClick(agent)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityFeed({ activity }: { activity: AgentData['activity'] }) {
  return (
    <div className="border border-border bg-bg-surface">
      <div className="p-3 border-b border-border">
        <p className="label-mono">Live Activity</p>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {activity.length > 0 ? activity.map((item, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-2 border-b border-border last:border-0">
            <Zap className="w-3 h-3 text-accent shrink-0" />
            <span className="font-mono text-[10px] font-bold text-accent w-20 truncate">{item.agent}</span>
            <span className="text-[10px] text-fg-secondary flex-1 truncate">{item.message}</span>
            <span className="font-mono text-[9px] text-fg-ghost shrink-0">
              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )) : (
          <p className="text-center text-[10px] text-fg-ghost py-8">No recent activity</p>
        )}
      </div>
    </div>
  );
}

function AgentDetail({ agent, onClose }: { agent: AgentState; onClose: () => void }) {
  const status = STATUS_CONFIG[agent.status] || STATUS_CONFIG.idle;
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-bg-surface border border-border max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-4 mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={agent.avatar} alt="" className="w-16 h-16 rounded-full object-contain bg-bg-elevated border border-border" />
          <div>
            <h2 className="font-mono text-lg font-bold">{agent.name}</h2>
            <p className="font-mono text-xs text-fg-tertiary">{agent.role}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full" style={{ background: status.color }} />
              <span className="font-mono text-[10px]" style={{ color: status.color }}>{status.label}</span>
            </div>
          </div>
        </div>

        <p className="text-sm text-fg-secondary italic mb-4">&ldquo;{agent.persona}&rdquo;</p>

        <div className="mb-4">
          <p className="label-mono mb-2">Current Task</p>
          <p className="text-sm text-fg-secondary">{agent.currentTask}</p>
        </div>

        <div className="mb-4">
          <p className="label-mono mb-2">Capabilities</p>
          <div className="flex flex-wrap gap-1.5">
            {agent.capabilities.map(c => (
              <span key={c} className="font-mono text-[10px] text-fg-secondary px-2 py-1 bg-bg-elevated border border-border">
                {c}
              </span>
            ))}
          </div>
        </div>

        {agent.mcpToolName && (
          <div className="mb-4">
            <p className="label-mono mb-2">MCP Tool</p>
            <code className="text-[11px] text-accent bg-bg-elevated px-2 py-1 border border-border">{agent.mcpToolName}</code>
          </div>
        )}

        <div className="flex items-center justify-between text-[10px] text-fg-ghost">
          <span>Tier: {agent.subscriptionTier}</span>
          <span>Dept: {agent.department}</span>
          {agent.lastActive && <span>Last: {new Date(agent.lastActive).toLocaleTimeString()}</span>}
        </div>

        <div className="flex gap-2 mt-4">
          {agent.hireable && agent.individualPrice && (
            <a
              href={`/billing?hire=${agent.id}&price=${agent.individualPrice}`}
              className="flex-1 h-10 bg-accent text-bg font-mono text-[10px] font-bold flex items-center justify-center gap-1.5 hover:bg-accent/90 transition-colors"
            >
              HIRE — ${agent.individualPrice}/mo
            </a>
          )}
          <button onClick={onClose} className={`${agent.hireable ? 'flex-1' : 'w-full'} btn-bracket text-[10px] h-10 text-center`}>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AgentHQ() {
  const [data, setData] = useState<AgentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set(['CMD', 'RESEARCH', 'CONTENT', 'SALES']));
  const [selectedAgent, setSelectedAgent] = useState<AgentState | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/agents');
      if (!res.ok) return;
      const d = await res.json();
      setData(d);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <BoomerangLoader layout="inline" size="lg" className="h-64" label="Loading..." />
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Shield className="w-8 h-8 text-signal-error" />
        <p className="text-fg-secondary">Failed to load agent data</p>
        <button onClick={fetchData} className="btn-bracket text-[10px]">RETRY</button>
      </div>
    );
  }

  const toggleDept = (id: string) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const agentsByDept = new Map<string, AgentState[]>();
  data.agents.forEach(a => {
    const list = agentsByDept.get(a.department) || [];
    list.push(a);
    agentsByDept.set(a.department, list);
  });

  const activeCount = data.agents.filter(a => a.status === 'active' || a.status === 'monitoring').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Users className="w-5 h-5 text-accent" />
            <h1 className="text-2xl font-light tracking-tight">
              Agent <span className="font-bold">HQ</span>
            </h1>
          </div>
          <p className="label-mono">
            {data.meta.visibleAgents} agents across {data.departments.length} departments
            {!data.meta.isOwner && <span className="text-fg-ghost"> · {data.meta.tier} tier</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-mono text-[10px]">
            <Activity className="w-3.5 h-3.5 text-signal-live" />
            <span className="text-signal-live font-bold">{activeCount} active</span>
          </div>
          <button onClick={fetchData} className="btn-bracket text-[10px] flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3" /> REFRESH
          </button>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border">
        <div className="bg-bg-surface p-4 text-center">
          <p className="text-lg font-mono font-bold text-fg">{data.meta.visibleAgents}</p>
          <p className="label-mono mt-1">Agents</p>
        </div>
        <div className="bg-bg-surface p-4 text-center">
          <p className="text-lg font-mono font-bold text-signal-live">{activeCount}</p>
          <p className="label-mono mt-1">Active</p>
        </div>
        <div className="bg-bg-surface p-4 text-center">
          <p className="text-lg font-mono font-bold">{data.departments.length}</p>
          <p className="label-mono mt-1">Departments</p>
        </div>
        <div className="bg-bg-surface p-4 text-center">
          <p className={`text-lg font-mono font-bold ${data.budget.remaining > 10 ? 'text-signal-live' : data.budget.remaining > 3 ? 'text-signal-warn' : 'text-signal-error'}`}>
            ${data.budget.remaining.toFixed(2)}
          </p>
          <p className="label-mono mt-1">Budget</p>
        </div>
      </div>

      {/* Departments + Agents */}
      <div className="space-y-3">
        {data.departments.map(dept => {
          const deptAgents = agentsByDept.get(dept.id) || [];
          if (deptAgents.length === 0) return null;
          return (
            <DepartmentSection
              key={dept.id}
              department={dept}
              agents={deptAgents}
              expanded={expandedDepts.has(dept.id)}
              onToggle={() => toggleDept(dept.id)}
              onAgentClick={setSelectedAgent}
            />
          );
        })}
      </div>

      {/* Activity Feed */}
      <ActivityFeed activity={data.activity} />

      {/* Audit Trail Note */}
      <div className="flex items-center gap-2 px-3 py-2 border border-border bg-bg-surface">
        <Clock className="w-3.5 h-3.5 text-fg-ghost" />
        <p className="font-mono text-[9px] text-fg-ghost">
          All agent activity is logged and auditable. Trace IDs attached to every action.
        </p>
      </div>

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <AgentDetail agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
      )}
    </div>
  );
}
