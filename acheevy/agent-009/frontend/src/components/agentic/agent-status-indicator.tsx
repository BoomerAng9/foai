/**
 * AgentStatusIndicator — Shows current agent state with animated visual feedback.
 *
 * UX Principles Applied:
 *   - Progressive disclosure: minimal footprint, expands context on hover
 *   - Cognitive load: single-glance status via color + animation
 *   - Accessibility: aria-label for screen readers, color-blind-safe animations
 */

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export type AgentState = 'idle' | 'thinking' | 'executing' | 'streaming' | 'complete' | 'error'

interface AgentStatusIndicatorProps {
    state: AgentState
    label?: string
    showLabel?: boolean
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

const STATE_CONFIG: Record<AgentState, {
    color: string
    label: string
    animate: boolean
    pulseSpeed: number
}> = {
    idle:      { color: 'var(--agent-idle)',      label: 'Idle',      animate: false, pulseSpeed: 0 },
    thinking:  { color: 'var(--agent-thinking)',   label: 'Thinking',  animate: true,  pulseSpeed: 2 },
    executing: { color: 'var(--agent-executing)',  label: 'Executing', animate: true,  pulseSpeed: 1.5 },
    streaming: { color: 'var(--agent-streaming)',  label: 'Streaming', animate: true,  pulseSpeed: 1 },
    complete:  { color: 'var(--agent-complete)',   label: 'Complete',  animate: false, pulseSpeed: 0 },
    error:     { color: 'var(--agent-error)',      label: 'Error',     animate: false, pulseSpeed: 0 },
}

const SIZE_MAP = {
    sm: { dot: 6, ring: 16, text: 'text-xs' },
    md: { dot: 8, ring: 20, text: 'text-sm' },
    lg: { dot: 10, ring: 24, text: 'text-sm' },
}

export function AgentStatusIndicator({
    state,
    label,
    showLabel = false,
    size = 'md',
    className,
}: AgentStatusIndicatorProps) {
    const config = STATE_CONFIG[state]
    const sizeConfig = SIZE_MAP[size]
    const displayLabel = label || config.label

    return (
        <div
            className={cn('inline-flex items-center gap-2', className)}
            role="status"
            aria-label={`Agent status: ${displayLabel}`}
        >
            <div className="relative flex items-center justify-center" style={{ width: sizeConfig.ring, height: sizeConfig.ring }}>
                {/* Pulse ring for active states */}
                {config.animate && (
                    <motion.div
                        className="absolute inset-0 rounded-full"
                        style={{ borderColor: config.color, borderWidth: 1 }}
                        animate={{
                            scale: [1, 1.8],
                            opacity: [0.5, 0],
                        }}
                        transition={{
                            duration: config.pulseSpeed,
                            repeat: Infinity,
                            ease: 'easeOut',
                        }}
                    />
                )}
                {/* Core dot */}
                <motion.div
                    className="rounded-full"
                    style={{
                        width: sizeConfig.dot,
                        height: sizeConfig.dot,
                        backgroundColor: config.color,
                    }}
                    animate={config.animate ? {
                        scale: [1, 1.15, 1],
                    } : undefined}
                    transition={config.animate ? {
                        duration: config.pulseSpeed,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    } : undefined}
                />
            </div>
            {showLabel && (
                <span
                    className={cn(sizeConfig.text, 'font-medium')}
                    style={{ color: config.color }}
                >
                    {displayLabel}
                </span>
            )}
        </div>
    )
}
