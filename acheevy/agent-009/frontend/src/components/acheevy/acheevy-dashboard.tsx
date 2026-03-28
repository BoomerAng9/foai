/**
 * ACHEEVY-009 — Pipeline Dashboard
 * Real-time pipeline visualizer + task routing cards.
 * Shows NtNtN → ii-researcher → II-Commons → ii-agent → ORACLE → AIMS Bridge
 *
 * Tasks badged "ACHEEVY" execute on plugmein.cloud.
 * Tasks badged "→ AIMS" route to aimanagedsolutions.cloud.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

interface PipelineStage {
    id: string
    label: string
    engine: string
    status: 'idle' | 'active' | 'complete' | 'error'
    icon: string
}

export interface TaskCard {
    id: string
    title: string
    description: string
    prompt: string
    category: 'build' | 'research' | 'deploy' | 'analyze'
    route: 'acheevy' | 'aims'
}

const PIPELINE_STAGES: PipelineStage[] = [
    { id: 'intake', label: 'Intake', engine: 'NtNtN', status: 'idle', icon: '✦' },
    { id: 'research', label: 'Research', engine: 'ii-researcher', status: 'idle', icon: '🔍' },
    { id: 'plan', label: 'Plan', engine: 'II-Commons', status: 'idle', icon: '🧠' },
    { id: 'execute', label: 'Execute', engine: 'ii-agent', status: 'idle', icon: '⚡' },
    { id: 'verify', label: 'Verify', engine: 'ORACLE', status: 'idle', icon: '🛡' },
    { id: 'deploy', label: 'Deploy', engine: 'AIMS Bridge', status: 'idle', icon: '🚀' },
]

const TASK_CARDS: TaskCard[] = [
    {
        id: 'full-stack',
        title: 'Build Full-Stack App',
        description: 'Generate, test, and deploy a complete application',
        prompt: 'Build a modern full-stack application with authentication, dashboard, and API',
        category: 'build',
        route: 'acheevy',
    },
    {
        id: 'deep-research',
        title: 'Deep Research',
        description: 'Multi-source investigation with citations and analysis',
        prompt: 'Research the current state of ',
        category: 'research',
        route: 'acheevy',
    },
    {
        id: 'code-review',
        title: 'Code Review & Refactor',
        description: 'Analyze codebase, find issues, apply fixes',
        prompt: 'Review and refactor the following code for production quality: ',
        category: 'analyze',
        route: 'acheevy',
    },
    {
        id: 'deploy-production',
        title: 'Deploy to Production',
        description: 'Route to AIMS for infrastructure execution',
        prompt: 'Deploy this application to production with ',
        category: 'deploy',
        route: 'aims',
    },
    {
        id: 'create-slides',
        title: 'Create Presentation',
        description: 'Generate slide decks with data and visuals',
        prompt: 'Create a professional slide deck about ',
        category: 'build',
        route: 'acheevy',
    },
    {
        id: 'automate-workflow',
        title: 'Automate Workflow',
        description: 'Build n8n/automation pipelines via AIMS',
        prompt: 'Design an automation workflow that ',
        category: 'deploy',
        route: 'aims',
    },
]

const CATEGORY_COLORS: Record<string, { gradient: string; border: string; badge: string }> = {
    build: {
        gradient: 'from-[var(--acheevy-gold-400)] to-[var(--acheevy-amber-400)]',
        border: 'border-[var(--border-brand)]',
        badge: 'bg-[var(--badge-brand-bg)] text-[var(--badge-brand-text)]',
    },
    research: {
        gradient: 'from-[var(--acheevy-gold-400)] to-[var(--acheevy-amber-400)]',
        border: 'border-[var(--border-brand)]',
        badge: 'bg-[var(--badge-brand-bg)] text-[var(--badge-brand-text)]',
    },
    analyze: {
        gradient: 'from-[var(--acheevy-emerald-400)] to-[var(--acheevy-emerald-600)]',
        border: 'border-[var(--status-success)]/30',
        badge: 'bg-[var(--badge-success-bg)] text-[var(--badge-success-text)]',
    },
    deploy: {
        gradient: 'from-[var(--acheevy-flame-400)] to-[var(--acheevy-amber-400)]',
        border: 'border-[var(--acheevy-flame-400)]/30',
        badge: 'bg-[var(--acheevy-flame-400)]/15 text-[var(--acheevy-flame-400)]',
    },
}

function PipelineVisualizer({ stages }: { stages: PipelineStage[] }) {
    return (
        <div className="flex items-center gap-1 w-full overflow-x-auto py-3 px-1">
            {stages.map((stage, i) => (
                <div key={stage.id} className="flex items-center">
                    <motion.div
                        className={`flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-lg border transition-colors
                            ${stage.status === 'active' ? 'border-[var(--acheevy-gold-400)] bg-[var(--acheevy-gold-400)]/10' : ''}
                            ${stage.status === 'complete' ? 'border-[var(--status-success)] bg-[var(--status-success)]/10' : ''}
                            ${stage.status === 'error' ? 'border-[var(--status-error)] bg-[var(--status-error)]/10' : ''}
                            ${stage.status === 'idle' ? 'border-[var(--border-default)] bg-[var(--bg-glass)]' : ''}
                        `}
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                    >
                        <div className="flex items-center gap-1">
                            <span className="text-xs">{stage.icon}</span>
                            <span className="text-[10px] font-medium whitespace-nowrap text-white/80">
                                {stage.label}
                            </span>
                        </div>
                        <span className="text-[9px] text-white/30 font-mono">{stage.engine}</span>
                    </motion.div>
                    {i < stages.length - 1 && (
                        <span className="text-white/15 mx-0.5 text-xs">›</span>
                    )}
                </div>
            ))}
        </div>
    )
}

interface AcheevyDashboardProps {
    onTaskSelect: (task: TaskCard) => void
    className?: string
}

export function AcheevyDashboard({ onTaskSelect, className = '' }: AcheevyDashboardProps) {
    const [stages] = useState<PipelineStage[]>(PIPELINE_STAGES)
    const [hoveredTask, setHoveredTask] = useState<string | null>(null)

    return (
        <div className={`flex flex-col gap-4 w-full ${className}`}>
            {/* Pipeline Visualizer */}
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-glass)] backdrop-blur-md p-3">
                <div className="flex items-center gap-2 mb-1">
                    <motion.div
                        className="w-2 h-2 rounded-full bg-[var(--acheevy-emerald-400)]"
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <span className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider">
                        ACHEEVY Pipeline
                    </span>
                    <span className="text-[9px] text-[var(--text-disabled)] ml-auto hidden sm:inline">
                        NtNtN → Research → Plan → Execute → Verify → Deploy
                    </span>
                </div>
                <PipelineVisualizer stages={stages} />
            </div>

            {/* Task Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                <AnimatePresence>
                    {TASK_CARDS.map((task) => {
                        const colors = CATEGORY_COLORS[task.category]
                        return (
                            <motion.button
                                key={task.id}
                                className={`relative text-left p-4 rounded-xl border ${colors.border}
                                    bg-[var(--bg-glass)] backdrop-blur-md hover:bg-[var(--bg-glass-hover)]
                                    transition-colors group cursor-pointer`}
                                onClick={() => onTaskSelect(task)}
                                onMouseEnter={() => setHoveredTask(task.id)}
                                onMouseLeave={() => setHoveredTask(null)}
                                whileHover={{ y: -2, scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                layout
                            >
                                {/* Route Badge */}
                                <div className={`absolute top-2 right-2 text-[8px] font-bold uppercase
                                    px-1.5 py-0.5 rounded
                                    ${task.route === 'aims'
                                        ? 'bg-[var(--acheevy-flame-400)]/20 text-[var(--acheevy-flame-400)]'
                                        : 'bg-[var(--badge-brand-bg)] text-[var(--badge-brand-text)]'
                                    }`}>
                                    {task.route === 'aims' ? '→ AIMS' : 'ACHEEVY'}
                                </div>

                                {/* Icon */}
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3
                                    bg-gradient-to-br ${colors.gradient} text-black text-sm`}>
                                    {task.category === 'build' && '⚡'}
                                    {task.category === 'research' && '🔍'}
                                    {task.category === 'analyze' && '🔬'}
                                    {task.category === 'deploy' && '🌐'}
                                </div>

                                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1 pr-14">
                                    {task.title}
                                </h4>
                                <p className="text-[11px] text-[var(--text-tertiary)] leading-relaxed">
                                    {task.description}
                                </p>

                                <motion.div
                                    className="flex items-center gap-1 mt-3 text-[10px] text-[var(--text-disabled)]
                                        group-hover:text-[var(--text-secondary)] transition-colors"
                                    animate={{ x: hoveredTask === task.id ? 3 : 0 }}
                                >
                                    <span>Start task →</span>
                                </motion.div>
                            </motion.button>
                        )
                    })}
                </AnimatePresence>
            </div>

            {/* Routing Legend */}
            <div className="flex items-center gap-4 text-[9px] text-[var(--text-disabled)] justify-center">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[var(--acheevy-gold-400)]" />
                    <span>ACHEEVY = executes here (plugmein.cloud)</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[var(--acheevy-flame-400)]" />
                    <span>→ AIMS = routes to aimanagedsolutions.cloud</span>
                </div>
            </div>
        </div>
    )
}

export default AcheevyDashboard
