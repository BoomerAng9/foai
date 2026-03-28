import { AGENT_TYPE } from '@/typings'
import { Button } from './ui/button'

interface SuggestionsProps {
    hidden?: boolean
    onSelect: (text: string) => void
    suggestions?: string[]
    agentType?: string | null
}

const DEFAULT_SUGGESTIONS: Partial<Record<AGENT_TYPE, string[]>> = {
    [AGENT_TYPE.GENERAL]: [
        'Build a SaaS dashboard with auth and billing',
        'Clone superagent.com for real estate agents',
        'Create a 3D landing page with scroll animations',
        'Research top AI coding assistants with citations'
    ],
    [AGENT_TYPE.MEDIA]: [
        'Render cinematic perfume visuals on frosted glass',
        'Design cyberpunk mech poster with brand markings',
        'Shoot stop-motion clip highlighting product assembly',
        'Film 15s hairstyle demo with bold lighting shifts',
        'Draft surreal poster art for new headphones drop'
    ],
    [AGENT_TYPE.SLIDE]: [
        'Build an investor pitch deck for an AI startup',
        'Create cybersecurity training slides',
        'Draft a product launch update deck',
        'Explain AI impact on future work',
        'Outline a SaaS onboarding walkthrough'
    ],
    [AGENT_TYPE.WEBSITE_BUILD]: [
        'Build a 3D hero landing page with glassmorphism',
        'Create a multi-page portfolio with scroll animations',
        'Develop a real-time metrics dashboard with charts',
        'Build a searchable knowledge base with MDX'
    ]
}

const Suggestions = ({
    hidden,
    onSelect,
    suggestions,
    agentType = AGENT_TYPE.GENERAL
}: SuggestionsProps) => {
    const fallbackSuggestions = DEFAULT_SUGGESTIONS[AGENT_TYPE.GENERAL] ?? []
    const suggestionsToRender =
        suggestions ??
        DEFAULT_SUGGESTIONS[(agentType as AGENT_TYPE) ?? AGENT_TYPE.GENERAL] ??
        fallbackSuggestions

    if (hidden) return null
    return (
        <div className="hidden md:flex items-center flex-wrap max-h-[50px] overflow-auto gap-x-2 gap-y-[6px]">
            {suggestionsToRender.map((item) => (
                <Button
                    key={item}
                    className="text-xs bg-[var(--bg-raised)] dark:bg-[var(--bg-glass)] px-2 py-[3px] h-[22px] rounded-full text-[var(--text-primary)] dark:text-[var(--text-secondary)] border border-[var(--border-default)] hover:border-[var(--border-brand)] hover:text-[var(--text-brand)] transition-colors"
                    onClick={() => onSelect(item)}
                >
                    {item}
                </Button>
            ))}
        </div>
    )
}

export default Suggestions
