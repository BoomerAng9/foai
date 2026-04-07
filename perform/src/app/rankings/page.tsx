'use client';

/**
 * /rankings — broadcast theme, position-grouped prospect rankings
 * ================================================================
 * Light broadcast UI matching /draft + /forecast. Hero features
 * the prospect board wall scene. Position group cards for deep dives.
 */

import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';

interface Player {
  id: number;
  name: string;
  school: string;
  position: string;
  overall_rank: number;
  position_rank: number;
  grade: string | number;
  grade_letter?: string;
}

const T = {
  bg:           '#F4F6FA',
  surface:      '#FFFFFF',
  surfaceAlt:   '#FAFBFD',
  border:       '#E2E6EE',
  borderStrong: '#CDD3DF',
  text:         '#0A0E1A',
  textMuted:    '#5A6478',
  textSubtle:   '#8B94A8',
  navy:         '#0B1E3F',
  navyDeep:     '#06122A',
  red:          '#D40028',
};

const POSITION_GROUPS = [
  { key: 'QB',   label: 'Quarterbacks',      color: '#D40028' },
  { key: 'RB',   label: 'Running Backs',     color: '#00874C' },
  { key: 'WR',   label: 'Wide Receivers',    color: '#7C3AED' },
  { key: 'TE',   label: 'Tight Ends',        color: '#DC6B19' },
  { key: 'OL',   label: 'Offensive Line',    color: '#0A66E8' },
  { key: 'EDGE', label: 'Edge Rushers',      color: '#8B1A00' },
  { key: 'DT',   label: 'Defensive Tackles', color: '#DC2626' },
  { key: 'LB',   label: 'Linebackers',       color: '#0891B2' },
  { key: 'CB',   label: 'Cornerbacks',       color: '#F59E0B' },
  { key: 'S',    label: 'Safeties',          color: '#84CC16' },
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

function normalizePosition(pos: string | null | undefined): string {
  if (!pos) return 'OTHER';
  return POSITION_MAP[pos.toUpperCase()] || pos.toUpperCase();
}

function nameSlug(name: string): string {
  return encodeURIComponent(name.toLowerCase().replace(/\s+/g, '-'));
}

export default function RankingsPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/players?limit=600&sort=overall_rank:asc')
      .then(r => r.json())
      .then(data => {
        setPlayers(data.players || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const grouped = useMemo(() => {
    const map: Record<string, Player[]> = {};
    players.forEach(p => {
      const g = normalizePosition(p.position);
      if (!map[g]) map[g] = [];
      map[g].push(p);
    });
    // Sort each group by overall_rank
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (a.overall_rank ?? 999) - (b.overall_rank ?? 999));
    }
    return map;
  }, [players]);

  return (
    <div className="min-h-screen" style={{ background: T.bg, color: T.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* ═══ TOP RIBBON ═══ */}
      <div style={{ background: T.navyDeep, color: '#FFFFFF', borderBottom: `2px solid ${T.red}` }}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between text-[11px] font-bold tracking-[0.18em] uppercase">
          <div className="flex items-center gap-3">
            <span style={{ color: T.red }}>● LIVE</span>
            <span className="opacity-50">|</span>
            <span>Per|Form Rankings</span>
            <span className="opacity-50">|</span>
            <span className="opacity-70">2026 NFL Draft Class</span>
          </div>
          <Link href="/draft" className="opacity-80 hover:opacity-100 transition">Big Board →</Link>
        </div>
      </div>

      {/* ═══ HERO — prospect board wall scene ═══ */}
      <header className="relative overflow-hidden" style={{ background: T.navyDeep, color: '#FFFFFF', minHeight: 360 }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url('/brand/scenes/rankings-board-wall.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(6,18,42,0.92) 0%, rgba(6,18,42,0.72) 50%, rgba(6,18,42,0.92) 100%)',
          }}
        />
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 80px, #FFFFFF 80px, #FFFFFF 81px)',
        }} />
        <div className="relative max-w-7xl mx-auto px-6 py-14">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="px-2 py-0.5 text-[10px] font-bold tracking-[0.2em] rounded" style={{ background: T.red }}>
              POSITION RANKINGS
            </span>
            <span className="text-[11px] font-semibold tracking-[0.15em] uppercase opacity-70">
              Canonical Board
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black leading-[0.92] tracking-tight uppercase">
            The Board
          </h1>
          <p className="text-base md:text-lg mt-4 opacity-80 max-w-2xl">
            Every prospect, grouped by position, graded by the Talent &amp; Innovation Engine. Click any group to see the full tier.
          </p>
        </div>
      </header>

      {/* ═══ POSITION GROUP GRID ═══ */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: T.border, borderTopColor: T.navy }} />
            <div className="text-xs font-mono mt-3" style={{ color: T.textMuted }}>Loading rankings…</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {POSITION_GROUPS.map(({ key, label, color }, i) => {
              const groupPlayers = grouped[key] || [];
              const topPlayer = groupPlayers[0];
              const count = groupPlayers.length;

              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.3) }}
                >
                  <Link
                    href={`/rankings/${key}`}
                    className="group block rounded-xl overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg"
                    style={{
                      background: T.surface,
                      border: `1px solid ${T.border}`,
                      borderLeft: `4px solid ${color}`,
                      boxShadow: '0 1px 3px rgba(10,14,26,0.04)',
                    }}
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="text-3xl font-black tracking-tight" style={{ color, fontFamily: "'Outfit', sans-serif" }}>
                            {key}
                          </div>
                          <div className="text-[10px] font-bold tracking-[0.15em] uppercase mt-0.5" style={{ color: T.textMuted }}>
                            {label}
                          </div>
                        </div>
                        <span
                          className="text-[9px] font-bold tracking-[0.15em] uppercase px-2 py-0.5 rounded"
                          style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
                        >
                          {count} prospects
                        </span>
                      </div>

                      {topPlayer ? (
                        <div
                          className="rounded-lg px-3 py-2.5 flex items-center gap-3"
                          style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}
                        >
                          <span
                            className="flex-shrink-0 w-7 h-7 rounded flex items-center justify-center text-xs font-black"
                            style={{ background: color, color: '#FFFFFF' }}
                          >
                            1
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-bold truncate" style={{ color: T.text }}>
                              {topPlayer.name}
                            </div>
                            <div className="text-[10px] font-mono truncate" style={{ color: T.textMuted }}>
                              {topPlayer.school} · #{topPlayer.overall_rank}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] font-mono italic text-center py-3" style={{ color: T.textSubtle }}>
                          No prospects
                        </div>
                      )}

                      <div className="mt-4 flex items-center justify-between text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: T.textMuted }}>
                        <span>View Full Tier</span>
                        <span className="transition-transform group-hover:translate-x-1" style={{ color }}>→</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* ═══ TOP 25 OVERALL BOARD (teaser) ═══ */}
      {!loading && players.length > 0 && (
        <section className="border-t" style={{ background: T.surface, borderColor: T.border }}>
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="flex items-baseline justify-between mb-6">
              <div>
                <div className="text-[10px] font-bold tracking-[0.22em] uppercase" style={{ color: T.red }}>
                  Overall Top 25
                </div>
                <h2 className="text-3xl md:text-4xl font-black tracking-tight mt-1">
                  2026 Per|Form Big Board
                </h2>
              </div>
              <Link
                href="/draft"
                className="text-[10px] font-bold tracking-[0.18em] uppercase px-3 py-1.5 rounded border"
                style={{ color: T.navy, borderColor: T.border }}
              >
                Full Board →
              </Link>
            </div>
            <div className="divide-y" style={{ borderColor: T.border }}>
              {players.slice(0, 25).map((p) => (
                <Link
                  key={p.id}
                  href={`/players/${nameSlug(p.name)}/forecast`}
                  className="flex items-center gap-4 py-3 hover:bg-gray-50 transition px-2 rounded"
                >
                  <span className="w-10 text-2xl font-black tabular-nums text-right" style={{ color: T.text, fontFamily: "'Outfit', sans-serif" }}>
                    {p.overall_rank ?? '—'}
                  </span>
                  <span className="px-2 py-0.5 text-[9px] font-black rounded" style={{ background: T.navy, color: '#FFFFFF' }}>
                    {p.position}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{p.name}</div>
                    <div className="text-xs" style={{ color: T.textMuted }}>{p.school}</div>
                  </div>
                  <span className="text-xl font-black tabular-nums" style={{ color: T.navy, fontFamily: "'Outfit', sans-serif" }}>
                    {Number(p.grade || 0).toFixed(1)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <footer className="py-6 text-center text-[10px] font-mono tracking-[0.25em]" style={{ background: T.navyDeep, color: 'rgba(255,255,255,0.5)' }}>
        PER|FORM RANKINGS · STAMPED BY THE TALENT &amp; INNOVATION ENGINE
      </footer>
    </div>
  );
}
