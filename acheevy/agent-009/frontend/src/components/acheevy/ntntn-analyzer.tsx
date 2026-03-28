import { motion, AnimatePresence } from 'framer-motion'
import { useState, useMemo, useEffect } from 'react'
import {
    classifyBuildIntent,
    detectBuildIntent,
    detectScopeTier,
    SCOPE_TIER_INFO,
    BUILD_PHASES,
    type CategoryMatch,
    type ScopeTier
} from '@/lib/ntntn/engine'

/**
 * ACHEEVY-009 — NtNtN Build Intent Analyzer
 * Shows real-time NLP analysis as the user types, displaying detected categories,
 * scope tier, estimated cost/time, and the pipeline phases.
 */

interface NtNtNAnalyzerProps {
    inputText: string
    isVisible?: boolean
    className?: string
}

const CATEGORY_ICON_CLASS: Record<string, string> = {
    'frontend-frameworks': 'text-[#7c7d70]',
    'animation-motion': 'text-[#8d8575]',
    'styling-systems': 'text-[#676661]',
    '3d-visual': 'text-[#9f7f72]',
    'scroll-interaction': 'text-[#7f8c8d]',
    'ui-components': 'text-[#6b796a]',
    'layout-responsive': 'text-[#8a8479]',
    'backend-fullstack': 'text-[#5f6160]',
    'cms-content': 'text-[#73827a]',
    'deployment-infra': 'text-[#887e71]'
}

const CATEGORY_SCORE_CLASS: Record<string, string> = {
    'frontend-frameworks': 'bg-[#eceae4] text-[#6f7064]',
    'animation-motion': 'bg-[#efe9e1] text-[#7e7160]',
    'styling-systems': 'bg-[#ece8e2] text-[#676661]',
    '3d-visual': 'bg-[#f1e8e3] text-[#8a6f65]',
    'scroll-interaction': 'bg-[#eceee9] text-[#6f7876]',
    'ui-components': 'bg-[#e9efe7] text-[#667261]',
    'layout-responsive': 'bg-[#efeee9] text-[#7d786d]',
    'backend-fullstack': 'bg-[#ececeb] text-[#5f6160]',
    'cms-content': 'bg-[#e7efeb] text-[#64756d]',
    'deployment-infra': 'bg-[#f0ece7] text-[#7f7468]'
}

const SCOPE_LABEL_CLASS: Record<ScopeTier, string> = {
    component: 'text-[#6d776a]',
    page: 'text-[#6b6f7d]',
    application: 'text-[#6f675d]',
    platform: 'text-[#6a645b]'
}

function CategoryChip({ match, index }: { match: CategoryMatch; index: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            transition={{ delay: index * 0.05, type: 'spring', stiffness: 400, damping: 25 }}
            className="flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[#f7f5f1] px-2.5 py-1"
        >
            <span className={`text-[10px] ${CATEGORY_ICON_CLASS[match.category] ?? 'text-[#676661]'}`}>
                {match.icon}
            </span>
            <span className="text-[10px] font-medium text-[var(--text-primary)]">
                {match.label}
            </span>
            <span
                className={`rounded-full px-1 py-0.5 font-mono text-[9px] ${CATEGORY_SCORE_CLASS[match.category] ?? 'bg-[#eceae4] text-[#676661]'}`}
            >
                {match.score}
            </span>
        </motion.div>
    )
}

function ScopeBadge({ tier }: { tier: ScopeTier }) {
    const info = SCOPE_TIER_INFO[tier]
    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 rounded-[14px] border border-[var(--border-default)] bg-[#f7f5f1] px-3 py-2"
        >
            <div>
                <span className={`text-xs font-semibold ${SCOPE_LABEL_CLASS[tier]}`}>
                    {info.label}
                </span>
                <p className="mt-0.5 text-[10px] text-[var(--text-secondary)]">
                    {info.description}
                </p>
            </div>
            <div className="flex flex-col items-end gap-0.5">
                <span className="text-[10px] font-mono text-[var(--text-secondary)]">{info.cost}</span>
                <span className="text-[10px] font-mono text-[var(--text-tertiary)]">{info.time}</span>
            </div>
        </motion.div>
    )
}

function PipelinePhases({ activePhase }: { activePhase: number }) {
    return (
        <div className="flex items-center gap-1">
            {BUILD_PHASES.map((phase, i) => (
                <motion.div
                    key={phase.id}
                    className="flex items-center gap-1"
                    animate={{
                        opacity: i <= activePhase ? 1 : 0.3
                    }}
                >
                    <motion.div
                        className={`flex h-5 w-5 items-center justify-center rounded-full border text-[8px] ${
                            i <= activePhase
                                ? 'border-[#a9a59d] bg-[#f0efeb] text-[#1d1d1b]'
                                : 'border-[#d5d2cb] bg-white text-[#92908a]'
                        }`}
                        animate={i === activePhase ? {
                            scale: [1, 1.15, 1],
                            borderColor: ['#bdb8ae', '#8f8a81', '#bdb8ae']
                        } : {}}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    >
                        {phase.icon}
                    </motion.div>
                    {i < BUILD_PHASES.length - 1 && (
                        <div
                            className={`h-px w-3 ${i < activePhase ? 'bg-[#b9b4aa]' : 'bg-[#dbd8d1]'}`}
                        />
                    )}
                </motion.div>
            ))}
        </div>
    )
}

export function NtNtNAnalyzer({ inputText, isVisible = true, className = '' }: NtNtNAnalyzerProps) {
    const [animPhase, setAnimPhase] = useState(0)

    const hasBuildIntent = useMemo(() => detectBuildIntent(inputText), [inputText])
    const categories = useMemo(() => classifyBuildIntent(inputText), [inputText])
    const scopeTier = useMemo(() => detectScopeTier(inputText), [inputText])

    // Animate through phases when build intent is detected
    useEffect(() => {
        if (!hasBuildIntent) {
            setAnimPhase(0)
            return
        }
        const interval = setInterval(() => {
            setAnimPhase((prev) => (prev + 1) % BUILD_PHASES.length)
        }, 2000)
        return () => clearInterval(interval)
    }, [hasBuildIntent])

    if (!isVisible || !inputText.trim() || !hasBuildIntent) return null

    return (
        <motion.div
            className={`rounded-[16px] border border-[var(--border-default)] bg-white p-3 shadow-[0_8px_24px_rgba(75,70,61,0.07)] ${className}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <motion.div
                        className="h-2 w-2 rounded-full bg-[#7d9b74]"
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)]">
                        NtNtN Engine — Build Intent Detected
                    </span>
                </div>
                <PipelinePhases activePhase={animPhase} />
            </div>

            {/* Categories */}
            <AnimatePresence mode="popLayout">
                <div className="flex flex-wrap gap-1.5 mb-2">
                    {categories.map((match, i) => (
                        <CategoryChip key={match.category} match={match} index={i} />
                    ))}
                </div>
            </AnimatePresence>

            {/* Scope */}
            <ScopeBadge tier={scopeTier} />
        </motion.div>
    )
}

export default NtNtNAnalyzer
