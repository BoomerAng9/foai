'use client';

// Meta-hero — shows Chicken Hawk *at work* as the marketing piece itself.
// Animated chat exchange: visitor prompt → thinking trace → CH reply with
// BOTH a charming ASCII portrait (delivers what was literally asked) AND
// the canon mech-style portrait (delivers what was actually wanted).
// Demonstrates persona, voice, and the "ask once, get the whole answer"
// posture in one self-explanatory unit.

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { HawkAvatar } from '@/components/hawk-avatar';

// Tighter ASCII portrait — preserves the cute beat while reading cleaner
// at the embedded 13px monospace size. Symmetric, balanced, hawk-shaped.
const ASCII_PORTRAIT = String.raw`     ___
   ,'   ',
  ( o   o )
   \  v  /
  __\___/__
 /| (   ) |\
`;

const THINKING_BEATS = [
  'Sketching the silhouette…',
  'Picking the eye shape…',
  'Adding the chest insignia…',
  'Tightening the spacing…',
];

const REPLY_TEXT =
  "Here's the ASCII you asked for — plus the real one from the locker. " +
  "What are you actually building today? Drop a brief and I'll get started.";

type Phase = 'idle' | 'user' | 'thinking' | 'reply' | 'done';

export function HeroChatDemo() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [thinkBeat, setThinkBeat] = useState(0);

  useEffect(() => {
    const seq: { p: Phase; ms: number }[] = [
      { p: 'user', ms: 700 },
      { p: 'thinking', ms: 600 },
      { p: 'reply', ms: 2400 },
      { p: 'done', ms: 0 },
    ];
    let cancelled = false;
    let i = 0;
    const advance = () => {
      if (cancelled) return;
      const step = seq[i];
      setPhase(step.p);
      i++;
      if (i < seq.length) setTimeout(advance, step.ms);
    };
    setTimeout(advance, 400);
    return () => { cancelled = true; };
  }, []);

  // cycle thinking beats while phase === 'thinking' or 'reply'
  useEffect(() => {
    if (phase !== 'thinking' && phase !== 'reply') return;
    const t = setInterval(() => setThinkBeat((b) => (b + 1) % THINKING_BEATS.length), 700);
    return () => clearInterval(t);
  }, [phase]);

  return (
    <div className="rounded-2xl border border-foai-border bg-foai-surface shadow-card-lg overflow-hidden">
      {/* Tab bar — looks like a chat app */}
      <div className="px-4 py-2.5 border-b border-foai-border bg-foai-surface-2 flex items-center gap-2">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-red-400/70" />
          <span className="size-2.5 rounded-full bg-amber-400/70" />
          <span className="size-2.5 rounded-full bg-green-400/70" />
        </div>
        <div className="flex-1 text-center text-xs font-mono text-foai-muted tracking-wide">
          hawk.foai.cloud — chat
        </div>
        <div className="w-12" />
      </div>

      <div className="p-5 space-y-4 min-h-[420px]">
        <AnimatePresence>
          {/* User prompt */}
          {phase !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex justify-end"
            >
              <div className="max-w-[80%] rounded-2xl px-4 py-2.5 bg-foai-gold text-white text-sm shadow-card">
                build a chicken hawk ascii portrait
              </div>
            </motion.div>
          )}

          {/* Thinking trace */}
          {(phase === 'thinking' || phase === 'reply' || phase === 'done') && (
            <motion.div
              key="thinking"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.05 }}
              className="flex items-start gap-2.5"
            >
              <HawkAvatar size={28} className="mt-0.5" />
              <div className="flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-foai-muted mb-1.5">
                  Chicken Hawk · thinking
                </div>
                <div className="rounded-xl px-3.5 py-2 bg-foai-surface-2 border border-foai-border text-xs text-foai-muted font-mono">
                  <span className="inline-flex items-center gap-2">
                    <span className="flex gap-1">
                      <span className="size-1.5 rounded-full bg-foai-gold animate-pulse" />
                      <span className="size-1.5 rounded-full bg-foai-gold animate-pulse [animation-delay:120ms]" />
                      <span className="size-1.5 rounded-full bg-foai-gold animate-pulse [animation-delay:240ms]" />
                    </span>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={thinkBeat}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        {THINKING_BEATS[thinkBeat]}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Reply */}
          {(phase === 'reply' || phase === 'done') && (
            <motion.div
              key="reply"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 }}
              className="flex items-start gap-2.5"
            >
              <HawkAvatar size={28} className="mt-0.5" />
              <div className="flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-foai-gold mb-1.5">
                  Chicken Hawk
                </div>
                <div className="rounded-xl px-4 py-3 bg-foai-surface border border-foai-border shadow-card">
                  <p className="text-sm text-foai-text leading-relaxed mb-3">{REPLY_TEXT}</p>
                  <div className="my-2 h-px bg-foai-border" />
                  <div className="grid grid-cols-1 sm:grid-cols-[auto,1fr] gap-3 items-start">
                    <pre className="font-mono text-[13px] leading-tight text-foai-gold whitespace-pre">
{ASCII_PORTRAIT}
                    </pre>
                    <div className="rounded-lg overflow-hidden border border-foai-border bg-foai-bg/40 shrink-0">
                      <Image
                        src="/chicken-hawk/ch-mech-port-orange.png"
                        alt="Chicken Hawk canon portrait"
                        width={120}
                        height={120}
                        className="block w-full h-auto max-w-[120px]"
                      />
                      <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-foai-muted text-center border-t border-foai-border">
                        canon · mech
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="px-5 py-3 border-t border-foai-border bg-foai-surface-2 text-xs text-foai-muted font-mono">
        ↳ try it — type below.
      </div>
    </div>
  );
}
