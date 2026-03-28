import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
    "inline-flex items-center cursor-pointer justify-center gap-2 whitespace-nowrap rounded-md transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[var(--acheevy-gold-400)]/25 focus-visible:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
    {
        variants: {
            variant: {
                default:
                    'bg-primary text-primary-foreground hover:bg-primary/90',
                destructive:
                    'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
                outline:
                    'border bg-background hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
                secondary:
                    'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
                link: 'text-primary underline-offset-4 hover:underline',
                /* ── Agentic Design System Variants ── */
                brand:
                    'bg-gradient-to-r from-[var(--acheevy-gold-400)] to-[var(--acheevy-amber-400)] text-[var(--neutral-900)] hover:from-[var(--acheevy-gold-500)] hover:to-[var(--acheevy-amber-500)] shadow-[var(--shadow-glow-gold)] hover:shadow-[var(--shadow-glow-gold-lg)] hover:-translate-y-px',
                'brand-outline':
                    'border border-[var(--border-brand)] text-[var(--acheevy-gold-400)] bg-[var(--bg-brand-subtle)] hover:bg-[var(--bg-brand-muted)] hover:border-[var(--border-brand-strong)]',
                'brand-ghost':
                    'text-[var(--acheevy-gold-400)] hover:bg-[var(--bg-brand-subtle)] hover:text-[var(--acheevy-gold-300)]',
                glass:
                    'bg-[var(--bg-glass)] backdrop-blur-lg border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] hover:border-[var(--border-strong)]'
            },
            size: {
                default: 'h-9 px-4 py-2 has-[>svg]:px-3 type-btn-md',
                sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5 type-btn-sm',
                lg: 'h-10 rounded-md px-6 has-[>svg]:px-4 type-btn-md',
                xl: 'h-12 rounded-xl px-6 has-[>svg]:px-4 type-btn-md',
                icon: 'size-9'
            }
        },
        defaultVariants: {
            variant: 'default',
            size: 'default'
        }
    }
)

function Button({
    className,
    variant,
    size,
    asChild = false,
    ...props
}: React.ComponentProps<'button'> &
    VariantProps<typeof buttonVariants> & {
        asChild?: boolean
    }) {
    const Comp = asChild ? Slot : 'button'

    return (
        <Comp
            data-slot="button"
            className={cn(buttonVariants({ variant, size, className }))}
            {...props}
        />
    )
}

export { Button, buttonVariants }
