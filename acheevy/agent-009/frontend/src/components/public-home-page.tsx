import { Link, useNavigate } from 'react-router'

import { Button } from './ui/button'
import { Icon } from './ui/icon'
import { enableGuestMode } from '@/constants/auth'

const PublicHomePage = () => {
    const navigate = useNavigate()
    const handleLogin = () => {
        navigate('/login')
    }

    const handleGuestAccess = () => {
        enableGuestMode()
        navigate('/chat')
    }

    return (
        <div className="flex flex-col h-screen justify-between px-3 md:px-6 pt-4 md:pt-8 pb-12 overflow-auto">
            <Link to="/" className="flex items-center gap-x-3">
                <img
                    src="/images/acheevy/acheevy-helmet.png"
                    className="size-10"
                    alt="ACHEEVY"
                />
                <span className="text-2xl font-semibold acheevy-gradient-text">
                    ACHEEVY-009
                </span>
            </Link>
            <div className="flex-1 flex flex-col justify-center items-center mt-8 md:mt-0">
                <p className="text-2xl md:text-[32px] font-semibold acheevy-gradient-text">
                    Meet Agent ACHEEVY-009
                </p>

                <img
                    src="/images/acheevy/acheevy-helmet.png"
                    alt="ACHEEVY-009 Agent"
                    className="w-32 md:w-48 mt-6"
                />
                <p className="text-center mt-6 text-xl md:text-2xl text-[var(--text-secondary)] dark:text-white">
                    Your intelligent agent for creating, researching, and
                    shipping fast.
                </p>
                <p className="text-center mt-2 text-sm text-[var(--text-tertiary)] font-mono tracking-wider">
                    Powered by the NtNtN Creative Build Engine
                </p>
                <Button
                    onClick={handleGuestAccess}
                    className="mt-6 h-10 md:h-12 px-4 md:px-6 rounded-3xl acheevy-btn-primary"
                >
                    Continue as Guest
                </Button>
                <Button
                    onClick={handleLogin}
                    variant="outline"
                    className="mt-3 h-10 md:h-12 px-4 md:px-6 rounded-3xl"
                >
                    Sign in
                </Button>
                <div className="mt-12 w-full max-w-5xl">
                    <div className="grid gap-3 md:gap-4 grid-cols-2">
                        {[
                            [
                                {
                                    icon: 'usb',
                                    title: 'Your Data, Your Control',
                                    description:
                                        'BYOK – connect your own API keys and services for private, high-performance runs.',
                                    highlights: [],
                                    ctaLabel: ''
                                },
                                {
                                    icon: 'presentation',
                                    title: 'From Idea to Deck in Minutes',
                                    description:
                                        'Generate slide outlines, refine every block, and export when ready - no context switching.'
                                },
                                {
                                    icon: 'bracket-square',
                                    title: 'Delegate the Code. Keep the Control.',
                                    description:
                                        'When implementation gets heavy, bring Codex Agent into the thread.',
                                    ctaLabel: ''
                                }
                            ],
                            [
                                {
                                    icon: 'property-search',
                                    title: 'Research That Cites Its Sources',
                                    description:
                                        'ACHEEVY plans, reads, and synthesizes across the web and your files - returning structured insights with citations.',
                                    highlights: [
                                        'Browsing',
                                        'Source graphs',
                                        'Evidence snippets',
                                        'One-tap briefs'
                                    ],
                                    ctaLabel: ''
                                },
                                {
                                    icon: 'ai-browser',
                                    title: 'Describe It. Ship It.',
                                    description:
                                        'Turn a prompt into a working site: scaffold pages, sections, and components; preview, edit, and export.',
                                    highlights: [
                                        'Live preview',
                                        'Clean markup',
                                        'Component library',
                                        'Export to repo/zip'
                                    ],
                                    ctaLabel: ''
                                }
                            ]
                        ].map((column, columnIndex) => (
                            <div
                                key={columnIndex}
                                className="flex flex-col gap-3 md:gap-4"
                            >
                                {column.map(
                                    (
                                        {
                                            icon,
                                            title,
                                            description,
                                            highlights,
                                            ctaLabel
                                        },
                                        featureIndex
                                    ) => (
                                        <div
                                            key={`${title}-${featureIndex}`}
                                            className="group relative overflow-hidden rounded-xl border border-[var(--border-brand)] bg-[var(--bg-glass)] px-3 py-5 md:px-4 shadow-acheevy dark:bg-[var(--surface-elevated)] dark:text-[var(--text-secondary)] hover:border-[var(--border-brand-strong)] hover:shadow-[var(--shadow-glow-gold)] transition-all duration-300"
                                        >
                                            <div className="relative flex justify-center h-full flex-col gap-3 md:gap-6">
                                                <div className="flex justify-center">
                                                    <Icon
                                                        name={icon}
                                                        className="size-12 md:size-16 fill-[var(--text-brand)]"
                                                    />
                                                </div>
                                                <div className="text-center">
                                                    <h3 className="text-base md:text-2xl font-semibold text-[var(--text-primary)]">
                                                        {title}
                                                    </h3>
                                                    <p className="mt-[6px] text-xs md:text-base text-[var(--text-tertiary)]">
                                                        {description}
                                                    </p>
                                                </div>
                                                {highlights?.length ? (
                                                    <div className="flex flex-wrap justify-center gap-3">
                                                        {highlights.map(
                                                            (item) => (
                                                                <div
                                                                    key={item}
                                                                    className="inline-flex items-center gap-1 md:gap-2 rounded-full border border-[var(--border-brand)] px-3 md:px-4 py-1 md:py-1.5 text-[10px] md:text-sm font-semibold text-[var(--text-brand)] dark:border-[var(--border-brand)] dark:text-[var(--text-brand)]"
                                                                >
                                                                    <Icon
                                                                        name="arrow-right-2"
                                                                        className="size-3 fill-[var(--text-brand)]"
                                                                    />
                                                                    <span className="flex-1">
                                                                        {item}
                                                                    </span>
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                ) : null}
                                                {ctaLabel ? (
                                                    <Button
                                                        onClick={handleLogin}
                                                        className="mt-3 h-7 md:h-12 w-fit m-auto rounded-3xl acheevy-btn-primary"
                                                    >
                                                        {ctaLabel}
                                                    </Button>
                                                ) : null}
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="flex justify-center gap-x-10 mt-8 md:mt-12">
                <Link
                    to="/terms-of-use"
                    className="dark:text-white text-sm font-semibold"
                >
                    Terms of Use
                </Link>
                <Link
                    to="/privacy-policy"
                    target="_blank"
                    className="dark:text-white text-sm font-semibold"
                >
                    Privacy Policy
                </Link>
            </div>
        </div>
    )
}

export default PublicHomePage
