/**
 * PlayerGradeDisplay
 * ===================
 * Convenience wrapper — takes a player row from /api/players and
 * delegates to <GradeDisplay/> after canonicalizing via
 * resolvePlayerGrade(). Every page rendering a player grade should use
 * this component so the same player_id can never display two different
 * badges on two different pages.
 */

'use client';

import { GradeDisplay } from './GradeDisplay';
import {
  resolvePlayerGrade,
  type GradeResolvable,
} from '@/lib/tie/resolve-player-grade';
import type { PrimeSubTag } from '@aims/tie-matrix';

type Variant = 'minimal' | 'badge' | 'full';

interface Props {
  player: GradeResolvable & { prime_sub_tags?: string[] | null };
  variant?: Variant;
  className?: string;
}

export function PlayerGradeDisplay({ player, variant = 'badge', className }: Props) {
  const resolved = resolvePlayerGrade(player);
  const primeSubTags = (player.prime_sub_tags ?? undefined) as PrimeSubTag[] | undefined;

  // If we only have a tier (no score), use the tier's midpoint so
  // GradeDisplay renders the right badge. This is safe because the
  // matrix mapping from band.min → band.tier is 1:1.
  const score = resolved.score ?? (resolved.band.min === 0 ? 30 : resolved.band.min);

  return (
    <GradeDisplay
      score={score}
      vertical={resolved.vertical}
      variant={variant}
      primeSubTags={primeSubTags}
      className={className}
    />
  );
}

export default PlayerGradeDisplay;
