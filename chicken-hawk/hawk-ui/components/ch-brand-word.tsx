import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Brand-word treatment — Permanent Marker font + neon glow + 1.5° tilt.
 *
 * Use ONLY on the literal words DEPLOY / AUTOMATION / A.I.M.S. (the brand-
 * vocabulary highlight pattern from CHICKEN_HAWK_DESIGN.md §3 + §4.3).
 * Body copy stays in the standard sans stack.
 *
 * Variants:
 *   - "deploy"     — neon green, used on the word DEPLOY
 *   - "automation" — neon orange, used on the word AUTOMATION
 *   - "aims"       — A.I.M.S. yellow (executive / ownership tier)
 *   - "cyan"       — info / general-use accent
 */
export type ChBrandWordVariant = 'deploy' | 'automation' | 'aims' | 'cyan';

export function ChBrandWord({
  children,
  variant,
  as: Tag = 'span',
  className,
}: {
  children: React.ReactNode;
  variant: ChBrandWordVariant;
  as?: 'span' | 'em' | 'strong' | 'h1' | 'h2' | 'h3';
  className?: string;
}) {
  return (
    <Tag className={cn('ch-brand-word', `ch-brand-word--${variant}`, className)}>
      {children}
    </Tag>
  );
}
