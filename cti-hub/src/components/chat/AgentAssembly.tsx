'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AgentTier } from '@/lib/chat/types';
import { AGENT_ROSTER } from '@/lib/chat/types';

interface AgentAssemblyProps {
  tier: AgentTier;
  agents: string[];
  taskSummary: string;
  onComplete?: () => void;
}

const TIER_CONFIG = {
  1: {
    title: "I'll take care of this personally.",
    subtitle: 'ACHEEVY',
    duration: 3000,
    bg: 'from-amber-50 to-orange-50',
    bgDark: 'dark:from-amber-950/30 dark:to-orange-950/20',
    accent: '#E8A020',
  },
  2: {
    title: 'Deploying specialist.',
    subtitle: 'Boomer_Ang Dispatched',
    duration: 4000,
    bg: 'from-blue-50 to-indigo-50',
    bgDark: 'dark:from-blue-950/30 dark:to-indigo-950/20',
    accent: '#3B82F6',
  },
  3: {
    title: 'The Sqwaad is assembling.',
    subtitle: 'Chicken Hawk on point',
    duration: 5000,
    bg: 'from-slate-100 to-zinc-100',
    bgDark: 'dark:from-slate-900/50 dark:to-zinc-900/40',
    accent: '#DC2626',
  },
  4: {
    title: 'Full workforce. Every agent. Your mission.',
    subtitle: 'All hands deployed',
    duration: 6000,
    bg: 'from-amber-50 via-orange-50 to-yellow-50',
    bgDark: 'dark:from-amber-950/30 dark:via-orange-950/20 dark:to-yellow-950/20',
    accent: '#E8A020',
  },
} as const;

function AgentBadge({ agentKey, delay }: { agentKey: string; delay: number }) {
  const agent = AGENT_ROSTER[agentKey as keyof typeof AGENT_ROSTER];
  if (!agent) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.4, type: 'spring', stiffness: 200 }}
      className="flex items-center gap-2.5 px-3 py-2 bg-bg-surface border border-border"
    >
      <div
        className="w-2.5 h-2.5 rounded-full animate-pulse"
        style={{ background: agent.color }}
      />
      <div className="flex flex-col">
        <span className="font-mono text-[11px] font-semibold tracking-wide text-fg">
          {agent.name}
        </span>
        <span className="font-mono text-[9px] text-fg-tertiary uppercase tracking-wider">
          {agent.role}
        </span>
      </div>
    </motion.div>
  );
}

function ScanLine({ color }: { color: string }) {
  return (
    <motion.div
      className="absolute left-0 right-0 h-[1px] opacity-30"
      style={{ background: color }}
      initial={{ top: '0%' }}
      animate={{ top: '100%' }}
      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
    />
  );
}

export function AgentAssembly({ tier, agents, taskSummary, onComplete }: AgentAssemblyProps) {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');
  const config = TIER_CONFIG[tier];

  useEffect(() => {
    const holdTimer = setTimeout(() => setPhase('hold'), 800);
    const exitTimer = setTimeout(() => {
      setPhase('exit');
      setTimeout(() => onComplete?.(), 500);
    }, config.duration);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
    };
  }, [config.duration, onComplete]);

  return (
    <AnimatePresence>
      {phase !== 'exit' ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className={`relative overflow-hidden bg-gradient-to-br ${config.bg} ${config.bgDark} border border-border p-6 sm:p-8`}
        >
          <ScanLine color={config.accent} />

          {/* Top — Mission brief */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-1.5 h-6"
                style={{ background: config.accent }}
              />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-secondary">
                {config.subtitle}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-light tracking-tight text-fg leading-snug">
              {config.title}
            </h2>
            {taskSummary && (
              <p className="font-mono text-[11px] text-fg-tertiary mt-2 max-w-md">
                {taskSummary}
              </p>
            )}
          </motion.div>

          {/* Agent badges — stagger in */}
          <div className="flex flex-wrap gap-2">
            {agents.map((agentKey, i) => (
              <AgentBadge
                key={agentKey}
                agentKey={agentKey}
                delay={0.4 + i * 0.15}
              />
            ))}
          </div>

          {/* Tier 4 — dramatic bottom bar */}
          {tier === 4 && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 1, duration: 1.5, ease: 'easeOut' }}
              className="absolute bottom-0 left-0 right-0 h-1 origin-left"
              style={{ background: `linear-gradient(90deg, ${config.accent}, transparent)` }}
            />
          )}

          {/* Progress indicator */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: config.duration / 1000, ease: 'linear' }}
            className="absolute bottom-0 left-0 right-0 h-[2px] origin-left bg-fg/10"
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
