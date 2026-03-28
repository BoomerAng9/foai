'use client';

import { useHawkStore } from '@/store/hawkStore';
import { GOVERNANCE_CHAIN } from '@/lib/constants';

export function HUDOverlay() {
  const { agents, gateway } = useHawkStore();

  const activeAgents = agents.filter((a) => a.status !== 'idle' && a.status !== 'offline');
  const totalTasks = agents.reduce((sum, a) => sum + a.tasksCompleted, 0);
  const workingAgents = agents.filter((a) => a.status === 'working');
  const learningAgents = agents.filter((a) => a.status === 'learning');

  return (
    <div className="absolute bottom-4 left-4 z-40 space-y-3">
      {/* Fleet Status Card */}
      <div className="glass-card p-3 w-64">
        <h3 className="text-hawk-gold text-xs font-bold tracking-wider mb-2">FLEET STATUS</h3>
        <div className="grid grid-cols-2 gap-2">
          <StatBox label="Active" value={activeAgents.length.toString()} color="text-green-400" />
          <StatBox label="Working" value={workingAgents.length.toString()} color="text-hawk-gold" />
          <StatBox label="Learning" value={learningAgents.length.toString()} color="text-cyan-400" />
          <StatBox label="Tasks Done" value={totalTasks.toString()} color="text-purple-400" />
        </div>
      </div>

      {/* Governance Chain */}
      <div className="glass-card p-3 w-64">
        <h3 className="text-hawk-gold text-xs font-bold tracking-wider mb-2">GOVERNANCE CHAIN</h3>
        <div className="flex flex-wrap items-center gap-1">
          {GOVERNANCE_CHAIN.map((node, i) => (
            <span key={node} className="flex items-center">
              <span className="text-[10px] text-hawk-text px-1.5 py-0.5 bg-hawk-surface-lighter rounded">
                {node}
              </span>
              {i < GOVERNANCE_CHAIN.length - 1 && (
                <span className="text-hawk-gold text-[10px] mx-0.5">→</span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* VPS Status */}
      <div className="glass-card p-3 w-64">
        <h3 className="text-hawk-gold text-xs font-bold tracking-wider mb-2">INFRASTRUCTURE</h3>
        <div className="space-y-1">
          <VPSRow
            label="VPS-1 Gateway"
            status={gateway.vps1Status}
          />
          <VPSRow
            label="VPS-2 Fleet"
            status={gateway.vps2Status}
          />
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-hawk-text-muted">Tailscale</span>
            <span className={gateway.tailscaleConnected ? 'text-green-400' : 'text-red-400'}>
              {gateway.tailscaleConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-hawk-surface/60 rounded-md p-2">
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-hawk-text-muted">{label}</div>
    </div>
  );
}

function VPSRow({ label, status }: { label: string; status: string }) {
  const statusColor = status === 'online' ? 'text-green-400' : status === 'connecting' ? 'text-yellow-400' : 'text-red-400';
  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="text-hawk-text-muted">{label}</span>
      <span className={`${statusColor} font-medium`}>{status.toUpperCase()}</span>
    </div>
  );
}
