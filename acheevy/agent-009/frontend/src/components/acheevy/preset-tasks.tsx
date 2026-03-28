import { motion } from 'framer-motion'
import { Icon } from '@/components/ui/icon'

/**
 * ACHEEVY-009 — Preset Task Cards
 * Pre-built task suggestions that showcase ACHEEVY's strengths via the NtNtN Engine.
 * Each card maps to a specific NtNtN category and scope tier.
 *
 * NtNtN Categories:
 *  1. Frontend Frameworks  2. Animation & Motion   3. Styling Systems
 *  4. 3D & Visual          5. Scroll & Interaction  6. UI Components
 *  7. Layout & Responsive  8. Backend & Fullstack   9. CMS & Content
 * 10. Deployment & Infra
 */

export interface PresetTask {
    id: string
    title: string
    description: string
    prompt: string
    icon: string
    category: string
    categoryColor: string
    scopeTier: 'component' | 'page' | 'application' | 'platform'
    estimatedTime: string
    tags: string[]
}

export const ACHEEVY_PRESET_TASKS: PresetTask[] = [
    {
        id: 'mim-webapp',
        title: 'Build a Full-Stack Web App',
        description: 'Describe your app idea and ACHEEVY-009 scaffolds the entire project via the M.I.M. pipeline.',
        prompt: 'Build a modern SaaS dashboard with user authentication, real-time data charts, and a billing page. Use React, Tailwind, and a Node.js API backend.',
        icon: 'ai-browser',
        category: 'Full-Stack Build',
        categoryColor: '#D4AF37',
        scopeTier: 'application',
        estimatedTime: '15-45 min',
        tags: ['M.I.M.', 'NtNtN', 'Buildsmith']
    },
    {
        id: 'deep-research',
        title: 'Deep Research Report',
        description: 'Multi-agent research with citations, data synthesis, and interactive scrollytelling output.',
        prompt: 'Research the current state of autonomous AI agents in enterprise. Compare top 10 platforms, pricing, capabilities, and market share. Produce an interactive report with charts.',
        icon: 'property-search',
        category: 'Deep Scout',
        categoryColor: '#06b6d4',
        scopeTier: 'page',
        estimatedTime: '5-15 min',
        tags: ['Research', 'Citations', 'Deep Scout']
    },
    {
        id: 'slide-deck',
        title: 'AI Presentation Builder',
        description: 'Turn a brief into a polished slide deck with AI-generated visuals and structured content.',
        prompt: 'Create a 12-slide investor pitch deck for an AI-powered coding education platform targeting bootcamp graduates. Include market size, product demo mockups, revenue model, and team slide.',
        icon: 'presentation',
        category: 'Slide Builder',
        categoryColor: '#f59e0b',
        scopeTier: 'page',
        estimatedTime: '5-10 min',
        tags: ['Slides', 'Presentation', 'Visual']
    },
    {
        id: '3d-landing',
        title: '3D Interactive Landing Page',
        description: 'A next-gen landing page with Three.js 3D scenes, scroll animations, and glassmorphism.',
        prompt: 'Build a landing page with a 3D hero scene featuring a floating crystal orb, parallax scroll effects, glassmorphism cards, animated gradient text, and a dark mode toggle. Make it mobile responsive.',
        icon: 'bracket-square',
        category: '3D & Visual',
        categoryColor: '#ec4899',
        scopeTier: 'page',
        estimatedTime: '10-20 min',
        tags: ['3D', 'Three.js', 'Framer Motion']
    },
    {
        id: 'clone-product',
        title: 'Clone & Customize Any Product',
        description: 'Point at a product, ACHEEVY-009 reverse-engineers it and builds your customized version.',
        prompt: 'Clone the Superagent.com platform. Adapt it for a real estate agency: property research, market analysis reports, and automated listing descriptions. Brand it as "PropertyScout".',
        icon: 'usb',
        category: 'M.I.M. Clone',
        categoryColor: '#10b981',
        scopeTier: 'application',
        estimatedTime: '20-45 min',
        tags: ['M.I.M.', 'Clone', 'Industry Preset']
    },
    {
        id: 'api-automation',
        title: 'API & Automation Pipeline',
        description: 'Build backend services, webhooks, cron jobs, and integration pipelines autonomously.',
        prompt: 'Create a webhook-driven automation: when a new row appears in a Google Sheet, validate the data, enrich it via an external API, store in PostgreSQL, and send a Slack notification with a summary.',
        icon: 'setting',
        category: 'Backend & Fullstack',
        categoryColor: '#3b82f6',
        scopeTier: 'application',
        estimatedTime: '15-30 min',
        tags: ['API', 'Automation', 'Backend']
    }
]

const SCOPE_TIER_LABELS: Record<string, { label: string; color: string }> = {
    component: { label: 'Component', color: '#6ee7b7' },
    page: { label: 'Page', color: '#93c5fd' },
    application: { label: 'Application', color: '#D4AF37' },
    platform: { label: 'Platform', color: '#fbbf24' }
}

const cardVariants = {
    hidden: { opacity: 0, y: 24, scale: 0.96 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            delay: i * 0.08,
            duration: 0.5,
            ease: [0.16, 1, 0.3, 1] as [number, number, number, number]
        }
    })
}

interface PresetTaskCardProps {
    task: PresetTask
    index: number
    onSelect: (prompt: string) => void
}

function PresetTaskCard({ task, index, onSelect }: PresetTaskCardProps) {
    const tier = SCOPE_TIER_LABELS[task.scopeTier]

    return (
        <motion.button
            custom={index}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover={{
                scale: 1.03,
                y: -4,
                boxShadow: `0 20px 40px rgba(0,0,0,0.3), 0 0 60px ${task.categoryColor}15`
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-5 text-left cursor-pointer hover:border-white/20"
            style={{
                perspective: '1000px',
                transformStyle: 'preserve-3d'
            }}
            onClick={() => onSelect(task.prompt)}
        >
            {/* Gradient accent line */}
            <div
                className="absolute top-0 left-0 right-0 h-[2px] opacity-60 group-hover:opacity-100 transition-opacity"
                style={{
                    background: `linear-gradient(90deg, transparent, ${task.categoryColor}, transparent)`
                }}
            />

            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${task.categoryColor}15` }}
                    >
                        <Icon
                            name={task.icon}
                            className="size-5"
                            style={{ fill: task.categoryColor } as React.CSSProperties}
                        />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white group-hover:text-white/90">
                            {task.title}
                        </h3>
                        <span
                            className="text-[10px] font-mono uppercase tracking-wider"
                            style={{ color: task.categoryColor }}
                        >
                            {task.category}
                        </span>
                    </div>
                </div>
            </div>

            {/* Description */}
            <p className="text-xs text-grey-2 leading-relaxed mb-4">
                {task.description}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                    {task.tags.slice(0, 3).map((tag) => (
                        <span
                            key={tag}
                            className="text-[9px] px-2 py-0.5 rounded-full border border-white/10 text-grey-2"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <span
                        className="text-[9px] px-2 py-0.5 rounded-full font-medium"
                        style={{
                            backgroundColor: `${tier.color}15`,
                            color: tier.color
                        }}
                    >
                        {tier.label}
                    </span>
                    <span className="text-[10px] text-grey-2 font-mono">
                        {task.estimatedTime}
                    </span>
                </div>
            </div>

            {/* Hover glow effect */}
            <motion.div
                className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                    background: `radial-gradient(circle at 50% 0%, ${task.categoryColor}08, transparent 60%)`
                }}
            />
        </motion.button>
    )
}

interface PresetTasksGridProps {
    onSelect: (prompt: string) => void
    className?: string
}

export function PresetTasksGrid({ onSelect, className = '' }: PresetTasksGridProps) {
    return (
        <div className={`${className}`}>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-sm font-semibold text-white">
                        Quick Launch
                    </h2>
                    <p className="text-xs text-grey-2 mt-0.5">
                        Preset tasks powered by the NtNtN Engine
                    </p>
                </div>
                <span className="text-[10px] text-grey-2 font-mono tracking-wider uppercase px-2 py-1 rounded-full border border-white/10">
                    ACHEEVY-009
                </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {ACHEEVY_PRESET_TASKS.map((task, i) => (
                    <PresetTaskCard
                        key={task.id}
                        task={task}
                        index={i}
                        onSelect={onSelect}
                    />
                ))}
            </div>
        </div>
    )
}

export default PresetTasksGrid
