'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import {
  scrollReveal,
  staggerContainer,
  staggerItem,
  heroStagger,
  heroItem,
} from '@/lib/motion';

/* ── Types ── */

interface DashboardStats {
  counts: {
    perform_players: number;
    cfb_players: number;
    nfl_draft_picks: number;
    huddle_posts: number;
    podcast_episodes: number;
  };
  recentHuddle: {
    id: number;
    title: string;
    author_name: string;
    created_at: string;
    excerpt: string | null;
  }[];
  topProspects: {
    name: string;
    position: string;
    school: string;
    grade: number | null;
    projected_round: number | null;
    overall_rank: number | null;
  }[];
}

/* ── Metric card config ── */

interface MetricCard {
  label: string;
  key: keyof DashboardStats['counts'];
  accent: string;
  href: string;
}

const METRICS: MetricCard[] = [
  { label: 'Draft Prospects', key: 'perform_players', accent: '#D4A853', href: '/draft' },
  { label: 'CFB Players', key: 'cfb_players', accent: '#60A5FA', href: '/draft' },
  { label: 'NFL Historical', key: 'nfl_draft_picks', accent: '#A78BFA', href: '/draft' },
  { label: 'Huddle Posts', key: 'huddle_posts', accent: '#34D399', href: '/huddle' },
  { label: 'Podcast Episodes', key: 'podcast_episodes', accent: '#F97316', href: '/podcast' },
];

/* ── Section nav tiles ── */

const SECTIONS = [
  {
    title: 'DRAFT BOARD',
    description: '50+ prospects graded and ranked by TIE',
    href: '/draft',
    accent: '#D4A853',
    span: 'col-span-1 md:col-span-2',
  },
  {
    title: 'MOCK DRAFT',
    description: 'Full 7-round projections with Bull and Bear cases',
    href: '/draft/mock',
    accent: '#60A5FA',
    span: 'col-span-1',
  },
  {
    title: 'WAR ROOM',
    description: 'Live analyst debates powered by TIE data',
    href: '/studio',
    accent: '#EF4444',
    span: 'col-span-1',
  },
  {
    title: 'FILM ROOM',
    description: 'Deep dive tape breakdowns and scheme analysis',
    href: '/film',
    accent: '#34D399',
    span: 'col-span-1',
  },
  {
    title: 'PLAYER INDEX',
    description: 'Complete prospect database with advanced metrics',
    href: '/draft',
    accent: '#A78BFA',
    span: 'col-span-1',
  },
  {
    title: 'FLAG FOOTBALL',
    description: '2028 Olympics tracking — athletes, combines, rosters',
    href: '/flag-football',
    accent: '#2DD4BF',
    span: 'col-span-1 md:col-span-2',
  },
  {
    title: 'ON THE CLOCK',
    description: 'Real-time draft tracker and pick predictions',
    href: '/draft',
    accent: '#F97316',
    span: 'col-span-1',
  },
  {
    title: 'ANALYSTS',
    description: 'Five autonomous voices delivering daily coverage',
    href: '/analysts',
    accent: '#F97316',
    span: 'col-span-1',
  },
];

/* ── Helpers ── */

function formatCount(n: number): string {
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K`;
  if (n >= 1_000) return n.toLocaleString();
  return String(n);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ── Component ── */

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => {
        if (r.status === 401 || r.status === 403) {
          setNeedsAuth(true);
          return null;
        }
        if (!r.ok) throw new Error(`Status ${r.status}`);
        return r.json();
      })
      .then((data) => { if (data) setStats(data); })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--pf-bg)' }}>
      <Header />

      <main className="flex-1 px-6 py-20 max-w-7xl mx-auto w-full">
        {/* Hero Header */}
        <motion.div
          className="mb-16"
          variants={heroStagger}
          initial="hidden"
          animate="visible"
        >
          <motion.p
            variants={heroItem}
            className="text-xs font-mono tracking-[0.3em] mb-4"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            COMMAND CENTER
          </motion.p>
          <motion.h1
            variants={heroItem}
            className="font-outfit text-5xl md:text-7xl font-black tracking-tight"
            style={{ color: '#D4A853' }}
          >
            DASHBOARD
          </motion.h1>
          <motion.div
            variants={heroItem}
            className="mt-4 w-24 h-[2px]"
            style={{ background: 'linear-gradient(90deg, #D4A853, transparent)' }}
          />
        </motion.div>

        {/* ── Metric Cards ── */}
        {!needsAuth && <motion.div
          className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-14"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
        >
          {METRICS.map((m) => (
            <motion.div key={m.key} variants={staggerItem}>
              <Link href={m.href} className="block">
                <div
                  className="rounded-xl p-5 transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.025)',
                    border: `1px solid ${m.accent}25`,
                  }}
                >
                  <p
                    className="text-3xl md:text-4xl font-outfit font-black tabular-nums"
                    style={{ color: m.accent }}
                  >
                    {stats ? formatCount(stats.counts[m.key]) : '--'}
                  </p>
                  <p className="mt-1 text-xs font-mono tracking-wider text-white/40 uppercase">
                    {m.label}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>}

        {needsAuth && (
          <motion.div
            className="mb-14 grid grid-cols-2 md:grid-cols-5 gap-4"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {METRICS.map((m) => (
              <motion.div key={m.key} variants={staggerItem}>
                <div
                  className="rounded-xl p-5"
                  style={{
                    background: 'rgba(255,255,255,0.015)',
                    border: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <p className="text-2xl font-outfit font-black text-white/15">--</p>
                  <p className="mt-1 text-xs font-mono tracking-wider text-white/20 uppercase">
                    {m.label}
                  </p>
                </div>
              </motion.div>
            ))}
            <motion.div variants={staggerItem} className="col-span-2 md:col-span-5">
              <div
                className="rounded-xl p-8 text-center"
                style={{
                  background: 'rgba(212,168,83,0.04)',
                  border: '1px solid rgba(212,168,83,0.15)',
                }}
              >
                <p className="text-sm font-mono text-white/50 mb-3">
                  Sign in to view live stats
                </p>
                <Link
                  href="/login"
                  className="inline-block px-6 py-2 rounded-lg text-xs font-mono font-bold tracking-wider transition-colors"
                  style={{
                    background: 'rgba(212,168,83,0.15)',
                    color: '#D4A853',
                    border: '1px solid rgba(212,168,83,0.3)',
                  }}
                >
                  SIGN IN
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}

        {error && !needsAuth && (
          <div className="mb-8 rounded-lg p-4 text-sm font-mono text-red-400 bg-red-900/20 border border-red-800/30">
            Failed to load live stats: {error}
          </div>
        )}

        {/* ── Recent Activity (Huddle + Top Prospects side by side) ── */}
        {stats && (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
          >
            {/* Latest Huddle Posts */}
            <motion.div
              variants={staggerItem}
              className="rounded-2xl p-6"
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(52,211,153,0.15)',
              }}
            >
              <h2 className="font-outfit text-sm font-bold tracking-[0.2em] text-emerald-400 mb-5">
                LATEST HUDDLE POSTS
              </h2>
              {stats.recentHuddle.length === 0 ? (
                <p className="text-white/30 text-sm font-mono">No posts yet</p>
              ) : (
                <ul className="space-y-4">
                  {stats.recentHuddle.map((post) => (
                    <li key={post.id} className="flex items-start gap-3">
                      <div
                        className="mt-1.5 w-2 h-2 rounded-full shrink-0"
                        style={{ background: '#34D399' }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm text-white/80 font-medium truncate">
                          {post.title}
                        </p>
                        <p className="text-xs text-white/30 font-mono mt-0.5">
                          {post.author_name} &middot; {timeAgo(post.created_at)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>

            {/* Top 5 Prospects */}
            <motion.div
              variants={staggerItem}
              className="rounded-2xl p-6"
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(212,168,83,0.15)',
              }}
            >
              <h2 className="font-outfit text-sm font-bold tracking-[0.2em] mb-5" style={{ color: '#D4A853' }}>
                TOP PROSPECTS
              </h2>
              {stats.topProspects.length === 0 ? (
                <p className="text-white/30 text-sm font-mono">No ranked prospects</p>
              ) : (
                <ul className="space-y-3">
                  {stats.topProspects.map((p, i) => (
                    <li
                      key={p.name}
                      className="flex items-center gap-3"
                    >
                      <span
                        className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold font-mono shrink-0"
                        style={{
                          background: 'rgba(212,168,83,0.12)',
                          color: '#D4A853',
                        }}
                      >
                        {p.overall_rank ?? i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white/80 font-medium truncate">
                          {p.name}
                        </p>
                        <p className="text-xs text-white/30 font-mono mt-0.5">
                          {p.position} &middot; {p.school}
                          {p.grade ? ` \u2022 Grade ${p.grade}` : ''}
                        </p>
                      </div>
                      {p.projected_round && (
                        <span className="text-xs font-mono text-white/20 shrink-0">
                          Rd {p.projected_round}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* ── Navigation Bento Grid ── */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-5"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {SECTIONS.map((section) => (
            <motion.div
              key={section.title}
              variants={staggerItem}
              className={section.span}
            >
              <Link href={section.href} className="block h-full">
                <motion.div
                  className="relative h-full rounded-2xl p-7 flex flex-col gap-4 overflow-hidden cursor-pointer"
                  style={{
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                  whileHover={{
                    scale: 1.02,
                    y: -4,
                    transition: { duration: 0.25, ease: 'easeOut' },
                  }}
                  onHoverStart={(e) => {
                    const el = (e as unknown as { target: HTMLElement }).target.closest(
                      '[class*="rounded-2xl"]'
                    ) as HTMLElement | null;
                    if (el) {
                      el.style.borderColor = section.accent + '60';
                      el.style.boxShadow = `0 8px 32px ${section.accent}15, 0 0 0 1px ${section.accent}30`;
                    }
                  }}
                  onHoverEnd={(e) => {
                    const el = (e as unknown as { target: HTMLElement }).target.closest(
                      '[class*="rounded-2xl"]'
                    ) as HTMLElement | null;
                    if (el) {
                      el.style.borderColor = 'rgba(255,255,255,0.06)';
                      el.style.boxShadow = 'none';
                    }
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-3 h-3 rounded-sm shrink-0"
                      style={{
                        background: section.accent,
                        boxShadow: `0 0 12px ${section.accent}40`,
                      }}
                    />
                    <h2 className="font-outfit text-lg font-bold tracking-[0.15em] text-white">
                      {section.title}
                    </h2>
                  </div>

                  <p className="text-sm font-mono text-white/40 leading-relaxed">
                    {section.description}
                  </p>

                  <div className="mt-auto pt-4">
                    <div
                      className="h-[1px] w-full opacity-20"
                      style={{ background: `linear-gradient(90deg, ${section.accent}, transparent)` }}
                    />
                  </div>

                  <div
                    className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.04] pointer-events-none"
                    style={{ background: `radial-gradient(circle, ${section.accent}, transparent)` }}
                  />
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
