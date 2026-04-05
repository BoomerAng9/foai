'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { staggerContainer, staggerItem, heroStagger, heroItem } from '@/lib/motion';

/* ── Types ─────────────────────────────────────────── */
interface Player {
  id: number;
  name: string;
  school: string;
  position: string;
  overall_rank: number;
  position_rank: number;
  grade: string;
}

/* ── Position groups ───────────────────────────────── */
const POSITION_GROUPS = [
  { key: 'QB', label: 'QUARTERBACKS', icon: '🏈' },
  { key: 'RB', label: 'RUNNING BACKS', icon: '💨' },
  { key: 'WR', label: 'WIDE RECEIVERS', icon: '🎯' },
  { key: 'TE', label: 'TIGHT ENDS', icon: '🛡' },
  { key: 'OL', label: 'OFFENSIVE LINE', icon: '🧱' },
  { key: 'EDGE', label: 'EDGE RUSHERS', icon: '⚡' },
  { key: 'DT', label: 'DEFENSIVE TACKLES', icon: '🔨' },
  { key: 'LB', label: 'LINEBACKERS', icon: '🦅' },
  { key: 'CB', label: 'CORNERBACKS', icon: '🔒' },
  { key: 'S', label: 'SAFETIES', icon: '👁' },
] as const;

const POSITION_MAP: Record<string, string> = {
  QB: 'QB',
  RB: 'RB',
  WR: 'WR',
  TE: 'TE',
  OL: 'OL', OT: 'OL', OG: 'OL', C: 'OL', IOL: 'OL',
  EDGE: 'EDGE', DE: 'EDGE',
  DT: 'DT', NT: 'DT', IDL: 'DT', DL: 'DT',
  LB: 'LB', ILB: 'LB', OLB: 'LB',
  CB: 'CB',
  S: 'S', FS: 'S', SS: 'S',
};

function normalizePosition(pos: string): string {
  return POSITION_MAP[pos?.toUpperCase()] || pos?.toUpperCase() || 'OTHER';
}

/* ── Accent colors per group ───────────────────────── */
const GROUP_COLORS: Record<string, string> = {
  QB: '#E74C3C',
  RB: '#2ECC71',
  WR: '#3498DB',
  TE: '#E67E22',
  OL: '#9B59B6',
  EDGE: '#E74C3C',
  DT: '#E91E63',
  LB: '#00BCD4',
  CB: '#FF9800',
  S: '#8BC34A',
};

export default function RankingsPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/players?limit=500&sort=position_rank:asc')
      .then(r => r.json())
      .then(data => {
        setPlayers(data.players || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  /* Group players by normalized position */
  const grouped: Record<string, Player[]> = {};
  players.forEach(p => {
    const g = normalizePosition(p.position);
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(p);
  });

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0F' }}>
      <Header />

      {/* Hero banner */}
      <motion.section
        variants={heroStagger}
        initial="hidden"
        animate="visible"
        className="relative overflow-hidden py-16 px-6"
        style={{
          background: 'linear-gradient(135deg, #0D4F4F 0%, #0A2E2E 60%, #0A0A0F 100%)',
        }}
      >
        {/* Diagonal stripe overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.06]"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.15) 20px, rgba(255,255,255,0.15) 22px)',
          }}
        />

        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div variants={heroItem} className="flex items-baseline gap-4 mb-2">
            <span className="text-white/60 text-sm font-mono tracking-[0.3em]">2026 NFL DRAFT</span>
            <span
              className="text-[10px] font-bold font-mono px-2 py-0.5 rounded"
              style={{ background: '#FFD700', color: '#0A0A0F' }}
            >
              V2.0
            </span>
          </motion.div>
          <motion.h1
            variants={heroItem}
            className="text-5xl md:text-7xl font-extrabold tracking-tight"
            style={{ fontStyle: 'italic' }}
          >
            <span style={{ color: '#D4A853' }}>PER<span className="text-white/40">|</span>FORM</span>{' '}
            <span style={{ color: '#FFD700' }}>TOP 5</span>
          </motion.h1>
          <motion.p variants={heroItem} className="text-white/50 text-lg mt-3 font-mono">
            POSITION-BY-POSITION PROSPECT RANKINGS
          </motion.p>
        </div>
      </motion.section>

      {/* Position group grid */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#D4A853', borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
          >
            {POSITION_GROUPS.map(({ key, label }) => {
              const groupPlayers = grouped[key] || [];
              const topPlayer = groupPlayers[0];
              const color = GROUP_COLORS[key] || '#D4A853';
              const count = groupPlayers.length;

              return (
                <motion.div key={key} variants={staggerItem}>
                  <Link href={`/rankings/${key}`}>
                    <div
                      className="group relative rounded-lg overflow-hidden cursor-pointer transition-transform duration-200 hover:scale-[1.03] hover:-translate-y-1"
                      style={{
                        background: 'linear-gradient(135deg, #0D4F4F 0%, #0A2E2E 100%)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      {/* Diagonal stripes */}
                      <div
                        className="absolute inset-0 pointer-events-none opacity-[0.04]"
                        style={{
                          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 12px, rgba(255,255,255,0.2) 12px, rgba(255,255,255,0.2) 14px)',
                        }}
                      />

                      {/* Color accent bar */}
                      <div className="h-1 w-full" style={{ background: color }} />

                      <div className="p-5 relative z-10">
                        {/* Position key + count */}
                        <div className="flex items-center justify-between mb-3">
                          <span
                            className="text-3xl font-extrabold tracking-tight"
                            style={{ color, fontStyle: 'italic' }}
                          >
                            {key}
                          </span>
                          <span
                            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded"
                            style={{ background: `${color}20`, color }}
                          >
                            {count} PROSPECT{count !== 1 ? 'S' : ''}
                          </span>
                        </div>

                        {/* Full label */}
                        <div className="text-xs font-bold tracking-[0.2em] text-white/70 mb-4" style={{ fontFamily: 'system-ui' }}>
                          {label}
                        </div>

                        {/* Top player preview */}
                        {topPlayer ? (
                          <div
                            className="rounded px-3 py-2"
                            style={{ background: 'rgba(0,188,212,0.08)', border: '1px solid rgba(0,188,212,0.15)' }}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="w-6 h-6 flex items-center justify-center rounded text-xs font-extrabold"
                                style={{ background: color, color: '#0A0A0F' }}
                              >
                                1
                              </span>
                              <div>
                                <div className="text-sm font-extrabold text-white tracking-wide" style={{ fontFamily: 'system-ui' }}>
                                  {topPlayer.name.toUpperCase()}
                                </div>
                                <div className="text-[10px] text-white/40 font-mono">
                                  {topPlayer.school}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-white/20 font-mono italic">No prospects ranked</div>
                        )}

                        {/* Arrow indicator */}
                        <div className="mt-4 flex items-center gap-1 text-white/30 group-hover:text-white/60 transition-colors">
                          <span className="text-[10px] font-mono tracking-wider">VIEW TOP 5</span>
                          <span className="text-sm transition-transform group-hover:translate-x-1">&rarr;</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </main>

      <Footer />
    </div>
  );
}
