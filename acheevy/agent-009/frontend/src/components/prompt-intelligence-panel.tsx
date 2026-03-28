import type { EnhancePromptResponse } from '@/services/prompt.service'

interface PromptIntelligencePanelProps {
    data: EnhancePromptResponse | null
    className?: string
}

const scopeTierLabel: Record<string, string> = {
    component: 'Component',
    page: 'Page',
    application: 'Application',
    platform: 'Platform'
}

export default function PromptIntelligencePanel({
    data,
    className = ''
}: PromptIntelligencePanelProps) {
    if (!data) {
        return null
    }

    const { analysis, terminology, reasoning } = data

    if (!analysis.terminology_engine_enabled) {
        return null
    }

    return (
        <div
            className={`rounded-[16px] border border-[var(--border-default)] bg-white px-4 py-4 shadow-[0_8px_24px_rgba(75,70,61,0.07)] ${className}`}
        >
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                        Prompt Intelligence
                    </div>
                    <div className="type-body-sm text-[var(--text-secondary)]">
                        {analysis.build_intent_detected
                            ? 'Directive translated into execution language.'
                            : 'Terminology and clarification signals extracted.'}
                    </div>
                </div>
                <div className="rounded-full border border-[var(--border-default)] bg-[#f4f3ef] px-3 py-1 text-xs font-medium text-[var(--text-primary)]">
                    Scope: {scopeTierLabel[analysis.scope_tier] ?? analysis.scope_tier}
                </div>
            </div>

            {analysis.categories.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                    {analysis.categories.map((category) => (
                        <div
                            key={category.key}
                            className="rounded-full border border-[var(--border-default)] bg-[#f7f5f1] px-3 py-1 text-xs text-[var(--text-primary)]"
                            title={category.description}
                        >
                            {category.label}
                            <span className="ml-2 text-[var(--text-tertiary)]">
                                {category.score}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {analysis.clarification_required && analysis.clarification_question && (
                <div className="mt-4 rounded-[14px] border border-[#d9cfb6] bg-[#f6f2e7] px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6c624f]">
                        Clarification Gate
                    </div>
                    <div className="type-body-sm mt-1 text-[var(--text-primary)]">
                        {analysis.clarification_question}
                    </div>
                </div>
            )}

            {terminology.length > 0 && (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {terminology.slice(0, 6).map((term) => (
                        <div
                            key={`${term.category}-${term.term}`}
                            className="rounded-[14px] border border-[var(--border-default)] bg-[#faf9f6] px-4 py-3"
                        >
                            <div className="text-sm font-semibold text-[var(--text-primary)]">
                                {term.preferred_phrase}
                            </div>
                            <div className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                                {term.category.replace('-', ' ')}
                            </div>
                            <div className="type-body-sm mt-2 text-[var(--text-secondary)]">
                                {term.definition}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {reasoning && (
                <div className="mt-4 text-xs text-[var(--text-tertiary)]">
                    {reasoning}
                </div>
            )}
        </div>
    )
}