'use client';

/**
 * TIE Engine Reveal Card
 * ========================
 * Three-state animated player card:
 *   1. LOCKED    — Classified dossier, silhouette, stats redacted
 *   2. ANALYZING — TIE logo spins, three bars fill left→right
 *   3. REVEALED  — Actual team colors, grade + rank flash in
 *
 * Every reveal teaches the TIE formula:
 *   T = Talent (40%)
 *   I = Intangibles (30%)
 *   E = Execution (30%)
 *
 * Usage:
 *   <TIERevealCard
 *     player={{ name, position, school, grade, tieGrade, rank }}
 *     lockedImageUrl="/generated/card/mendoza-mythic-locked.png"
 *     revealedImageUrl="/generated/card/mendoza-mythic-reveal.png"
 *   />
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TIERevealPlayer {
  name: string;
  position: string;
  school: string;
  grade: number;           // 0-100
  tieGrade: string;        // e.g. "Generational", "Blue Chip"
  rank: number;            // Overall Per|Form rank
  // Component sub-scores (from the TIE engine)
  talent?: number;         // 0-100
  intangibles?: number;    // 0-100
  execution?: number;      // 0-100
}

interface Props {
  player: TIERevealPlayer;
  lockedImageUrl: string;
  revealedImageUrl: string;
  autoPlay?: boolean;      // Auto-trigger reveal on mount
}

type State = 'locked' | 'analyzing' | 'revealed';

export function TIERevealCard({ player, lockedImageUrl, revealedImageUrl, autoPlay = false }: Props) {
  const [state, setState] = useState<State>('locked');
  const [barT, setBarT] = useState(0);
  const [barI, setBarI] = useState(0);
  const [barE, setBarE] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Derive sub-scores if not provided
  const talent = player.talent ?? Math.round(player.grade * 0.95 + Math.random() * 5);
  const intangibles = player.intangibles ?? Math.round(player.grade * 0.92 + Math.random() * 8);
  const execution = player.execution ?? Math.round(player.grade * 1.02);

  useEffect(() => {
    if (autoPlay) {
      const t = setTimeout(() => triggerAnalysis(), 800);
      return () => clearTimeout(t);
    }
  }, [autoPlay]);

  function playTone(freq: number, duration: number, type: OscillatorType = 'sine') {
    if (typeof window === 'undefined') return;
    if (!audioCtxRef.current) {
      const AudioContextClass = (window as unknown as { AudioContext: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AudioContextClass();
    }
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  function triggerAnalysis() {
    if (state !== 'locked') return;
    setState('analyzing');

    // Sequential bar fills with tick sounds
    animateBar(setBarT, talent, 0, () => {
      playTone(440, 0.1, 'square');
      animateBar(setBarI, intangibles, 400, () => {
        playTone(554, 0.1, 'square');
        animateBar(setBarE, execution, 400, () => {
          playTone(659, 0.15, 'square');
          // Final chord + reveal
          setTimeout(() => {
            playTone(880, 0.4, 'triangle');
            setTimeout(() => playTone(1108, 0.4, 'triangle'), 80);
            setTimeout(() => playTone(1318, 0.5, 'triangle'), 160);
            setState('revealed');
          }, 500);
        });
      });
    });
  }

  function animateBar(
    setter: (v: number) => void,
    target: number,
    delay: number,
    onComplete?: () => void,
  ) {
    setTimeout(() => {
      const start = Date.now();
      const duration = 900;
      const tick = () => {
        const elapsed = Date.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setter(Math.round(target * eased));
        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          onComplete?.();
        }
      };
      tick();
    }, delay);
  }

  function reset() {
    setState('locked');
    setBarT(0);
    setBarI(0);
    setBarE(0);
  }

  return (
    <div className="relative w-full max-w-[360px] mx-auto aspect-[3/4] rounded-2xl overflow-hidden group select-none">
      {/* LOCKED STATE — background image */}
      <motion.div
        className="absolute inset-0"
        initial={false}
        animate={{ opacity: state === 'revealed' ? 0 : 1 }}
        transition={{ duration: 0.6 }}
      >
        <img
          src={lockedImageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black/80" />
        {/* CLASSIFIED stamp */}
        {state === 'locked' && (
          <div className="absolute top-6 right-6 px-3 py-1 border-2 border-red-500 rotate-12">
            <span className="font-mono text-red-500 text-xs tracking-[0.3em] font-bold">CLASSIFIED</span>
          </div>
        )}
      </motion.div>

      {/* REVEALED STATE — background image */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: state === 'revealed' ? 1 : 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <img
          src={revealedImageUrl}
          alt={player.name}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      </motion.div>

      {/* ANALYZING overlay — three TIE bars */}
      <AnimatePresence>
        {state === 'analyzing' && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Spinning TIE mark */}
            <motion.div
              className="mb-6 text-4xl font-bold tracking-[0.3em]"
              style={{ color: '#D4A853' }}
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
            >
              TIE
            </motion.div>

            <div className="text-[10px] font-mono text-white/40 tracking-[0.25em] uppercase mb-6">
              Running Analysis
            </div>

            {/* Three bars */}
            <div className="w-[80%] space-y-3">
              <TIEBar label="T — Talent" value={barT} color="#D4A853" />
              <TIEBar label="I — Intangibles" value={barI} color="#D4A853" />
              <TIEBar label="E — Execution" value={barE} color="#D4A853" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REVEALED overlay — player info + grade */}
      <AnimatePresence>
        {state === 'revealed' && (
          <motion.div
            className="absolute inset-0 flex flex-col justify-end pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {/* Grade medallion — top left */}
            <motion.div
              className="absolute top-4 left-4 w-16 h-16 rounded-full flex flex-col items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #D4A853, #8B6914)',
                boxShadow: '0 0 30px rgba(212,168,83,0.6), 0 4px 16px rgba(0,0,0,0.5)',
              }}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.6, delay: 0.3, type: 'spring', stiffness: 140 }}
            >
              <span className="text-[8px] font-mono text-black/70 tracking-wider">TIE</span>
              <span className="text-xl font-bold text-black leading-none">{player.grade}</span>
            </motion.div>

            {/* Rank badge — top right */}
            <motion.div
              className="absolute top-4 right-4 px-3 py-1.5 rounded bg-black/80 backdrop-blur border border-white/20"
              initial={{ x: 80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <div className="text-[8px] font-mono text-white/50 uppercase tracking-wider">Rank</div>
              <div className="text-lg font-bold text-white leading-none">#{player.rank}</div>
            </motion.div>

            {/* Name plate — bottom */}
            <motion.div
              className="p-5 bg-gradient-to-t from-black via-black/80 to-transparent"
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <div className="text-[10px] font-mono tracking-[0.2em]" style={{ color: '#D4A853' }}>
                {player.tieGrade.toUpperCase()}
              </div>
              <h3 className="text-2xl font-extrabold text-white leading-tight tracking-tight mt-1">
                {player.name}
              </h3>
              <div className="text-sm text-white/60 font-mono mt-0.5">
                {player.position} · {player.school}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LOCKED state CTA */}
      <AnimatePresence>
        {state === 'locked' && (
          <motion.div
            className="absolute inset-0 flex flex-col justify-end p-5 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="text-[10px] font-mono text-white/40 tracking-[0.2em]">PROSPECT FILE</div>
            <div className="text-2xl font-mono text-white/60 tracking-tight mt-1">
              ████████████
            </div>
            <div className="text-xs text-white/40 font-mono mt-0.5">
              {player.position.slice(0, 1)}█ · ████████
            </div>

            <button
              className="mt-4 self-start px-4 py-2 rounded font-mono text-[10px] tracking-[0.2em] font-bold border transition-all pointer-events-auto"
              style={{
                color: '#D4A853',
                borderColor: '#D4A853',
                background: 'rgba(212,168,83,0.08)',
              }}
              onClick={triggerAnalysis}
            >
              ▸ RUN TIE ANALYSIS
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset button (revealed state) */}
      {state === 'revealed' && (
        <button
          className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white/80 text-xs backdrop-blur"
          onClick={reset}
          aria-label="Reset"
        >
          ↺
        </button>
      )}
    </div>
  );
}

/* ── TIE Bar sub-component ── */
function TIEBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] font-mono text-white/60 tracking-wider">{label}</span>
        <span className="text-[10px] font-mono font-bold tabular-nums" style={{ color }}>
          {value}
        </span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-none"
          style={{
            width: `${value}%`,
            background: `linear-gradient(90deg, ${color}60, ${color})`,
            boxShadow: `0 0 8px ${color}80`,
          }}
        />
      </div>
    </div>
  );
}
