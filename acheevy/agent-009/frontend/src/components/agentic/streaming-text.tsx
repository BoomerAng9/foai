/**
 * StreamingText — Animated text with typewriter cursor.
 *
 * UX Principles Applied:
 *   - Behavioral psychology: streaming feels faster than waiting for full response
 *   - Cognitive load: cursor indicates "still generating" without extra UI
 *   - Component patterns: composable — works inside any container
 */

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface StreamingTextProps {
    text: string
    isStreaming?: boolean
    className?: string
    cursorClassName?: string
}

export function StreamingText({
    text,
    isStreaming = true,
    className,
    cursorClassName,
}: StreamingTextProps) {
    return (
        <span className={cn('inline', className)}>
            {text}
            {isStreaming && (
                <motion.span
                    className={cn(
                        'ml-0.5 inline-block w-[2px] h-[1em] align-text-bottom bg-[var(--streaming-cursor)]',
                        cursorClassName,
                    )}
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                    aria-hidden
                />
            )}
        </span>
    )
}
