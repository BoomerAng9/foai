import { ToolExecutionCard, type ToolState } from '@/components/agentic'
import { WrenchIcon } from 'lucide-react'
import type { ToolEvent } from './types'

interface ToolTimelineProps {
    tools: ToolEvent[]
    className?: string
}

function statusToToolState(status: ToolEvent['status']): ToolState {
    if (status === 'running') return 'running'
    if (status === 'error') return 'error'
    return 'complete'
}

function formatInput(tool: ToolEvent) {
    if (!tool.input) return undefined
    return <pre className="whitespace-pre-wrap">{tool.input}</pre>
}

function formatOutput(tool: ToolEvent) {
    if (tool.error) {
        return <pre className="whitespace-pre-wrap text-[var(--status-error)]">{tool.error}</pre>
    }
    if (!tool.output) return undefined
    return <pre className="whitespace-pre-wrap">{tool.output}</pre>
}

export function ToolTimeline({ tools, className }: ToolTimelineProps) {
    return (
        <div className={className}>
            <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">Tool Timeline</h4>
                <span className="text-[11px] text-[var(--text-tertiary)]">{tools.length} events</span>
            </div>
            <div className="space-y-2">
                {tools.length === 0 && (
                    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-glass)] px-3 py-2 text-xs text-[var(--text-tertiary)]">
                        No tool activity yet.
                    </div>
                )}
                {tools.slice().reverse().map((tool) => (
                    <ToolExecutionCard
                        key={tool.id}
                        icon={WrenchIcon}
                        label={tool.name}
                        state={statusToToolState(tool.status)}
                        input={formatInput(tool)}
                        output={formatOutput(tool)}
                        duration={tool.durationMs}
                    />
                ))}
            </div>
        </div>
    )
}
