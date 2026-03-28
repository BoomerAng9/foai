/**
 * ToolExecutionCard — Displays tool call with real-time status progression.
 *
 * UX Principles Applied:
 *   - Progressive disclosure: collapsed by default, expand for details
 *   - Cognitive load: icon + one-line label for instant comprehension
 *   - Behavioral psychology: progress animation reduces perceived wait time
 *   - Accessibility: semantic roles, keyboard interaction, aria-expanded
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
    ChevronDown,
    Loader2,
    CheckCircle2,
    AlertCircle,
    type LucideIcon,
} from 'lucide-react'
import { StatusDot } from './status-dot'

export type ToolState = 'pending' | 'running' | 'complete' | 'error'

interface ToolExecutionCardProps {
    icon?: LucideIcon
    label: string
    state: ToolState
    input?: React.ReactNode
    output?: React.ReactNode
    duration?: number  // ms
    className?: string
    defaultExpanded?: boolean
}

const STATE_BORDER: Record<ToolState, string> = {
    pending:  'border-[var(--tool-border)]',
    running:  'border-[var(--tool-active-border)]',
    complete: 'border-[var(--tool-complete-border)]',
    error:    'border-[var(--tool-error-border)]',
}

const STATE_ICON: Record<ToolState, React.ReactNode> = {
    pending:  null,
    running:  <Loader2 className="size-4 animate-spin text-[var(--acheevy-amber-400)]" />,
    complete: <CheckCircle2 className="size-4 text-[var(--status-success)]" />,
    error:    <AlertCircle className="size-4 text-[var(--status-error)]" />,
}

export function ToolExecutionCard({
    icon: Icon,
    label,
    state,
    input,
    output,
    duration,
    className,
    defaultExpanded = false,
}: ToolExecutionCardProps) {
    const [expanded, setExpanded] = useState(defaultExpanded)
    const hasContent = input || output

    return (
        <motion.div
            className={cn(
                'rounded-xl border bg-[var(--tool-bg)] backdrop-blur-md overflow-hidden transition-colors duration-200',
                STATE_BORDER[state],
                className,
            )}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
        >
            {/* Header — always visible */}
            <button
                className={cn(
                    'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                    'hover:bg-[var(--tool-header-bg)]',
                    !hasContent && 'cursor-default',
                )}
                onClick={() => hasContent && setExpanded((v) => !v)}
                aria-expanded={expanded}
                aria-controls="tool-content"
            >
                {/* Tool icon */}
                <div className="flex items-center justify-center size-7 rounded-lg bg-[var(--bg-brand-subtle)]">
                    {Icon ? (
                        <Icon className="size-4 text-[var(--text-brand)]" />
                    ) : (
                        <StatusDot state={state === 'running' ? 'executing' : state === 'complete' ? 'complete' : state === 'error' ? 'error' : 'idle'} size="sm" />
                    )}
                </div>

                {/* Label */}
                <span className="flex-1 text-sm font-medium text-[var(--text-primary)] truncate">
                    {label}
                </span>

                {/* Status icon */}
                {STATE_ICON[state]}

                {/* Duration */}
                {state === 'complete' && duration != null && (
                    <span className="text-xs text-[var(--text-tertiary)] tabular-nums">
                        {duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(1)}s`}
                    </span>
                )}

                {/* Expand chevron */}
                {hasContent && (
                    <motion.div
                        animate={{ rotate: expanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <ChevronDown className="size-4 text-[var(--text-tertiary)]" />
                    </motion.div>
                )}
            </button>

            {/* Collapsed progress bar */}
            {state === 'running' && !expanded && (
                <div className="h-px w-full overflow-hidden">
                    <div className="shimmer-gold h-full" />
                </div>
            )}

            {/* Expandable content */}
            <AnimatePresence initial={false}>
                {expanded && hasContent && (
                    <motion.div
                        id="tool-content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="border-t border-[var(--border-subtle)] px-4 py-3 space-y-3">
                            {input && (
                                <div className="space-y-1">
                                    <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Input</p>
                                    <div className="text-xs text-[var(--text-secondary)] font-mono bg-[var(--code-bg)] rounded-lg p-2 border border-[var(--code-border)] overflow-x-auto">
                                        {input}
                                    </div>
                                </div>
                            )}
                            {output && (
                                <div className="space-y-1">
                                    <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Output</p>
                                    <div className="text-xs text-[var(--text-secondary)] font-mono bg-[var(--code-bg)] rounded-lg p-2 border border-[var(--code-border)] overflow-x-auto">
                                        {output}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
