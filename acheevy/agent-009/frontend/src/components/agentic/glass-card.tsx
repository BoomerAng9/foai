/**
 * GlassCard — A glass-morphism card for agentic surfaces.
 *
 * UX Principles Applied:
 *   - Visual hierarchy: subtle depth via blur + transparency
 *   - Dashboard design: consistent container for agent outputs
 *   - Design tokens: all values backed by the token system
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Highlight border color based on agent state */
    variant?: 'default' | 'brand' | 'success' | 'warning' | 'error'
    /** Intensity of the blur effect */
    blur?: 'sm' | 'md' | 'lg'
    /** Show subtle glow on hover */
    glow?: boolean
}

const VARIANT_STYLES = {
    default: 'border-[var(--border-default)] hover:border-[var(--border-strong)]',
    brand:   'border-[var(--border-brand)] hover:border-[var(--border-brand-strong)]',
    success: 'border-[var(--status-success)]/20 hover:border-[var(--status-success)]/40',
    warning: 'border-[var(--status-warning)]/20 hover:border-[var(--status-warning)]/40',
    error:   'border-[var(--status-error)]/20 hover:border-[var(--status-error)]/40',
}

const GLOW_STYLES = {
    default: 'hover:shadow-[0_0_24px_rgba(255,255,255,0.03)]',
    brand:   'hover:shadow-[var(--shadow-glow-gold)]',
    success: 'hover:shadow-[var(--shadow-glow-emerald)]',
    warning: 'hover:shadow-[var(--shadow-glow-amber)]',
    error:   'hover:shadow-[var(--shadow-glow-error)]',
}

const BLUR_MAP = {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg',
}

export function GlassCard({
    variant = 'default',
    blur = 'md',
    glow = true,
    className,
    children,
    ...props
}: GlassCardProps) {
    return (
        <div
            className={cn(
                'rounded-xl border bg-[var(--bg-glass)] p-4 transition-all duration-200',
                BLUR_MAP[blur],
                VARIANT_STYLES[variant],
                glow && GLOW_STYLES[variant],
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}
