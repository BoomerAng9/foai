'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { hasAccess, grantAccess, checkOwnerBypass } from '@/lib/paywall';
import { COLORS } from '@/lib/design/tokens';

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const VALUE_PROPS = [
  {
    title: 'Draft Board',
    desc: 'AI-powered mock draft simulator with TIE grades on every prospect across all seven rounds.',
    icon: '\u{1F3AF}',
  },
  {
    title: 'AI Analysts',
    desc: 'Three distinct analyst personas delivering scouting reports, hot takes, and deep-dive film breakdowns.',
    icon: '\u{1F4CA}',
  },
  {
    title: 'Film Room',
    desc: 'Side-by-side prospect comparisons, combine data overlays, and historical player comps.',
    icon: '\u{1F3AC}',
  },
];

export default function AccessPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (checkOwnerBypass() || hasAccess()) {
      router.replace('/draft');
      return;
    }
    setChecking(false);
  }, [router]);

  function handleEnter() {
    grantAccess();
    router.push('/draft');
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.bg }}>
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: COLORS.goldBorder, borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative" style={{ background: COLORS.bg }}>
      {/* Radial glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 700px 500px at 50% 30%, rgba(212,168,83,0.07), transparent)' }}
      />

      <motion.div
        className="relative z-10 max-w-2xl w-full text-center"
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.12 }}
      >
        {/* Hero */}
        <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
          <span className="text-[10px] font-mono tracking-[0.4em]" style={{ color: 'rgba(255,255,255,0.25)' }}>
            PER|FORM INTELLIGENCE
          </span>
          <h1 className="font-outfit text-4xl md:text-5xl font-black tracking-tight mt-3 mb-4" style={{ color: COLORS.gold }}>
            Unlock the Full<br />Draft Intelligence
          </h1>
          <p className="text-sm text-white/50 max-w-md mx-auto mb-10 leading-relaxed">
            TIE-graded prospects, AI analyst breakdowns, and a mock draft engine that runs 24/7 &mdash; all for one flat entry.
          </p>
        </motion.div>

        {/* Value prop cards */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10"
          variants={fadeUp}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          {VALUE_PROPS.map((v) => (
            <div
              key={v.title}
              className="rounded-xl p-5 text-left"
              style={{ background: 'rgba(212,168,83,0.04)', border: `1px solid ${COLORS.goldBorder}` }}
            >
              <span className="text-2xl mb-3 block">{v.icon}</span>
              <h3 className="font-outfit text-sm font-bold text-white/90 mb-1">{v.title}</h3>
              <p className="text-xs text-white/40 leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </motion.div>

        {/* Price + CTA */}
        <motion.div variants={fadeUp} transition={{ duration: 0.5, delay: 0.3 }}>
          <div className="inline-flex items-baseline gap-1 mb-6">
            <span className="font-outfit text-5xl font-black" style={{ color: COLORS.gold }}>$7</span>
            <span className="text-xs font-mono text-white/30 tracking-wider">ONE-TIME</span>
          </div>

          <button
            onClick={handleEnter}
            className="w-full max-w-xs mx-auto block px-8 py-4 rounded-xl text-sm font-outfit font-bold tracking-[0.2em] transition-all duration-200 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: COLORS.gold,
              color: COLORS.bg,
              boxShadow: '0 0 40px rgba(212,168,83,0.3)',
            }}
          >
            GET ACCESS
          </button>

          <button
            onClick={() => {
              if (hasAccess()) router.push('/draft');
              else alert('No access found. Complete your entry to continue.');
            }}
            className="mt-5 text-xs font-mono tracking-wider transition-colors duration-200 hover:text-white/60 block mx-auto"
            style={{ color: 'rgba(255,255,255,0.25)' }}
          >
            Already have access?
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
