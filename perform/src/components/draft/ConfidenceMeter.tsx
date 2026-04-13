'use client';

/**
 * ConfidenceMeter — Circular gauge showing model confidence for upcoming pick.
 * Displays 0-100% confidence with color coding.
 * Uses mock values (random 40-95%) since ML model isn't serving live predictions yet.
 */

import { useState, useEffect } from 'react';

interface ConfidenceMeterProps {
  /** Current pick number being predicted */
  pickNumber: number;
  /** Position the model predicts */
  predictedPosition?: string;
  /** Override confidence (0-100). If not provided, generates mock value. */
  confidence?: number;
}

function getConfidenceColor(value: number): string {
  if (value >= 80) return '#22C55E';   // green
  if (value >= 50) return '#F59E0B';   // amber
  return '#EF4444';                     // red
}

/** Generate a deterministic-ish mock confidence based on pick number */
function mockConfidence(pickNumber: number): number {
  // Simple seeded pseudo-random: higher confidence early, more variance later
  const base = pickNumber <= 10 ? 75 : pickNumber <= 32 ? 65 : pickNumber <= 100 ? 55 : 50;
  const seed = ((pickNumber * 7919) % 56) - 28; // -28 to +27
  return Math.min(95, Math.max(40, base + seed));
}

const MOCK_POSITIONS = ['EDGE', 'QB', 'WR', 'OT', 'CB', 'DT', 'LB', 'S', 'RB', 'TE', 'IOL'];

function mockPosition(pickNumber: number): string {
  return MOCK_POSITIONS[pickNumber % MOCK_POSITIONS.length];
}

export function ConfidenceMeter({ pickNumber, predictedPosition, confidence }: ConfidenceMeterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const targetValue = confidence ?? mockConfidence(pickNumber);
  const position = predictedPosition ?? mockPosition(pickNumber);
  const color = getConfidenceColor(targetValue);

  // Animate value on change
  useEffect(() => {
    setDisplayValue(0);
    const duration = 600; // ms
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(targetValue * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [targetValue, pickNumber]);

  // SVG circle parameters
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * displayValue) / 100;

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Circular gauge */}
      <div className="relative w-16 h-16 flex-shrink-0">
        <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
          {/* Background circle */}
          <circle
            cx="32" cy="32" r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="4"
          />
          {/* Progress circle */}
          <circle
            cx="32" cy="32" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke 0.3s' }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-black tabular-nums" style={{ color }}>
            {displayValue}%
          </span>
        </div>
      </div>

      {/* Label */}
      <div className="min-w-0">
        <div className="text-[9px] font-bold tracking-[0.15em] text-white/30 uppercase">
          Model Prediction
        </div>
        <div className="text-[11px] font-bold text-white/70 mt-0.5 truncate">
          {displayValue}% chance{' '}
          <span style={{ color }}>{position}</span>
          {' '}goes here
        </div>
      </div>
    </div>
  );
}
