import {
    AgentStatusIndicator,
    ConfidenceMeter,
    ContextCapacity,
    ContextRibbon,
    GlassPanel,
    TokenBadge,
} from '@/components/agentic'
import { cn } from '@/lib/utils'
import { TaskKanban } from './task-kanban'
import { ToolTimeline } from './tool-timeline'
import type { ObservabilityState } from './types'

interface ObservabilityPanelProps {
    data: ObservabilityState
    className?: string
}

function formatElapsed(ms: number) {
    const s = Math.floor(ms / 1000)
    const minutes = Math.floor(s / 60)
    const seconds = s % 60
    return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function ObservabilityPanel({ data, className }: ObservabilityPanelProps) {
    return (
        <div className={cn('space-y-3 py-3', className)}>
            <GlassPanel
                title="Agent State"
                subtitle="Live execution visibility"
                rightSlot={<TokenBadge label={formatElapsed(data.elapsedMs)} color="neutral" />}
            >
                <AgentStatusIndicator state={data.agentState} showLabel />
            </GlassPanel>

            <GlassPanel title="Context" subtitle="Model, token budget, and cost tracking">
                <ContextRibbon
                    model={data.context.model}
                    tokensUsed={data.context.tokensUsed}
                    tokensLimit={data.context.tokensLimit}
                />
                <ContextCapacity used={data.context.tokensUsed} limit={data.context.tokensLimit} />
                <div className="text-xs text-[var(--text-tertiary)]">
                    Estimated cost: <span className="text-[var(--text-secondary)]">${data.context.costUsd.toFixed(4)}</span>
                </div>
            </GlassPanel>

            <GlassPanel title="Confidence" subtitle="Execution confidence signals">
                <div className="space-y-2">
                    {data.confidence.length === 0 && (
                        <p className="text-xs text-[var(--text-tertiary)]">No confidence metrics available yet.</p>
                    )}
                    {data.confidence.map((score) => (
                        <ConfidenceMeter
                            key={score.label}
                            label={score.label}
                            value={score.value}
                            description={score.description}
                        />
                    ))}
                </div>
            </GlassPanel>

            <TaskKanban tasks={data.tasks} />
            <ToolTimeline tools={data.tools} />
        </div>
    )
}
