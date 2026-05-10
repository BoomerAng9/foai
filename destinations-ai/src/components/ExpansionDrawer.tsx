'use client';

/**
 * ExpansionDrawer — port of prototype's Expansion.jsx.
 *
 * Surfaces the Coming Soon roster. Three position modes:
 *   - 'right drawer'  — right-docked pill, expands leftward (default)
 *   - 'bottom sheet'  — bottom-right pill, expands upward
 *   - 'pinned card'   — always-visible compact card, no collapse state
 *
 * Notify-me button is real: calls POST /api/waitlist with the caller's
 * session cookie when they're authenticated, falls back to local-only
 * state when they're not (Phase 2+ auth prompt flow).
 */

import { useState, type RefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ComingSoonRegion } from '@/lib/validation';

export type ExpansionPosition = 'right drawer' | 'bottom sheet' | 'pinned card';

export interface ExpansionDrawerProps {
  regions: ComingSoonRegion[];
  dragConstraints?: RefObject<HTMLElement | null>;
  position?: ExpansionPosition;
}

const NON_DRAGGABLE = new Set<ExpansionPosition>(['pinned card']);

export function ExpansionDrawer({
  regions,
  dragConstraints,
  position = 'right drawer',
}: ExpansionDrawerProps) {
  const [expanded, setExpanded] = useState(false);
  const [notifiedIds, setNotifiedIds] = useState<Record<string, boolean>>({});
  const draggable = !NON_DRAGGABLE.has(position);

  const totalDestinations = regions.reduce((s, r) => s + r.destinationCount, 0);
  const totalWaitlist = regions.reduce((s, r) => s + r.waitlistCount, 0);

  const { pillStyle, panelClass } = resolvePosition(position);

  const toggleNotify = (id: string) => {
    setNotifiedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <motion.div
      drag={draggable}
      dragMomentum={false}
      dragConstraints={dragConstraints}
      dragElastic={0}
      whileDrag={{ scale: 1.02, zIndex: 100 }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 40, mass: 1.1 }}
      className={`absolute z-30 will-change-transform ${
        draggable ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
      style={{ ...pillStyle, touchAction: 'none' }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {expanded ? (
          <motion.div
            key="panel"
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className={`rounded-2xl border backdrop-blur-2xl overflow-hidden ${panelClass}`}
            style={{
              background: 'var(--panel-bg-depth)',
              boxShadow: 'var(--panel-shadow)',
              borderColor: 'var(--border)',
            }}
          >
            <div
              className="flex items-center justify-between px-4 pt-3 pb-2 border-b"
              style={{ borderColor: 'var(--divider)' }}
            >
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-1 h-1 rounded-full bg-white/30" />
                  <div className="w-1 h-1 rounded-full bg-white/30" />
                  <div className="w-1 h-1 rounded-full bg-white/30" />
                </div>
                <div
                  className="text-white font-semibold"
                  style={{
                    fontFamily: 'var(--font-geist-mono), monospace',
                    fontSize: 10,
                    letterSpacing: '0.22em',
                  }}
                >
                  EXPANSION ROSTER
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="text-[#FF8A3D]"
                  style={{
                    fontFamily: 'var(--font-geist-mono), monospace',
                    fontSize: 9,
                    letterSpacing: '0.14em',
                  }}
                >
                  {totalWaitlist.toLocaleString()} ON WAITLIST
                </div>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setExpanded(false)}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white"
                  aria-label="Collapse expansion roster"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                    <path d="M2.5 2.5L7.5 7.5M7.5 2.5L2.5 7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </motion.button>
              </div>
            </div>

            <div className="px-4 pt-3 pb-2">
              <div className="text-white font-bold tracking-tight leading-tight text-[18px]">
                Destinations, expanding.
              </div>
              <div className="text-zinc-500 text-xs mt-0.5">
                {regions.length} regions · {totalDestinations} destinations queued · launching through 2027
              </div>
            </div>

            <div
              className="px-3 pb-3 space-y-2 max-h-[60vh] overflow-y-auto"
              onPointerDown={(e) => e.stopPropagation()}
            >
              {regions.map((region, i) => (
                <RegionCard
                  key={region.regionId}
                  region={region}
                  index={i}
                  notified={!!notifiedIds[region.regionId]}
                  onNotify={() => toggleNotify(region.regionId)}
                />
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="pill"
            type="button"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setExpanded(true)}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex items-center gap-2.5 px-4 py-2 rounded-full border backdrop-blur-2xl"
            style={{
              background: 'var(--panel-bg-depth)',
              borderColor: 'var(--border)',
              boxShadow:
                'inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 28px rgba(0,0,0,0.45), 0 0 20px rgba(255,107,0,0.18)',
            }}
          >
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-[#FF6B00]"
              style={{ boxShadow: '0 0 8px #FF6B00' }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
            />
            <span
              className="text-white"
              style={{
                fontFamily: 'var(--font-geist-mono), monospace',
                fontSize: 10,
                letterSpacing: '0.22em',
              }}
            >
              COMING SOON
            </span>
            <div className="w-px h-3 bg-white/15" />
            <span
              className="text-zinc-400"
              style={{
                fontFamily: 'var(--font-geist-mono), monospace',
                fontSize: 9,
                letterSpacing: '0.18em',
              }}
            >
              {regions.length} REGIONS · {totalDestinations} DESTINATIONS
            </span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-[#FF8A3D]" aria-hidden="true">
              <path
                d="M3 2L7 5L3 8"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function resolvePosition(
  position: ExpansionPosition,
): { pillStyle: React.CSSProperties; panelClass: string } {
  switch (position) {
    case 'bottom sheet':
      return {
        pillStyle: { right: 24, bottom: 24 },
        panelClass: 'w-auto',
      };
    case 'pinned card':
      return {
        pillStyle: { right: 24, bottom: 200, width: 400 },
        panelClass: 'w-[400px]',
      };
    case 'right drawer':
    default:
      return {
        pillStyle: { right: 24, top: 80 },
        panelClass: 'w-[420px]',
      };
  }
}

function RegionCard({
  region,
  index,
  notified,
  onNotify,
}: {
  region: ComingSoonRegion;
  index: number;
  notified: boolean;
  onNotify: () => void;
}) {
  const [p0 = '#FF6B00', p1 = '#FF8A3D', p2 = '#C94A00'] = region.ambientPalette;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28, delay: index * 0.04 }}
      whileHover={{ y: -2 }}
      className="relative rounded-xl border overflow-hidden cursor-pointer"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(10,10,15,0.3) 100%)',
        borderColor: 'var(--border)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      <div
        className="h-1.5 w-full"
        style={{
          background: `linear-gradient(90deg, ${p0} 0%, ${p1} 50%, ${p2} 100%)`,
          boxShadow: `0 0 10px ${p0}55`,
        }}
      />

      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold tracking-tight text-[14px] leading-tight">
              {region.name}
            </div>
            <div className="text-zinc-500 text-[11px] mt-0.5">{region.geographicArea}</div>
          </div>
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border"
            style={{
              background: `${p0}18`,
              borderColor: `${p0}55`,
              fontFamily: 'var(--font-geist-mono), monospace',
              fontSize: 8,
              letterSpacing: '0.18em',
              color: '#fff',
            }}
          >
            {region.estimatedUnlockQuarter}
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {region.flagshipDestinations.map((d) => (
            <span
              key={d}
              className="px-2 py-0.5 rounded-full border backdrop-blur-md text-white"
              style={{
                fontSize: 10,
                background: 'rgba(255,255,255,0.04)',
                borderColor: 'rgba(255,255,255,0.10)',
                letterSpacing: '0.01em',
              }}
            >
              {d}
            </span>
          ))}
        </div>

        <div className="text-zinc-400 text-[11px] italic leading-snug">
          {region.regionVibe.slice(0, 3).join(' · ')}
        </div>

        <div
          className="flex items-center justify-between pt-1"
          style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 9, letterSpacing: '0.14em' }}
        >
          <span className="text-zinc-500">
            {region.destinationCount} DESTINATIONS · {region.waitlistCount} WAITLIST
          </span>
          <motion.button
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={(e) => {
              e.stopPropagation();
              onNotify();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="px-2.5 py-1 rounded-md border flex items-center gap-1"
            style={{
              background: notified ? 'rgba(255,107,0,0.18)' : 'rgba(255,255,255,0.04)',
              borderColor: notified ? 'rgba(255,107,0,0.55)' : 'rgba(255,255,255,0.12)',
              color: notified ? '#fff' : '#a1a1aa',
              boxShadow: notified
                ? '0 0 14px rgba(255,107,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)'
                : 'inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            {notified ? (
              <>
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
                  <path d="M2 4.5L4 6.5L7.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>NOTIFIED</span>
              </>
            ) : (
              <>
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
                  <path d="M4.5 1.5V4.5M4.5 4.5V7.5M4.5 4.5H1.5M4.5 4.5H7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                <span>NOTIFY ME</span>
              </>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
