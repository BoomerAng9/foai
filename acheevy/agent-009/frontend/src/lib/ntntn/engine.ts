/**
 * NtNtN Engine — Frontend Interface
 * Creative build factory: NLP intent detection → category classification → scope tiering.
 * Mirrors the backend aims-skills/ntntn-engine/index.ts logic for client-side previews.
 *
 * Pipeline: User describes → detectBuildIntent → classifyBuildIntent → detectScopeTier
 *           → Picker_Ang selects → Buildsmith constructs → Chicken Hawk verifies
 */

// ── Build Trigger Words ──
const BUILD_TRIGGERS = new Set([
    'build', 'create', 'make', 'design', 'develop', 'generate', 'scaffold',
    'implement', 'construct', 'craft', 'produce', 'set up', 'spin up',
    'launch', 'deploy', 'ship', 'clone', 'replicate', 'customize'
])

const TARGET_WORDS = new Set([
    'website', 'site', 'page', 'app', 'application', 'dashboard', 'portal',
    'component', 'ui', 'interface', 'layout', 'section', 'form', 'modal',
    'animation', 'landing', 'hero', 'navbar', 'sidebar', 'footer',
    'api', 'backend', 'server', 'database', 'webhook', 'automation',
    'platform', 'saas', 'marketplace', 'storefront', 'blog', 'cms'
])

// ── NtNtN Categories ──
export const NTNTN_CATEGORIES = {
    FRONTEND_FRAMEWORKS: 'frontend-frameworks',
    ANIMATION_MOTION: 'animation-motion',
    STYLING_SYSTEMS: 'styling-systems',
    THREE_D_VISUAL: '3d-visual',
    SCROLL_INTERACTION: 'scroll-interaction',
    UI_COMPONENTS: 'ui-components',
    LAYOUT_RESPONSIVE: 'layout-responsive',
    BACKEND_FULLSTACK: 'backend-fullstack',
    CMS_CONTENT: 'cms-content',
    DEPLOYMENT_INFRA: 'deployment-infra'
} as const

export const CATEGORY_LABELS: Record<string, string> = {
    [NTNTN_CATEGORIES.FRONTEND_FRAMEWORKS]: 'Frontend Frameworks',
    [NTNTN_CATEGORIES.ANIMATION_MOTION]: 'Animation & Motion',
    [NTNTN_CATEGORIES.STYLING_SYSTEMS]: 'Styling Systems',
    [NTNTN_CATEGORIES.THREE_D_VISUAL]: '3D & Visual',
    [NTNTN_CATEGORIES.SCROLL_INTERACTION]: 'Scroll & Interaction',
    [NTNTN_CATEGORIES.UI_COMPONENTS]: 'UI Components',
    [NTNTN_CATEGORIES.LAYOUT_RESPONSIVE]: 'Layout & Responsive',
    [NTNTN_CATEGORIES.BACKEND_FULLSTACK]: 'Backend & Fullstack',
    [NTNTN_CATEGORIES.CMS_CONTENT]: 'CMS & Content',
    [NTNTN_CATEGORIES.DEPLOYMENT_INFRA]: 'Deployment & Infra'
}

export const CATEGORY_COLORS: Record<string, string> = {
    [NTNTN_CATEGORIES.FRONTEND_FRAMEWORKS]: '#D4AF37',
    [NTNTN_CATEGORIES.ANIMATION_MOTION]: '#FF6B35',
    [NTNTN_CATEGORIES.STYLING_SYSTEMS]: '#D4881F',
    [NTNTN_CATEGORIES.THREE_D_VISUAL]: '#f43f5e',
    [NTNTN_CATEGORIES.SCROLL_INTERACTION]: '#d4881f',
    [NTNTN_CATEGORIES.UI_COMPONENTS]: '#39ff14',
    [NTNTN_CATEGORIES.LAYOUT_RESPONSIVE]: '#B7791F',
    [NTNTN_CATEGORIES.BACKEND_FULLSTACK]: '#d4af37',
    [NTNTN_CATEGORIES.CMS_CONTENT]: '#14b8a6',
    [NTNTN_CATEGORIES.DEPLOYMENT_INFRA]: '#D4881F'
}

export const CATEGORY_ICONS: Record<string, string> = {
    [NTNTN_CATEGORIES.FRONTEND_FRAMEWORKS]: '◆',
    [NTNTN_CATEGORIES.ANIMATION_MOTION]: '◈',
    [NTNTN_CATEGORIES.STYLING_SYSTEMS]: '◇',
    [NTNTN_CATEGORIES.THREE_D_VISUAL]: '△',
    [NTNTN_CATEGORIES.SCROLL_INTERACTION]: '▽',
    [NTNTN_CATEGORIES.UI_COMPONENTS]: '□',
    [NTNTN_CATEGORIES.LAYOUT_RESPONSIVE]: '▣',
    [NTNTN_CATEGORIES.BACKEND_FULLSTACK]: '⬡',
    [NTNTN_CATEGORIES.CMS_CONTENT]: '▶',
    [NTNTN_CATEGORIES.DEPLOYMENT_INFRA]: '●'
}

// ── Keyword → Category Mapping ──
const CATEGORY_KEYWORDS: Record<string, string[]> = {
    [NTNTN_CATEGORIES.FRONTEND_FRAMEWORKS]: [
        'react', 'next', 'nextjs', 'vue', 'nuxt', 'svelte', 'angular',
        'astro', 'solid', 'qwik', 'remix', 'gatsby', 'web component'
    ],
    [NTNTN_CATEGORIES.ANIMATION_MOTION]: [
        'animation', 'animate', 'motion', 'framer', 'gsap', 'lottie',
        'rive', 'transition', 'spring', 'bounce', 'ease', 'keyframe',
        'morph', 'tween', 'parallax'
    ],
    [NTNTN_CATEGORIES.STYLING_SYSTEMS]: [
        'tailwind', 'css', 'style', 'theme', 'sass', 'scss', 'styled',
        'vanilla extract', 'uno', 'gradient', 'glassmorphism', 'dark mode'
    ],
    [NTNTN_CATEGORIES.THREE_D_VISUAL]: [
        '3d', 'three', 'threejs', 'webgl', 'webgpu', 'babylon', 'spline',
        'canvas', 'svg', 'shader', 'particle', 'mesh', 'geometry',
        'scene', 'camera', 'lighting', 'bloom', 'glow', 'reflection'
    ],
    [NTNTN_CATEGORIES.SCROLL_INTERACTION]: [
        'scroll', 'intersect', 'trigger', 'lenis', 'locomotive',
        'scrollytelling', 'sticky', 'snap', 'reveal', 'viewport'
    ],
    [NTNTN_CATEGORIES.UI_COMPONENTS]: [
        'component', 'button', 'card', 'modal', 'dialog', 'dropdown',
        'tooltip', 'form', 'input', 'table', 'carousel', 'tab',
        'accordion', 'sidebar', 'navbar', 'radix', 'shadcn', 'headless'
    ],
    [NTNTN_CATEGORIES.LAYOUT_RESPONSIVE]: [
        'layout', 'grid', 'flexbox', 'responsive', 'mobile', 'adaptive',
        'container query', 'fluid', 'breakpoint', 'column', 'masonry'
    ],
    [NTNTN_CATEGORIES.BACKEND_FULLSTACK]: [
        'api', 'backend', 'server', 'endpoint', 'database', 'prisma',
        'postgres', 'redis', 'auth', 'webhook', 'rest', 'graphql',
        'trpc', 'fastapi', 'express', 'node', 'python', 'docker',
        'stripe', 'payment', 'subscription', 'cron', 'job', 'queue'
    ],
    [NTNTN_CATEGORIES.CMS_CONTENT]: [
        'cms', 'content', 'blog', 'article', 'post', 'markdown', 'mdx',
        'sanity', 'strapi', 'contentful', 'payload', 'headless cms'
    ],
    [NTNTN_CATEGORIES.DEPLOYMENT_INFRA]: [
        'deploy', 'deployment', 'vercel', 'netlify', 'cloudflare',
        'aws', 'gcp', 'vps', 'docker', 'compose', 'ci', 'cd',
        'pipeline', 'cdn', 'ssl', 'domain', 'nginx', 'monitoring'
    ]
}

// ── Scope Tiers ──
export type ScopeTier = 'component' | 'page' | 'application' | 'platform'

export const SCOPE_TIER_INFO: Record<ScopeTier, {
    label: string
    cost: string
    time: string
    color: string
    description: string
}> = {
    component: {
        label: 'Component',
        cost: '$0.25–$0.75',
        time: '2–5 min',
        color: '#6ee7b7',
        description: 'A single UI pattern or reusable block'
    },
    page: {
        label: 'Page',
        cost: '$1–$3',
        time: '5–15 min',
        color: '#93c5fd',
        description: 'A full landing page, form, or content layout'
    },
    application: {
        label: 'Application',
        cost: '$3–$8',
        time: '15–45 min',
        color: '#D4AF37',
        description: 'A multi-page app with routing, state, and API'
    },
    platform: {
        label: 'Platform',
        cost: '$8–$20',
        time: '45–120 min',
        color: '#fbbf24',
        description: 'Enterprise SaaS with auth, billing, and deploy'
    }
}

// ── Build Phases ──
export const BUILD_PHASES = [
    { id: 'intake', label: 'Intake', icon: '◇', description: 'Build manifest created from creative brief' },
    { id: 'image', label: 'Image', icon: '◆', description: 'Visual assets generated & optimized (Pillar 1)' },
    { id: 'interface', label: 'Interface', icon: '⬡', description: 'Code generated in sandbox (Pillar 2)' },
    { id: 'integrations', label: 'Integrations', icon: '▲', description: 'DB, auth, API, deploy wired (Pillar 3)' },
    { id: 'verification', label: 'Verification', icon: '◈', description: 'ORACLE gates + Lighthouse + a11y' },
    { id: 'sign', label: 'Sign', icon: '●', description: 'Buildsmith signature + delivery package' }
] as const

// ── NLP Functions ──

export function detectBuildIntent(message: string): boolean {
    const lower = message.toLowerCase()
    const words = lower.split(/\s+/)

    const hasTrigger = words.some((w) => BUILD_TRIGGERS.has(w))
    const hasTarget = words.some((w) => TARGET_WORDS.has(w))

    return hasTrigger && hasTarget
}

export interface CategoryMatch {
    category: string
    label: string
    color: string
    icon: string
    score: number
}

export function classifyBuildIntent(message: string): CategoryMatch[] {
    const lower = message.toLowerCase()
    const matches: CategoryMatch[] = []

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        const score = keywords.reduce((acc, kw) => {
            return acc + (lower.includes(kw) ? 1 : 0)
        }, 0)

        if (score > 0) {
            matches.push({
                category,
                label: CATEGORY_LABELS[category],
                color: CATEGORY_COLORS[category],
                icon: CATEGORY_ICONS[category],
                score
            })
        }
    }

    return matches.sort((a, b) => b.score - a.score)
}

export function detectScopeTier(message: string): ScopeTier {
    const lower = message.toLowerCase()

    const platformKeywords = ['platform', 'saas', 'enterprise', 'marketplace', 'multi-tenant', 'billing']
    const appKeywords = ['app', 'application', 'dashboard', 'portal', 'multi-page', 'routing', 'auth']
    const pageKeywords = ['page', 'landing', 'portfolio', 'form', 'hero', 'section']

    if (platformKeywords.some((k) => lower.includes(k))) return 'platform'
    if (appKeywords.some((k) => lower.includes(k))) return 'application'
    if (pageKeywords.some((k) => lower.includes(k))) return 'page'
    return 'component'
}

// ── Export bundle ──
export const ntntnEngine = {
    detectBuildIntent,
    classifyBuildIntent,
    detectScopeTier,
    NTNTN_CATEGORIES,
    CATEGORY_LABELS,
    CATEGORY_COLORS,
    CATEGORY_ICONS,
    SCOPE_TIER_INFO,
    BUILD_PHASES
}

export default ntntnEngine
