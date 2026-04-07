'use client';

/**
 * Pillar Radar — broadcast theme (light)
 * =========================================
 * Navy + red ESPN/PFF aesthetic, deterministic SVG. Proper padding
 * around the triangle so pillar labels never clip, value chips
 * positioned with collision-safe offsets.
 */

import { motion } from 'framer-motion';

interface Pillars {
  gamePerformance: number;
  athleticism: number;
  intangibles: number;
}

interface PillarRadarProps {
  actual: Pillars;
  clean?: Pillars;
  size?: number;
}

const NAVY = '#0B1E3F';
const NAVY_LIGHT = '#1A4ECC';
const NAVY_GLOW = 'rgba(11,30,63,0.18)';
const RED = '#D40028';
const INK = '#0A0E1A';
const MUTED = '#5A6478';
const BORDER = '#E2E6EE';
const GRID = '#EEF0F5';

export function PillarRadar({ actual, clean, size = 520 }: PillarRadarProps) {
  // Leave generous margin for labels
  const margin = 110;
  const center = size / 2;
  const maxRadius = size / 2 - margin;

  const angles = {
    gp:  -Math.PI / 2,                     // top
    ath: -Math.PI / 2 + (2 * Math.PI) / 3, // bottom-right
    int: -Math.PI / 2 - (2 * Math.PI) / 3, // bottom-left
  };

  function point(value: number, angleKey: keyof typeof angles): [number, number] {
    const r = (Math.max(0, Math.min(100, value)) / 100) * maxRadius;
    return [center + r * Math.cos(angles[angleKey]), center + r * Math.sin(angles[angleKey])];
  }

  function vertex(angleKey: keyof typeof angles, scale = 1): [number, number] {
    return [
      center + maxRadius * scale * Math.cos(angles[angleKey]),
      center + maxRadius * scale * Math.sin(angles[angleKey]),
    ];
  }

  function trianglePath(p: Pillars): string {
    const [a, b] = point(p.gamePerformance, 'gp');
    const [c, d] = point(p.athleticism, 'ath');
    const [e, f] = point(p.intangibles, 'int');
    return `M ${a} ${b} L ${c} ${d} L ${e} ${f} Z`;
  }

  const rings = [0.25, 0.5, 0.75, 1.0];
  const outerPath = (() => {
    const [a, b] = vertex('gp');
    const [c, d] = vertex('ath');
    const [e, f] = vertex('int');
    return `M ${a} ${b} L ${c} ${d} L ${e} ${f} Z`;
  })();

  // Label positions — further out, with proper anchoring
  const labelGP  = vertex('gp',  1.28);
  const labelAth = vertex('ath', 1.18);
  const labelInt = vertex('int', 1.18);

  return (
    <svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`} style={{ maxWidth: size }}>
      <defs>
        <linearGradient id="navyFill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor={NAVY_LIGHT} stopOpacity="0.22" />
          <stop offset="100%" stopColor={NAVY}       stopOpacity="0.32" />
        </linearGradient>
        <filter id="navyGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Grid rings */}
      {rings.map((scale, i) => {
        const [a, b] = vertex('gp',  scale);
        const [c, d] = vertex('ath', scale);
        const [e, f] = vertex('int', scale);
        return (
          <polygon
            key={i}
            points={`${a},${b} ${c},${d} ${e},${f}`}
            fill="none"
            stroke={GRID}
            strokeWidth="1"
          />
        );
      })}

      {/* Axis lines */}
      {(['gp', 'ath', 'int'] as const).map((k) => {
        const [x, y] = vertex(k);
        return (
          <line
            key={k}
            x1={center} y1={center}
            x2={x} y2={y}
            stroke={BORDER}
            strokeWidth="1"
          />
        );
      })}

      {/* Outer triangle */}
      <path d={outerPath} fill="none" stroke={BORDER} strokeWidth="1.5" />

      {/* Scale ticks */}
      {rings.map((scale, i) => {
        const value = Math.round(scale * 100);
        const [x, y] = vertex('gp', scale);
        return (
          <text
            key={`tick-${i}`}
            x={x + 8}
            y={y + 4}
            fill="#8B94A8"
            fontSize="9"
            fontFamily="'JetBrains Mono', monospace"
          >
            {value}
          </text>
        );
      })}

      {/* CLEAN triangle (behind) */}
      {clean && (
        <motion.path
          d={trianglePath(clean)}
          fill="none"
          stroke={RED}
          strokeWidth="2"
          strokeDasharray="5 4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.9 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        />
      )}

      {/* ACTUAL triangle */}
      <motion.path
        d={trianglePath(actual)}
        fill="url(#navyFill)"
        stroke={NAVY}
        strokeWidth="3"
        filter="url(#navyGlow)"
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
        style={{ transformOrigin: `${center}px ${center}px` }}
      />

      {/* Vertex dots + value chips */}
      {(['gp', 'ath', 'int'] as const).map((k) => {
        const value = k === 'gp' ? actual.gamePerformance
          : k === 'ath' ? actual.athleticism
          : actual.intangibles;
        const [x, y] = point(value, k);
        // Chip offset — push away from center so it doesn't overlap the point
        const [cx, cy] = [x - center, y - center];
        const len = Math.max(1, Math.hypot(cx, cy));
        const chipX = x + (cx / len) * 26;
        const chipY = y + (cy / len) * 16;

        return (
          <g key={`pt-${k}`}>
            <circle cx={x} cy={y} r="6" fill={NAVY} stroke="#FFFFFF" strokeWidth="2.5" />
            <g transform={`translate(${chipX - 22}, ${chipY - 11})`}>
              <rect
                width="44"
                height="22"
                rx="4"
                fill="#FFFFFF"
                stroke={NAVY}
                strokeWidth="1.5"
              />
              <text
                x="22"
                y="15"
                textAnchor="middle"
                fill={NAVY}
                fontSize="12"
                fontWeight="800"
                fontFamily="'Outfit', sans-serif"
              >
                {value.toFixed(1)}
              </text>
            </g>
          </g>
        );
      })}

      {/* Pillar labels — properly anchored so they never clip */}
      <g fontFamily="'Outfit', sans-serif">
        {/* TOP — centered */}
        <text x={labelGP[0]} y={labelGP[1] - 14} textAnchor="middle" fill={INK} fontSize="13" fontWeight="800" letterSpacing="0.05em">
          GAME PERFORMANCE
        </text>
        <text x={labelGP[0]} y={labelGP[1]} textAnchor="middle" fill={RED} fontSize="9" fontWeight="700" fontFamily="'JetBrains Mono', monospace" letterSpacing="0.15em">
          40% WEIGHT
        </text>

        {/* BOTTOM-RIGHT — anchored end so it stretches to the left */}
        <text x={labelAth[0]} y={labelAth[1]} textAnchor="end" fill={INK} fontSize="13" fontWeight="800" letterSpacing="0.05em">
          ATHLETICISM
        </text>
        <text x={labelAth[0]} y={labelAth[1] + 14} textAnchor="end" fill={RED} fontSize="9" fontWeight="700" fontFamily="'JetBrains Mono', monospace" letterSpacing="0.15em">
          30% WEIGHT
        </text>

        {/* BOTTOM-LEFT — anchored start so it stretches to the right */}
        <text x={labelInt[0]} y={labelInt[1]} textAnchor="start" fill={INK} fontSize="13" fontWeight="800" letterSpacing="0.05em">
          INTANGIBLES
        </text>
        <text x={labelInt[0]} y={labelInt[1] + 14} textAnchor="start" fill={RED} fontSize="9" fontWeight="700" fontFamily="'JetBrains Mono', monospace" letterSpacing="0.15em">
          30% WEIGHT
        </text>
      </g>

      {/* Legend */}
      <g transform={`translate(${size * 0.08}, ${size - 24})`} fontFamily="'JetBrains Mono', monospace" fontSize="10">
        <rect x="0" y="-10" width="16" height="10" fill="url(#navyFill)" stroke={NAVY} strokeWidth="1.5" />
        <text x="22" y="-1" fill={INK} fontWeight="700">ACTUAL</text>
        {clean && (
          <>
            <line x1="96" y1="-5" x2="112" y2="-5" stroke={RED} strokeWidth="2" strokeDasharray="3 2" />
            <text x="118" y="-1" fill={MUTED} fontWeight="700">CLEAN</text>
          </>
        )}
      </g>
    </svg>
  );
}
