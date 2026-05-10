'use client';

/**
 * ConstellationOverlay — port of prototype's Constellation.jsx.
 *
 * When ≥2 destinations are shortlisted, draws an SVG layer across the map
 * connecting every pair with a glowing dashed line. The dashed offset
 * animates on an infinite loop for a subtle "flow" effect — turns the
 * shortlist into a route map.
 *
 * Renders above MapBackground (z-5) and below pins (z-10).
 */

import { motion } from 'framer-motion';
import { useMap } from '@/lib/map/provider';
import type { Destination } from '@/lib/validation';

export interface ConstellationOverlayProps {
  shortlist: string[];
  destinations: Destination[];
}

export function ConstellationOverlay({
  shortlist,
  destinations,
}: ConstellationOverlayProps) {
  const { project, isReady } = useMap();
  if (!isReady || shortlist.length < 2) return null;

  const shortlisted = shortlist
    .map((id) => destinations.find((d) => d.destinationId === id))
    .filter((d): d is Destination => d !== undefined);

  // All unique pairs (i < j).
  const pairs: [Destination, Destination][] = [];
  for (let i = 0; i < shortlisted.length; i++) {
    for (let j = i + 1; j < shortlisted.length; j++) {
      pairs.push([shortlisted[i]!, shortlisted[j]!]);
    }
  }

  const projected = shortlisted.map((d) => ({
    d,
    p: project(d.coordinates),
  }));

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-[5]"
      style={{ width: '100%', height: '100%' }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <filter id="constellation-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.8" />
        </filter>
      </defs>

      {pairs.map(([a, b], idx) => {
        const pa = project(a.coordinates);
        const pb = project(b.coordinates);
        if (!pa || !pb) return null;
        const key = `${a.destinationId}-${b.destinationId}`;
        return (
          <g key={key}>
            {/* outer glow */}
            <motion.line
              x1={pa.x}
              y1={pa.y}
              x2={pb.x}
              y2={pb.y}
              stroke="rgba(255,107,0,0.25)"
              strokeWidth={2.4}
              filter="url(#constellation-glow)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.9, delay: idx * 0.08, ease: 'easeInOut' }}
            />
            {/* dashed route with flowing offset */}
            <motion.line
              x1={pa.x}
              y1={pa.y}
              x2={pb.x}
              y2={pb.y}
              stroke="rgba(255,255,255,0.35)"
              strokeWidth={1}
              strokeDasharray="2 4"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: 1,
                opacity: 1,
                strokeDashoffset: [0, -24],
              }}
              transition={{
                pathLength: { duration: 0.9, delay: idx * 0.08, ease: 'easeInOut' },
                opacity: { duration: 0.9, delay: idx * 0.08 },
                strokeDashoffset: {
                  duration: 6,
                  repeat: Infinity,
                  ease: 'linear',
                },
              }}
            />
          </g>
        );
      })}

      {/* shortlisted pin nodes */}
      {projected.map(({ d, p }) => {
        if (!p) return null;
        return (
          <circle
            key={`node-${d.destinationId}`}
            cx={p.x}
            cy={p.y}
            r={2}
            fill="#FF6B00"
            style={{ filter: 'drop-shadow(0 0 4px #FF6B00)' }}
          />
        );
      })}
    </svg>
  );
}
