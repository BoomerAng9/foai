/**
 * TokenBadge — Route / environment badge using design tokens.
 *
 * Used to label task routing (ACHEEVY vs AIMS) and environments
 * (production, staging, sandbox) in the dashboard.
 */

import { cn } from '@/lib/utils'

type BadgeColor = 'gold' | 'amber' | 'emerald' | 'error' | 'neutral'

interface TokenBadgeProps {
    label: string
    color?: BadgeColor
    dot?: boolean
    className?: string
}

const COLOR_MAP: Record<BadgeColor, { bg: string; text: string; dot: string }> = {
    gold:    { bg: 'bg-[var(--badge-brand-bg)]',   text: 'text-[var(--badge-brand-text)]',   dot: 'bg-[var(--acheevy-gold-400)]' },
    amber:   { bg: 'bg-[var(--badge-warning-bg)]',  text: 'text-[var(--badge-warning-text)]',  dot: 'bg-[var(--acheevy-amber-400)]' },
    emerald: { bg: 'bg-[var(--badge-success-bg)]',  text: 'text-[var(--badge-success-text)]',  dot: 'bg-[var(--acheevy-emerald-400)]' },
    error:   { bg: 'bg-[var(--badge-error-bg)]',    text: 'text-[var(--badge-error-text)]',    dot: 'bg-[var(--status-error)]' },
    neutral: { bg: 'bg-[var(--badge-default-bg)]',  text: 'text-[var(--badge-default-text)]',  dot: 'bg-[var(--neutral-500)]' },
}

export function TokenBadge({
    label,
    color = 'gold',
    dot = false,
    className,
}: TokenBadgeProps) {
    const c = COLOR_MAP[color]
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                c.bg,
                c.text,
                className,
            )}
        >
            {dot && <span className={cn('size-1.5 rounded-full', c.dot)} />}
            {label}
        </span>
    )
}
