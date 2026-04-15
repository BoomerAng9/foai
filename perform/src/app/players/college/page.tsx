'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { staggerContainer, staggerItem, heroStagger, heroItem, fadeUp } from '@/lib/motion';

/* ── Types ─────────────────────────────────────────────── */

interface CollegePlayer {
  id: number;
  name: string;
  jersey_number: string | number | null;
  position: string;
  school: string;
  conference: string | null;
  height: string | null;
  weight: string | number | null;
  class_year: string | null;
  birthplace: string | null;
  season: number;
  passing_yards: number | null;
  rushing_yards: number | null;
  receiving_yards: number | null;
  total_touchdowns: number | null;
  tackles: number | null;
  sacks: number | null;
  interceptions: number | null;
  stats: Record<string, unknown> | null;
}

interface APIResponse {
  players: CollegePlayer[];
  total: number;
  limit: number;
  offset: number;
}

/* ── Constants ─────────────────────────────────────────── */

const PAGE_SIZE = 50;

const POSITIONS = [
  'QB', 'RB', 'WR', 'TE', 'OL', 'OT', 'OG', 'C',
  'EDGE', 'DE', 'DT', 'DL', 'LB', 'ILB', 'OLB',
  'CB', 'S', 'FS', 'SS', 'K', 'P',
] as const;

const CONFERENCES = [
  'SEC', 'Big Ten', 'Big 12', 'ACC', 'Pac-12',
  'AAC', 'Mountain West', 'Sun Belt', 'C-USA', 'MAC',
  'Independent',
] as const;

const CLASS_YEARS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate'] as const;

const POSITION_COLORS: Record<string, string> = {
  QB: '#E74C3C',
  RB: '#27AE60',
  WR: '#8E44AD',
  TE: '#E67E22',
  OL: '#2980B9', OT: '#2980B9', OG: '#2980B9', C: '#2980B9',
  EDGE: '#C0392B', DE: '#C0392B',
  DT: '#E91E63', DL: '#E91E63',
  LB: '#00BCD4', ILB: '#00BCD4', OLB: '#00BCD4',
  CB: '#FF9800',
  S: '#8BC34A', FS: '#8BC34A', SS: '#8BC34A',
  K: '#9E9E9E',
  P: '#607D8B',
};

function getPositionColor(pos: string | null | undefined): string {
  if (!pos) return '#D4A853';
  return POSITION_COLORS[pos.toUpperCase()] || '#D4A853';
}

/* ── Stat badge helper ──────────────────────────────────── */

interface StatBadge {
  label: string;
  value: string;
}

function extractStatBadges(p: CollegePlayer): StatBadge[] {
  const badges: StatBadge[] = [];
  if (p.passing_yards && p.passing_yards > 0) {
    badges.push({ label: 'PASS YDS', value: p.passing_yards.toLocaleString() });
  }
  if (p.rushing_yards && p.rushing_yards > 0) {
    badges.push({ label: 'RUSH YDS', value: p.rushing_yards.toLocaleString() });
  }
  if (p.receiving_yards && p.receiving_yards > 0) {
    badges.push({ label: 'REC YDS', value: p.receiving_yards.toLocaleString() });
  }
  if (p.total_touchdowns && p.total_touchdowns > 0) {
    badges.push({ label: 'TD', value: String(p.total_touchdowns) });
  }
  if (p.tackles && p.tackles > 0) {
    badges.push({ label: 'TKL', value: String(p.tackles) });
  }
  if (p.sacks && p.sacks > 0) {
    badges.push({ label: 'SACKS', value: String(p.sacks) });
  }
  if (p.interceptions && p.interceptions > 0) {
    badges.push({ label: 'INT', value: String(p.interceptions) });
  }
  // Pull additional stats from JSONB if present
  if (p.stats && typeof p.stats === 'object') {
    const s = p.stats as Record<string, number | string | null>;
    if (s.completions && s.attempts) {
      badges.push({ label: 'CMP/ATT', value: `${s.completions}/${s.attempts}` });
    }
    if (s.passer_rating && Number(s.passer_rating) > 0) {
      badges.push({ label: 'QBR', value: String(Number(s.passer_rating).toFixed(1)) });
    }
    if (s.yards_per_carry && Number(s.yards_per_carry) > 0) {
      badges.push({ label: 'YPC', value: String(Number(s.yards_per_carry).toFixed(1)) });
    }
  }
  return badges;
}

/* ── Select component ──────────────────────────────────── */

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: readonly string[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="appearance-none text-sm font-mono px-3 py-3 rounded-lg focus:outline-none focus:ring-1 transition-all cursor-pointer"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: value ? '#FFFFFF' : 'rgba(255,255,255,0.35)',
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
    >
      <option value="" style={{ background: 'var(--pf-bg-secondary)', color: 'rgba(255,255,255,0.5)' }}>
        {placeholder}
      </option>
      {options.map(opt => (
        <option key={opt} value={opt} style={{ background: 'var(--pf-bg-secondary)', color: 'var(--pf-text)' }}>
          {opt}
        </option>
      ))}
    </select>
  );
}

/* ── Season toggle ─────────────────────────────────────── */

function SeasonToggle({
  season,
  onChange,
}: {
  season: number;
  onChange: (s: number) => void;
}) {
  return (
    <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      {[2025, 2026].map(s => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className="px-4 py-3 text-sm font-mono font-bold tracking-wider transition-all"
          style={{
            background: season === s ? 'rgba(212,168,83,0.15)' : 'rgba(255,255,255,0.02)',
            color: season === s ? '#D4A853' : 'rgba(255,255,255,0.35)',
            borderRight: s === 2025 ? '1px solid rgba(255,255,255,0.08)' : 'none',
          }}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

/* ── Expanded player detail ────────────────────────────── */

function PlayerDetail({ player }: { player: CollegePlayer }) {
  const badges = extractStatBadges(player);
  const accent = getPositionColor(player.position);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden"
    >
      <div
        className="px-4 md:px-6 py-5 mx-2 md:mx-4 mb-2 rounded-lg"
        style={{
          background: 'rgba(255,255,255,0.02)',
          borderLeft: `3px solid ${accent}`,
        }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <span className="text-[10px] font-mono text-white/25 tracking-widest uppercase block mb-1">
              Position
            </span>
            <span className="text-sm font-mono font-bold" style={{ color: accent }}>
              {player.position || '--'}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-mono text-white/25 tracking-widest uppercase block mb-1">
              Height / Weight
            </span>
            <span className="text-sm font-mono text-white/70">
              {player.height || '--'} / {player.weight ? `${player.weight} lbs` : '--'}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-mono text-white/25 tracking-widest uppercase block mb-1">
              Class
            </span>
            <span className="text-sm font-mono text-white/70">
              {player.class_year || '--'}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-mono text-white/25 tracking-widest uppercase block mb-1">
              Birthplace
            </span>
            <span className="text-sm font-mono text-white/70">
              {player.birthplace || '--'}
            </span>
          </div>
        </div>

        {player.season === 2025 && badges.length > 0 && (
          <div>
            <span className="text-[10px] font-mono text-white/25 tracking-widest uppercase block mb-2">
              2025 Season Stats
            </span>
            <div className="flex flex-wrap gap-2">
              {badges.map(b => (
                <div
                  key={b.label}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md"
                  style={{
                    background: `${accent}10`,
                    border: `1px solid ${accent}25`,
                  }}
                >
                  <span className="text-[9px] font-mono tracking-widest uppercase" style={{ color: `${accent}99` }}>
                    {b.label}
                  </span>
                  <span className="text-xs font-mono font-bold" style={{ color: accent }}>
                    {b.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {player.season !== 2025 && (
          <p className="text-xs font-mono text-white/20 italic">
            Stats available for 2025 season only.
          </p>
        )}
      </div>
    </motion.div>
  );
}

/* ── Main page ─────────────────────────────────────────── */

export default function CollegePlayerIndexPage() {
  const [players, setPlayers] = useState<CollegePlayer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState('');
  const [conference, setConference] = useState('');
  const [classYear, setClassYear] = useState('');
  const [season, setSeason] = useState(2026);

  // Expanded row
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        season: String(season),
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      if (search.trim()) params.set('search', search.trim());
      if (position) params.set('position', position);
      if (conference) params.set('conference', conference);
      if (classYear) params.set('class', classYear);

      const res = await fetch(`/api/cfb/players?${params.toString()}`);
      const data: APIResponse = await res.json();
      setPlayers(data.players || []);
      setTotal(data.total || 0);
    } catch {
      setPlayers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [season, offset, search, position, conference, classYear]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  // Reset offset when filters change
  useEffect(() => {
    setOffset(0);
    setExpandedId(null);
  }, [search, position, conference, classYear, season]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 7;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, currentPage - 2);
      let end = Math.min(totalPages - 1, currentPage + 2);
      if (currentPage <= 3) end = Math.min(5, totalPages - 1);
      if (currentPage >= totalPages - 2) start = Math.max(totalPages - 4, 2);
      if (start > 2) pages.push(-1); // ellipsis
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push(-2); // ellipsis
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, currentPage]);

  function goToPage(page: number) {
    setOffset((page - 1) * PAGE_SIZE);
    setExpandedId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--pf-bg)' }}>
      <Header />

      <main className="flex-1 px-4 md:px-8 py-8 max-w-7xl mx-auto w-full">
        {/* ── Hero ────────────────────────────────────────── */}
        <motion.div variants={heroStagger} initial="hidden" animate="visible" className="mb-8">
          <motion.div variants={heroItem} className="flex items-center gap-3 mb-3">
            <div className="w-1.5 h-8 rounded-full" style={{ background: '#D4A853' }} />
            <span className="text-[10px] font-mono font-bold tracking-[0.25em] text-white/30 uppercase">
              Per|Form College Database
            </span>
          </motion.div>

          <motion.h1
            variants={heroItem}
            className="font-outfit text-3xl md:text-5xl font-extrabold tracking-tight mb-2"
            style={{ color: '#D4A853' }}
          >
            COLLEGE FOOTBALL PLAYER INDEX
          </motion.h1>

          <motion.p variants={heroItem} className="text-sm font-mono text-white/30 mb-6">
            {loading ? 'Loading...' : `${total.toLocaleString()} players indexed`}
            {' '}<span className="text-white/15">|</span>{' '}
            {season} Season
          </motion.p>

          {/* ── Filter bar ────────────────────────────────── */}
          <motion.div variants={heroItem} className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
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
                  placeholder="Search by name, school..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg text-sm font-mono focus:outline-none focus:ring-1 transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'var(--pf-text)',
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

              {/* Dropdowns */}
              <FilterSelect
                value={position}
                onChange={setPosition}
                placeholder="All Positions"
                options={POSITIONS}
              />
              <FilterSelect
                value={conference}
                onChange={setConference}
                placeholder="All Conferences"
                options={CONFERENCES}
              />
              <FilterSelect
                value={classYear}
                onChange={setClassYear}
                placeholder="All Classes"
                options={CLASS_YEARS}
              />

              {/* Season toggle */}
              <SeasonToggle season={season} onChange={setSeason} />
            </div>

            {/* Active filter chips */}
            {(position || conference || classYear || search) && (
              <div className="flex flex-wrap items-center gap-2">
                {search && (
                  <FilterChip label={`"${search}"`} onClear={() => setSearch('')} />
                )}
                {position && (
                  <FilterChip label={position} onClear={() => setPosition('')} />
                )}
                {conference && (
                  <FilterChip label={conference} onClear={() => setConference('')} />
                )}
                {classYear && (
                  <FilterChip label={classYear} onClear={() => setClassYear('')} />
                )}
                <button
                  onClick={() => { setSearch(''); setPosition(''); setConference(''); setClassYear(''); }}
                  className="text-[10px] font-mono tracking-wider text-white/25 hover:text-white/50 transition-colors ml-1"
                >
                  CLEAR ALL
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>

        {/* ── Loading state ───────────────────────────────── */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-8 h-8 rounded-full border-2 animate-spin"
                style={{ borderColor: 'rgba(255,255,255,0.06)', borderTopColor: '#D4A853' }}
              />
              <span className="text-sm font-mono text-white/30 animate-pulse">
                Loading players...
              </span>
            </div>
          </div>
        )}

        {/* ── Desktop table ───────────────────────────────── */}
        {!loading && players.length > 0 && (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {/* Table header */}
            <div className="hidden md:block">
              <div
                className="grid gap-2 px-4 py-2.5 text-[10px] font-mono tracking-widest uppercase"
                style={{
                  gridTemplateColumns: '2fr 50px 70px 1.2fr 1fr 70px 70px 90px 1fr',
                  color: 'rgba(255,255,255,0.2)',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <span>Name</span>
                <span>#</span>
                <span>Pos</span>
                <span>School</span>
                <span>Conference</span>
                <span>Ht</span>
                <span>Wt</span>
                <span>Class</span>
                <span>Birthplace</span>
              </div>

              {/* Player rows */}
              {players.map((p, i) => {
                const accent = getPositionColor(p.position);
                const isExpanded = expandedId === p.id;
                const hasBadges = p.season === 2025 && extractStatBadges(p).length > 0;

                return (
                  <motion.div key={p.id} variants={staggerItem}>
                    <div
                      className="grid gap-2 px-4 py-3 items-center transition-colors rounded-lg cursor-pointer"
                      style={{
                        gridTemplateColumns: '2fr 50px 70px 1.2fr 1fr 70px 70px 90px 1fr',
                        borderBottom: i < players.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                        background: isExpanded ? 'rgba(212,168,83,0.04)' : 'transparent',
                      }}
                      onClick={() => setExpandedId(isExpanded ? null : p.id)}
                      onMouseEnter={e => {
                        if (!isExpanded) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                      }}
                      onMouseLeave={e => {
                        if (!isExpanded) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-outfit text-sm font-bold text-white truncate">
                          {p.name}
                        </span>
                        {hasBadges && (
                          <span
                            className="flex-shrink-0 w-1.5 h-1.5 rounded-full"
                            style={{ background: '#D4A853' }}
                            title="Stats available"
                          />
                        )}
                      </div>
                      <span className="font-mono text-xs text-white/30 tabular-nums">
                        {p.jersey_number ?? '--'}
                      </span>
                      <span
                        className="text-[10px] font-mono font-bold tracking-wider"
                        style={{ color: accent }}
                      >
                        {p.position || '--'}
                      </span>
                      <span className="font-mono text-xs text-white/40 truncate">
                        {p.school}
                      </span>
                      <span className="font-mono text-xs text-white/30 truncate">
                        {p.conference || '--'}
                      </span>
                      <span className="font-mono text-xs text-white/30">
                        {p.height || '--'}
                      </span>
                      <span className="font-mono text-xs text-white/30 tabular-nums">
                        {p.weight || '--'}
                      </span>
                      <span className="font-mono text-xs text-white/30">
                        {p.class_year || '--'}
                      </span>
                      <span className="font-mono text-[11px] text-white/25 truncate">
                        {p.birthplace || '--'}
                      </span>
                    </div>

                    <AnimatePresence>
                      {isExpanded && <PlayerDetail player={p} />}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>

            {/* ── Mobile cards ────────────────────────────── */}
            <div className="md:hidden flex flex-col gap-2">
              {players.map(p => {
                const accent = getPositionColor(p.position);
                const isExpanded = expandedId === p.id;
                const hasBadges = p.season === 2025 && extractStatBadges(p).length > 0;

                return (
                  <motion.div key={p.id} variants={staggerItem}>
                    <div
                      className="p-4 rounded-xl transition-colors cursor-pointer"
                      style={{
                        background: isExpanded ? 'rgba(212,168,83,0.04)' : 'rgba(255,255,255,0.02)',
                        border: isExpanded
                          ? '1px solid rgba(212,168,83,0.15)'
                          : '1px solid rgba(255,255,255,0.05)',
                      }}
                      onClick={() => setExpandedId(isExpanded ? null : p.id)}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-[10px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded"
                              style={{ background: `${accent}15`, color: accent }}
                            >
                              {p.position || '--'}
                            </span>
                            {p.jersey_number && (
                              <span className="text-[10px] font-mono text-white/25">
                                #{p.jersey_number}
                              </span>
                            )}
                            {hasBadges && (
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ background: '#D4A853' }}
                              />
                            )}
                          </div>
                          <span className="font-outfit text-sm font-bold text-white mt-1 block truncate">
                            {p.name}
                          </span>
                          <span className="text-xs font-mono text-white/40">{p.school}</span>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-[10px] font-mono text-white/25 block">
                            {p.conference || ''}
                          </span>
                          <span className="text-[10px] font-mono text-white/20 block">
                            {p.class_year || ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] font-mono text-white/25">
                        {p.height && <span>{p.height}</span>}
                        {p.weight && (
                          <>
                            <span className="text-white/10">|</span>
                            <span>{p.weight} lbs</span>
                          </>
                        )}
                        {p.birthplace && (
                          <>
                            <span className="text-white/10">|</span>
                            <span className="truncate">{p.birthplace}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && <PlayerDetail player={p} />}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── Empty state ─────────────────────────────────── */}
        {!loading && players.length === 0 && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center justify-center py-24 gap-4"
          >
            <p className="text-sm font-mono text-white/30">No players found.</p>
            {(search || position || conference || classYear) && (
              <button
                onClick={() => { setSearch(''); setPosition(''); setConference(''); setClassYear(''); }}
                className="text-xs font-mono px-4 py-2 rounded transition-colors hover:bg-white/5"
                style={{ color: '#D4A853', border: '1px solid rgba(212,168,83,0.25)' }}
              >
                CLEAR FILTERS
              </button>
            )}
          </motion.div>
        )}

        {/* ── Pagination ──────────────────────────────────── */}
        {!loading && totalPages > 1 && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="flex items-center justify-center gap-1 mt-10"
          >
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 rounded-lg text-xs font-mono transition-all disabled:opacity-20"
              style={{
                color: 'rgba(255,255,255,0.5)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              PREV
            </button>

            {pageNumbers.map((pn, i) =>
              pn < 0 ? (
                <span key={`ellipsis-${i}`} className="px-2 text-xs font-mono text-white/15">
                  ...
                </span>
              ) : (
                <button
                  key={pn}
                  onClick={() => goToPage(pn)}
                  className="w-9 h-9 rounded-lg text-xs font-mono font-bold transition-all"
                  style={{
                    background: pn === currentPage ? 'rgba(212,168,83,0.15)' : 'transparent',
                    color: pn === currentPage ? '#D4A853' : 'rgba(255,255,255,0.3)',
                    border: pn === currentPage
                      ? '1px solid rgba(212,168,83,0.3)'
                      : '1px solid transparent',
                  }}
                >
                  {pn}
                </button>
              ),
            )}

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 rounded-lg text-xs font-mono transition-all disabled:opacity-20"
              style={{
                color: 'rgba(255,255,255,0.5)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              NEXT
            </button>
          </motion.div>
        )}

        {/* Page info */}
        {!loading && total > 0 && (
          <p className="text-center text-[10px] font-mono text-white/15 mt-4 tracking-wider">
            SHOWING {offset + 1}-{Math.min(offset + PAGE_SIZE, total)} OF {total.toLocaleString()}
          </p>
        )}
      </main>

      <Footer />
    </div>
  );
}

/* ── Filter chip ───────────────────────────────────────── */

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono tracking-wider"
      style={{
        background: 'rgba(212,168,83,0.08)',
        border: '1px solid rgba(212,168,83,0.2)',
        color: '#D4A853',
      }}
    >
      {label}
      <button
        onClick={e => { e.stopPropagation(); onClear(); }}
        className="hover:text-white transition-colors ml-0.5"
      >
        x
      </button>
    </span>
  );
}
