'use client';

/**
 * GradeStamp — Animated press stamp
 * ===================================
 * The badge gets "slammed" onto the top-right corner of the card:
 *   1. Entry    — large, rotated, translucent, above the card
 *   2. Impact   — snaps to final size+position, ring shockwave
 *   3. Settle   — tiny jitter bounce, ink bleeds out
 *   4. Rest     — sits on corner like a wax seal
 *
 * Usage inside TIERevealCard:
 *   <GradeStamp score={player.grade} trigger={state === 'revealed'} />
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GradeBadge, getTierStyle } from './GradeBadge';
import { getGradeBand } from '@/lib/draft/tie-scale';

interface GradeStampProps {
  score: number;
  trigger: boolean;
  size?: number;           // final resting size in px
  corner?: 'tl' | 'tr' | 'bl' | 'br';
  delay?: number;          // ms before impact
  onImpact?: () => void;   // callback when stamp hits
}

export function GradeStamp({
  score,
  trigger,
  size = 110,
  corner = 'tr',
  delay = 400,
  onImpact,
}: GradeStampProps) {
  const [phase, setPhase] = useState<'idle' | 'entering' | 'impact' | 'settled'>('idle');
  const style = getTierStyle(score);
  const band = getGradeBand(score);

  useEffect(() => {
    if (!trigger) {
      setPhase('idle');
      return;
    }
    const t1 = setTimeout(() => setPhase('entering'), delay);
    const t2 = setTimeout(() => {
      setPhase('impact');
      onImpact?.();
      playImpactSound();
    }, delay + 450);
    const t3 = setTimeout(() => setPhase('settled'), delay + 750);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [trigger, delay, onImpact]);

  const cornerPos = {
    tl: { top: 12, left: 12 },
    tr: { top: 12, right: 12 },
    bl: { bottom: 12, left: 12 },
    br: { bottom: 12, right: 12 },
  }[corner];

  return (
    <AnimatePresence>
      {trigger && phase !== 'idle' && (
        <motion.div
          className="absolute pointer-events-none"
          style={{ ...cornerPos, width: size, height: size, zIndex: 40 }}
        >
          {/* Shockwave ring — only on impact */}
          <AnimatePresence>
            {phase === 'impact' && (
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  border: `3px solid ${style.accent}`,
                  boxShadow: `0 0 40px ${style.glow}`,
                }}
                initial={{ scale: 1, opacity: 1 }}
                animate={{ scale: 2.4, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            )}
          </AnimatePresence>

          {/* Second shockwave ring (staggered) */}
          <AnimatePresence>
            {phase === 'impact' && (
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ border: `2px solid ${style.accent}` }}
                initial={{ scale: 1, opacity: 0.7 }}
                animate={{ scale: 1.8, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, delay: 0.08, ease: 'easeOut' }}
              />
            )}
          </AnimatePresence>

          {/* Ink splatter dots */}
          <AnimatePresence>
            {phase === 'impact' && (
              <>
                {Array.from({ length: 8 }).map((_, i) => {
                  const angle = (i * 45 * Math.PI) / 180;
                  const distance = 35 + (i % 3) * 12;
                  const dx = Math.cos(angle) * distance;
                  const dy = Math.sin(angle) * distance;
                  const dotSize = 3 + (i % 3);
                  return (
                    <motion.div
                      key={i}
                      className="absolute rounded-full"
                      style={{
                        top: '50%',
                        left: '50%',
                        width: dotSize,
                        height: dotSize,
                        background: style.accent,
                        boxShadow: `0 0 6px ${style.glow}`,
                      }}
                      initial={{ x: 0, y: 0, opacity: 1 }}
                      animate={{ x: dx, y: dy, opacity: 0 }}
                      transition={{ duration: 0.55, ease: 'easeOut' }}
                    />
                  );
                })}
              </>
            )}
          </AnimatePresence>

          {/* The stamp itself */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{
              scale: 3.2,
              rotate: -28,
              opacity: 0,
              y: -80,
            }}
            animate={{
              scale: phase === 'entering' ? 3.2 : phase === 'impact' ? 0.92 : 1,
              rotate: phase === 'entering' ? -28 : phase === 'impact' ? -8 : -6,
              opacity: phase === 'entering' ? 0.3 : 1,
              y: phase === 'entering' ? -80 : phase === 'impact' ? 4 : 0,
            }}
            transition={
              phase === 'entering'
                ? { duration: 0.35, ease: 'easeIn' }
                : phase === 'impact'
                ? { duration: 0.12, ease: [0.7, 0, 0.3, 1] }
                : { duration: 0.35, type: 'spring', stiffness: 360, damping: 14 }
            }
            style={{
              filter:
                phase === 'impact'
                  ? `drop-shadow(0 6px 12px ${style.glow}) drop-shadow(0 0 30px ${style.glow})`
                  : phase === 'settled'
                  ? `drop-shadow(0 3px 8px rgba(0,0,0,0.6)) drop-shadow(0 0 14px ${style.glow})`
                  : 'none',
            }}
          >
            <GradeBadge score={score} size={size} variant="stamp" showScore={true} />
          </motion.div>

          {/* Impact flash overlay */}
          <AnimatePresence>
            {phase === 'impact' && (
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `radial-gradient(circle, ${style.accent}cc 0%, transparent 70%)`,
                  mixBlendMode: 'screen',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.3, times: [0, 0.2, 1] }}
              />
            )}
          </AnimatePresence>

          {/* Wax-seal rotation tick marks (settled state) */}
          {phase === 'settled' && (
            <motion.div
              className="absolute -inset-1 rounded-full pointer-events-none"
              style={{
                border: `1px dashed ${style.accent}40`,
              }}
              initial={{ opacity: 0, rotate: 0 }}
              animate={{ opacity: 1, rotate: 360 }}
              transition={{
                opacity: { duration: 0.4 },
                rotate: { duration: 40, repeat: Infinity, ease: 'linear' },
              }}
            />
          )}

          {/* Tier label caption under stamp */}
          {phase === 'settled' && (
            <motion.div
              className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap"
              style={{
                top: size + 4,
                color: style.accent,
                textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              }}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <div
                className="text-[8px] font-bold tracking-[0.2em]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {band.label}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Impact sound via Web Audio API ── */
function playImpactSound() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass =
      (window as unknown as { AudioContext: typeof AudioContext }).AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();

    // Low thud (the press)
    const thud = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(120, ctx.currentTime);
    thud.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.15);
    thudGain.gain.setValueAtTime(0.4, ctx.currentTime);
    thudGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    thud.connect(thudGain).connect(ctx.destination);
    thud.start();
    thud.stop(ctx.currentTime + 0.25);

    // High click (the contact)
    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.type = 'square';
    click.frequency.setValueAtTime(2200, ctx.currentTime);
    clickGain.gain.setValueAtTime(0.12, ctx.currentTime);
    clickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    click.connect(clickGain).connect(ctx.destination);
    click.start();
    click.stop(ctx.currentTime + 0.05);
  } catch {
    /* audio not available */
  }
}
