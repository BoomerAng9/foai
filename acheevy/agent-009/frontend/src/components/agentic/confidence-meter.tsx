import { cn } from '@/lib/utils'

interface ConfidenceMeterProps {
    label: string
    value: number
    description?: string
    className?: string
}

export function ConfidenceMeter({ label, value, description, className }: ConfidenceMeterProps) {
    const bounded = Math.max(0, Math.min(1, value))
    const percent = Math.round(bounded * 100)

    return (
        <div className={cn('space-y-1.5', className)}>
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-[var(--text-secondary)]">{label}</span>
                <span className="text-xs font-semibold text-[var(--text-primary)] tabular-nums">{percent}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[var(--neutral-800)]/60 overflow-hidden">
                <progress
                    className="h-full w-full rounded-full [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:bg-[var(--acheevy-gold-400)] [&::-moz-progress-bar]:bg-[var(--acheevy-gold-400)]"
                    value={percent}
                    max={100}
                    aria-label={`${label} confidence`}
                />
            </div>
            {description && <p className="text-[11px] text-[var(--text-tertiary)]">{description}</p>}
        </div>
    )
}
