/**
 * AgentThinkingBar — Compact thinking indicator for the chat stream.
 *
 * UX Principles Applied:
 *   - Cognitive load: morphing shape + single line of text
 *   - Behavioral psychology: animation reduces perceived wait time
 *   - Accessibility: role="status" + aria-live for screen readers
 */

import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { StreamingText } from './streaming-text'
import { StatusDot } from './status-dot'

interface AgentThinkingBarProps {
    message?: string
    agentName?: string
    isActive?: boolean
    className?: string
}

export function AgentThinkingBar({
    message = 'Thinking...',
    agentName = 'ACHEEVY-009',
    isActive = true,
    className,
}: AgentThinkingBarProps) {
    return (
        <AnimatePresence>
            {isActive && (
                <motion.div
                    role="status"
                    aria-live="polite"
                    className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-xl',
                        'bg-[var(--bg-glass)] backdrop-blur-md',
                        'border border-[var(--border-default)]',
                        className,
                    )}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
                    transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}
                >
                    {/* Animated status dot cluster */}
                    <div className="flex items-center gap-1.5">
                        <StatusDot state="thinking" size="sm" />
                    </div>

                    {/* Agent name + message */}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                            {agentName}
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)] font-mono truncate">
                            <StreamingText text={message} isStreaming />
                        </p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
