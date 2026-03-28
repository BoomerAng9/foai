import { cn } from '@/lib/utils'

interface ContextRibbonProps {
    model: string
    tokensUsed: number
    tokensLimit: number
    className?: string
}

function formatTokens(value: number) {
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

export function ContextRibbon({ model, tokensUsed, tokensLimit, className }: ContextRibbonProps) {
    const ratio = tokensLimit > 0 ? Math.min(1, tokensUsed / tokensLimit) : 0
    const pct = Math.round(ratio * 100)

    return (
        <div className={cn('space-y-2', className)}>
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-[var(--text-tertiary)] truncate">{model}</span>
                <span className="text-xs font-medium text-[var(--text-secondary)] tabular-nums">
                    {formatTokens(tokensUsed)} / {formatTokens(tokensLimit)}
                </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[var(--neutral-800)]/60 overflow-hidden">
                <progress
                    className="h-full w-full rounded-full [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:bg-[var(--acheevy-gold-400)] [&::-moz-progress-bar]:bg-[var(--acheevy-gold-400)]"
                    value={pct}
                    max={100}
                    aria-label="Context usage"
                />
            </div>
        </div>
    )
}
