'use client';

/**
 * Pillar Radar Chart — deterministic SVG triangle radar
 * =======================================================
 * Three-pillar radar showing actual vs clean (medical-adjusted)
 * pillars overlaid. Hand-built SVG so it ALWAYS renders correctly
 * (Vega-Lite from Gemini was producing broken layouts with text
 * collisions). Three vertices: Game Performance (top), Athleticism
 * (bottom-right), Intangibles (bottom-left).
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

export function PillarRadar({ actual, clean, size = 480 }: PillarRadarProps) {
  const center = size / 2;
  const maxRadius = size * 0.36;

  // Three vertices (Game Perf top, Athleticism bottom-right, Intangibles bottom-left)
  const angles = {
    gp: -Math.PI / 2,                  // top
    ath: -Math.PI / 2 + (2 * Math.PI) / 3,  // 30°
    int: -Math.PI / 2 - (2 * Math.PI) / 3,  // 150°
  };

  function point(value: number, angleKey: keyof typeof angles): [number, number] {
    const r = (Math.max(0, Math.min(100, value)) / 100) * maxRadius;
    return [
      center + r * Math.cos(angles[angleKey]),
      center + r * Math.sin(angles[angleKey]),
    ];
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

  // Grid rings (25, 50, 75, 100)
  const rings = [0.25, 0.5, 0.75, 1.0];

  // Outer triangle for axis
  const outerPath = (() => {
    const [a, b] = vertex('gp');
    const [c, d] = vertex('ath');
    const [e, f] = vertex('int');
    return `M ${a} ${b} L ${c} ${d} L ${e} ${f} Z`;
  })();

  // Label positions (push out from vertices)
  const labelGP = vertex('gp', 1.18);
  const labelAth = vertex('ath', 1.22);
  const labelInt = vertex('int', 1.22);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <radialGradient id="radarGoldFill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFD700" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#8B6914" stopOpacity="0.25" />
        </radialGradient>
        <filter id="radarGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Concentric grid rings (triangles) */}
      {rings.map((scale, i) => {
        const [a, b] = vertex('gp', scale);
        const [c, d] = vertex('ath', scale);
        const [e, f] = vertex('int', scale);
        return (
          <polygon
            key={i}
            points={`${a},${b} ${c},${d} ${e},${f}`}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="1"
          />
        );
      })}

      {/* Axis lines from center to each vertex */}
      {(['gp', 'ath', 'int'] as const).map((k) => {
        const [x, y] = vertex(k);
        return (
          <line
            key={k}
            x1={center}
            y1={center}
            x2={x}
            y2={y}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1"
          />
        );
      })}

      {/* Outer triangle */}
      <path d={outerPath} fill="none" stroke="rgba(212,168,83,0.25)" strokeWidth="1.5" />

      {/* Scale tick numbers along the GP axis */}
      {rings.map((scale, i) => {
        const value = Math.round(scale * 100);
        const [x, y] = vertex('gp', scale);
        return (
          <text
            key={`tick-${i}`}
            x={x + 6}
            y={y + 4}
            fill="rgba(255,255,255,0.25)"
            fontSize="8"
            fontFamily="'JetBrains Mono', monospace"
          >
            {value}
          </text>
        );
      })}

      {/* CLEAN triangle (silver dotted, behind) */}
      {clean && (
        <motion.path
          d={trianglePath(clean)}
          fill="rgba(192,192,200,0.08)"
          stroke="#C0C8D8"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
          style={{ transformOrigin: `${center}px ${center}px` }}
        />
      )}

      {/* ACTUAL triangle (gold filled) */}
      <motion.path
        d={trianglePath(actual)}
        fill="url(#radarGoldFill)"
        stroke="#D4A853"
        strokeWidth="2.5"
        filter="url(#radarGlow)"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, delay: 0.4, ease: 'easeOut' }}
        style={{ transformOrigin: `${center}px ${center}px` }}
      />

      {/* Vertex points + value labels on actual */}
      {(['gp', 'ath', 'int'] as const).map((k) => {
        const value =
          k === 'gp' ? actual.gamePerformance
          : k === 'ath' ? actual.athleticism
          : actual.intangibles;
        const [x, y] = point(value, k);
        return (
          <g key={`pt-${k}`}>
            <circle
              cx={x}
              cy={y}
              r="5"
              fill="#FFD700"
              stroke="#1A0F00"
              strokeWidth="2"
              filter="url(#radarGlow)"
            />
            <text
              x={x}
              y={y - 12}
              textAnchor="middle"
              fill="#FFD700"
              fontSize="13"
              fontWeight="800"
              fontFamily="'Outfit', sans-serif"
            >
              {value.toFixed(1)}
            </text>
          </g>
        );
      })}

      {/* Pillar labels (outside the triangle) */}
      <g fontFamily="'Outfit', sans-serif" fontWeight="700">
        <text
          x={labelGP[0]}
          y={labelGP[1]}
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="14"
        >
          GAME PERFORMANCE
        </text>
        <text
          x={labelGP[0]}
          y={labelGP[1] + 14}
          textAnchor="middle"
          fill="rgba(212,168,83,0.7)"
          fontSize="9"
          fontFamily="'JetBrains Mono', monospace"
        >
          40% WEIGHT
        </text>

        <text
          x={labelAth[0]}
          y={labelAth[1]}
          textAnchor="start"
          fill="#FFFFFF"
          fontSize="14"
        >
          ATHLETICISM
        </text>
        <text
          x={labelAth[0]}
          y={labelAth[1] + 14}
          textAnchor="start"
          fill="rgba(212,168,83,0.7)"
          fontSize="9"
          fontFamily="'JetBrains Mono', monospace"
        >
          30% WEIGHT
        </text>

        <text
          x={labelInt[0]}
          y={labelInt[1]}
          textAnchor="end"
          fill="#FFFFFF"
          fontSize="14"
        >
          INTANGIBLES
        </text>
        <text
          x={labelInt[0]}
          y={labelInt[1] + 14}
          textAnchor="end"
          fill="rgba(212,168,83,0.7)"
          fontSize="9"
          fontFamily="'JetBrains Mono', monospace"
        >
          30% WEIGHT
        </text>
      </g>

      {/* Legend */}
      <g transform={`translate(${size * 0.05}, ${size * 0.92})`} fontFamily="'JetBrains Mono', monospace" fontSize="10">
        <rect x="0" y="-9" width="14" height="9" fill="url(#radarGoldFill)" stroke="#D4A853" />
        <text x="20" y="0" fill="#FFFFFF">ACTUAL</text>
        {clean && (
          <>
            <rect x="80" y="-9" width="14" height="9" fill="rgba(192,192,200,0.08)" stroke="#C0C8D8" strokeDasharray="2 2" />
            <text x="100" y="0" fill="rgba(255,255,255,0.7)">CLEAN</text>
          </>
        )}
      </g>
    </svg>
  );
}
