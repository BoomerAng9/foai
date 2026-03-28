import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

/**
 * ACHEEVY-009 — LLM Loader
 * A modern AI loader that shows the NtNtN pipeline phases while the agent is thinking.
 * Uses morphing shapes, pulsing gradients, and streaming text.
 */

const PIPELINE_PHASES = [
    { label: 'Detecting Intent', icon: '◆', color: 'var(--acheevy-gold-400)' },
    { label: 'Picker_Ang Selecting Stack', icon: '⬡', color: 'var(--acheevy-amber-400)' },
    { label: 'Buildsmith Constructing', icon: '▲', color: 'var(--acheevy-emerald-400)' },
    { label: 'Chicken Hawk Verifying', icon: '◈', color: 'var(--acheevy-amber-400)' },
    { label: 'ACHEEVY Deploying', icon: '●', color: 'var(--acheevy-flame-400)' }
]

const THINKING_MESSAGES = [
    'Analyzing creative brief...',
    'Mapping categories from NtNtN Engine...',
    'Selecting frameworks & techniques...',
    'Assembling build manifest...',
    'Running ORACLE verification gates...',
    'Preparing execution sandbox...',
    'Generating visual assets...',
    'Composing interface code...',
    'Wiring integrations...',
    'Finalizing deployment...'
]

function PulseRing({ delay, size, color }: { delay: number; size: number; color: string }) {
    return (
        <motion.div
            className="absolute rounded-full border"
            style={{
                width: size,
                height: size,
                borderColor: color,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
            }}
            initial={{ scale: 0.8, opacity: 0.6 }}
            animate={{
                scale: [0.8, 1.4, 0.8],
                opacity: [0.6, 0, 0.6]
            }}
            transition={{
                duration: 3,
                repeat: Infinity,
                delay,
                ease: 'easeInOut'
            }}
        />
    )
}

function MorphShape() {
    return (
        <motion.div
            className="w-12 h-12 relative"
            animate={{
                rotate: [0, 90, 180, 270, 360]
            }}
            transition={{
                duration: 8,
                repeat: Infinity,
                ease: 'linear'
            }}
        >
            <motion.div
                className="absolute inset-0"
                style={{
                    background: 'conic-gradient(from 0deg, var(--acheevy-gold-400), var(--acheevy-amber-400), var(--acheevy-emerald-400), var(--acheevy-flame-400), var(--acheevy-gold-700), var(--acheevy-gold-400))',
                    borderRadius: '50%'
                }}
                animate={{
                    borderRadius: ['50%', '30%', '50%', '20% 50%', '50%'],
                    scale: [1, 1.1, 0.95, 1.05, 1]
                }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeInOut'
                }}
            />
            <div
                className="absolute inset-[3px] bg-[var(--bg-base)] rounded-full"
                style={{ borderRadius: 'inherit' }}
            />
        </motion.div>
    )
}

interface AcheevyLoaderProps {
    isActive?: boolean
    phase?: number
    message?: string
    variant?: 'compact' | 'full' | 'inline'
}

export function AcheevyLoader({
    isActive = true,
    phase = 0,
    message,
    variant = 'full'
}: AcheevyLoaderProps) {
    const [currentMsg, setCurrentMsg] = useState(0)
    const [displayText, setDisplayText] = useState('')

    useEffect(() => {
        if (!isActive) return
        const interval = setInterval(() => {
            setCurrentMsg((prev) => (prev + 1) % THINKING_MESSAGES.length)
        }, 3000)
        return () => clearInterval(interval)
    }, [isActive])

    // Typewriter effect
    useEffect(() => {
        const target = message || THINKING_MESSAGES[currentMsg]
        let i = 0
        setDisplayText('')
        const interval = setInterval(() => {
            if (i <= target.length) {
                setDisplayText(target.slice(0, i))
                i++
            } else {
                clearInterval(interval)
            }
        }, 30)
        return () => clearInterval(interval)
    }, [currentMsg, message])

    if (!isActive) return null

    if (variant === 'inline') {
        return (
            <motion.div
                className="flex items-center gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div
                    className="flex gap-1"
                >
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            className="w-2 h-2 rounded-full bg-[var(--acheevy-gold-400)]"
                            animate={{
                                y: [0, -6, 0],
                                opacity: [0.5, 1, 0.5]
                            }}
                            transition={{
                                duration: 1.2,
                                repeat: Infinity,
                                delay: i * 0.2
                            }}
                        />
                    ))}
                </motion.div>
                <span className="text-sm text-[var(--text-tertiary)] font-mono">
                    {displayText}
                    <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity }}
                    >
                        ▋
                    </motion.span>
                </span>
            </motion.div>
        )
    }

    if (variant === 'compact') {
        return (
            <motion.div
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--bg-glass)] backdrop-blur-md border border-[var(--border-default)]"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
            >
                <MorphShape />
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text-primary)] font-medium truncate">
                        Agent ACHEEVY-009
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)] font-mono truncate">
                        {displayText}
                        <motion.span
                            animate={{ opacity: [1, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity }}
                        >
                            ▋
                        </motion.span>
                    </p>
                </div>
            </motion.div>
        )
    }

    return (
        <motion.div
            className="flex flex-col items-center gap-6 py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Morphing core with pulse rings */}
            <div className="relative w-32 h-32 flex items-center justify-center">
                <PulseRing delay={0} size={100} color="rgba(212,175,55,0.3)" />
                <PulseRing delay={0.8} size={120} color="rgba(212,136,31,0.2)" />
                <PulseRing delay={1.6} size={140} color="rgba(57,255,20,0.15)" />
                <MorphShape />
            </div>

            {/* Agent identity */}
            <div className="text-center">
                <motion.p
                    className="text-lg font-semibold text-[var(--text-primary)]"
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    ACHEEVY-009
                </motion.p>
                <p className="text-xs text-[var(--text-tertiary)] mt-1 tracking-widest uppercase">
                    NtNtN Engine Active
                </p>
            </div>

            {/* Pipeline phase indicator */}
            <div className="flex items-center gap-2">
                {PIPELINE_PHASES.map((p, i) => (
                    <motion.div
                        key={i}
                        className="flex items-center gap-1"
                        animate={{
                            opacity: i <= phase ? 1 : 0.3,
                            scale: i === phase ? 1.1 : 1
                        }}
                        transition={{ type: 'spring', stiffness: 300 }}
                    >
                        <span
                            className="text-xs"
                            style={{ color: p.color }}
                        >
                            {p.icon}
                        </span>
                        {i < PIPELINE_PHASES.length - 1 && (
                            <motion.div
                                className="w-6 h-[2px] rounded"
                                style={{ backgroundColor: i < phase ? p.color : 'rgba(255,255,255,0.1)' }}
                                animate={i === phase ? {
                                    scaleX: [0, 1],
                                    backgroundColor: [p.color, PIPELINE_PHASES[i + 1]?.color || p.color]
                                } : {}}
                                transition={{ duration: 2 }}
                            />
                        )}
                    </motion.div>
                ))}
            </div>

            {/* Streaming message */}
            <AnimatePresence mode="wait">
                <motion.p
                    key={currentMsg}
                    className="text-sm text-[var(--text-tertiary)] font-mono text-center max-w-sm"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                >
                    {displayText}
                    <motion.span
                        className="text-[var(--text-brand)]"
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity }}
                    >
                        ▋
                    </motion.span>
                </motion.p>
            </AnimatePresence>
        </motion.div>
    )
}

export default AcheevyLoader
