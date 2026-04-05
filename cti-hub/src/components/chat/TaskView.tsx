'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { AgentAssembly } from './AgentAssembly';
import { ProcessTracker } from './ProcessTracker';
import type { AgentTier, AgentDispatch } from '@/lib/chat/types';
import { AGENT_ROSTER } from '@/lib/chat/types';

interface TaskViewProps {
  tier: AgentTier;
  agents: string[];
  taskSummary: string;
  streamContent: string;
  onDismiss: () => void;
}

export function TaskView({ tier, agents, taskSummary, streamContent, onDismiss }: TaskViewProps) {
  const [assemblyDone, setAssemblyDone] = useState(false);
  const [videoSkipped, setVideoSkipped] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Derive phase from stream content
  const phase = derivePhase(streamContent);

  const dispatch: AgentDispatch = {
    tier,
    agents,
    taskSummary,
    phase,
  };

  const handleAssemblyComplete = useCallback(() => {
    setAssemblyDone(true);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col border border-border bg-bg overflow-hidden"
    >
      {/* TOP — RFP-BAMARAM Process Tracker */}
      <div className={expanded ? 'flex-1' : ''}>
        <ProcessTracker
          dispatch={dispatch}
          streamContent={streamContent}
        />
      </div>

      {/* BOTTOM — Entertainment Zone (collapsible) */}
      {!expanded && (
        <AnimatePresence mode="wait">
          {!assemblyDone ? (
            <motion.div
              key="assembly"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative"
            >
              <AgentAssembly
                tier={tier}
                agents={agents}
                taskSummary={taskSummary}
                onComplete={handleAssemblyComplete}
              />
            </motion.div>
          ) : !videoSkipped ? (
            <motion.div
              key="video-zone"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="relative bg-bg-elevated border-t border-border p-4 sm:p-6"
            >
              {/* Placeholder for future video content */}
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-fg-ghost">
                  Operations Floor
                </span>
                <button
                  onClick={() => setVideoSkipped(true)}
                  className="font-mono text-[9px] text-fg-ghost hover:text-fg-secondary transition-colors uppercase tracking-wider"
                >
                  Skip
                </button>
              </div>

              {/* Agent activity feed */}
              <div className="space-y-2">
                {agents.map(agentKey => {
                  const agentData = AGENT_ROSTER[agentKey as keyof typeof AGENT_ROSTER];
                  if (!agentData) return null;
                  return (
                    <motion.div
                      key={agentKey}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-2 py-1"
                    >
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: agentData.color }}
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 2, repeat: Infinity, delay: Math.random() }}
                      />
                      <span className="font-mono text-[10px] text-fg-secondary">
                        {agentData.name}
                      </span>
                      <span className="font-mono text-[9px] text-fg-ghost">
                        {getAgentStatus(agentKey, phase)}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      )}

      {/* Controls bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-bg border-t border-border">
        <div className="flex items-center gap-2">
          <motion.div
            className="w-2 h-2 rounded-full bg-signal-success"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="font-mono text-[9px] text-fg-ghost uppercase tracking-wider">
            {phase === 'complete' ? 'Mission Complete' : 'In Progress'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-fg-ghost hover:text-fg-secondary transition-colors"
            title={expanded ? 'Show entertainment zone' : 'Focus on tracker'}
          >
            {expanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
          {phase === 'complete' && (
            <button
              onClick={onDismiss}
              className="p-1 text-fg-ghost hover:text-fg-secondary transition-colors"
              title="Close"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function derivePhase(content: string): AgentDispatch['phase'] {
  if (!content) return 'receiving';
  const len = content.length;
  if (len < 50) return 'analyzing';
  if (len < 200) return 'proposing';
  if (content.includes('complete') || content.includes('done') || content.includes('finished')) return 'complete';
  if (len > 500) return 'verifying';
  return 'building';
}

function getAgentStatus(agentKey: string, phase: AgentDispatch['phase']): string {
  const statusMap: Record<string, Record<string, string>> = {
    acheevy: { receiving: 'reviewing request...', analyzing: 'coordinating...', building: 'overseeing...', complete: 'mission complete' },
    q_ang: { analyzing: 'gathering intel...', building: 'monitoring sources...', complete: 'intel delivered' },
    code_ang: { building: 'writing code...', verifying: 'running tests...', complete: 'code shipped' },
    iller_ang: { analyzing: 'drafting concepts...', building: 'designing assets...', complete: 'designs ready' },
    content_ang: { building: 'drafting content...', verifying: 'reviewing copy...', complete: 'content published' },
    biz_ang: { analyzing: 'evaluating strategy...', building: 'modeling scenarios...', complete: 'strategy locked' },
    learn_ang: { building: 'preparing materials...', complete: 'curriculum ready' },
    luc: { analyzing: 'calculating costs...', complete: 'budget finalized' },
    chicken_hawk: { building: 'deploying sqwaad...', verifying: 'quality check...', complete: 'all clear' },
  };
  return statusMap[agentKey]?.[phase] || 'standing by...';
}
