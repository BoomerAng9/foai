'use client';

/**
 * Historical Comp Landscape — premium scatter
 * ============================================
 * Plots the player + each historical comp on a 2D plane:
 *   X-axis: career years (durability)
 *   Y-axis: peak performance grade (ceiling)
 * Bubble size: pro bowls
 * Color: outcome tier
 * The player is rendered as a glowing gold star.
 *
 * Hand-built SVG so it's deterministic, branded, and not generic.
 */

import { motion } from 'framer-motion';

interface Comp {
  name: string;
  careerYears: number;
  peakYears: number;
  proBowls: number;
  outcome: 'hall_of_fame' | 'pro_bowl' | 'starter' | 'rotational' | 'out_of_league_early';
}

interface CompLandscapeProps {
  playerName: string;
  playerGrade: number;
  upside?: Comp | null;
  baseline?: Comp | null;
  downside?: Comp | null;
  size?: number;
}

const OUTCOME_COLOR: Record<Comp['outcome'], string> = {
  hall_of_fame: '#FFD700',
  pro_bowl: '#3FD3FF',
  starter: '#B8B8C8',
  rotational: '#A0693A',
  out_of_league_early: '#FF6B2B',
};

const OUTCOME_LABEL: Record<Comp['outcome'], string> = {
  hall_of_fame: 'HALL OF FAME',
  pro_bowl: 'PRO BOWL',
  starter: 'STARTER',
  rotational: 'ROTATIONAL',
  out_of_league_early: 'EARLY EXIT',
};

export function CompLandscape({
  playerName,
  playerGrade,
  upside,
  baseline,
  downside,
  size = 720,
}: CompLandscapeProps) {
  const width = size;
  const height = size * 0.62;
  const padding = { top: 50, right: 60, bottom: 60, left: 80 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  // Axis ranges
  const xMin = 0, xMax = 20;          // career years
  const yMin = 75, yMax = 100;        // peak performance grade

  function x(years: number): number {
    return padding.left + ((years - xMin) / (xMax - xMin)) * plotW;
  }
  function y(grade: number): number {
    return padding.top + plotH - ((grade - yMin) / (yMax - yMin)) * plotH;
  }
  function bubbleSize(proBowls: number): number {
    return 8 + proBowls * 2.2;
  }

  // Synthesize a peak grade for each comp from peakYears (5 peak years ~= 95)
  function synthPeakGrade(c: Comp): number {
    return Math.min(99, 80 + c.peakYears * 2.2);
  }

  // Player position (use grade as the y-axis, project years from grade)
  // Use the player's actual grade as their peak. Career years estimated.
  const playerYears = 8;     // Default projection
  const playerX = x(playerYears);
  const playerY = y(playerGrade);

  const comps = [
    { kind: 'UPSIDE', comp: upside, color: '#3FD3FF' },
    { kind: 'BASELINE', comp: baseline, color: '#FFFFFF' },
    { kind: 'DOWNSIDE', comp: downside, color: '#FF6B2B' },
  ].filter(c => c.comp);

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="playerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFD700" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#D4A853" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#D4A853" stopOpacity="0" />
        </radialGradient>
        <filter id="compGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background grid */}
      {[5, 10, 15, 20].map(yr => (
        <g key={`vgrid-${yr}`}>
          <line
            x1={x(yr)}
            y1={padding.top}
            x2={x(yr)}
            y2={padding.top + plotH}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
          />
        </g>
      ))}
      {[80, 85, 90, 95, 100].map(g => (
        <g key={`hgrid-${g}`}>
          <line
            x1={padding.left}
            y1={y(g)}
            x2={padding.left + plotW}
            y2={y(g)}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
          />
        </g>
      ))}

      {/* Tier band overlays */}
      <rect
        x={padding.left}
        y={y(100)}
        width={plotW}
        height={y(90) - y(100)}
        fill="rgba(255,215,0,0.05)"
      />
      <text
        x={padding.left + plotW - 8}
        y={y(95) + 4}
        textAnchor="end"
        fill="rgba(255,215,0,0.4)"
        fontSize="9"
        fontFamily="'JetBrains Mono', monospace"
      >
        ELITE TIER
      </text>

      {/* Axes */}
      <line
        x1={padding.left}
        y1={padding.top + plotH}
        x2={padding.left + plotW}
        y2={padding.top + plotH}
        stroke="rgba(212,168,83,0.4)"
        strokeWidth="1.5"
      />
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={padding.top + plotH}
        stroke="rgba(212,168,83,0.4)"
        strokeWidth="1.5"
      />

      {/* X-axis labels */}
      {[0, 5, 10, 15, 20].map(yr => (
        <text
          key={`xlbl-${yr}`}
          x={x(yr)}
          y={padding.top + plotH + 18}
          textAnchor="middle"
          fill="rgba(255,255,255,0.6)"
          fontSize="11"
          fontFamily="'JetBrains Mono', monospace"
        >
          {yr}
        </text>
      ))}
      <text
        x={padding.left + plotW / 2}
        y={padding.top + plotH + 42}
        textAnchor="middle"
        fill="#D4A853"
        fontSize="10"
        fontWeight="700"
        fontFamily="'JetBrains Mono', monospace"
        letterSpacing="0.15em"
      >
        CAREER YEARS · DURABILITY
      </text>

      {/* Y-axis labels */}
      {[80, 85, 90, 95, 100].map(g => (
        <text
          key={`ylbl-${g}`}
          x={padding.left - 12}
          y={y(g) + 4}
          textAnchor="end"
          fill="rgba(255,255,255,0.6)"
          fontSize="11"
          fontFamily="'JetBrains Mono', monospace"
        >
          {g}
        </text>
      ))}
      <text
        x={20}
        y={padding.top + plotH / 2}
        textAnchor="middle"
        fill="#D4A853"
        fontSize="10"
        fontWeight="700"
        fontFamily="'JetBrains Mono', monospace"
        letterSpacing="0.15em"
        transform={`rotate(-90, 20, ${padding.top + plotH / 2})`}
      >
        PEAK GRADE · CEILING
      </text>

      {/* Comp bubbles */}
      {comps.map((item, i) => {
        const c = item.comp!;
        const cx = x(c.careerYears);
        const cy = y(synthPeakGrade(c));
        const r = bubbleSize(c.proBowls);
        const color = OUTCOME_COLOR[c.outcome];
        return (
          <motion.g
            key={c.name}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 + i * 0.15, ease: 'backOut' }}
          >
            {/* outer halo */}
            <circle cx={cx} cy={cy} r={r + 8} fill={color} opacity="0.1" />
            {/* main bubble */}
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill={color}
              fillOpacity="0.85"
              stroke={color}
              strokeWidth="2"
              filter="url(#compGlow)"
            />
            {/* name label */}
            <text
              x={cx}
              y={cy - r - 8}
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="12"
              fontWeight="800"
              fontFamily="'Outfit', sans-serif"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
            >
              {c.name}
            </text>
            {/* outcome tag */}
            <text
              x={cx}
              y={cy + r + 16}
              textAnchor="middle"
              fill={color}
              fontSize="8"
              fontWeight="700"
              fontFamily="'JetBrains Mono', monospace"
              letterSpacing="0.1em"
            >
              {OUTCOME_LABEL[c.outcome]}
            </text>
            <text
              x={cx}
              y={cy + r + 28}
              textAnchor="middle"
              fill="rgba(255,255,255,0.5)"
              fontSize="8"
              fontFamily="'JetBrains Mono', monospace"
            >
              {c.careerYears}yr · {c.proBowls}× PB
            </text>
          </motion.g>
        );
      })}

      {/* Player marker — gold star with halo */}
      <motion.g
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.9, ease: 'backOut' }}
      >
        <circle cx={playerX} cy={playerY} r="32" fill="url(#playerGlow)" />
        <Star cx={playerX} cy={playerY} size={20} fill="#FFD700" stroke="#1A0F00" />
        <text
          x={playerX}
          y={playerY - 38}
          textAnchor="middle"
          fill="#FFD700"
          fontSize="14"
          fontWeight="900"
          fontFamily="'Outfit', sans-serif"
          style={{ textShadow: '0 0 10px rgba(212,168,83,0.8), 0 1px 4px rgba(0,0,0,0.9)' }}
        >
          {playerName.toUpperCase()}
        </text>
        <text
          x={playerX}
          y={playerY + 36}
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="11"
          fontWeight="700"
          fontFamily="'JetBrains Mono', monospace"
        >
          GRADE {playerGrade.toFixed(1)}
        </text>
      </motion.g>
    </svg>
  );
}

/* ── 5-point star helper ── */
function Star({ cx, cy, size, fill, stroke }: { cx: number; cy: number; size: number; fill: string; stroke: string }) {
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? size : size * 0.4;
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return (
    <polygon
      points={points.join(' ')}
      fill={fill}
      stroke={stroke}
      strokeWidth="2"
      style={{ filter: `drop-shadow(0 0 12px rgba(212,168,83,0.9))` }}
    />
  );
}
