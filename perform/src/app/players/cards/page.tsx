'use client';

/**
 * /players/cards — Position Card Gallery
 * =========================================
 * One "position card" per football position. The top player (#1 at the
 * position) leads; a cycler below walks through every other player at
 * that position. Grade + tier + NFL comp + height/weight + school
 * surface on the card face.
 */

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getGradeForScore } from '@/lib/tie/grades';
import { positionColor, normalizePosition } from '@/lib/ui/positions';

interface Player {
  id: number;
  name: string;
  school: string;
  position: string;
  overall_rank: number | null;
  position_rank: number | null;
  grade: string | number | null;
  tie_grade: string | null;
  tie_tier: string | null;
  projected_round: number | null;
  nfl_comparison: string | null;
  height?: string | null;
  weight?: number | null;
  attribute_badges?: string[] | null;
  prime_sub_tags?: string[] | null;
  versatility_flex?: string | null;
}

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'OT', 'OG', 'C', 'EDGE', 'DL', 'LB', 'CB', 'S'] as const;

function formatHeight(h?: string | null): string {
  if (!h) return '—';
  // beast format "6052" = 6'5" + 2/8 frac (or 6'5.2")
  const n = parseInt(h, 10);
  if (!Number.isFinite(n)) return h;
  if (h.length === 4) {
    const ft = Math.floor(n / 1000);
    const inch = Math.floor((n % 1000) / 10);
    const frac = n % 10;
    return frac > 0 ? `${ft}'${inch} ${frac}/8"` : `${ft}'${inch}"`;
  }
  return h;
}

function formatWeight(w?: number | null): string {
  if (w == null || w <= 0) return '—';
  return `${w} lbs`;
}

export default function PositionCardsPage(): React.JSX.Element {
  const [players, setPlayers] = useState<Player[]>([]);
  const [activePos, setActivePos] = useState<string>('QB');
  const [cycleIdx, setCycleIdx] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/players?limit=500&sort=overall_rank:asc&sport=football')
      .then(r => r.json())
      .then(j => {
        setPlayers(j.players || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const byPosition = useMemo(() => {
    const map: Record<string, Player[]> = {};
    for (const p of players) {
      const pos = normalizePosition(p.position);
      if (!map[pos]) map[pos] = [];
      map[pos].push(p);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (a.position_rank ?? 999) - (b.position_rank ?? 999));
    }
    return map;
  }, [players]);

  useEffect(() => { setCycleIdx(0); }, [activePos]);

  const roster = byPosition[activePos] ?? [];
  const current = roster[cycleIdx] ?? null;
  const accent = positionColor(activePos);

  return (
    <div className="min-h-screen bg-[#05060A] text-white" style={{ fontFamily: 'var(--font-geist-sans, system-ui)' }}>
      <Header />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <div className="mb-6">
          <div className="text-[10px] font-mono tracking-[0.25em] uppercase text-white/30 mb-2">Per|Form Cards</div>
          <h1 className="font-outfit text-3xl md:text-5xl font-extrabold tracking-tight" style={{ color: 'var(--pf-text)' }}>
            Position Cards
          </h1>
          <p className="text-white/55 mt-2 text-[13px]">
            Top player at each position — cycle through the full stack in order.
          </p>
        </div>

        {/* Position tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {POSITIONS.map(pos => {
            const isActive = pos === activePos;
            const count = byPosition[pos]?.length ?? 0;
            const posColor = positionColor(pos);
            return (
              <button
                key={pos}
                onClick={() => setActivePos(pos)}
                className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider uppercase transition-all"
                style={{
                  background: isActive ? `${posColor}22` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isActive ? posColor : 'rgba(255,255,255,0.06)'}`,
                  color: isActive ? posColor : 'rgba(255,255,255,0.55)',
                }}
              >
                {pos} <span className="opacity-50">· {count}</span>
              </button>
            );
          })}
        </div>

        {loading && <div className="py-24 text-center text-sm font-mono text-white/30 animate-pulse">LOADING CARDS...</div>}

        {!loading && current && (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activePos}:${current.id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 220, damping: 26 }}
              className="relative rounded-2xl overflow-hidden backdrop-blur-xl"
              style={{
                border: `1px solid ${accent}55`,
                background: `linear-gradient(135deg, ${accent}18 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.01) 100%)`,
                boxShadow: `0 0 48px ${accent}22`,
              }}
            >
              <div
                className="absolute top-0 left-0 right-0"
                style={{
                  height: '2px',
                  background: `linear-gradient(90deg, transparent 0%, ${accent} 20%, ${accent} 80%, transparent 100%)`,
                }}
              />
              <div className="grid md:grid-cols-[auto_1fr_auto] gap-6 p-6 md:p-8 items-center">
                <CyclerButton
                  dir="prev"
                  disabled={cycleIdx === 0}
                  onClick={() => setCycleIdx(i => Math.max(0, i - 1))}
                  accent={accent}
                />
                <PositionCardFace player={current} accent={accent} activePos={activePos} />
                <CyclerButton
                  dir="next"
                  disabled={cycleIdx >= roster.length - 1}
                  onClick={() => setCycleIdx(i => Math.min(roster.length - 1, i + 1))}
                  accent={accent}
                />
              </div>

              {/* Cycler progress / jump dropdown */}
              <div className="border-t border-white/5 px-6 py-3 flex items-center gap-4 bg-black/20">
                <span className="text-[10px] font-mono tracking-widest uppercase text-white/40">
                  {cycleIdx + 1} of {roster.length} · {activePos}
                </span>
                <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${((cycleIdx + 1) / Math.max(1, roster.length)) * 100}%`, background: accent, opacity: 0.65 }} />
                </div>
                <select
                  value={cycleIdx}
                  onChange={e => setCycleIdx(parseInt(e.target.value, 10))}
                  className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[11px] font-mono text-white/75 outline-none"
                >
                  {roster.map((p, i) => (
                    <option key={p.id} value={i}>#{p.position_rank ?? '—'} · {p.name} ({p.school})</option>
                  ))}
                </select>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {!loading && !current && (
          <div className="py-24 text-center text-sm font-mono text-white/30">No players at {activePos} yet.</div>
        )}
      </main>

      <Footer />
    </div>
  );
}

function CyclerButton({ dir, disabled, onClick, accent }: { dir: 'prev' | 'next'; disabled: boolean; onClick: () => void; accent: string }): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="shrink-0 hidden md:inline-flex items-center justify-center rounded-full transition-all hover:scale-110 disabled:opacity-20 disabled:cursor-not-allowed"
      style={{
        width: 44, height: 44,
        background: `${accent}18`,
        border: `1px solid ${accent}55`,
        color: accent,
      }}
      aria-label={dir === 'prev' ? 'Previous player' : 'Next player'}
    >
      {dir === 'prev' ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
    </button>
  );
}

function PositionCardFace({ player, accent, activePos }: { player: Player; accent: string; activePos: string }): React.JSX.Element {
  const gradeNum = player.grade ? parseFloat(String(player.grade)) : 0;
  const gradeInfo = Number.isFinite(gradeNum) && gradeNum > 0 ? getGradeForScore(gradeNum) : null;
  const tier = player.tie_tier ?? 'C';
  const isPrime = tier === 'PRIME';
  const hofBadges = (player.attribute_badges ?? []).filter(b => b.endsWith('_hof')).length;
  const totalBadges = player.attribute_badges?.length ?? 0;

  return (
    <div className="min-w-0">
      <div className="flex items-baseline gap-3 mb-2 flex-wrap">
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full"
          style={{
            fontFamily: 'Geist Mono, monospace',
            fontSize: '10px',
            letterSpacing: '0.2em',
            background: `${accent}22`,
            color: accent,
            border: `1px solid ${accent}55`,
            textTransform: 'uppercase',
          }}
        >
          #{player.position_rank ?? '—'} {activePos}
        </span>
        {isPrime && (
          <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: '#F4D47A' }}>
            PRIME 🛸
          </span>
        )}
      </div>

      <h2
        className="font-outfit font-extrabold tracking-tight mb-1"
        style={{ color: accent, fontSize: 'clamp(36px, 5vw, 56px)', lineHeight: 1.02 }}
      >
        {player.name}
      </h2>
      <div className="flex items-baseline gap-3 mb-4 text-white/65 text-sm font-mono uppercase tracking-widest">
        <span>{player.position}</span>
        <span>·</span>
        <span>{player.school}</span>
        {player.projected_round && (
          <>
            <span>·</span>
            <span>R{player.projected_round}</span>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Overall" value={`#${player.overall_rank ?? '—'}`} accent={accent} />
        <Stat
          label="Grade"
          value={gradeInfo ? `${gradeNum.toFixed(1)} ${gradeInfo.grade}` : '—'}
          accent={gradeInfo?.badgeColor ?? accent}
        />
        <Stat label="Height" value={formatHeight(player.height)} accent={accent} />
        <Stat label="Weight" value={formatWeight(player.weight)} accent={accent} />
      </div>

      {totalBadges > 0 && (
        <div className="mt-4 text-[11px] font-mono tracking-widest uppercase text-white/50">
          {totalBadges} badges · {hofBadges} HOF
          {player.versatility_flex && player.versatility_flex !== 'none' && (
            <span className="ml-3" style={{ color: '#93C5FD' }}>+ {player.versatility_flex.replace('_', '-')}</span>
          )}
        </div>
      )}
      {player.nfl_comparison && (
        <div className="mt-2 text-[11px] font-mono uppercase tracking-widest text-white/45">
          NFL Comp · <span className="text-white/75">{player.nfl_comparison}</span>
        </div>
      )}

      <div className="mt-4 flex gap-3 flex-wrap">
        <Link
          href={`/draft/${encodeURIComponent(player.name)}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-wider uppercase transition-all hover:scale-[1.02]"
          style={{ background: accent, color: '#0A0A0F', boxShadow: `0 0 18px ${accent}44` }}
        >
          Full Profile
        </Link>
        <Link
          href="/draft/center"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-wider uppercase transition-colors"
          style={{ background: `${accent}15`, border: `1px solid ${accent}40`, color: accent }}
        >
          Draft Center
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }): React.JSX.Element {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div className="text-[10px] uppercase tracking-widest text-white/40" style={{ fontFamily: 'Geist Mono, monospace' }}>{label}</div>
      <div className="mt-0.5 font-outfit font-extrabold tabular-nums" style={{ color: accent, fontSize: 18 }}>{value}</div>
    </div>
  );
}
