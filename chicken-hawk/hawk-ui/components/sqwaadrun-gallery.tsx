'use client';

// Interactive Sqwaadrun fleet gallery.
//
// Each card responds to mouse movement with a 3D tilt (CSS perspective
// + framer-motion springs). Click toggles an expanded modal-style overlay
// showing the hawk's stats radar, catchphrase, specialty, and a "Deploy
// this hawk" CTA that pre-loads a chat prompt.
//
// Falls back gracefully if a hawk's image hasn't been generated yet —
// shows a slate placeholder with the role icon.

import { useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { X, ArrowRight, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SQWAADRUN_ROSTER, type SqwaadrunHawk } from '@/lib/sqwaadrun-roster';

const STAT_KEYS: (keyof SqwaadrunHawk['stats'])[] = ['speed', 'accuracy', 'stealth', 'endurance', 'intel'];

function HawkTilt({ hawk, onOpen }: { hawk: SqwaadrunHawk; onOpen: () => void }) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const sx = useSpring(mx, { stiffness: 220, damping: 22 });
  const sy = useSpring(my, { stiffness: 220, damping: 22 });
  const rotX = useTransform(sy, [0, 1], [10, -10]);
  const rotY = useTransform(sx, [0, 1], [-12, 12]);
  const lift = useTransform(sx, [0, 0.5, 1], [0, 1, 0]);

  function onMove(e: React.MouseEvent<HTMLButtonElement>) {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  }
  function onLeave() {
    mx.set(0.5);
    my.set(0.5);
  }

  const filename = hawk.id.toLowerCase() + '.png';

  return (
    <motion.button
      ref={ref}
      type="button"
      onClick={onOpen}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: rotX, rotateY: rotY, transformStyle: 'preserve-3d' }}
      className="group relative aspect-[3/4] rounded-2xl border border-foai-border bg-foai-surface shadow-card-sm hover:shadow-card-lg hover:border-foai-gold/50 transition-all overflow-hidden text-left"
      aria-label={`${hawk.id} — ${hawk.title}`}
    >
      {/* Hawk portrait — falls back gracefully if not yet generated */}
      <div className="absolute inset-0">
        <Image
          src={`/hawks/${filename}`}
          alt={`${hawk.id} character art`}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover"
          unoptimized
        />
      </div>

      {/* Subtle amber wash on hover */}
      <motion.div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, transparent 50%, rgba(15,23,42,0.85) 100%)',
        }}
      />
      <motion.div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          background:
            'radial-gradient(ellipse 400px 300px at 50% 100%, rgba(217,119,6,0.35), transparent 60%)',
        }}
      />

      {/* Sheen — moves with the cursor */}
      <motion.div
        aria-hidden
        className="absolute inset-0 pointer-events-none mix-blend-overlay"
        style={{
          background:
            'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)',
          opacity: lift,
        }}
      />

      {/* Caption — bottom of card */}
      <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-12 text-white">
        <div className="text-[11px] font-mono tracking-wider uppercase text-white/70 mb-0.5">
          {hawk.title}
        </div>
        <div className="font-semibold text-base">{hawk.id}</div>
        <div className="mt-1.5 text-xs text-white/80 italic line-clamp-2">
          &ldquo;{hawk.catchphrase}&rdquo;
        </div>
      </div>
    </motion.button>
  );
}

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-[11px] font-mono uppercase tracking-wider text-foai-muted mb-1">
        <span>{label}</span>
        <span className="text-foai-gold font-semibold">{value}/10</span>
      </div>
      <div className="h-1.5 rounded-full bg-foai-surface-2 overflow-hidden">
        <div
          className="h-full rounded-full bg-foai-gold"
          style={{ width: `${value * 10}%` }}
        />
      </div>
    </div>
  );
}

function HawkDetail({ hawk, onClose }: { hawk: SqwaadrunHawk; onClose: () => void }) {
  const filename = hawk.id.toLowerCase() + '.png';
  const deployPrompt = encodeURIComponent(
    `Deploy ${hawk.id} (${hawk.title}). Specialty: ${hawk.specialty}. I need help with — `,
  );
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foai-text/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, y: 12, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl rounded-3xl bg-foai-surface border border-foai-border shadow-card-lg overflow-hidden grid md:grid-cols-2"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 size-8 rounded-full bg-foai-surface border border-foai-border flex items-center justify-center text-foai-muted hover:text-foai-text hover:border-foai-gold/50 transition-colors"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        <div className="relative aspect-square md:aspect-auto bg-foai-surface-2">
          <Image
            src={`/hawks/${filename}`}
            alt={`${hawk.id} character art`}
            fill
            className="object-cover"
            unoptimized
          />
        </div>

        <div className="p-6 md:p-8 space-y-5">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-foai-gold mb-1">
              {hawk.title}
            </div>
            <h3 className="text-2xl font-bold text-foai-text">{hawk.id}</h3>
            <p className="mt-2 text-foai-muted italic leading-relaxed">
              &ldquo;{hawk.catchphrase}&rdquo;
            </p>
          </div>

          <div className="space-y-2.5">
            {STAT_KEYS.map((k) => (
              <StatBar key={k} label={k} value={hawk.stats[k]} />
            ))}
          </div>

          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-foai-muted mb-1.5">
              Personality
            </div>
            <p className="text-sm text-foai-text leading-relaxed">{hawk.personality}</p>
          </div>

          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-foai-muted mb-1.5">
              Specialty
            </div>
            <p className="text-sm text-foai-text leading-relaxed">{hawk.specialty}</p>
          </div>

          <Link
            href={`/?prompt=${deployPrompt}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-foai-gold text-white text-sm font-semibold hover:bg-foai-gold-hover shadow-amber-soft hover:shadow-amber-press transition-all"
          >
            <Send className="size-4" /> Deploy {hawk.id} <ArrowRight className="size-4" />
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function SqwaadrunGallery() {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = openId ? SQWAADRUN_ROSTER.find((h) => h.id === openId) ?? null : null;

  return (
    <>
      <div
        className={cn(
          'grid gap-4 sm:gap-5',
          'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
        )}
        style={{ perspective: 1200 }}
      >
        {SQWAADRUN_ROSTER.map((hawk) => (
          <HawkTilt key={hawk.id} hawk={hawk} onOpen={() => setOpenId(hawk.id)} />
        ))}
      </div>

      <AnimatePresence>
        {open && <HawkDetail hawk={open} onClose={() => setOpenId(null)} />}
      </AnimatePresence>
    </>
  );
}
