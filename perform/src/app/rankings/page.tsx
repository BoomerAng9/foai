'use client';

/**
 * /rankings — Per|Form 2026 Big Board
 * ================================================================
 * Top 5 as large hero cards (one per row on mobile, featured grid on desktop).
 * Ranks 6-32 as a clean, dense, scannable list — ESPN draft board style.
 * Position group browse at the bottom.
 */

import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BackHomeNav } from '@/components/layout/BackHomeNav';
import {
  POSITION_GROUPS,
  normalizePosition,
  positionColor,
} from '@/lib/ui/positions';
import { LiveTicker } from '@/components/live/LiveTicker';
import { PlayerIndexDrawer } from '@/components/player-index/PlayerIndexDrawer';
import { AnonymousHelmet } from '@/components/cards/AnonymousHelmet';

interface Player {
  id: number;
  name: string;
  school: string;
  position: string;
  overall_rank: number | null;
  position_rank: number | null;
  grade: string | number | null;
  grade_letter?: string | null;
  tie_grade?: string | null;
  tie_tier?: string | null;
  projected_round?: number | null;
  scouting_summary?: string | null;
  strengths?: string | null;
  weaknesses?: string | null;
  nfl_comparison?: string | null;
  // Consensus ranks from perform_consensus_ranks (migration 012 + ingest-consensus-board.ts).
  // DrafTek/Yahoo/Ringer are ingested today; PFF/ESPN/NFL.com slots reserved for post-draft scrape.
  consensus_drafttek?: number | null;
  consensus_yahoo?: number | null;
  consensus_ringer?: number | null;
  consensus_avg?: number | null;
  consensus_pff?: number | null;
  consensus_espn?: number | null;
  consensus_nflcom?: number | null;
  image_url?: string | null;
}

// All surface + text tokens route through shared CSS vars so the page flips
// with the theme toggle. Brand colors (navy, red, gold) stay fixed.
const T = {
  bg:           'var(--pf-bg)',
  surface:      'var(--pf-bg-secondary)',
  surfaceAlt:   'var(--pf-surface)',
  border:       'var(--pf-divider)',
  borderStrong: 'var(--pf-surface-2)',
  text:         'var(--pf-text)',
  textMuted:    'var(--pf-text-muted)',
  textSubtle:   'var(--pf-text-subtle)',
  navy:         'var(--pf-navy)',
  navyDeep:     'var(--pf-navy-deep)',
  red:          'var(--pf-red)',
  gold:         'var(--pf-gold)',
};

// POSITION_GROUPS / normalizePosition / positionColor sourced from @/lib/ui/positions

function blurbFor(p: Player, maxLen = 180): string {
  const s = (p.scouting_summary ?? '').trim();
  if (!s) return 'Analysis pending -- consensus scouting report in progress.';
  if (s.length <= maxLen) return s;
  const slice = s.slice(0, maxLen);
  const lastDot = slice.lastIndexOf('. ');
  return (lastDot > maxLen * 0.5 ? slice.slice(0, lastDot + 1) : slice + '...').trim();
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

  const ranked = useMemo(
    () => players.filter(p => typeof p.overall_rank === 'number').sort((a, b) => (a.overall_rank ?? 999) - (b.overall_rank ?? 999)),
    [players],
  );

  const top5 = ranked.slice(0, 5);
  const rest = ranked.slice(5, 32);

  const grouped = useMemo(() => {
    const map: Record<string, Player[]> = {};
    ranked.forEach(p => {
      const g = normalizePosition(p.position);
      if (!map[g]) map[g] = [];
      map[g].push(p);
    });
    return map;
  }, [ranked]);

  return (
    <div className="min-h-screen" style={{ background: T.bg, color: T.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <PlayerIndexDrawer />
      <LiveTicker />
      {/* Nav ribbon */}
      <nav style={{ background: T.navyDeep, color: 'var(--pf-text)' }}>
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center">
            <BackHomeNav />
            <span className="opacity-70">Per|Form Rankings -- 2026 NFL Draft Class</span>
          </div>
          <Link href="/draft" className="opacity-70 hover:opacity-100 transition">Big Board</Link>
        </div>
      </nav>

      {/* ═══ TOP 5 HERO SECTION ═══ */}
      <header style={{ background: T.navyDeep, color: 'var(--pf-text)' }}>
        <div className="max-w-6xl mx-auto px-6 pt-12 pb-14">
          <div className="mb-8">
            <span className="text-xs font-bold px-2 py-1 rounded" style={{ background: T.red }}>The Top 5</span>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mt-4">Per|Form 2026</h1>
            <p className="text-sm mt-2 opacity-70 max-w-xl">
              The five prospects the industry agrees on. Graded by the Talent &amp; Innovation Engine on a 40/30/30 split.
            </p>
          </div>

          {loading ? (
            <div className="py-12 text-center">
              <div className="inline-block w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: T.gold }} />
            </div>
          ) : top5.length === 0 ? (
            <div className="py-12 text-center text-sm opacity-50">No ranked players available.</div>
          ) : (
            <div className="space-y-4">
              {top5.map((p, i) => {
                const accent = positionColor(p.position);
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                  >
                    <Link
                      href={`/draft/${encodeURIComponent(p.name)}`}
                      className="group block rounded-xl overflow-hidden transition-all hover:ring-1 hover:ring-white/20"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      <div className="grid items-center gap-6 p-5 md:p-6" style={{ gridTemplateColumns: '64px 1fr auto' }}>
                        {/* Rank */}
                        <div className="text-center">
                          <span
                            className="text-5xl font-black tabular-nums leading-none"
                            style={{ color: T.gold, fontFamily: "'Outfit', sans-serif" }}
                          >
                            {p.overall_rank}
                          </span>
                        </div>

                        {/* Identity */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-xl md:text-2xl font-black tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
                              {p.name}
                            </span>
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded"
                              style={{ background: accent, color: 'var(--pf-text)' }}
                            >
                              {normalizePosition(p.position)}
                            </span>
                          </div>
                          <div className="text-sm opacity-60">{p.school}</div>
                          <p className="text-sm leading-relaxed opacity-70 mt-2 max-w-2xl hidden md:block">
                            {blurbFor(p, 220)}
                          </p>
                          {p.nfl_comparison && (
                            <div className="text-xs opacity-50 mt-2 hidden md:block">
                              NFL Comp: {p.nfl_comparison}
                            </div>
                          )}
                        </div>

                        {/* Grade + TIE badge */}
                        <div className="text-right flex flex-col items-end gap-1">
                          <span
                            className="text-3xl md:text-4xl font-black tabular-nums leading-none"
                            style={{ color: T.gold, fontFamily: "'Outfit', sans-serif" }}
                          >
                            {Number(p.grade ?? 0).toFixed(1)}
                          </span>
                          {p.tie_tier && (
                            <span className="text-xs font-semibold opacity-50">{p.tie_tier}</span>
                          )}
                          <span
                            className="text-[9px] font-bold mt-1 px-2 py-0.5 rounded"
                            style={{ background: 'rgba(212,168,83,0.15)', color: T.gold }}
                          >
                            TIE
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </header>

      {/* ═══ RANKS 6-32 — DENSE LIST ═══ */}
      {!loading && rest.length > 0 && (
        <section style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
          <div className="max-w-6xl mx-auto px-6 py-10">
            <div className="flex items-baseline justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Ranks 6 -- 32
                </h2>
                <p className="text-sm mt-1" style={{ color: T.textMuted }}>
                  First-round consensus board
                </p>
              </div>
              <Link
                href="/draft"
                className="hidden md:inline-block text-xs font-semibold px-3 py-1.5 rounded border"
                style={{ color: T.navy, borderColor: T.border }}
              >
                Full Board
              </Link>
            </div>

            {/* Table header — 6 cols on mobile, 10 cols on md+ with consensus comparison */}
            <div
              className="hidden md:grid items-center gap-3 px-4 py-2 text-xs font-semibold rounded-t-lg grid-cols-[40px_1fr_60px_100px_60px_45px_50px_50px_50px_55px]"
              style={{ background: T.surfaceAlt, color: T.textMuted, borderBottom: `1px solid ${T.border}` }}
            >
              <span>Rank</span>
              <span>Player</span>
              <span>Pos</span>
              <span>School</span>
              <span className="text-right">Grade</span>
              <span className="text-right">Rd</span>
              <span className="text-right" title="DrafTek consensus rank">DrafTek</span>
              <span className="text-right" title="Yahoo Sports (Charles McDonald) consensus rank">Yahoo</span>
              <span className="text-right" title="The Ringer (Danny Kelly) consensus rank">Ringer</span>
              <span className="text-right" title="Per|Form vs consensus delta">&Delta;</span>
            </div>

            {/* Rows */}
            <div className="divide-y" style={{ borderColor: T.border }}>
              {rest.map((p, i) => {
                const accent = positionColor(p.position);
                const perfRank = p.overall_rank ?? 9999;
                const avg = p.consensus_avg ?? null;
                const delta = avg != null ? avg - perfRank : null;
                const deltaColor = delta == null ? T.textSubtle : delta > 0 ? '#16A34A' : delta < 0 ? T.red : T.textSubtle;
                const deltaText = delta == null ? '—' : delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '0';
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.2, delay: Math.min(i * 0.015, 0.3) }}
                  >
                    <Link
                      href={`/draft/${encodeURIComponent(p.name)}`}
                      className="group grid items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 grid-cols-[48px_1fr_80px_120px_80px_60px] md:grid-cols-[40px_1fr_60px_100px_60px_45px_50px_50px_50px_55px]"
                    >
                      {/* Rank */}
                      <span className="text-lg font-black tabular-nums" style={{ color: T.text, fontFamily: "'Outfit', sans-serif" }}>
                        {p.overall_rank}
                      </span>

                      {/* Name */}
                      <span className="font-bold truncate group-hover:underline" style={{ color: T.text }}>
                        {p.name}
                      </span>

                      {/* Position chip */}
                      <span>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded"
                          style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}30` }}
                        >
                          {normalizePosition(p.position)}
                        </span>
                      </span>

                      {/* School */}
                      <span className="text-sm truncate" style={{ color: T.textMuted }}>
                        {p.school}
                      </span>

                      {/* Grade */}
                      <span className="text-right text-lg font-black tabular-nums" style={{ color: T.navy, fontFamily: "'Outfit', sans-serif" }}>
                        {Number(p.grade ?? 0).toFixed(1)}
                      </span>

                      {/* Round */}
                      <span className="text-right text-sm" style={{ color: T.textSubtle }}>
                        {p.projected_round ? `R${p.projected_round}` : '--'}
                      </span>

                      {/* DrafTek — desktop only */}
                      <span className="hidden md:inline text-right text-sm tabular-nums" style={{ color: T.textMuted }}>
                        {p.consensus_drafttek != null ? `#${p.consensus_drafttek}` : '—'}
                      </span>

                      {/* Yahoo — desktop only */}
                      <span className="hidden md:inline text-right text-sm tabular-nums" style={{ color: T.textMuted }}>
                        {p.consensus_yahoo != null ? `#${p.consensus_yahoo}` : '—'}
                      </span>

                      {/* Ringer — desktop only */}
                      <span className="hidden md:inline text-right text-sm tabular-nums" style={{ color: T.textMuted }}>
                        {p.consensus_ringer != null ? `#${p.consensus_ringer}` : '—'}
                      </span>

                      {/* Delta — desktop only. Positive = Per|Form saw him earlier than consensus. */}
                      <span
                        className="hidden md:inline text-right text-xs font-bold tabular-nums"
                        style={{ color: deltaColor }}
                        title="Per|Form rank − consensus avg rank (positive = Per|Form ahead)"
                      >
                        {deltaText}
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Browse by position — face card per position group */}
      {!loading && (
        <section style={{ background: T.bg }}>
          <div className="max-w-6xl mx-auto px-6 py-10">
            <h3 className="text-lg font-bold mb-1">Browse by Position</h3>
            <p className="text-xs mb-6" style={{ color: T.textMuted }}>
              The #1 prospect at each position is the face of its card.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {POSITION_GROUPS.map(({ key, label, color }) => {
                const groupPlayers = grouped[key] || [];
                const topPlayer = groupPlayers[0];
                const isPrime = topPlayer && Number(topPlayer.grade ?? 0) >= 101;
                return (
                  <Link
                    key={key}
                    href={`/rankings/${key}`}
                    className="group block rounded-lg p-4 transition-all hover:-translate-y-0.5"
                    style={{
                      background: T.surface,
                      border: `1px solid ${T.border}`,
                      borderLeft: `3px solid ${color}`,
                      minHeight: 200,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                    }}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <span className="text-lg font-black" style={{ color, fontFamily: "'Outfit', sans-serif" }}>{key}</span>
                      <span className="text-xs" style={{ color: T.textSubtle }}>{groupPlayers.length}</span>
                    </div>

                    {/* Face card — AnonymousHelmet of the #1 player at this position */}
                    {topPlayer ? (
                      <>
                        <AnonymousHelmet
                          accentColor={color}
                          size={80}
                          crown={isPrime}
                          jerseyNumber={null}
                          label={undefined}
                          allowImage={!!topPlayer.image_url}
                          imageUrl={topPlayer.image_url}
                        />
                        <div className="mt-3 w-full">
                          <div className="text-[11px] font-bold uppercase tracking-wider truncate" style={{ color: T.text }}>
                            #{topPlayer.overall_rank} {topPlayer.name}
                          </div>
                          <div className="text-[10px] font-mono mt-0.5 truncate" style={{ color: T.textSubtle }}>
                            {topPlayer.school}
                          </div>
                          {topPlayer.tie_tier && (
                            <div className="inline-flex items-center mt-2 px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider" style={{ background: `${color}15`, color }}>
                              {topPlayer.tie_tier.replace('_PLUS', '+').replace('_MINUS', '-')}
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-[11px]" style={{ color: T.textSubtle }}>
                        {label}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <footer className="py-5 text-center text-xs" style={{ background: T.navyDeep, color: 'rgba(255,255,255,0.4)' }}>
        Per|Form Rankings -- Stamped by the Talent &amp; Innovation Engine
      </footer>
    </div>
  );
}
