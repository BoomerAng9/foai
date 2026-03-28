/**
 * StatusDot — Minimal status indicator dot with animation.
 *
 * Used across the agentic UI: sidebar sessions, tool cards, agent header, etc.
 * Maps directly to the agent state color tokens from design-tokens.css.
 */

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { AgentState } from './agent-status-indicator'

interface StatusDotProps {
    state: AgentState
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

const STATE_COLORS: Record<AgentState, string> = {
    idle:      'var(--agent-idle)',
    thinking:  'var(--agent-thinking)',
    executing: 'var(--agent-executing)',
    streaming: 'var(--agent-streaming)',
    complete:  'var(--agent-complete)',
    error:     'var(--agent-error)',
}

const SIZE_MAP = { sm: 6, md: 8, lg: 10 }

const ANIMATED_STATES = new Set<AgentState>(['thinking', 'executing', 'streaming'])

export function StatusDot({ state, size = 'md', className }: StatusDotProps) {
    const s = SIZE_MAP[size]
    const color = STATE_COLORS[state]
    const shouldAnimate = ANIMATED_STATES.has(state)

    return (
        <span
            className={cn('relative inline-flex items-center justify-center', className)}
            style={{ width: s * 2, height: s * 2 }}
            role="img"
            aria-label={`Status: ${state}`}
        >
            {shouldAnimate && (
                <motion.span
                    className="absolute rounded-full"
                    style={{
                        width: s,
                        height: s,
                        backgroundColor: color,
                    }}
                    animate={{ scale: [1, 2], opacity: [0.4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                />
            )}
            <span
                className="rounded-full"
                style={{
                    width: s,
                    height: s,
                    backgroundColor: color,
                }}
            />
        </span>
    )
}
