'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ═══════════════════════════════════════════════════════════════════
   Broadcast Overlay — "Breaking News" style banner
   Animates in from the bottom with spring physics.
   Gold stripe at top, white text, optional countdown timer.
   ═══════════════════════════════════════════════════════════════════ */

interface OverlayProps {
  /** The headline text */
  headline: string;
  /** Optional subheadline / analyst name */
  subtext?: string;
  /** If set, shows a countdown (in seconds) */
  countdownSeconds?: number;
  /** Auto-dismiss after this many ms (default 8000, 0 = manual) */
  autoHideMs?: number;
  /** Whether the overlay is open */
  open: boolean;
  /** Called when overlay closes */
  onClose?: () => void;
  /** Accent color override (defaults to gold) */
  accentColor?: string;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function BroadcastOverlay({
  headline,
  subtext,
  countdownSeconds,
  autoHideMs = 8000,
  open,
  onClose,
  accentColor = '#D4A853',
}: OverlayProps) {
  const [remaining, setRemaining] = useState(countdownSeconds ?? 0);

  // Countdown tick
  useEffect(() => {
    if (!open || countdownSeconds == null) return;
    setRemaining(countdownSeconds);
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [open, countdownSeconds]);

  // Auto-hide
  useEffect(() => {
    if (!open || autoHideMs <= 0) return;
    const timeout = setTimeout(() => onClose?.(), autoHideMs);
    return () => clearTimeout(timeout);
  }, [open, autoHideMs, onClose]);

  const handleClose = useCallback(() => onClose?.(), [onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-[9998]"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 1 }}
        >
          {/* Gold stripe */}
          <div className="h-1" style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}88, ${accentColor})` }} />

          {/* Content area */}
          <div
            className="relative flex items-center gap-4 px-6 py-4"
            style={{
              background: 'linear-gradient(180deg, var(--pf-bg) 0%, #111118 100%)',
              borderTop: `1px solid ${accentColor}40`,
            }}
          >
            {/* LIVE pulse */}
            <div className="flex items-center gap-2 shrink-0">
              <span
                className="relative flex h-3 w-3"
              >
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ background: '#EF4444' }}
                />
                <span
                  className="relative inline-flex rounded-full h-3 w-3"
                  style={{ background: '#EF4444' }}
                />
              </span>
              <span className="text-[10px] font-mono font-bold tracking-[0.2em]" style={{ color: '#EF4444' }}>
                BREAKING
              </span>
            </div>

            {/* Vertical divider */}
            <div className="w-px h-8 shrink-0" style={{ background: `${accentColor}40` }} />

            {/* Headline + subtext */}
            <div className="flex-1 min-w-0">
              <p className="text-sm md:text-base font-outfit font-bold text-white truncate">
                {headline}
              </p>
              {subtext && (
                <p className="text-[11px] font-mono mt-0.5" style={{ color: `${accentColor}` }}>
                  {subtext}
                </p>
              )}
            </div>

            {/* Countdown timer */}
            {countdownSeconds != null && (
              <div className="shrink-0 flex flex-col items-center">
                <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: accentColor }}>
                  COUNTDOWN
                </span>
                <span className="text-lg font-mono font-bold tabular-nums text-white">
                  {formatCountdown(remaining)}
                </span>
              </div>
            )}

            {/* Close button */}
            <button
              onClick={handleClose}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-white/10"
              aria-label="Close overlay"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scanline texture overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 4px)',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
