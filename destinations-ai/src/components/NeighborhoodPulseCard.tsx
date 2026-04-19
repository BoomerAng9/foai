'use client';

/**
 * NeighborhoodPulseCard — port of prototype's card (Pins.jsx:312).
 *
 * Unfurls next to the active pin when a destination is hovered/clicked.
 * Contains WalkArc, NoiseWaveform, SchoolDots, HeroStrip subcomponents —
 * all inline to keep the card self-contained.
 *
 * HeroStrip keeps per-destination ambient color (Iller_Ang directive:
 * brand accents follow the scheme, hero region follows place identity).
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useMap } from '@/lib/map/provider';
import { hexToRgba, resolveAccent, type AccentScheme } from '@/lib/color';
import type { Destination } from '@/lib/validation';

export interface NeighborhoodPulseCardProps {
  destination: Destination;
  pinned: boolean;
  isShortlisted: boolean;
  accentScheme?: AccentScheme;
  onShortlist: () => void;
  onClose: () => void;
}

export function NeighborhoodPulseCard({
  destination,
  pinned,
  isShortlisted,
  accentScheme = 'ambient',
  onShortlist,
  onClose,
}: NeighborhoodPulseCardProps) {
  const { project } = useMap();
  const pos = project(destination.coordinates);
  if (!pos) return null;

  const color = resolveAccent(destination, accentScheme);

  return (
    <motion.div
      className="absolute z-40 will-change-transform pointer-events-auto"
      style={{
        left: pos.x,
        top: pos.y,
        // Unfurl to the side that fits; approximation uses raw pixel offsets.
        transform: 'translate(20px, -50%)',
      }}
      initial={{ opacity: 0, scale: 0.92, x: -12 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
    >
      <div
        className="relative w-[340px] rounded-2xl border overflow-hidden backdrop-blur-2xl"
        style={{
          background: 'var(--panel-bg)',
          borderColor: 'var(--border)',
          boxShadow: `var(--panel-shadow), 0 0 40px ${hexToRgba(color, 0.12)}`,
        }}
      >
        {/* top accent */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${hexToRgba(color, 0.9)}, transparent)` }}
        />

        <div className="p-4 space-y-3.5">
          <header className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div
                className="text-zinc-500 mb-0.5"
                style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 9, letterSpacing: '0.18em' }}
              >
                DESTINATION · {destination.destinationId.replace('dest_', '').toUpperCase()}
              </div>
              <h2 className="text-white font-bold tracking-tight text-[17px] leading-tight">
                {destination.name}
              </h2>
              <p className="text-zinc-400 text-xs mt-0.5">
                {destination.region}, {destination.state}
              </p>
            </div>
            {pinned && (
              <motion.button
                type="button"
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
                aria-label="Close destination card"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </motion.button>
            )}
          </header>

          <HeroStrip destination={destination} />

          <div className="flex items-center gap-4">
            {destination.pulse.walkScore !== null && (
              <WalkArc value={destination.pulse.walkScore} color={color} />
            )}
            <div className="flex-1 space-y-2">
              <MetaRow label="MEDIAN HOME" value={formatPrice(destination.medianHomePrice)} />
              <MetaRow
                label="ACTIVE LISTINGS"
                value={
                  <span className="flex items-center gap-1.5">
                    <span>{destination.listingCount}</span>
                    <motion.span
                      className="inline-block w-1 h-1 rounded-full"
                      style={{ background: color, boxShadow: `0 0 4px ${color}` }}
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.4, repeat: Infinity }}
                    />
                  </span>
                }
              />
            </div>
          </div>

          {destination.pulse.noiseDbRange && (
            <section>
              <SubLabel>AMBIENT NOISE</SubLabel>
              <NoiseWaveform range={destination.pulse.noiseDbRange} color={color} />
            </section>
          )}

          {destination.pulse.schoolRating !== null && (
            <section className="flex items-center justify-between">
              <SubLabel>SCHOOLS</SubLabel>
              <div className="flex items-center gap-2">
                <SchoolDots rating={destination.pulse.schoolRating} color={color} />
                <span className="text-white text-xs font-semibold">
                  {destination.pulse.schoolRating}/10
                </span>
              </div>
            </section>
          )}

          <section className="flex flex-wrap gap-1.5">
            {destination.pulse.vibeDescriptors.map((v) => (
              <span
                key={v}
                className="px-2 py-1 rounded-full border backdrop-blur-md text-white"
                style={{
                  fontSize: 10,
                  background: hexToRgba(color, 0.08),
                  borderColor: hexToRgba(color, 0.25),
                  letterSpacing: '0.02em',
                }}
              >
                {v}
              </span>
            ))}
          </section>

          <footer className="flex gap-2 pt-1">
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onClick={onShortlist}
              className="flex-1 py-2 rounded-xl border text-white text-xs font-semibold flex items-center justify-center gap-2"
              style={{
                background: isShortlisted ? hexToRgba(color, 0.22) : 'rgba(255,255,255,0.04)',
                borderColor: isShortlisted ? hexToRgba(color, 0.6) : 'rgba(255,255,255,0.12)',
                boxShadow: isShortlisted
                  ? `inset 0 1px 0 rgba(255,255,255,0.08), 0 0 20px ${hexToRgba(color, 0.3)}`
                  : 'inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                {isShortlisted ? (
                  <path d="M3 6L5 8L9 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <path d="M6 2V10M2 6H10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                )}
              </svg>
              {isShortlisted ? 'Shortlisted' : 'Add to Shortlist'}
            </motion.button>
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="px-3 py-2 rounded-xl border text-white text-xs font-semibold flex items-center gap-1.5"
              style={{
                background: `linear-gradient(180deg, ${hexToRgba(color, 0.25)}, ${hexToRgba(color, 0.1)})`,
                borderColor: hexToRgba(color, 0.45),
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.1), 0 0 16px ${hexToRgba(color, 0.25)}`,
              }}
            >
              Explore
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <path d="M2 5H8M8 5L5 2M8 5L5 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.button>
          </footer>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-zinc-500 mb-1.5"
      style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 9, letterSpacing: '0.14em' }}
    >
      {children}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div
        className="text-zinc-500"
        style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 9, letterSpacing: '0.14em' }}
      >
        {label}
      </div>
      <div className="text-white font-semibold tracking-tight text-sm">{value}</div>
    </div>
  );
}

function formatPrice(price: number | null): string {
  if (price === null) return 'n/a';
  return `$${(price / 1000).toFixed(0)}k`;
}

function WalkArc({ value, color }: { value: number; color: string }) {
  const pct = value / 100;
  const radius = 34;
  const circ = 2 * Math.PI * radius;
  const dash = circ * 0.75;
  const filled = dash * pct;
  return (
    <div className="relative flex items-center justify-center" style={{ width: 84, height: 84 }}>
      <svg width="84" height="84" viewBox="0 0 84 84" className="-rotate-[135deg]" aria-hidden="true">
        <circle
          cx="42"
          cy="42"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="3"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
        <circle
          cx="42"
          cy="42"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={`${filled} ${circ}`}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-white font-bold tracking-tight" style={{ fontSize: 22 }}>
          {value}
        </div>
        <div
          className="text-zinc-500"
          style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 8, letterSpacing: '0.14em' }}
        >
          WALK
        </div>
      </div>
    </div>
  );
}

function NoiseWaveform({
  range,
  color,
}: {
  range: [number, number];
  color: string;
}) {
  const [min, max] = range;
  const bars = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => {
        const t = i / 36;
        return min + (max - min) * (0.4 + 0.6 * Math.abs(Math.sin(t * 9)));
      }),
    [min, max],
  );
  return (
    <div>
      <div className="flex items-center gap-0.5 h-10">
        {bars.map((v, i) => {
          const h = ((v - 30) / 40) * 100;
          return (
            <motion.div
              key={i}
              className="flex-1 rounded-full"
              style={{
                background: `linear-gradient(to top, ${hexToRgba(color, 0.9)}, ${hexToRgba(color, 0.3)})`,
                boxShadow: `0 0 4px ${hexToRgba(color, 0.5)}`,
              }}
              initial={{ height: `${Math.max(10, h * 0.4)}%` }}
              animate={{
                height: [
                  `${Math.max(10, h * 0.45)}%`,
                  `${Math.min(100, h)}%`,
                  `${Math.max(10, h * 0.55)}%`,
                ],
              }}
              transition={{
                duration: 0.9 + (i % 5) * 0.08,
                repeat: Infinity,
                repeatType: 'mirror',
                delay: i * 0.03,
                ease: 'easeInOut',
              }}
            />
          );
        })}
      </div>
      <div
        className="flex justify-between mt-1.5 text-zinc-500"
        style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 9, letterSpacing: '0.12em' }}
      >
        <span>{min} dB</span>
        <span className="text-zinc-400">AMBIENT · DAYTIME</span>
        <span>{max} dB</span>
      </div>
    </div>
  );
}

function SchoolDots({ rating, color }: { rating: number; color: string }) {
  return (
    <div className="flex gap-1" role="img" aria-label={`School rating ${rating} out of 10`}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="rounded-full"
          style={{
            width: 8,
            height: 8,
            background: i < rating ? color : 'rgba(255,255,255,0.1)',
            border: `1px solid ${i < rating ? hexToRgba(color, 0.6) : 'rgba(255,255,255,0.12)'}`,
            boxShadow: i < rating ? `0 0 6px ${hexToRgba(color, 0.55)}` : 'none',
          }}
        />
      ))}
    </div>
  );
}

function HeroStrip({ destination }: { destination: Destination }) {
  // Place-identity color (per Iller_Ang: HeroStrip is a visual moment, not UI chrome).
  const color = destination.pulse.ambientColor;
  return (
    <div
      className="relative w-full h-24 rounded-xl overflow-hidden border border-white/10"
      style={{ background: 'var(--hero-base)' }}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 20% 40%, ${hexToRgba(color, 0.55)}, transparent 60%),
                       radial-gradient(circle at 80% 70%, ${hexToRgba(color, 0.35)}, transparent 55%),
                       var(--hero-mix)`,
        }}
        animate={{ backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
      />
      <div
        className="absolute left-0 right-0 top-1/2 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${hexToRgba(color, 0.7)}, transparent)`,
          boxShadow: `0 0 10px ${hexToRgba(color, 0.5)}`,
        }}
      />
      <div
        className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10"
        style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 8, letterSpacing: '0.16em' }}
      >
        <motion.div
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: color, boxShadow: `0 0 6px ${color}` }}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        />
        <span className="text-zinc-300">LIVE · {destination.region.toUpperCase()}</span>
      </div>
      <div
        className="absolute bottom-2 right-2 text-zinc-400"
        style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 8, letterSpacing: '0.12em' }}
      >
        {destination.coordinates.lat.toFixed(4)}°N,{' '}
        {Math.abs(destination.coordinates.lng).toFixed(4)}°W
      </div>
    </div>
  );
}
