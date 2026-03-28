/**
 * useObservability — Bridge between existing Redux/stream state and
 * the Glass Box ObservabilityState type.
 *
 * Subscribes to the agent slice, settings slice, and plan/tool events
 * from the chat transport layer, then produces a single
 * ObservabilityState object that the ObservabilityPanel can consume.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAppSelector } from '@/state/store'
import {
    selectIsCompleted,
    selectIsStopped,
    selectBuildStep,
    selectSelectedModel,
} from '@/state'
import type { AgentState } from '@/components/agentic'
import type {
    ObservabilityState,
    ToolEvent,
    TaskItem,
    TaskStatus,
    ContextSnapshot,
    ConfidenceScore,
} from '@/components/glass-box/index'
import { BUILD_STEP } from '@/typings/agent'

// ── Helpers ──────────────────────────────────

function buildStepToAgentState(
    step: BUILD_STEP,
    isCompleted: boolean,
    isStopped: boolean,
): AgentState {
    if (isStopped) return 'error'
    if (isCompleted) return 'complete'
    switch (step) {
        case BUILD_STEP.THINKING:
            return 'thinking'
        case BUILD_STEP.PLAN:
            return 'thinking'
        case BUILD_STEP.BUILD:
            return 'executing'
        default:
            return 'idle'
    }
}

function planToTask(plan: {
    id: string
    content: string
    status: 'pending' | 'in_progress' | 'completed'
}): TaskItem {
    const statusMap: Record<string, TaskStatus> = {
        pending: 'queued',
        in_progress: 'active',
        completed: 'complete',
    }
    return {
        id: plan.id,
        label: plan.content,
        status: statusMap[plan.status] ?? 'queued',
    }
}

// ── Default context limits per model family ──

const MODEL_LIMITS: Record<string, number> = {
    'gpt-4': 128_000,
    'gpt-4o': 128_000,
    'gpt-4.1': 128_000,
    'gpt-3.5': 16_385,
    'claude-3': 200_000,
    'claude-3.5': 200_000,
    'claude-4': 200_000,
    'gemini-2': 1_000_000,
    'gemini-1.5': 1_000_000,
    'deepseek': 128_000,
}

function guessModelLimit(modelId?: string): number {
    if (!modelId) return 128_000
    const lower = modelId.toLowerCase()
    for (const [prefix, limit] of Object.entries(MODEL_LIMITS)) {
        if (lower.includes(prefix)) return limit
    }
    return 128_000
}

// ── Token cost estimate (rough: $0.01 / 1K tokens average) ──

function estimateCost(tokens: number): number {
    return tokens * 0.00001
}

// ── Hook ─────────────────────────────────────

export interface UseObservabilityOptions {
    /** Override model context limit */
    contextLimit?: number
}

export function useObservability(
    options?: UseObservabilityOptions,
): {
    data: ObservabilityState
    /** Call when a tool starts executing */
    onToolStart: (id: string, name: string) => void
    /** Call when a tool finishes */
    onToolEnd: (id: string, output?: string, error?: string) => void
    /** Update token usage from stream events */
    onUsage: (input: number, output: number) => void
    /** Reset all tool/usage state (e.g. new session) */
    reset: () => void
} {
    // ── Redux state ──────────────────────────
    const isCompleted = useAppSelector(selectIsCompleted)
    const isStopped = useAppSelector(selectIsStopped)
    const buildStep = useAppSelector(selectBuildStep)
    const modelId = useAppSelector(selectSelectedModel)
    const plans = useAppSelector((state) => state.agent.plans)

    // ── Local state ──────────────────────────
    const [tools, setTools] = useState<ToolEvent[]>([])
    const [tokensUsed, setTokensUsed] = useState(0)
    const startRef = useRef(Date.now())
    const [elapsedMs, setElapsedMs] = useState(0)

    // Tick elapsed timer while agent is active
    useEffect(() => {
        const agentState = buildStepToAgentState(buildStep, isCompleted, isStopped)
        if (agentState === 'idle' || agentState === 'complete' || agentState === 'error') return

        const interval = setInterval(() => {
            setElapsedMs(Date.now() - startRef.current)
        }, 250)
        return () => clearInterval(interval)
    }, [buildStep, isCompleted, isStopped])

    // Reset timer when a new build starts
    useEffect(() => {
        if (buildStep === BUILD_STEP.THINKING && !isCompleted && !isStopped) {
            startRef.current = Date.now()
            setElapsedMs(0)
        }
    }, [buildStep, isCompleted, isStopped])

    // ── Callbacks ────────────────────────────

    const onToolStart = useCallback((id: string, name: string) => {
        setTools((prev) => [
            ...prev,
            {
                id,
                name,
                status: 'running',
                startedAt: Date.now(),
            },
        ])
    }, [])

    const onToolEnd = useCallback((id: string, output?: string, error?: string) => {
        setTools((prev) =>
            prev.map((t) =>
                t.id === id
                    ? {
                          ...t,
                          status: error ? ('error' as const) : ('complete' as const),
                          output,
                          error,
                          completedAt: Date.now(),
                          durationMs: Date.now() - t.startedAt,
                      }
                    : t,
            ),
        )
    }, [])

    const onUsage = useCallback((input: number, output: number) => {
        setTokensUsed((prev) => prev + input + output)
    }, [])

    const reset = useCallback(() => {
        setTools([])
        setTokensUsed(0)
        startRef.current = Date.now()
        setElapsedMs(0)
    }, [])

    // ── Derived ──────────────────────────────

    const agentState = buildStepToAgentState(buildStep, isCompleted, isStopped)
    const tokensLimit = options?.contextLimit ?? guessModelLimit(modelId)

    const context: ContextSnapshot = useMemo(
        () => ({
            model: modelId ?? 'unknown',
            tokensUsed,
            tokensLimit,
            costUsd: estimateCost(tokensUsed),
        }),
        [modelId, tokensUsed, tokensLimit],
    )

    const tasks: TaskItem[] = useMemo(() => plans.map(planToTask), [plans])

    const confidence: ConfidenceScore[] = useMemo(() => {
        const scores: ConfidenceScore[] = []

        // Task progress confidence
        if (tasks.length > 0) {
            const done = tasks.filter((t) => t.status === 'complete').length
            scores.push({
                label: 'Task Progress',
                value: done / tasks.length,
                description: `${done} of ${tasks.length} tasks complete`,
            })
        }

        // Context capacity (inverse — lower usage = higher confidence)
        if (tokensLimit > 0) {
            const remaining = 1 - tokensUsed / tokensLimit
            scores.push({
                label: 'Context Budget',
                value: Math.max(0, remaining),
                description: `${Math.round(remaining * 100)}% context remaining`,
            })
        }

        return scores
    }, [tasks, tokensUsed, tokensLimit])

    const data: ObservabilityState = useMemo(
        () => ({
            agentState,
            context,
            tasks,
            tools,
            confidence,
            elapsedMs,
        }),
        [agentState, context, tasks, tools, confidence, elapsedMs],
    )

    return { data, onToolStart, onToolEnd, onUsage, reset }
}
