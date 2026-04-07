'use client';

/**
 * Historical Comp Landscape — broadcast theme (light)
 * ======================================================
 * Navy + ESPN red scatter plot. Career years × peak grade.
 * Collision-aware: overlapping comps get nudged apart so they
 * don't stack (e.g. AP and Marcus Allen both at 15+ yr / 94 peak).
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

const NAVY = '#0B1E3F';
const NAVY_DEEP = '#06122A';
const RED = '#D40028';
const GREEN = '#00874C';
const BLUE = '#0A66E8';
const AMBER = '#DC6B19';
const INK = '#0A0E1A';
const MUTED = '#5A6478';
const BORDER = '#E2E6EE';
const GRID = '#EEF0F5';
const SURFACE_ALT = '#FAFBFD';

const OUTCOME_COLOR: Record<Comp['outcome'], string> = {
  hall_of_fame:        GREEN,
  pro_bowl:            BLUE,
  starter:             MUTED,
  rotational:          AMBER,
  out_of_league_early: RED,
};

const OUTCOME_LABEL: Record<Comp['outcome'], string> = {
  hall_of_fame:        'HALL OF FAME',
  pro_bowl:            'PRO BOWL',
  starter:             'STARTER',
  rotational:          'ROTATIONAL',
  out_of_league_early: 'EARLY EXIT',
};

export function CompLandscape({
  playerName,
  playerGrade,
  upside,
  baseline,
  downside,
  size = 820,
}: CompLandscapeProps) {
  const width = size;
  const height = Math.round(size * 0.6);
  const padding = { top: 60, right: 80, bottom: 70, left: 90 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const xMin = 0, xMax = 20;
  const yMin = 75, yMax = 100;

  const x = (years: number) => padding.left + ((years - xMin) / (xMax - xMin)) * plotW;
  const y = (grade: number) => padding.top + plotH - ((grade - yMin) / (yMax - yMin)) * plotH;
  const bubble = (pb: number) => 14 + pb * 2.8;
  const synthPeak = (c: Comp) => Math.min(99, 80 + c.peakYears * 2.2);

  /* ── Collision offsets: nudge overlapping comps apart ── */
  type Placed = { comp: Comp; kind: string; dx: number; dy: number };
  const raw: Array<{ comp: Comp | null; kind: string }> = [
    { comp: upside ?? null,   kind: 'UPSIDE' },
    { comp: baseline ?? null, kind: 'BASELINE' },
    { comp: downside ?? null, kind: 'DOWNSIDE' },
  ];

  const placed: Placed[] = [];
  raw.forEach(({ comp, kind }) => {
    if (!comp) return;
    const cx = x(comp.careerYears);
    const cy = y(synthPeak(comp));
    let dx = 0, dy = 0;
    // Extra breathing room so name labels above + outcome labels below
    // never collide with the next bubble's labels.
    const labelRoom = 70;
    for (const p of placed) {
      const px = x(p.comp.careerYears) + p.dx;
      const py = y(synthPeak(p.comp)) + p.dy;
      const dist = Math.hypot(cx + dx - px, cy + dy - py);
      const minDist = bubble(comp.proBowls) + bubble(p.comp.proBowls) + labelRoom;
      if (dist < minDist) {
        const needed = minDist - dist;
        // Horizontal-only push keeps labels aligned cleanly
        dx += needed * 0.95;
      }
    }
    placed.push({ comp, kind, dx, dy });
  });

  const playerX = x(8);
  const playerY = y(playerGrade);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <defs>
        <radialGradient id="playerStarGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={RED}   stopOpacity="0.35" />
          <stop offset="60%"  stopColor={RED}   stopOpacity="0.1" />
          <stop offset="100%" stopColor={RED}   stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Grid */}
      {[0, 5, 10, 15, 20].map((yr) => (
        <line key={`v-${yr}`} x1={x(yr)} y1={padding.top} x2={x(yr)} y2={padding.top + plotH} stroke={GRID} strokeWidth="1" />
      ))}
      {[75, 80, 85, 90, 95, 100].map((g) => (
        <line key={`h-${g}`} x1={padding.left} y1={y(g)} x2={padding.left + plotW} y2={y(g)} stroke={GRID} strokeWidth="1" />
      ))}

      {/* ELITE TIER band */}
      <rect
        x={padding.left}
        y={y(100)}
        width={plotW}
        height={y(90) - y(100)}
        fill={NAVY}
        fillOpacity="0.04"
      />
      <text
        x={padding.left + plotW - 10}
        y={y(100) + 14}
        textAnchor="end"
        fill={NAVY}
        fillOpacity="0.5"
        fontSize="9"
        fontWeight="700"
        fontFamily="'JetBrains Mono', monospace"
        letterSpacing="0.15em"
      >
        ELITE TIER
      </text>

      {/* Axis lines */}
      <line x1={padding.left} y1={padding.top + plotH} x2={padding.left + plotW} y2={padding.top + plotH} stroke={BORDER} strokeWidth="1.5" />
      <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotH} stroke={BORDER} strokeWidth="1.5" />

      {/* X labels */}
      {[0, 5, 10, 15, 20].map((yr) => (
        <text
          key={`xl-${yr}`}
          x={x(yr)}
          y={padding.top + plotH + 18}
          textAnchor="middle"
          fill={MUTED}
          fontSize="11"
          fontFamily="'JetBrains Mono', monospace"
        >
          {yr}
        </text>
      ))}
      <text
        x={padding.left + plotW / 2}
        y={padding.top + plotH + 44}
        textAnchor="middle"
        fill={RED}
        fontSize="10"
        fontWeight="700"
        fontFamily="'JetBrains Mono', monospace"
        letterSpacing="0.18em"
      >
        CAREER YEARS · DURABILITY
      </text>

      {/* Y labels */}
      {[80, 85, 90, 95, 100].map((g) => (
        <text
          key={`yl-${g}`}
          x={padding.left - 12}
          y={y(g) + 4}
          textAnchor="end"
          fill={MUTED}
          fontSize="11"
          fontFamily="'JetBrains Mono', monospace"
        >
          {g}
        </text>
      ))}
      <text
        x={26}
        y={padding.top + plotH / 2}
        textAnchor="middle"
        fill={RED}
        fontSize="10"
        fontWeight="700"
        fontFamily="'JetBrains Mono', monospace"
        letterSpacing="0.18em"
        transform={`rotate(-90, 26, ${padding.top + plotH / 2})`}
      >
        PEAK GRADE · CEILING
      </text>

      {/* Comp bubbles */}
      {placed.map((item, i) => {
        const c = item.comp;
        const baseX = x(c.careerYears);
        const baseY = y(synthPeak(c));
        const cx = baseX + item.dx;
        const cy = baseY + item.dy;
        const r = bubble(c.proBowls);
        const color = OUTCOME_COLOR[c.outcome];

        // Leader line from original position to offset position
        const needsLeader = Math.hypot(item.dx, item.dy) > 4;

        return (
          <motion.g
            key={c.name}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 + i * 0.15, ease: 'backOut' }}
          >
            {needsLeader && (
              <line
                x1={baseX}
                y1={baseY}
                x2={cx}
                y2={cy}
                stroke={color}
                strokeOpacity="0.3"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
            )}
            <circle cx={cx} cy={cy} r={r + 5} fill={color} fillOpacity="0.12" />
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill={color}
              fillOpacity="0.88"
              stroke="#FFFFFF"
              strokeWidth="3"
            />
            {/* Name label above bubble — with breathing room */}
            <text
              x={cx}
              y={cy - r - 12}
              textAnchor="middle"
              fill={INK}
              fontSize="13"
              fontWeight="800"
              fontFamily="'Outfit', sans-serif"
            >
              {c.name}
            </text>
            {/* Single-line stat summary below bubble */}
            <text
              x={cx}
              y={cy + r + 18}
              textAnchor="middle"
              fill={color}
              fontSize="10"
              fontWeight="700"
              fontFamily="'JetBrains Mono', monospace"
              letterSpacing="0.1em"
            >
              {c.careerYears}yr · {c.proBowls}× PB
            </text>
          </motion.g>
        );
      })}

      {/* Player star marker */}
      <motion.g
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.9, ease: 'backOut' }}
      >
        <circle cx={playerX} cy={playerY} r="36" fill="url(#playerStarGlow)" />
        <Star cx={playerX} cy={playerY} size={18} fill={RED} stroke={NAVY_DEEP} />
        <text
          x={playerX}
          y={playerY - 30}
          textAnchor="middle"
          fill={NAVY}
          fontSize="13"
          fontWeight="900"
          fontFamily="'Outfit', sans-serif"
        >
          {playerName.toUpperCase()}
        </text>
        <text
          x={playerX}
          y={playerY + 34}
          textAnchor="middle"
          fill={INK}
          fontSize="10"
          fontWeight="800"
          fontFamily="'JetBrains Mono', monospace"
        >
          GRADE {playerGrade.toFixed(1)}
        </text>
      </motion.g>
    </svg>
  );
}

function Star({ cx, cy, size, fill, stroke }: { cx: number; cy: number; size: number; fill: string; stroke: string }) {
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? size : size * 0.42;
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return (
    <polygon
      points={points.join(' ')}
      fill={fill}
      stroke={stroke}
      strokeWidth="2.5"
      style={{ filter: `drop-shadow(0 2px 6px rgba(212,0,40,0.4))` }}
    />
  );
}
