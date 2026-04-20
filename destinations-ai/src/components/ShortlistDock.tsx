'use client';

/**
 * ShortlistDock — port of prototype's Panels.jsx:238.
 *
 * Four position modes (per tweak):
 *   - 'bottom'       — full-width dock centered at bottom (default)
 *   - 'right'        — docked bottom-right corner
 *   - 'floating'     — draggable anywhere, initial top-right
 *   - 'auto-hidden'  — collapsed pill when empty; expands to bottom dock when populated
 */

import { type RefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { hexToRgba } from '@/lib/color';
import type { Destination } from '@/lib/validation';

export type DockPosition = 'bottom' | 'right' | 'floating' | 'auto-hidden';

export interface ShortlistDockProps {
  shortlist: string[];
  destinations: Destination[];
  onRemove: (destinationId: string) => void;
  dragConstraints?: RefObject<HTMLElement | null>;
  initialPos?: { x: number; y: number };
  position: DockPosition;
}

export function ShortlistDock({
  shortlist,
  destinations,
  onRemove,
  dragConstraints,
  initialPos = { x: 24, y: 24 },
  position,
}: ShortlistDockProps) {
  const items = shortlist
    .map((id) => destinations.find((d) => d.destinationId === id))
    .filter((d): d is Destination => d !== undefined);

  // auto-hidden + empty → collapsed pill
  if (position === 'auto-hidden' && items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="absolute z-30 will-change-transform"
        style={{ right: 24, bottom: 24 }}
      >
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-2xl"
          style={{
            background: 'var(--panel-bg-depth)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--panel-shadow)',
            fontFamily: 'var(--font-geist-mono), monospace',
            fontSize: 9,
            letterSpacing: '0.18em',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-zinc-400" aria-hidden="true">
            <path
              d="M5 1L6.2 3.6L9 4L7 6L7.4 8.8L5 7.5L2.6 8.8L3 6L1 4L3.8 3.6L5 1Z"
              stroke="currentColor"
              strokeWidth="0.8"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-zinc-400">SHORTLIST · 0</span>
        </div>
      </motion.div>
    );
  }

  const autoHiddenWithItems = position === 'auto-hidden' && items.length > 0;
  const anchoredRight = position === 'right';
  const fullWidth = position === 'bottom' || autoHiddenWithItems;

  const wrapperStyle: React.CSSProperties = autoHiddenWithItems
    ? { left: 24, right: 24, bottom: 24 }
    : anchoredRight
    ? { right: 24, bottom: 24 }
    : position === 'bottom'
    ? { left: 24, right: 24, bottom: 24 }
    : { touchAction: 'none' };

  return (
    <motion.div
      drag={position === 'floating'}
      dragMomentum={false}
      dragConstraints={dragConstraints}
      dragElastic={0}
      whileDrag={{ scale: 1.02, zIndex: 100 }}
      initial={{ opacity: 0, y: 40 }}
      animate={
        position === 'floating'
          ? { opacity: 1, x: initialPos.x, y: initialPos.y }
          : { opacity: 1, x: 0, y: 0 }
      }
      transition={{ type: 'spring', stiffness: 200, damping: 40, mass: 1.2 }}
      className={`absolute z-30 will-change-transform ${
        position === 'floating' ? 'top-0 left-0 cursor-grab active:cursor-grabbing' : ''
      }`}
      style={wrapperStyle}
    >
      <div
        className="rounded-2xl border backdrop-blur-2xl overflow-hidden"
        style={{
          background: 'var(--panel-bg-depth)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--panel-shadow)',
          minWidth: fullWidth ? undefined : 520,
        }}
      >
        <div
          className="flex items-center justify-between px-4 pt-3 pb-2 border-b"
          style={{ borderColor: 'var(--divider)' }}
        >
          <div className="flex items-center gap-2">
            {position === 'floating' && (
              <div className="flex gap-1">
                <div className="w-1 h-1 rounded-full bg-white/30" />
                <div className="w-1 h-1 rounded-full bg-white/30" />
                <div className="w-1 h-1 rounded-full bg-white/30" />
              </div>
            )}
            <div
              className="text-zinc-400"
              style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 9, letterSpacing: '0.18em' }}
            >
              SHORTLIST DOCK
            </div>
          </div>
          <div
            className="text-zinc-500"
            style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 9, letterSpacing: '0.14em' }}
          >
            {items.length} / ∞ SAVED
          </div>
        </div>

        <div className="p-3">
          {items.length === 0 ? (
            <div
              className="py-6 text-center text-zinc-500 text-xs"
              style={{ letterSpacing: '0.01em' }}
            >
              Click a pin → <span className="text-zinc-300">Add to Shortlist</span> to save destinations here.
            </div>
          ) : (
            <div className="flex items-stretch gap-2 overflow-x-auto">
              <AnimatePresence mode="popLayout">
                {items.map((d) => (
                  <ShortlistCard
                    key={d.destinationId}
                    destination={d}
                    onRemove={() => onRemove(d.destinationId)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ShortlistCard({
  destination,
  onRemove,
}: {
  destination: Destination;
  onRemove: () => void;
}) {
  const color = destination.pulse.ambientColor;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 20 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="relative rounded-xl border border-white/10 overflow-hidden flex-shrink-0 cursor-pointer"
      style={{
        width: 170,
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(10,10,15,0.3) 100%)',
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 20px rgba(0,0,0,0.4), 0 0 16px ${hexToRgba(color, 0.12)}`,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="h-14 relative overflow-hidden"
        style={{
          background: `radial-gradient(circle at 30% 50%, ${hexToRgba(color, 0.5)}, transparent 65%), var(--hero-mix)`,
        }}
      >
        <motion.div
          className="absolute left-0 right-0 top-1/2 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${hexToRgba(color, 0.7)}, transparent)`,
          }}
          animate={{ x: ['-20%', '20%', '-20%'] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.button
          type="button"
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={onRemove}
          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white backdrop-blur-md"
          aria-label={`Remove ${destination.name} from shortlist`}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
            <path d="M2 2L6 6M6 2L2 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </motion.button>
      </div>
      <div className="p-2.5 space-y-1">
        <div className="text-white font-semibold text-xs tracking-tight leading-tight truncate">
          {destination.name}
        </div>
        <div className="flex items-center justify-between">
          <div
            className="text-zinc-500"
            style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 8, letterSpacing: '0.14em' }}
          >
            WALK {destination.pulse.walkScore ?? 'n/a'}
          </div>
          <div className="text-white font-semibold" style={{ fontSize: 10 }}>
            {destination.medianHomePrice !== null
              ? `$${(destination.medianHomePrice / 1000).toFixed(0)}k`
              : 'n/a'}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
