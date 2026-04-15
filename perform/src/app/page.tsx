'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Clock3, Radio } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getGradeForScore } from '@/lib/tie/grades';
import { DRAFT_2026 } from '@/lib/draft/draft-rules-2026';
import { heroStagger, heroItem, staggerContainer, staggerItem, fadeUp } from '@/lib/motion';

interface Prospect {
  id: number;
  name: string;
  school: string;
  position: string;
  overall_rank: number | null;
  projected_round: number | null;
  tie_grade: string | null;
  grade: string | null;
  nfl_comparison: string | null;
}

interface Episode {
  id: number;
  analyst_id: string;
  title: string;
  audio_url: string | null;
  duration_seconds: number;
  created_at: string;
}

/* ── Countdown ──────────────────────────────────────── */
function useCountdown(targetIso: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const target = new Date(targetIso).getTime();
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  const secs = Math.floor((diff % 60_000) / 1000);
  return { days, hours, mins, secs, started: diff === 0 };
}

function GradePill({ value }: { value: string | number | null }) {
  if (value == null) return <span className="font-mono text-[10px] text-white/25">--</span>;
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return <span className="font-mono text-[10px] text-white/25">--</span>;
  const info = getGradeForScore(num);
  return (
    <span
      className="inline-flex items-center px-2 py-[2px] rounded-full text-[10px] font-mono font-bold tabular-nums"
      style={{ background: `${info.badgeColor}18`, color: info.badgeColor }}
    >
      {num.toFixed(1)}
    </span>
  );
}

/* ── Analyst meta (for show strip) ──────────────────── */
const ANALYSTS: Record<string, { name: string; color: string }> = {
  'void-caster': { name: 'The Void-Caster', color: '#D4A853' },
  'the-haze': { name: 'The Haze', color: '#60A5FA' },
  'air-pod-host-1': { name: 'The Haze', color: '#60A5FA' },
  'air-pod-host-2': { name: 'The Haze', color: '#60A5FA' },
  'the-colonel': { name: 'The Colonel', color: '#EF4444' },
  'astra-novatos': { name: 'Astra Novatos', color: '#F59E0B' },
  'bun-e': { name: 'Bun-E', color: '#8B5CF6' },
};

function formatDuration(sec?: number) {
  if (!sec || sec <= 0) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/* ═════════════════════════════════════════════════════
 *  HOMEPAGE
 * ═════════════════════════════════════════════════════ */
export default function HomePage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/players?limit=10&sort=overall_rank:asc&sport=football').then(r => r.json()).catch(() => ({})),
      fetch('/api/podcast/episodes?limit=5').then(r => r.json()).catch(() => ({})),
    ]).then(([playersJson, epsJson]) => {
      setProspects(playersJson.players || []);
      setEpisodes(epsJson.episodes || []);
      setLoading(false);
    });
  }, []);

  const { days, hours, mins, secs, started } = useCountdown(DRAFT_2026.dates.round1);

  const latestByShow = useMemo(() => {
    const seen = new Set<string>();
    const out: Episode[] = [];
    for (const ep of episodes) {
      const key = ep.analyst_id.startsWith('air-pod-host') ? 'the-haze' : ep.analyst_id;
      if (seen.has(key) || !ANALYSTS[ep.analyst_id]) continue;
      seen.add(key);
      out.push(ep);
      if (out.length >= 4) break;
    }
    return out;
  }, [episodes]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--pf-bg)', color: 'var(--pf-text)' }}>
      <Header />

      <main className="flex-1">
        {/* ═══ HERO ═══ */}
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              background: 'radial-gradient(ellipse at top, rgba(212,168,83,0.20) 0%, transparent 60%)',
            }}
          />
          <motion.div
            variants={heroStagger}
            initial="hidden"
            animate="visible"
            className="relative max-w-7xl mx-auto px-4 md:px-8 pt-12 md:pt-20 pb-16"
          >
            <motion.div
              variants={heroItem}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono tracking-[0.2em] uppercase mb-6"
              style={{
                background: 'rgba(212,168,83,0.08)',
                border: '1px solid rgba(212,168,83,0.25)',
                color: '#D4A853',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4A853] animate-pulse" />
              {started ? 'Draft night — live coverage' : `${DRAFT_2026.city} · Acrisure Stadium`}
            </motion.div>

            <motion.h1
              variants={heroItem}
              className="font-outfit text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[0.95] mb-6"
              style={{ color: 'var(--pf-text)' }}
            >
              The 2026 <span style={{ color: '#D4A853' }}>NFL Draft</span>
              <br />
              starts in
            </motion.h1>

            {/* Countdown clock */}
            <motion.div variants={heroItem} className="flex flex-wrap gap-4 md:gap-8 mb-8">
              {[
                { label: 'Days', value: days },
                { label: 'Hours', value: hours },
                { label: 'Min', value: mins },
                { label: 'Sec', value: secs },
              ].map(u => (
                <div key={u.label} className="flex flex-col">
                  <span
                    className="font-outfit text-5xl md:text-7xl font-extrabold tabular-nums leading-none"
                    style={{ color: '#D4A853' }}
                  >
                    {String(u.value).padStart(2, '0')}
                  </span>
                  <span className="mt-2 text-[10px] md:text-xs font-mono tracking-[0.25em] uppercase text-white/40">
                    {u.label}
                  </span>
                </div>
              ))}
            </motion.div>

            <motion.p
              variants={heroItem}
              className="text-base md:text-lg max-w-2xl mb-8"
              style={{ color: 'var(--pf-text-muted)' }}
            >
              Per|Form covers the 2026 class with TIE grades, Beast combine calibration, and a 2,268-player board.
              Mock the draft, run the war room, scout the film.
            </motion.p>

            <motion.div variants={heroItem} className="flex flex-wrap gap-3">
              <Link
                href="/draft/simulate"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-mono font-bold tracking-wider uppercase transition-all hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(135deg, #D4A853 0%, #B8912E 100%)',
                  color: '#0A0A0F',
                  boxShadow: '0 0 30px rgba(212,168,83,0.2)',
                }}
              >
                Simulate the Draft <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/players"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-mono font-bold tracking-wider uppercase transition-colors"
                style={{
                  background: 'rgba(212,168,83,0.08)',
                  border: '1px solid rgba(212,168,83,0.25)',
                  color: '#D4A853',
                }}
              >
                Big Board <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/draft/war-room"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-mono font-bold tracking-wider uppercase transition-colors hover:bg-white/[0.04]"
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--pf-text)',
                }}
              >
                War Room
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* ═══ TOP 10 BIG BOARD STRIP ═══ */}
        <section className="max-w-7xl mx-auto px-4 md:px-8 pb-16">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="flex items-end justify-between gap-4 mb-6"
          >
            <motion.div variants={staggerItem}>
              <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-white/30 block mb-1">
                Per|Form Big Board · Top 10
              </span>
              <h2 className="font-outfit text-2xl md:text-3xl font-extrabold tracking-tight" style={{ color: 'var(--pf-text)' }}>
                Who's on the board tonight
              </h2>
            </motion.div>
            <motion.div variants={staggerItem}>
              <Link
                href="/players"
                className="text-xs font-mono font-bold tracking-wider uppercase hover:underline"
                style={{ color: '#D4A853' }}
              >
                All 2,268 &rarr;
              </Link>
            </motion.div>
          </motion.div>

          {loading && (
            <div className="py-16 text-center text-xs font-mono text-white/30 animate-pulse">
              LOADING BIG BOARD...
            </div>
          )}

          {!loading && prospects.length === 0 && (
            <div className="py-16 text-center text-xs font-mono text-white/40">
              Board unavailable — check <Link href="/players" className="underline">/players</Link>.
            </div>
          )}

          {!loading && prospects.length > 0 && (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              className="grid gap-2"
            >
              {prospects.map(p => (
                <motion.div
                  key={p.id}
                  variants={staggerItem}
                  className="grid gap-3 items-center px-4 py-3 rounded-lg transition-colors hover:bg-white/[0.03]"
                  style={{
                    gridTemplateColumns: '40px 2fr 1fr 60px 70px 1.5fr',
                    background: 'rgba(255,255,255,0.015)',
                    border: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <span
                    className="font-outfit text-2xl font-extrabold tabular-nums"
                    style={{ color: p.overall_rank && p.overall_rank <= 3 ? '#D4A853' : 'rgba(255,255,255,0.25)' }}
                  >
                    {p.overall_rank ?? '-'}
                  </span>
                  <Link
                    href={`/draft/${encodeURIComponent(p.name)}`}
                    className="font-outfit text-sm md:text-base font-bold hover:text-[#D4A853] transition-colors truncate"
                    style={{ color: 'var(--pf-text)' }}
                  >
                    {p.name}
                  </Link>
                  <span className="font-mono text-[11px] truncate" style={{ color: 'var(--pf-text-muted)' }}>
                    {p.school}
                  </span>
                  <span
                    className="font-mono text-[10px] font-bold tracking-wider"
                    style={{ color: '#D4A853' }}
                  >
                    {p.position}
                  </span>
                  <GradePill value={p.grade ?? p.tie_grade} />
                  <span className="font-mono text-[10px] truncate" style={{ color: 'var(--pf-text-subtle)' }}>
                    {p.nfl_comparison || `R${p.projected_round ?? '--'}`}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>

        {/* ═══ EXPERIENCE TILES ═══ */}
        <section className="max-w-7xl mx-auto px-4 md:px-8 pb-20">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3"
          >
            {[
              { title: 'Mock Draft', copy: '1st round, all 32 picks, your call.', href: '/draft/mock', accent: '#60A5FA' },
              { title: 'Simulation', copy: 'All 7 rounds with TIE-powered trades.', href: '/draft/simulate', accent: '#D4A853' },
              { title: 'War Room', copy: 'Live draft night, real NFL feel.', href: '/draft/war-room', accent: '#EF4444' },
              { title: 'Player Cards', copy: '17 broadcast-grade card aesthetics.', href: '/players/cards', accent: '#F59E0B' },
            ].map(tile => (
              <motion.div key={tile.href} variants={staggerItem}>
                <Link
                  href={tile.href}
                  className="block h-full p-5 rounded-xl transition-all hover:-translate-y-0.5"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                    style={{ background: `${tile.accent}18`, border: `1px solid ${tile.accent}40` }}>
                    <span className="font-outfit text-sm font-extrabold" style={{ color: tile.accent }}>
                      {tile.title[0]}
                    </span>
                  </div>
                  <h3 className="font-outfit text-base font-extrabold tracking-tight mb-1" style={{ color: 'var(--pf-text)' }}>
                    {tile.title}
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--pf-text-muted)' }}>{tile.copy}</p>
                  <div className="mt-4 text-[10px] font-mono font-bold tracking-wider uppercase inline-flex items-center gap-1"
                    style={{ color: tile.accent }}>
                    Enter <ArrowRight className="w-3 h-3" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ═══ LATEST FROM THE SHOWS — small strip ═══ */}
        {latestByShow.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 md:px-8 pb-20">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className="flex items-end justify-between gap-4 mb-4"
            >
              <motion.div variants={staggerItem} className="flex items-center gap-3">
                <Radio className="w-4 h-4" style={{ color: '#D4A853' }} />
                <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-white/30">
                  Latest from the shows
                </span>
              </motion.div>
              <motion.div variants={staggerItem}>
                <Link href="/podcast/shows" className="text-xs font-mono font-bold tracking-wider uppercase hover:underline" style={{ color: '#D4A853' }}>
                  All shows &rarr;
                </Link>
              </motion.div>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-30px' }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
            >
              {latestByShow.map(ep => {
                const meta = ANALYSTS[ep.analyst_id] || { name: ep.analyst_id, color: '#888' };
                return (
                  <motion.div key={ep.id} variants={staggerItem}>
                    <Link
                      href="/podcast/shows"
                      className="block p-4 rounded-xl transition-colors hover:bg-white/[0.04]"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
                        <span className="text-[10px] font-mono tracking-wider uppercase" style={{ color: meta.color }}>
                          {meta.name}
                        </span>
                      </div>
                      <h4 className="font-outfit text-sm font-bold line-clamp-2 mb-3" style={{ color: 'var(--pf-text)' }}>
                        {ep.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-white/30">
                        <Clock3 className="w-3 h-3" />
                        {formatDuration(ep.duration_seconds)}
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
