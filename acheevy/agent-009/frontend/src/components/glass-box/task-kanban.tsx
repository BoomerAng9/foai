import { GlassPanel } from '@/components/agentic'
import { cn } from '@/lib/utils'
import type { TaskItem, TaskStatus } from './types'

interface TaskKanbanProps {
    tasks: TaskItem[]
    className?: string
}

const STATUS_LABEL: Record<TaskStatus, string> = {
    queued: 'Queued',
    active: 'Active',
    complete: 'Complete',
    error: 'Error',
}

const STATUS_STYLES: Record<TaskStatus, string> = {
    queued: 'bg-[var(--neutral-800)]/60 text-[var(--text-tertiary)]',
    active: 'bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)]',
    complete: 'bg-[var(--badge-success-bg)] text-[var(--badge-success-text)]',
    error: 'bg-[var(--badge-error-bg)] text-[var(--badge-error-text)]',
}

export function TaskKanban({ tasks, className }: TaskKanbanProps) {
    return (
        <GlassPanel
            className={className}
            title="Tasks"
            subtitle="Current execution plan status"
        >
            <ul className="space-y-2">
                {tasks.length === 0 && (
                    <li className="text-xs text-[var(--text-tertiary)]">No tasks yet.</li>
                )}
                {tasks.map((task) => (
                    <li
                        key={task.id}
                        className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-glass)] px-2.5 py-2"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-[var(--text-secondary)] truncate">{task.label}</p>
                            <span
                                className={cn(
                                    'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                                    STATUS_STYLES[task.status],
                                )}
                            >
                                {STATUS_LABEL[task.status]}
                            </span>
                        </div>
                    </li>
                ))}
            </ul>
        </GlassPanel>
    )
}
