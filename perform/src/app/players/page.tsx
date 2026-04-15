'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getGradeForScore } from '@/lib/tie/grades';
import { positionColor, normalizePosition as normalizeFootballPosition } from '@/lib/ui/positions';
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
  sport?: string;
}

type Sport = 'football' | 'basketball' | 'baseball';

const SPORTS: { id: Sport; label: string; status: 'live' | 'coming-soon' }[] = [
  { id: 'football', label: 'FOOTBALL', status: 'live' },
  { id: 'basketball', label: 'BASKETBALL', status: 'coming-soon' },
  { id: 'baseball', label: 'BASEBALL', status: 'coming-soon' },
];

/* ── Position groups per sport ──────────────────────── */
const POSITION_GROUPS_BY_SPORT: Record<Sport, readonly string[]> = {
  football: ['QB', 'RB', 'WR', 'TE', 'OL', 'EDGE', 'DL', 'LB', 'CB', 'S'] as const,
  basketball: ['PG', 'SG', 'SF', 'PF', 'C'] as const,
  baseball: ['P', 'C', 'IF', 'OF', 'DH'] as const,
};

function normalizePosition(pos: string, sport: Sport): string {
  if (sport === 'football') return normalizeFootballPosition(pos);
  return pos?.toUpperCase() || 'OTHER';
}

// Basketball + baseball palettes — football routes through @/lib/ui/positions.
const MULTI_SPORT_COLORS: Record<string, string> = {
  PG: '#D40028', SG: '#0A66E8', SF: '#00874C', PF: '#DC6B19', C: '#7C3AED',
  P:  '#D40028', IF: '#0A66E8', OF: '#00874C', DH: '#DC6B19',
};

function getGroupColor(group: string): string {
  return positionColor(group) !== '#9CA3AF' ? positionColor(group) : (MULTI_SPORT_COLORS[group] ?? '#9CA3AF');
}

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
  const [sport, setSport] = useState<Sport>('football');

  const sportMeta = SPORTS.find(s => s.id === sport)!;
  const isLive = sportMeta.status === 'live';

  useEffect(() => {
    if (!isLive) { setPlayers([]); setLoading(false); return; }
    setLoading(true);
    fetch(`/api/players?limit=500&sort=overall_rank:asc&sport=${sport}`)
      .then(r => r.json())
      .then(d => {
        setPlayers(d.players || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sport, isLive]);

  const filtered = useMemo(() => {
    if (!search.trim()) return players;
    const q = search.toLowerCase();
    return players.filter(
      p => p.name.toLowerCase().includes(q) || p.school?.toLowerCase().includes(q) || p.position?.toLowerCase().includes(q),
    );
  }, [players, search]);

  const positionGroups = POSITION_GROUPS_BY_SPORT[sport];
  const grouped = useMemo(() => {
    const groups: Record<string, Player[]> = {};
    for (const g of positionGroups) groups[g] = [];
    for (const p of filtered) {
      const norm = normalizePosition(p.position, sport);
      if (groups[norm]) groups[norm].push(p);
      else { if (!groups['OTHER']) groups['OTHER'] = []; groups['OTHER'].push(p); }
    }
    return groups;
  }, [filtered, positionGroups, sport]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--pf-bg)' }}>
      <Header />

      <main className="flex-1 px-4 md:px-8 py-8 max-w-6xl mx-auto w-full">
        <motion.div variants={heroStagger} initial="hidden" animate="visible" className="mb-8">
          <motion.h1
            variants={heroItem}
            className="font-outfit text-3xl md:text-4xl font-extrabold tracking-tight mb-6"
            style={{ color: '#D4A853' }}
          >
            PLAYER INDEX
          </motion.h1>

          {/* Sport tabs */}
          <motion.div variants={heroItem} className="flex gap-2 mb-5 flex-wrap">
            {SPORTS.map(s => {
              const active = s.id === sport;
              return (
                <button
                  key={s.id}
                  onClick={() => { setSport(s.id); setSearch(''); }}
                  className="px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-wider transition-all"
                  style={{
                    background: active ? 'rgba(212,168,83,0.15)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${active ? 'rgba(212,168,83,0.45)' : 'rgba(255,255,255,0.06)'}`,
                    color: active ? '#D4A853' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  {s.label}
                  {s.status === 'coming-soon' && <span className="ml-2 text-[9px] text-white/30">SOON</span>}
                </button>
              );
            })}
          </motion.div>

          {/* Nav links (football only) */}
          {sport === 'football' && (
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
          )}

          {isLive && (
            <motion.div variants={heroItem} className="mb-2">
              <div className="relative max-w-md">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.3)" strokeWidth={2}
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
                    color: 'var(--pf-text)',
                    caretColor: '#D4A853',
                  }}
                />
              </div>
              {search && (
                <p className="text-xs font-mono text-white/30 mt-2">
                  {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                </p>
              )}
            </motion.div>
          )}
        </motion.div>

        {!isLive && (
          <motion.div
            variants={fadeUp} initial="hidden" animate="visible"
            className="flex flex-col items-center justify-center py-24 gap-3 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}
          >
            <span className="font-outfit text-lg font-bold" style={{ color: '#D4A853' }}>
              {sportMeta.label} — COMING SOON
            </span>
            <p className="text-xs font-mono text-white/40 max-w-md text-center">
              Player Index expands to {sportMeta.label.toLowerCase()} after the NFL Draft launch.
              Multi-sport grading engine already live on the backend.
            </p>
          </motion.div>
        )}

        {isLive && loading && (
          <div className="flex items-center justify-center py-24">
            <span className="text-sm font-mono text-white/30 animate-pulse">Loading players...</span>
          </div>
        )}

        {isLive && positionGroups.map(group => {
          const list = grouped[group];
          if (!list || list.length === 0) return null;
          const accent = getGroupColor(group);

          return (
            <motion.div
              key={group}
              variants={staggerContainer} initial="hidden"
              whileInView="visible" viewport={{ once: true, margin: '-30px' }}
              className="mb-10"
            >
              <motion.div variants={staggerItem} className="flex items-center gap-3 mb-3">
                <div className="w-1 h-6 rounded-full" style={{ background: accent }} />
                <span className="font-outfit text-sm font-extrabold tracking-wider" style={{ color: accent }}>
                  {group}
                </span>
                <span className="text-[11px] font-mono text-white/25">{list.length} players</span>
              </motion.div>

              <div className="hidden md:block">
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
                  <span>{sport === 'football' ? 'Round' : 'Tier'}</span>
                  <span>{sport === 'football' ? 'NFL Comp' : 'Pro Comp'}</span>
                </div>

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
                    <span className="font-mono text-xs text-white/25 tabular-nums">{p.overall_rank || '-'}</span>
                    <Link
                      href={`/draft/${encodeURIComponent(p.name)}`}
                      className="font-outfit text-sm font-bold text-white hover:text-[#D4A853] transition-colors truncate"
                    >
                      {p.name}
                    </Link>
                    <span className="font-mono text-xs text-white/40 truncate">{p.school}</span>
                    <GradePill value={p.grade || p.tie_grade} />
                    <span className="font-mono text-xs text-white/40">
                      {p.projected_round ? (sport === 'football' ? `RD ${p.projected_round}` : `T${p.projected_round}`) : '--'}
                    </span>
                    <span className="font-mono text-[11px] text-white/30 truncate">{p.nfl_comparison || '--'}</span>
                  </motion.div>
                ))}
              </div>

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
                            {p.overall_rank && <span className="text-[10px] font-mono text-white/25">#{p.overall_rank}</span>}
                            <span className="font-outfit text-sm font-bold text-white truncate">{p.name}</span>
                          </div>
                          <span className="text-xs font-mono text-white/40">{p.school}</span>
                        </div>
                        <GradePill value={p.grade || p.tie_grade} />
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-mono text-white/30">
                        {p.projected_round && <span>{sport === 'football' ? `Round ${p.projected_round}` : `Tier ${p.projected_round}`}</span>}
                        {p.nfl_comparison && (<><span className="text-white/10">|</span><span className="truncate">{p.nfl_comparison}</span></>)}
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          );
        })}

        {isLive && !loading && filtered.length === 0 && (
          <motion.div
            variants={fadeUp} initial="hidden" animate="visible"
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
