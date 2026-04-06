'use client';

/**
 * TIE Shield Badge
 * ===================
 * The canonical Per|Form brand mark — TIE Talent & Innovation Engine
 * shield (gold/silver/black hexagonal frame) with the grade letter
 * and score baked underneath. Replaces the old generic "orb" badge.
 *
 * Variants:
 *   - 'shield'   — full shield with grade overlay (use on cards)
 *   - 'grade'    — shield + tier color tint matching the canonical scale
 *   - 'minimal'  — small inline shield mark (for headers, list rows)
 */

import Image from 'next/image';
import { getGradeBand } from '@/lib/draft/tie-scale';

interface TIEShieldProps {
  score?: number;          // If set, overlays grade letter + score under shield
  size?: number;
  variant?: 'shield' | 'grade' | 'minimal';
  background?: 'transparent' | 'black';
  showLabel?: boolean;     // Show tier label under
}

const TIER_TINTS: Record<string, { glow: string; accent: string }> = {
  PRIME:               { glow: 'rgba(200,155,255,0.7)', accent: '#C89BFF' },
  ELITE:               { glow: 'rgba(255,215,0,0.7)',   accent: '#FFD700' },
  'FIRST ROUND LOCK':  { glow: 'rgba(255,107,43,0.7)',  accent: '#FF6B2B' },
  'LATE FIRST ROUND':  { glow: 'rgba(200,200,216,0.7)', accent: '#C8C8D8' },
  'HIGH CEILING':      { glow: 'rgba(205,127,50,0.7)',  accent: '#CD7F32' },
  'SOLID CONTRIBUTOR': { glow: 'rgba(139,90,43,0.7)',   accent: '#A0693A' },
  DEVELOPMENTAL:       { glow: 'rgba(63,211,255,0.7)',  accent: '#3FD3FF' },
  DEPTH:               { glow: 'rgba(154,163,179,0.6)', accent: '#9AA3B3' },
  UDFA:                { glow: 'rgba(107,107,107,0.5)', accent: '#6B6B6B' },
};

export function TIEShield({
  score,
  size = 200,
  variant = 'shield',
  background = 'transparent',
  showLabel = false,
}: TIEShieldProps) {
  const band = score !== undefined ? getGradeBand(score) : null;
  const tint = band ? TIER_TINTS[band.label] ?? TIER_TINTS.UDFA : null;
  const imageSrc = background === 'black'
    ? '/brand/tie-shield-black.png'
    : '/brand/tie-shield-white.png';

  if (variant === 'minimal') {
    return (
      <div
        className="relative inline-flex items-center justify-center"
        style={{ width: size, height: size * 0.85 }}
      >
        <Image
          src={imageSrc}
          alt="TIE"
          fill
          sizes={`${size}px`}
          className="object-contain"
          style={{
            filter: tint
              ? `drop-shadow(0 0 14px ${tint.glow})`
              : 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
          }}
        />
      </div>
    );
  }

  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: size }}>
      {/* Glow halo behind shield */}
      {tint && (
        <div
          className="absolute pointer-events-none rounded-full"
          style={{
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: size * 0.95,
            height: size * 0.95,
            background: `radial-gradient(circle, ${tint.glow} 0%, transparent 65%)`,
            filter: 'blur(20px)',
          }}
        />
      )}

      {/* Shield image */}
      <div
        className="relative"
        style={{
          width: size,
          height: size,
          filter: tint
            ? `drop-shadow(0 0 24px ${tint.glow}) drop-shadow(0 8px 18px rgba(0,0,0,0.7))`
            : 'drop-shadow(0 8px 18px rgba(0,0,0,0.7))',
        }}
      >
        <Image
          src={imageSrc}
          alt="TIE Shield"
          fill
          sizes={`${size}px`}
          className="object-contain"
          priority
        />
      </div>

      {/* Grade overlay — score + letter underneath the shield */}
      {band && score !== undefined && (
        <div
          className="relative -mt-6 flex flex-col items-center text-center"
          style={{ minWidth: size * 0.7 }}
        >
          <div
            className="px-4 py-1.5 rounded-md backdrop-blur-sm"
            style={{
              background: 'linear-gradient(180deg, rgba(0,0,0,0.85), rgba(0,0,0,0.6))',
              border: `1.5px solid ${tint?.accent ?? '#D4A853'}`,
              boxShadow: `0 0 20px ${tint?.glow ?? 'rgba(212,168,83,0.4)'}`,
            }}
          >
            <div className="flex items-baseline gap-2">
              <span
                className="text-2xl font-black leading-none"
                style={{
                  color: tint?.accent ?? '#D4A853',
                  fontFamily: "'Outfit', sans-serif",
                  textShadow: `0 0 12px ${tint?.glow ?? 'rgba(212,168,83,0.6)'}`,
                }}
              >
                {band.grade}
              </span>
              <span
                className="text-xl font-extrabold tabular-nums"
                style={{
                  color: '#FFFFFF',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {score >= 101 ? '101+' : score.toFixed(1)}
              </span>
            </div>
          </div>

          {showLabel && (
            <div
              className="mt-2 text-[9px] font-bold tracking-[0.22em]"
              style={{
                color: tint?.accent ?? '#D4A853',
                fontFamily: "'JetBrains Mono', monospace",
                textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              }}
            >
              {band.label}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
