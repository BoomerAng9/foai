'use client';

import { useHawkStore } from '@/store/hawkStore';
import { STATUS_COLORS, ROOM_LABELS } from '@/lib/constants';

export function AgentPanel() {
  const { agents, selectedAgent, selectAgent } = useHawkStore();
  const agent = agents.find((a) => a.id === selectedAgent);

  if (!agent) return null;

  const statusColor = STATUS_COLORS[agent.status] || '#8892B0';

  return (
    <div className="absolute top-16 right-4 z-40 w-80 glass-card p-4 max-h-[calc(100vh-120px)] overflow-y-auto">
      {/* Close button */}
      <button
        onClick={() => selectAgent(null)}
        className="absolute top-3 right-3 text-hawk-text-muted hover:text-hawk-text text-sm"
      >
        x
      </button>

      {/* Agent header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
          style={{ backgroundColor: agent.color }}
        >
          {agent.displayName.slice(0, 2)}
        </div>
        <div>
          <h2 className="text-hawk-text font-bold">{agent.name}</h2>
          <p className="text-hawk-text-muted text-xs">{agent.backend}</p>
        </div>
      </div>

      {/* Status badge */}
      <div className="mb-4">
        <span
          className="px-2 py-1 rounded-full text-xs font-medium"
          style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
        >
          {agent.status.toUpperCase()}
        </span>
      </div>

      {/* Info rows */}
      <div className="space-y-3 mb-4">
        <InfoRow label="Role" value={agent.role} />
        <InfoRow label="Model" value={agent.model} />
        <InfoRow label="Room" value={ROOM_LABELS[agent.currentRoom] || agent.currentRoom} />
        {agent.currentTask && (
          <div>
            <div className="text-hawk-text-muted text-[10px] uppercase tracking-wider mb-1">Current Task</div>
            <div className="text-hawk-text text-xs bg-hawk-surface/60 rounded-md p-2">
              {agent.currentTask}
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="border-t border-hawk-gold/10 pt-3">
        <h3 className="text-hawk-gold text-xs font-bold tracking-wider mb-2">STATS</h3>
        <div className="grid grid-cols-2 gap-2">
          <StatCell label="Tasks Done" value={agent.tasksCompleted.toString()} />
          <StatCell label="Tokens Used" value={formatTokens(agent.tokensUsed)} />
        </div>
      </div>

      {/* Description */}
      <div className="border-t border-hawk-gold/10 pt-3 mt-3">
        <h3 className="text-hawk-gold text-xs font-bold tracking-wider mb-2">DESCRIPTION</h3>
        <p className="text-hawk-text-muted text-xs leading-relaxed">{agent.description}</p>
      </div>

      {/* Quick actions */}
      <div className="border-t border-hawk-gold/10 pt-3 mt-3 space-y-2">
        <h3 className="text-hawk-gold text-xs font-bold tracking-wider mb-2">ACTIONS</h3>
        <button className="w-full px-3 py-2 bg-hawk-surface-lighter/50 hover:bg-hawk-surface-lighter text-hawk-text text-xs rounded-md transition-all">
          Send Task
        </button>
        <button className="w-full px-3 py-2 bg-hawk-surface-lighter/50 hover:bg-hawk-surface-lighter text-hawk-text text-xs rounded-md transition-all">
          View Logs
        </button>
        <button className="w-full px-3 py-2 bg-hawk-accent/10 hover:bg-hawk-accent/20 text-hawk-accent text-xs rounded-md transition-all">
          Reset Agent
        </button>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-hawk-text-muted text-xs">{label}</span>
      <span className="text-hawk-text text-xs font-medium">{value}</span>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-hawk-surface/60 rounded-md p-2 text-center">
      <div className="text-hawk-gold text-sm font-bold">{value}</div>
      <div className="text-[10px] text-hawk-text-muted">{label}</div>
    </div>
  );
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return tokens.toString();
}
