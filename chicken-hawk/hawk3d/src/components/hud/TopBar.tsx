'use client';

import { useHawkStore } from '@/store/hawkStore';

interface TopBarProps {
  onToggleActivity: () => void;
}

export function TopBar({ onToggleActivity }: TopBarProps) {
  const { agents, gateway, viewMode, setViewMode, triggerJanitor, isJanitorActive } = useHawkStore();

  const activeAgents = agents.filter((a) => a.status !== 'idle' && a.status !== 'offline').length;
  const totalAgents = agents.length;

  return (
    <div className="absolute top-0 left-0 right-0 z-50 glass-card m-3 px-4 py-2 flex items-center justify-between">
      {/* Logo / Title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-hawk-gold flex items-center justify-center text-hawk-surface font-bold text-sm">
          H3
        </div>
        <div>
          <h1 className="text-hawk-gold font-bold text-sm tracking-wider">HAWK3D</h1>
          <p className="text-hawk-text-muted text-[10px]">Chicken-Hawk Ecosystem</p>
        </div>
      </div>

      {/* View mode tabs */}
      <div className="flex items-center gap-1 bg-hawk-surface/50 rounded-lg p-1">
        {(['office', 'topology', 'globe'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              viewMode === mode
                ? 'bg-hawk-gold text-hawk-surface'
                : 'text-hawk-text-muted hover:text-hawk-text'
            }`}
          >
            {mode === 'office' ? 'Office' : mode === 'topology' ? 'Topology' : 'Globe'}
          </button>
        ))}
      </div>

      {/* Status indicators */}
      <div className="flex items-center gap-4">
        {/* Gateway status */}
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              gateway.connected ? 'bg-green-400 hawk-pulse' : 'bg-red-400'
            }`}
          />
          <span className="text-xs text-hawk-text-muted">
            {gateway.connected ? 'Gateway Connected' : 'Gateway Offline'}
          </span>
        </div>

        {/* Agent count */}
        <div className="text-xs">
          <span className="text-hawk-gold font-bold">{activeAgents}</span>
          <span className="text-hawk-text-muted">/{totalAgents} active</span>
        </div>

        {/* Janitor button */}
        <button
          onClick={triggerJanitor}
          disabled={isJanitorActive}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
            isJanitorActive
              ? 'bg-blue-500/20 text-blue-400 cursor-not-allowed'
              : 'bg-hawk-surface-lighter/50 text-hawk-text-muted hover:text-hawk-gold hover:bg-hawk-surface-lighter'
          }`}
          title="Clean session context"
        >
          {isJanitorActive ? 'Sweeping...' : 'Clean Session'}
        </button>

        {/* Activity toggle */}
        <button
          onClick={onToggleActivity}
          className="px-3 py-1 rounded-md text-xs font-medium bg-hawk-surface-lighter/50 text-hawk-text-muted hover:text-hawk-gold hover:bg-hawk-surface-lighter transition-all"
        >
          Activity
        </button>
      </div>
    </div>
  );
}
