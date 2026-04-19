'use client';

/**
 * DestinationPin — port of prototype's DestinationPin (Pins.jsx:14).
 *
 * Three visual variants: glow (default ambient orb), beacon (vertical
 * holo beam + elliptical ground halo), ring (radar-sweep ring).
 * Positions itself via useMap().project() — re-renders when the map
 * camera moves.
 */

import { motion } from 'framer-motion';
import { useMap } from '@/lib/map/provider';
import { hexToRgba, resolveAccent, type AccentScheme } from '@/lib/color';
import type { Destination } from '@/lib/validation';

export type PinStyle = 'glow' | 'beacon' | 'ring';

export interface DestinationPinProps {
  destination: Destination;
  style?: PinStyle;
  accentScheme?: AccentScheme;
  isActive: boolean;
  isShortlisted: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onClick: () => void;
}

export function DestinationPin({
  destination,
  style = 'glow',
  accentScheme = 'ambient',
  isActive,
  isShortlisted,
  onHoverStart,
  onHoverEnd,
  onClick,
}: DestinationPinProps) {
  const { project } = useMap();
  const pos = project(destination.coordinates);
  if (!pos) return null;

  const color = resolveAccent(destination, accentScheme);
  const calloutText =
    destination.name.split(' — ')[0]?.split(', ')[0] ?? destination.name;

  return (
    <motion.button
      type="button"
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
      onClick={onClick}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      className="absolute will-change-transform z-10"
      style={{
        left: pos.x,
        top: pos.y,
        transform: 'translate(-50%, -50%)',
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
      }}
      aria-label={`${destination.name} destination pin`}
    >
      {/* outer glow — always visible */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 140,
          height: 140,
          left: -70,
          top: -70,
          background: `radial-gradient(circle at center, ${hexToRgba(color, 0.32)}, transparent 68%)`,
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.55, 1, 0.55] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {style === 'beacon' && (
        <>
          <motion.div
            className="absolute pointer-events-none"
            style={{
              width: 2,
              height: 46,
              left: -1,
              top: -46,
              background: `linear-gradient(to top, ${hexToRgba(color, 0.9)}, transparent)`,
              boxShadow: `0 0 8px ${hexToRgba(color, 0.7)}`,
            }}
            animate={{ opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute rounded-full border pointer-events-none"
            style={{
              width: 28,
              height: 10,
              left: -14,
              top: -5,
              borderColor: hexToRgba(color, 0.7),
              transform: 'perspective(200px) rotateX(70deg)',
            }}
            animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          />
        </>
      )}

      {style === 'ring' && (
        <motion.div
          className="absolute rounded-full border pointer-events-none"
          style={{
            width: 32,
            height: 32,
            left: -16,
            top: -16,
            borderColor: hexToRgba(color, 0.75),
            borderWidth: 1.5,
          }}
          animate={{ scale: [1, 1.6, 2], opacity: [0.8, 0.3, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
        />
      )}

      {/* core dot */}
      <div
        className="relative rounded-full"
        style={{
          width: 14,
          height: 14,
          background: `radial-gradient(circle at 35% 30%, ${hexToRgba(color, 1)}, ${hexToRgba(color, 0.55)} 55%, ${hexToRgba(color, 0.15)} 100%)`,
          boxShadow: `0 0 16px ${hexToRgba(color, 0.9)}, inset 0 1px 0 rgba(255,255,255,0.4)`,
          border: `1px solid ${hexToRgba(color, 0.8)}`,
        }}
      >
        {isShortlisted && (
          <div
            className="absolute inset-0 rounded-full"
            style={{
              boxShadow: `0 0 0 2px rgba(10,10,15,1), 0 0 0 3px ${hexToRgba(color, 0.9)}`,
            }}
          />
        )}
      </div>

      {/* callout label below pin */}
      <div
        className="absolute left-1/2 top-[14px] -translate-x-1/2 whitespace-nowrap pointer-events-none"
        style={{
          fontFamily: 'var(--font-geist-mono), monospace',
          fontSize: 9,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: isActive ? color : 'rgba(255,255,255,0.55)',
          textShadow: `0 0 8px ${hexToRgba(color, 0.6)}`,
        }}
      >
        <div className="mt-1">{calloutText}</div>
      </div>
    </motion.button>
  );
}
