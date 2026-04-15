'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getGradeForScore } from '@/lib/tie/grades';
import { staggerContainer, staggerItem, heroItem, heroStagger, fadeUp } from '@/lib/motion';

interface Player {
  id: number;
  name: string;
  school: string;
  position: string;
  overall_rank: number;
  tie_grade: string;
  grade: string;
  projected_round: number;
  nfl_comparison: string;
}

/* ── Position grouping ─────────────────────────────── */
const POSITION_GROUPS = ['QB', 'RB', 'WR', 'TE', 'OL', 'EDGE', 'DL', 'LB', 'CB', 'S'] as const;

const POSITION_MAP: Record<string, string> = {
  QB: 'QB',
  RB: 'RB',
  WR: 'WR',
  TE: 'TE',
  OL: 'OL', OT: 'OL', OG: 'OL', C: 'OL', IOL: 'OL',
  EDGE: 'EDGE', DE: 'EDGE',
  DL: 'DL', DT: 'DL', NT: 'DL', IDL: 'DL',
  LB: 'LB', ILB: 'LB', OLB: 'LB',
  CB: 'CB',
  S: 'S', FS: 'S', SS: 'S',
};

function normalizePosition(pos: string): string {
  return POSITION_MAP[pos?.toUpperCase()] || pos?.toUpperCase() || 'OTHER';
}

/* ── Position group accent colors ────────────────────── */
const GROUP_COLORS: Record<string, string> = {
  QB: '#E74C3C',
  RB: '#2ECC71',
  WR: '#3498DB',
  TE: '#E67E22',
  OL: '#9B59B6',
  EDGE: '#E74C3C',
  DL: '#E91E63',
  LB: '#00BCD4',
  CB: '#FF9800',
  S: '#8BC34A',
};

function getGroupColor(group: string): string {
  return GROUP_COLORS[group] || '#D4A853';
}

/* ── Grade pill ──────────────────────────────────────── */
function GradePill({ value }: { value: string | number }) {
  const num = parseFloat(String(value));
  if (isNaN(num)) return <span className="font-mono text-xs text-white/30">--</span>;
  const info = getGradeForScore(num);
  return (
    <span
      className="inline-block text-xs font-mono font-bold px-2.5 py-0.5 rounded-full"
      style={{ background: `${info.badgeColor}18`, color: info.badgeColor }}
    >
      {num.toFixed(1)}
    </span>
  );
}

export default function PlayerIndexPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/players?limit=500&sort=overall_rank:asc')
      .then(r => r.json())
      .then(d => {
        setPlayers(d.players || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return players;
    const q = search.toLowerCase();
    return players.filter(
      p => p.name.toLowerCase().includes(q) || p.school?.toLowerCase().includes(q) || p.position?.toLowerCase().includes(q),
    );
  }, [players, search]);

  const grouped = useMemo(() => {
    const groups: Record<string, Player[]> = {};
    for (const g of POSITION_GROUPS) groups[g] = [];
    for (const p of filtered) {
      const norm = normalizePosition(p.position);
      if (groups[norm]) {
        groups[norm].push(p);
      } else {
        if (!groups['OTHER']) groups['OTHER'] = [];
        groups['OTHER'].push(p);
      }
    }
    return groups;
  }, [filtered]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--pf-bg)' }}>
      <Header />

      <main className="flex-1 px-4 md:px-8 py-8 max-w-6xl mx-auto w-full">
        {/* Page header */}
        <motion.div variants={heroStagger} initial="hidden" animate="visible" className="mb-8">
          <motion.h1
            variants={heroItem}
            className="font-outfit text-3xl md:text-4xl font-extrabold tracking-tight mb-6"
            style={{ color: '#D4A853' }}
          >
            PLAYER INDEX
          </motion.h1>

          {/* Nav links */}
          <motion.div variants={heroItem} className="flex gap-3 mb-4">
            <Link
              href="/players/cards"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-wider transition-all hover:scale-[1.02]"
              style={{
                background: 'rgba(212,168,83,0.08)',
                border: '1px solid rgba(212,168,83,0.25)',
                color: '#D4A853',
              }}
            >
              DRAFT CARDS
              <span className="text-white/20">&rarr;</span>
            </Link>
          </motion.div>

          {/* Search */}
          <motion.div variants={heroItem} className="mb-2">
            <div className="relative max-w-md">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth={2}
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, school, or position..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg text-sm font-mono focus:outline-none focus:ring-1 transition-all"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#FFFFFF',
                  caretColor: '#D4A853',
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = 'rgba(212,168,83,0.4)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                }}
              />
            </div>
            {search && (
              <p className="text-xs font-mono text-white/30 mt-2">
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </p>
            )}
          </motion.div>
        </motion.div>

        {loading && (
          <div className="flex items-center justify-center py-24">
            <span className="text-sm font-mono text-white/30 animate-pulse">Loading players...</span>
          </div>
        )}

        {/* ── Position Groups ────────────────────────────── */}
        {POSITION_GROUPS.map(group => {
          const list = grouped[group];
          if (!list || list.length === 0) return null;
          const accent = getGroupColor(group);

          return (
            <motion.div
              key={group}
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-30px' }}
              className="mb-10"
            >
              {/* Group header */}
              <motion.div
                variants={staggerItem}
                className="flex items-center gap-3 mb-3"
              >
                <div className="w-1 h-6 rounded-full" style={{ background: accent }} />
                <span className="font-outfit text-sm font-extrabold tracking-wider" style={{ color: accent }}>
                  {group}
                </span>
                <span className="text-[11px] font-mono text-white/25">{list.length} players</span>
              </motion.div>

              {/* ── Desktop: Table ────────────────────────── */}
              <div className="hidden md:block">
                {/* Table header */}
                <div
                  className="grid gap-3 px-4 py-2.5 text-[10px] font-mono tracking-widest uppercase"
                  style={{
                    gridTemplateColumns: '50px 1.5fr 1fr 80px 80px 1fr',
                    color: 'rgba(255,255,255,0.2)',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <span>Rank</span>
                  <span>Name</span>
                  <span>School</span>
                  <span>Grade</span>
                  <span>Round</span>
                  <span>NFL Comp</span>
                </div>

                {/* Player rows */}
                {list.map((p, i) => (
                  <motion.div
                    key={p.id}
                    variants={staggerItem}
                    className="grid gap-3 px-4 py-3 items-center transition-colors rounded-lg hover:bg-white/[0.03]"
                    style={{
                      gridTemplateColumns: '50px 1.5fr 1fr 80px 80px 1fr',
                      borderBottom: i < list.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                    }}
                  >
                    <span className="font-mono text-xs text-white/25 tabular-nums">
                      {p.overall_rank || '-'}
                    </span>
                    <Link
                      href={`/draft/${encodeURIComponent(p.name)}`}
                      className="font-outfit text-sm font-bold text-white hover:text-[#D4A853] transition-colors truncate"
                    >
                      {p.name}
                    </Link>
                    <span className="font-mono text-xs text-white/40 truncate">{p.school}</span>
                    <GradePill value={p.grade || p.tie_grade} />
                    <span className="font-mono text-xs text-white/40">
                      {p.projected_round ? `RD ${p.projected_round}` : '--'}
                    </span>
                    <span className="font-mono text-[11px] text-white/30 truncate">
                      {p.nfl_comparison || '--'}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* ── Mobile: Cards ─────────────────────────── */}
              <div className="md:hidden flex flex-col gap-2">
                {list.map(p => (
                  <motion.div key={p.id} variants={staggerItem}>
                    <Link
                      href={`/draft/${encodeURIComponent(p.name)}`}
                      className="block p-4 rounded-xl transition-colors hover:bg-white/[0.04]"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {p.overall_rank && (
                              <span className="text-[10px] font-mono text-white/25">#{p.overall_rank}</span>
                            )}
                            <span className="font-outfit text-sm font-bold text-white truncate">
                              {p.name}
                            </span>
                          </div>
                          <span className="text-xs font-mono text-white/40">{p.school}</span>
                        </div>
                        <GradePill value={p.grade || p.tie_grade} />
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-mono text-white/30">
                        {p.projected_round && <span>Round {p.projected_round}</span>}
                        {p.nfl_comparison && (
                          <>
                            <span className="text-white/10">|</span>
                            <span className="truncate">{p.nfl_comparison}</span>
                          </>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          );
        })}

        {!loading && filtered.length === 0 && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center justify-center py-24 gap-4"
          >
            <p className="text-sm font-mono text-white/30">No players found.</p>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-xs font-mono px-4 py-2 rounded transition-colors hover:bg-white/5"
                style={{ color: '#D4A853', border: '1px solid rgba(212,168,83,0.25)' }}
              >
                CLEAR SEARCH
              </button>
            )}
          </motion.div>
        )}
      </main>

      <Footer />
    </div>
  );
}
