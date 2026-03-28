/**
 * useMockObservability — Generates a simulated ObservabilityState
 * that cycles through agent phases for development and demo purposes.
 *
 * Usage:
 *   const { data } = useMockObservability()
 *   <ObservabilityPanel data={data} />
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { AgentState } from '@/components/agentic'
import type {
    ObservabilityState,
    ToolEvent,
    TaskItem,
    ContextSnapshot,
    ConfidenceScore,
} from '@/components/glass-box/index'

// ── Static fixtures ──────────────────────────

const MOCK_TASKS: TaskItem[] = [
    { id: 't1', label: 'Analyse user request', status: 'complete' },
    { id: 't2', label: 'Search codebase for relevant files', status: 'complete' },
    { id: 't3', label: 'Generate implementation plan', status: 'active' },
    { id: 't4', label: 'Write unit tests', status: 'queued' },
    { id: 't5', label: 'Apply code changes', status: 'queued' },
    { id: 't6', label: 'Verify build passes', status: 'queued' },
]

const MOCK_TOOL_NAMES = [
    'web_search',
    'str_replace_editor',
    'bash',
    'code_interpreter',
    'web_visit',
    'code_execution',
]

function randomBetween(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

let toolIdCounter = 0

function makeTool(overrides?: Partial<ToolEvent>): ToolEvent {
    const id = `tool-${++toolIdCounter}`
    const name = MOCK_TOOL_NAMES[Math.floor(Math.random() * MOCK_TOOL_NAMES.length)]
    const startedAt = Date.now() - randomBetween(500, 5000)
    return {
        id,
        name,
        status: 'complete',
        startedAt,
        completedAt: Date.now(),
        durationMs: Date.now() - startedAt,
        input: `{"query": "example search for ${name}"}`,
        output: `Found 3 results for ${name}`,
        ...overrides,
    }
}

// ── Hook ─────────────────────────────────────

interface UseMockObservabilityOptions {
    /** Auto-advance through phases */
    autoPlay?: boolean
    /** Interval between phase ticks (ms) */
    tickMs?: number
}

export function useMockObservability(
    options?: UseMockObservabilityOptions,
): { data: ObservabilityState } {
    const { autoPlay = true, tickMs = 2000 } = options ?? {}

    const [phase, setPhase] = useState(0)
    const startRef = useRef(Date.now())
    const [elapsedMs, setElapsedMs] = useState(0)
    const [tools, setTools] = useState<ToolEvent[]>(() => [
        makeTool({ status: 'complete' }),
        makeTool({ status: 'complete' }),
    ])

    // Elapsed timer
    useEffect(() => {
        const interval = setInterval(() => {
            setElapsedMs(Date.now() - startRef.current)
        }, 250)
        return () => clearInterval(interval)
    }, [])

    // Phase auto-advance
    useEffect(() => {
        if (!autoPlay) return
        const interval = setInterval(() => {
            setPhase((p) => {
                const next = p + 1
                if (next > 8) return 0 // loop
                return next
            })
        }, tickMs)
        return () => clearInterval(interval)
    }, [autoPlay, tickMs])

    // Add a new tool event each phase
    useEffect(() => {
        if (phase > 0 && phase <= 6) {
            const isRunning = phase % 3 === 0
            setTools((prev) => [
                ...prev,
                makeTool({
                    status: isRunning ? 'running' : 'complete',
                }),
            ])
        }
        if (phase === 0) {
            // Reset
            toolIdCounter = 0
            startRef.current = Date.now()
            setTools([makeTool(), makeTool()])
        }
    }, [phase])

    // Derive state from phase
    const agentState: AgentState = useMemo(() => {
        if (phase <= 1) return 'thinking'
        if (phase <= 5) return 'executing'
        if (phase === 6) return 'streaming'
        if (phase === 7) return 'complete'
        return 'idle'
    }, [phase])

    const tokensUsed = Math.min(phase * 8500, 68000)
    const tokensLimit = 128_000

    const tasks: TaskItem[] = useMemo(() => {
        return MOCK_TASKS.map((t, i) => {
            if (i < phase - 1) return { ...t, status: 'complete' as const }
            if (i === phase - 1) return { ...t, status: 'active' as const }
            return { ...t, status: 'queued' as const }
        })
    }, [phase])

    const context: ContextSnapshot = {
        model: 'claude-4-opus',
        tokensUsed,
        tokensLimit,
        costUsd: tokensUsed * 0.00001,
    }

    const confidence: ConfidenceScore[] = useMemo(() => {
        const done = tasks.filter((t) => t.status === 'complete').length
        return [
            {
                label: 'Task Progress',
                value: tasks.length > 0 ? done / tasks.length : 0,
                description: `${done} of ${tasks.length} tasks complete`,
            },
            {
                label: 'Context Budget',
                value: Math.max(0, 1 - tokensUsed / tokensLimit),
                description: `${Math.round((1 - tokensUsed / tokensLimit) * 100)}% remaining`,
            },
            {
                label: 'Intent Confidence',
                value: Math.min(1, 0.6 + phase * 0.05),
                description: 'How well the agent understands the request',
            },
        ]
    }, [tasks, tokensUsed, tokensLimit, phase])

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

    return { data }
}
