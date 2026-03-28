import type { AgentState } from '@/components/agentic'

export type TaskStatus = 'queued' | 'active' | 'complete' | 'error'
export type ToolStatus = 'running' | 'complete' | 'error'

export interface ToolEvent {
    id: string
    name: string
    status: ToolStatus
    startedAt: number
    completedAt?: number
    durationMs?: number
    input?: string
    output?: string
    error?: string
}

export interface TaskItem {
    id: string
    label: string
    status: TaskStatus
}

export interface ContextSnapshot {
    model: string
    tokensUsed: number
    tokensLimit: number
    costUsd: number
}

export interface ConfidenceScore {
    label: string
    value: number
    description?: string
}

export interface ObservabilityState {
    agentState: AgentState
    context: ContextSnapshot
    tasks: TaskItem[]
    tools: ToolEvent[]
    confidence: ConfidenceScore[]
    elapsedMs: number
}
