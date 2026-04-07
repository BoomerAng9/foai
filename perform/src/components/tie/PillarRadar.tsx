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

export function PillarRadar({ actual, clean, size = 540 }: PillarRadarProps) {
  // Generous margins so labels never clip on any screen
  const margin = 130;
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
  const labelGP  = vertex('gp',  1.38);
  const labelAth = vertex('ath', 1.30);
  const labelInt = vertex('int', 1.30);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: 'auto', maxWidth: size, display: 'block' }}
    >
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

      {/* Vertex dots only — values live with labels outside the triangle */}
      {(['gp', 'ath', 'int'] as const).map((k) => {
        const value = k === 'gp' ? actual.gamePerformance
          : k === 'ath' ? actual.athleticism
          : actual.intangibles;
        const [x, y] = point(value, k);
        return (
          <circle
            key={`pt-${k}`}
            cx={x}
            cy={y}
            r="6"
            fill={NAVY}
            stroke="#FFFFFF"
            strokeWidth="2.5"
          />
        );
      })}

      {/* Pillar labels — name + value stacked, outside the triangle */}
      <g fontFamily="'Outfit', sans-serif">
        {/* TOP — Game Performance */}
        <text x={labelGP[0]} y={labelGP[1]} textAnchor="middle" fill={INK} fontSize="13" fontWeight="800" letterSpacing="0.04em">
          GAME PERFORMANCE
        </text>
        <text x={labelGP[0]} y={labelGP[1] + 22} textAnchor="middle" fill={NAVY} fontSize="22" fontWeight="900">
          {actual.gamePerformance.toFixed(1)}
        </text>

        {/* BOTTOM-RIGHT — Athleticism */}
        <text x={labelAth[0]} y={labelAth[1]} textAnchor="start" fill={INK} fontSize="13" fontWeight="800" letterSpacing="0.04em">
          ATHLETICISM
        </text>
        <text x={labelAth[0]} y={labelAth[1] + 22} textAnchor="start" fill={NAVY} fontSize="22" fontWeight="900">
          {actual.athleticism.toFixed(1)}
        </text>

        {/* BOTTOM-LEFT — Intangibles */}
        <text x={labelInt[0]} y={labelInt[1]} textAnchor="end" fill={INK} fontSize="13" fontWeight="800" letterSpacing="0.04em">
          INTANGIBLES
        </text>
        <text x={labelInt[0]} y={labelInt[1] + 22} textAnchor="end" fill={NAVY} fontSize="22" fontWeight="900">
          {actual.intangibles.toFixed(1)}
        </text>
      </g>

      {/* Legend — bottom right, clear of labels */}
      <g transform={`translate(${size - 200}, ${size - 20})`} fontFamily="'JetBrains Mono', monospace" fontSize="10">
        <rect x="0" y="-10" width="16" height="10" fill="url(#navyFill)" stroke={NAVY} strokeWidth="1.5" />
        <text x="22" y="-1" fill={INK} fontWeight="700">ACTUAL</text>
        {clean && (
          <>
            <line x1="80" y1="-5" x2="96" y2="-5" stroke={RED} strokeWidth="2" strokeDasharray="3 2" />
            <text x="102" y="-1" fill={MUTED} fontWeight="700">CLEAN</text>
          </>
        )}
      </g>
    </svg>
  );
}
