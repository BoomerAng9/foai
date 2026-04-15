'use client';

/**
 * TeamTheme — Layered team-themed background wrapper.
 * Layers:
 *   1. Base dark room (#08080d)
 *   2. Team color gradient overlay (primary at 8-12% opacity)
 *   3. Team accent bar (top border in primary color)
 *   4. Team logo watermark (abbreviation as large background text at 5% opacity)
 *
 * Transitions live when user switches teams.
 */

import { useMemo, type ReactNode } from 'react';
import { getTeamTheme } from '@/lib/franchise/team-colors';
import type { Sport } from '@/lib/franchise/types';

interface TeamThemeProps {
  sport: Sport;
  teamAbbr?: string;
  children: ReactNode;
}

export function TeamTheme({ sport, teamAbbr, children }: TeamThemeProps) {
  const theme = useMemo(
    () => (teamAbbr ? getTeamTheme(sport, teamAbbr) : null),
    [sport, teamAbbr]
  );

  if (!theme || !teamAbbr) {
    return (
      <div className="min-h-screen relative" style={{ background: 'var(--pf-bg)' }}>
        {children}
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative"
      style={{
        background: 'var(--pf-bg)',
        transition: 'all 0.6s ease',
      }}
    >
      {/* Layer 2: Team gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: theme.gradient,
          transition: 'background 0.6s ease',
        }}
      />

      {/* Layer 3: Team accent bar (top border) */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] pointer-events-none"
        style={{
          background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary}, ${theme.primary})`,
          transition: 'background 0.6s ease',
        }}
      />

      {/* Layer 4: Team watermark (abbreviation as large BG text) */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none"
        aria-hidden="true"
      >
        <span
          className="text-[28vw] font-black leading-none tracking-tighter"
          style={{
            color: theme.primary,
            opacity: 0.04,
            transition: 'color 0.6s ease, opacity 0.6s ease',
            WebkitTextStroke: `2px ${theme.primary}08`,
          }}
        >
          {teamAbbr}
        </span>
      </div>

      {/* Content layer */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
