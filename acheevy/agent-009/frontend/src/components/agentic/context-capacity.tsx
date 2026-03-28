import { cn } from '@/lib/utils'

interface ContextCapacityProps {
    used: number
    limit: number
    className?: string
}

export function ContextCapacity({ used, limit, className }: ContextCapacityProps) {
    const ratio = limit > 0 ? Math.min(1, used / limit) : 0
    const percent = Math.round(ratio * 100)
    const toneClass =
        percent >= 90
            ? 'text-[var(--status-error)]'
            : percent >= 75
              ? 'text-[var(--status-warning)]'
              : 'text-[var(--status-success)]'

    return (
        <div className={cn('rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-glass)] px-3 py-2', className)}>
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-[var(--text-tertiary)]">Context Capacity</span>
                <span className={cn('text-xs font-semibold tabular-nums', toneClass)}>{percent}% used</span>
            </div>
        </div>
    )
}
