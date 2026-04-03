'use client';

import { motion } from 'framer-motion';
import type { AgentDispatch } from '@/lib/chat/types';
import { AGENT_ROSTER } from '@/lib/chat/types';

type Phase = AgentDispatch['phase'];

const PHASES: { key: Phase; label: string; icon: string }[] = [
  { key: 'receiving', label: 'RFP Received', icon: '◈' },
  { key: 'analyzing', label: 'Analysis', icon: '◉' },
  { key: 'proposing', label: 'Proposal', icon: '◊' },
  { key: 'building', label: 'Building', icon: '▣' },
  { key: 'verifying', label: 'Verification', icon: '◆' },
  { key: 'complete', label: 'BAMARAM', icon: '★' },
];

function phaseIndex(phase: Phase): number {
  return PHASES.findIndex(p => p.key === phase);
}

interface ProcessTrackerProps {
  dispatch: AgentDispatch;
  streamContent?: string;
}

export function ProcessTracker({ dispatch, streamContent }: ProcessTrackerProps) {
  const currentIdx = phaseIndex(dispatch.phase);

  return (
    <div className="bg-bg-surface border-b border-border p-4 sm:p-5">
      {/* Task summary */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-4 bg-accent" />
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-fg-secondary">
          Mission Tracker
        </span>
      </div>

      {dispatch.taskSummary && (
        <p className="font-mono text-[11px] text-fg mb-4 max-w-lg leading-relaxed">
          {dispatch.taskSummary}
        </p>
      )}

      {/* Phase progress bar */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto">
        {PHASES.map((phase, idx) => {
          const isActive = idx === currentIdx;
          const isDone = idx < currentIdx;
          const isFuture = idx > currentIdx;

          return (
            <div key={phase.key} className="flex items-center gap-1">
              <motion.div
                className={`
                  flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-wider
                  transition-colors duration-300 whitespace-nowrap
                  ${isActive ? 'bg-accent text-white' : ''}
                  ${isDone ? 'bg-fg/10 text-fg-secondary' : ''}
                  ${isFuture ? 'bg-bg-elevated text-fg-ghost border border-border' : ''}
                `}
                animate={isActive ? { scale: [1, 1.02, 1] } : {}}
                transition={isActive ? { duration: 1.5, repeat: Infinity } : {}}
              >
                <span className="text-[11px]">{phase.icon}</span>
                <span>{phase.label}</span>
                {isDone && <span className="text-signal-success ml-0.5">✓</span>}
              </motion.div>
              {idx < PHASES.length - 1 && (
                <div className={`w-3 h-[1px] ${isDone ? 'bg-fg/20' : 'bg-border'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Active agents */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="font-mono text-[9px] text-fg-ghost uppercase tracking-wider">Active:</span>
        {dispatch.agents.map(agentKey => {
          const agent = AGENT_ROSTER[agentKey as keyof typeof AGENT_ROSTER];
          if (!agent) return null;
          return (
            <div key={agentKey} className="flex items-center gap-1.5">
              <motion.div
                className="w-2 h-2 rounded-full"
                style={{ background: agent.color }}
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className="font-mono text-[10px] text-fg-secondary font-medium">
                {agent.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Live stream preview */}
      {streamContent && dispatch.phase === 'building' && (
        <div className="mt-3 p-2 bg-bg-elevated border border-border max-h-[60px] overflow-hidden">
          <p className="font-mono text-[10px] text-fg-tertiary leading-relaxed line-clamp-2">
            {streamContent.slice(-200)}
          </p>
        </div>
      )}
    </div>
  );
}
