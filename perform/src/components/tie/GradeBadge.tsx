'use client';

/**
 * GradeBadge — Per|Form canonical tier badges
 * =============================================
 * One SVG badge per tier on the canonical ACHIEVEMOR scale:
 *   101+   Prime Player 🛸  iridescent holo
 *   90-100 A+           🚀  radiant gold
 *   85-89  A            🔥  fire
 *   80-84  A-           ⭐  silver star
 *   75-79  B+           ⏳  bronze
 *   70-74  B            🏈  leather
 *   65-69  B-           ⚡  electric
 *   60-64  C+           🔧  steel
 *   <60    C or Below   ❌  slate
 *
 * These are used both as static display badges AND as the "ink" of the
 * press stamp animation.
 */

import { getGradeBand } from '@/lib/draft/tie-scale';

interface GradeBadgeProps {
  score: number;
  size?: number;
  variant?: 'badge' | 'stamp'; // stamp = simplified for press animation
  showScore?: boolean;
}

interface TierStyle {
  ring: string;
  fill: string;
  text: string;
  accent: string;
  gradientStops: { offset: string; color: string }[];
  glow: string;
}

const TIER_STYLES: Record<string, TierStyle> = {
  PRIME: {
    ring: '#E8D4FF',
    fill: 'url(#holoGradient)',
    text: '#FFFFFF',
    accent: '#C89BFF',
    gradientStops: [
      { offset: '0%', color: '#FF6FD8' },
      { offset: '33%', color: '#3813C2' },
      { offset: '66%', color: '#00E0FF' },
      { offset: '100%', color: '#FFD700' },
    ],
    glow: 'rgba(200,155,255,0.9)',
  },
  ELITE: {
    ring: '#FFE680',
    fill: 'url(#goldGradient)',
    text: '#1A0F00',
    accent: '#FFD700',
    gradientStops: [
      { offset: '0%', color: '#FFF4B8' },
      { offset: '50%', color: '#FFD700' },
      { offset: '100%', color: '#8B6914' },
    ],
    glow: 'rgba(255,215,0,0.85)',
  },
  'FIRST ROUND LOCK': {
    ring: '#FF6B2B',
    fill: 'url(#fireGradient)',
    text: '#FFFFFF',
    accent: '#FF4500',
    gradientStops: [
      { offset: '0%', color: '#FFD166' },
      { offset: '50%', color: '#FF6B2B' },
      { offset: '100%', color: '#8B1A00' },
    ],
    glow: 'rgba(255,107,43,0.8)',
  },
  'LATE FIRST ROUND': {
    ring: '#E8E8F0',
    fill: 'url(#silverGradient)',
    text: '#1A1A2E',
    accent: '#B8B8C8',
    gradientStops: [
      { offset: '0%', color: '#FFFFFF' },
      { offset: '50%', color: '#C8C8D8' },
      { offset: '100%', color: '#6A6A7A' },
    ],
    glow: 'rgba(200,200,216,0.75)',
  },
  'HIGH CEILING': {
    ring: '#D68A3C',
    fill: 'url(#bronzeGradient)',
    text: '#FFFFFF',
    accent: '#CD7F32',
    gradientStops: [
      { offset: '0%', color: '#E8A864' },
      { offset: '50%', color: '#CD7F32' },
      { offset: '100%', color: '#5C3A10' },
    ],
    glow: 'rgba(205,127,50,0.7)',
  },
  'SOLID CONTRIBUTOR': {
    ring: '#8B5A2B',
    fill: 'url(#leatherGradient)',
    text: '#FFFFFF',
    accent: '#A0522D',
    gradientStops: [
      { offset: '0%', color: '#A0693A' },
      { offset: '50%', color: '#6B3A1A' },
      { offset: '100%', color: '#2A1508' },
    ],
    glow: 'rgba(139,90,43,0.65)',
  },
  DEVELOPMENTAL: {
    ring: '#3FD3FF',
    fill: 'url(#electricGradient)',
    text: '#001828',
    accent: '#00B8E6',
    gradientStops: [
      { offset: '0%', color: '#B8F0FF' },
      { offset: '50%', color: '#3FD3FF' },
      { offset: '100%', color: '#00486B' },
    ],
    glow: 'rgba(63,211,255,0.75)',
  },
  DEPTH: {
    ring: '#9AA3B3',
    fill: 'url(#steelGradient)',
    text: '#FFFFFF',
    accent: '#6B7280',
    gradientStops: [
      { offset: '0%', color: '#BCC4D1' },
      { offset: '50%', color: '#6B7280' },
      { offset: '100%', color: '#2A2F38' },
    ],
    glow: 'rgba(154,163,179,0.6)',
  },
  UDFA: {
    ring: '#6B6B6B',
    fill: 'url(#slateGradient)',
    text: '#E0E0E0',
    accent: '#4A4A4A',
    gradientStops: [
      { offset: '0%', color: '#5A5A5A' },
      { offset: '50%', color: '#333333' },
      { offset: '100%', color: '#141414' },
    ],
    glow: 'rgba(107,107,107,0.5)',
  },
};

export function GradeBadge({ score, size = 120, variant = 'badge', showScore = true }: GradeBadgeProps) {
  const band = getGradeBand(score);
  const style = TIER_STYLES[band.label] ?? TIER_STYLES.UDFA;
  const gradientId = `grad-${band.label.replace(/\s+/g, '-')}`;
  const scoreDisplay = score >= 101 ? '101+' : score.toFixed(0);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      style={{
        filter: variant === 'badge' ? `drop-shadow(0 0 16px ${style.glow})` : 'none',
      }}
    >
      <defs>
        {/* Tier-specific gradient */}
        <radialGradient id={gradientId} cx="50%" cy="35%" r="75%">
          {style.gradientStops.map((s, i) => (
            <stop key={i} offset={s.offset} stopColor={s.color} />
          ))}
        </radialGradient>

        {/* Holo overlay for PRIME */}
        {band.label === 'PRIME' && (
          <linearGradient id={`${gradientId}-holo`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.3" />
          </linearGradient>
        )}

        {/* Metallic rim */}
        <linearGradient id={`${gradientId}-rim`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="50%" stopColor={style.ring} stopOpacity="1" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      {/* Outer ring */}
      <circle cx="100" cy="100" r="96" fill="none" stroke={`url(#${gradientId}-rim)`} strokeWidth="4" />

      {/* Inner medallion */}
      <circle cx="100" cy="100" r="88" fill={`url(#${gradientId})`} />

      {/* Holo sheen for PRIME */}
      {band.label === 'PRIME' && (
        <circle cx="100" cy="100" r="88" fill={`url(#${gradientId}-holo)`} />
      )}

      {/* Inner detail ring */}
      <circle cx="100" cy="100" r="80" fill="none" stroke={style.ring} strokeWidth="1.5" opacity="0.6" />

      {/* Star ticks around border (12 points) */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 * Math.PI) / 180;
        const x1 = 100 + 84 * Math.cos(angle);
        const y1 = 100 + 84 * Math.sin(angle);
        const x2 = 100 + 78 * Math.cos(angle);
        const y2 = 100 + 78 * Math.sin(angle);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={style.ring}
            strokeWidth="1.5"
            opacity="0.7"
          />
        );
      })}

      {/* Tier icon (emoji) — top */}
      <text
        x="100"
        y="70"
        textAnchor="middle"
        fontSize="34"
        style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))' }}
      >
        {band.icon}
      </text>

      {/* Grade letter — middle */}
      <text
        x="100"
        y="118"
        textAnchor="middle"
        fill={style.text}
        fontSize={band.grade.length > 3 ? '22' : '38'}
        fontWeight="900"
        fontFamily="'Outfit', system-ui, sans-serif"
        style={{ letterSpacing: '-0.02em' }}
      >
        {band.grade}
      </text>

      {/* Score — bottom */}
      {showScore && (
        <>
          <line x1="60" y1="130" x2="140" y2="130" stroke={style.text} strokeWidth="1" opacity="0.4" />
          <text
            x="100"
            y="152"
            textAnchor="middle"
            fill={style.text}
            fontSize="24"
            fontWeight="800"
            fontFamily="'JetBrains Mono', monospace"
            opacity="0.95"
          >
            {scoreDisplay}
          </text>
        </>
      )}

      {/* Tier label — arc at bottom */}
      {variant === 'badge' && (
        <text
          x="100"
          y="178"
          textAnchor="middle"
          fill={style.text}
          fontSize="9"
          fontWeight="700"
          fontFamily="'JetBrains Mono', monospace"
          style={{ letterSpacing: '0.2em' }}
          opacity="0.85"
        >
          {band.label}
        </text>
      )}
    </svg>
  );
}

/* ── Tier style helper (exported for stamp component) ── */
export function getTierStyle(score: number) {
  const band = getGradeBand(score);
  return TIER_STYLES[band.label] ?? TIER_STYLES.UDFA;
}

/* ── All 9 tiers for showcase page ── */
export const TIER_SCORES = [
  { score: 103, label: 'PRIME' },
  { score: 95, label: 'ELITE' },
  { score: 87, label: 'FIRST ROUND LOCK' },
  { score: 82, label: 'LATE FIRST ROUND' },
  { score: 77, label: 'HIGH CEILING' },
  { score: 72, label: 'SOLID CONTRIBUTOR' },
  { score: 67, label: 'DEVELOPMENTAL' },
  { score: 62, label: 'DEPTH' },
  { score: 55, label: 'UDFA' },
];
