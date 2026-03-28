import * as React from 'react'
import { cn } from '@/lib/utils'
import { GlassCard } from './glass-card'

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string
    subtitle?: string
    rightSlot?: React.ReactNode
    contentClassName?: string
}

export function GlassPanel({
    title,
    subtitle,
    rightSlot,
    className,
    contentClassName,
    children,
    ...props
}: GlassPanelProps) {
    return (
        <GlassCard className={cn('space-y-3', className)} {...props}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                        {title}
                    </h3>
                    {subtitle && (
                        <p className="text-xs text-[var(--text-tertiary)] mt-0.5 line-clamp-2">
                            {subtitle}
                        </p>
                    )}
                </div>
                {rightSlot && <div className="shrink-0">{rightSlot}</div>}
            </div>
            <div className={cn('space-y-2', contentClassName)}>{children}</div>
        </GlassCard>
    )
}
