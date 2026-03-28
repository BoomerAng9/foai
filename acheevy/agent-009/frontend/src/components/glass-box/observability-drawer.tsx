/**
 * ObservabilityDrawer — Slide-out Glass Box panel.
 *
 * Provides a right-side Sheet that hosts the ObservabilityPanel.
 * Consumes either the real `useObservability` hook (production) or
 * `useMockObservability` (when `demo` prop is true).
 *
 * Designed to be opened from a toggle button in the right sidebar
 * or header bar during an active agent session.
 */

import { useState } from 'react'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetTrigger,
} from '@/components/ui/sheet'
import { ObservabilityPanel } from '@/components/glass-box/index'
import { useObservability } from '@/hooks/use-observability'
import { useMockObservability } from '@/hooks/use-mock-observability'
import { ActivityIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ObservabilityDrawerProps {
    /** Use mock/demo data instead of real Redux state */
    demo?: boolean
    className?: string
}

export function ObservabilityDrawer({ demo = false, className }: ObservabilityDrawerProps) {
    const [open, setOpen] = useState(false)
    const real = useObservability()
    const mock = useMockObservability({ autoPlay: open && demo })
    const { data } = demo ? mock : real

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <button
                    className={cn(
                        'relative flex items-center justify-center',
                        'w-9 h-9 rounded-lg',
                        'border border-[var(--border-subtle)]',
                        'bg-[var(--surface-glass)] hover:bg-[var(--surface-glass-hover)]',
                        'text-[var(--text-secondary)] hover:text-[var(--acheevy-gold-400)]',
                        'transition-colors duration-150',
                        className,
                    )}
                    title="Agent Observability"
                    aria-label="Open agent observability panel"
                >
                    <ActivityIcon className="w-4 h-4" />
                    {/* Live indicator dot when agent is active */}
                    {data.agentState !== 'idle' && data.agentState !== 'complete' && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--agent-executing)] animate-pulse" />
                    )}
                </button>
            </SheetTrigger>
            <SheetContent
                side="right"
                className={cn(
                    'w-[380px] sm:max-w-[420px]',
                    'bg-[var(--surface-base)] border-l border-[var(--border-subtle)]',
                    'overflow-y-auto',
                )}
            >
                <SheetHeader className="pb-0">
                    <SheetTitle className="text-[var(--text-primary)] text-sm font-semibold flex items-center gap-2">
                        <ActivityIcon className="w-4 h-4 text-[var(--acheevy-gold-400)]" />
                        Glass Box — Agent Observability
                    </SheetTitle>
                    <SheetDescription className="text-[var(--text-tertiary)] text-xs">
                        Real-time view of what the agent is doing, why, and how much it costs.
                    </SheetDescription>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto px-1">
                    <ObservabilityPanel data={data} />
                </div>
            </SheetContent>
        </Sheet>
    )
}

export default ObservabilityDrawer
