'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import Link from 'next/link';
import {
  scrollReveal,
  scrollRevealBlur,
  staggerContainer,
  staggerItem,
  heroStagger,
  heroItem,
} from '@/lib/motion';
import PaywallGate from '@/components/PaywallGate';

interface AnalystTake {
  analyst: string;
  color: string;
  archetype: string;
  content: string;
}

interface FeedItem {
  title?: string;
  summary?: string;
}

const ANALYSTS = [
  {
    id: 'analyst-1',
    name: 'The Anchor',
    descriptor: 'Breaking news and headline analysis',
    color: '#D4A853',
  },
  {
    id: 'analyst-2',
    name: 'The Scout',
    descriptor: 'Player evaluations and recruiting',
    color: '#60A5FA',
  },
  {
    id: 'analyst-3',
    name: 'The Coach',
    descriptor: 'Film breakdown and scheme analysis',
    color: '#34D399',
  },
  {
    id: 'analyst-4',
    name: 'The Contrarian',
    descriptor: 'Hot takes and debate',
    color: '#F97316',
  },
];

const SEGMENTS = [
  {
    slug: 'around-the-horn',
    title: 'AROUND THE HORN',
    desc: 'Quick-fire takes from all 4 analysts. 30 seconds on the clock.',
    accent: '#D4A853',
  },
  {
    slug: 'bull-vs-bear',
    title: 'BULL VS BEAR',
    desc: 'Two analysts argue opposite sides of one player or pick.',
    accent: '#EF4444',
  },
  {
    slug: 'film-room',
    title: 'FILM ROOM',
    desc: "Deep dive breakdown on a single player — tape don't lie.",
    accent: '#34D399',
  },
  {
    slug: 'mock-draft-live',
    title: 'MOCK DRAFT LIVE',
    desc: 'Analysts make picks in real-time. No take-backs.',
    accent: '#60A5FA',
  },
];

export default function StudioPage() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [takes, setTakes] = useState<AnalystTake[]>([]);
  const [debateStarted, setDebateStarted] = useState(false);
  const [feeds, setFeeds] = useState<Record<string, FeedItem | null>>({});

  // Fetch latest content for each analyst
  useEffect(() => {
    ANALYSTS.forEach(async (analyst) => {
      try {
        const res = await fetch(`/api/analysts/${analyst.name.toLowerCase().replace(/\s+/g, '-')}/feed`);
        if (res.ok) {
          const data = await res.json();
          if (data && (data.title || data.summary)) {
            setFeeds((prev) => ({ ...prev, [analyst.id]: data }));
          }
        }
      } catch {
        // Feed not available yet
      }
    });
  }, []);

  async function startDebate() {
    if (!topic.trim()) return;
    setLoading(true);
    setDebateStarted(true);
    setTakes([]);

    try {
      const res = await fetch('/api/studio/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), format: 'around-the-horn' }),
      });
      const data = await res.json();
      if (data.takes) {
        setTakes(data.takes);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }

  return (
    <PaywallGate>
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0F' }}>
      <Header />

      {/* Subtle grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <main className="relative z-10 flex-1 px-4 md:px-8 py-12 max-w-7xl mx-auto w-full">
        {/* Header */}
        <motion.div
          className="text-center mb-14"
          variants={heroStagger}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            variants={heroItem}
            className="inline-block px-4 py-1.5 mb-4 rounded-full"
            style={{
              background: 'rgba(212,168,83,0.08)',
              border: '1px solid rgba(212,168,83,0.2)',
            }}
          >
            <span
              className="text-[10px] font-mono tracking-[0.3em]"
              style={{ color: '#D4A853' }}
            >
              BROADCAST STUDIO
            </span>
          </motion.div>
          <motion.h1
            variants={heroItem}
            className="font-outfit text-5xl md:text-7xl font-black tracking-tight text-white"
          >
            THE WAR ROOM
          </motion.h1>
          <motion.p
            variants={heroItem}
            className="mt-3 text-sm font-mono text-white/35"
          >
            Live analyst debate — powered by TIE data
          </motion.p>
          <motion.div
            variants={heroItem}
            className="mt-5 mx-auto w-48 h-[2px]"
            style={{
              background: 'linear-gradient(90deg, transparent, #D4A853, transparent)',
            }}
          />
        </motion.div>

        {/* Topic input */}
        <motion.div
          className="max-w-2xl mx-auto mb-12 flex gap-3"
          variants={scrollReveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && startDebate()}
            placeholder="Enter debate topic... e.g. Who should go #1 overall?"
            className="flex-1 px-5 py-3.5 rounded-xl text-sm font-mono text-white placeholder-white/20 outline-none transition-all focus:ring-1"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              // @ts-expect-error CSS custom property for focus ring
              '--tw-ring-color': '#D4A85340',
            }}
          />
          <motion.button
            onClick={startDebate}
            disabled={loading || !topic.trim()}
            className="px-7 py-3.5 rounded-xl text-xs font-mono font-bold tracking-[0.2em] transition-all"
            style={{
              background: loading ? 'rgba(212,168,83,0.3)' : '#D4A853',
              color: loading ? '#D4A853' : '#0A0A0F',
              cursor: loading || !topic.trim() ? 'not-allowed' : 'pointer',
            }}
            whileHover={!loading && topic.trim() ? { scale: 1.03 } : {}}
            whileTap={!loading && topic.trim() ? { scale: 0.97 } : {}}
          >
            {loading ? 'DEBATING...' : 'GO LIVE'}
          </motion.button>
        </motion.div>

        {/* 2x2 Analyst Panel Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-16"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
        >
          {ANALYSTS.map((analyst) => {
            const take = takes.find((t) => t.analyst === analyst.name);
            const feed = feeds[analyst.id];
            const isActive = debateStarted;

            return (
              <motion.div
                key={analyst.id}
                variants={staggerItem}
                className="relative rounded-xl overflow-hidden"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isActive ? analyst.color + '35' : 'rgba(255,255,255,0.06)'}`,
                  borderTop: `2px solid ${analyst.color}`,
                  minHeight: debateStarted ? '220px' : '160px',
                  transition: 'border-color 0.3s ease',
                }}
              >
                {/* Panel header */}
                <div
                  className="flex items-center gap-3 px-5 py-3.5"
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: `linear-gradient(135deg, ${analyst.color}08, transparent)`,
                  }}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      background: analyst.color,
                      boxShadow: `0 0 10px ${analyst.color}50`,
                    }}
                  />
                  <span className="font-outfit text-sm font-bold text-white tracking-wide">
                    {analyst.name.toUpperCase()}
                  </span>
                  <span className="text-[10px] font-mono text-white/25 ml-auto">
                    {analyst.descriptor}
                  </span>
                </div>

                {/* Panel content */}
                <div className="px-5 py-4">
                  {loading && !take && (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-1.5 h-1.5 rounded-full animate-pulse"
                        style={{ background: analyst.color }}
                      />
                      <span className="text-xs font-mono text-white/20">
                        Forming take...
                      </span>
                    </div>
                  )}
                  {take && (
                    <p className="text-sm text-white/70 leading-relaxed font-sans">
                      {take.content}
                    </p>
                  )}
                  {!debateStarted && feed && (
                    <div>
                      <p className="text-[10px] font-mono text-white/20 mb-2 tracking-wider">
                        LATEST
                      </p>
                      <p className="text-sm text-white/50 leading-relaxed font-sans">
                        {feed.title || feed.summary}
                      </p>
                    </div>
                  )}
                  {!debateStarted && !feed && (
                    <p className="text-xs font-mono text-white/15 italic">
                      Broadcasting soon...
                    </p>
                  )}
                </div>

                {/* Live indicator */}
                {isActive && (
                  <div className="absolute top-3.5 right-4 flex items-center gap-1.5">
                    <div
                      className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ background: '#EF4444' }}
                    />
                    <span className="text-[9px] font-mono text-white/30">
                      LIVE
                    </span>
                  </div>
                )}

                {/* Corner glow */}
                <div
                  className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full pointer-events-none opacity-[0.06]"
                  style={{
                    background: `radial-gradient(circle, ${analyst.color}, transparent)`,
                  }}
                />
              </motion.div>
            );
          })}
        </motion.div>

        {/* Segments Section */}
        <motion.div
          className="mb-12"
          variants={scrollRevealBlur}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-[1px]" style={{ background: '#D4A853' }} />
            <h2 className="font-outfit text-xl font-bold text-white tracking-[0.15em]">
              SEGMENTS
            </h2>
            <div
              className="flex-1 h-[1px]"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            />
          </div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {SEGMENTS.map((seg) => (
              <motion.div key={seg.slug} variants={staggerItem}>
                <Link href={`/studio/${seg.slug}`} className="block h-full">
                  <motion.div
                    className="relative h-full rounded-xl p-6 overflow-hidden cursor-pointer"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                    whileHover={{
                      scale: 1.03,
                      y: -3,
                      transition: { duration: 0.25, ease: 'easeOut' },
                    }}
                    onHoverStart={(e) => {
                      const el = (
                        e as unknown as { target: HTMLElement }
                      ).target.closest('[class*="rounded-xl"]') as HTMLElement | null;
                      if (el) {
                        el.style.borderColor = seg.accent + '50';
                        el.style.boxShadow = `0 4px 24px ${seg.accent}12`;
                      }
                    }}
                    onHoverEnd={(e) => {
                      const el = (
                        e as unknown as { target: HTMLElement }
                      ).target.closest('[class*="rounded-xl"]') as HTMLElement | null;
                      if (el) {
                        el.style.borderColor = 'rgba(255,255,255,0.06)';
                        el.style.boxShadow = 'none';
                      }
                    }}
                  >
                    {/* Accent bar */}
                    <div
                      className="w-6 h-1 rounded-full mb-4"
                      style={{ background: seg.accent }}
                    />

                    <h3 className="font-outfit text-sm font-bold text-white tracking-[0.15em] mb-2">
                      {seg.title}
                    </h3>
                    <p className="text-xs font-mono text-white/30 leading-relaxed">
                      {seg.desc}
                    </p>
                    <div
                      className="mt-4 text-[10px] font-mono tracking-wider"
                      style={{ color: seg.accent }}
                    >
                      ENTER STUDIO &rarr;
                    </div>

                    {/* Corner glow */}
                    <div
                      className="absolute -top-8 -right-8 w-20 h-20 rounded-full pointer-events-none opacity-[0.04]"
                      style={{
                        background: `radial-gradient(circle, ${seg.accent}, transparent)`,
                      }}
                    />
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </main>

      <Footer />
    </div>
    </PaywallGate>
  );
}
