'use client';

/**
 * /nba/playoffs — Per|Form NBA Playoffs 2026 Tracker
 * ====================================================
 * Live results + bracket on its own page (per owner directive 2026-04-21).
 *
 * Composition:
 *   - Top: brand bar + live games strip (auto-refresh ESPN scoreboard /20s)
 *   - Below: 16-team bracket (West top, East bottom, Finals center)
 *
 * Class B alongside the Draft Center on the perform-draft-2026 Cloud Run
 * service. Brand floor: black + gold (#D4A853) + orange accent (#FF6B00).
 * Bebas Neue display, Geist Mono for live data, glass morphism panels,
 * Framer Motion springs.
 *
 * Data source: ESPN public scoreboard API proxied via /api/nba/scoreboard.
 * Bracket structure derived from ESPN scoreboard payload (which carries
 * `season.type === 3` postseason rounds + series state).
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ESPNCompetitor {
  id: string;
  team: { id: string; abbreviation: string; displayName: string; shortDisplayName: string; logo: string; color?: string };
  score: string;
  homeAway: 'home' | 'away';
  records?: { type: string; summary: string }[];
  winner?: boolean;
}

interface ESPNStatus {
  type: { id: string; name: string; state: 'pre' | 'in' | 'post'; completed: boolean; description: string; detail: string; shortDetail: string };
  period: number;
  displayClock: string;
}

interface ESPNEvent {
  id: string;
  date: string;
  name: string;
  shortName: string;
  status: ESPNStatus;
  competitions: { id: string; competitors: ESPNCompetitor[]; notes?: { type: string; headline: string }[] }[];
  season?: { type: number; year: number };
}

interface ESPNScoreboard {
  events?: ESPNEvent[];
  season?: { type: number; year: number };
}

const REFRESH_MS = 20_000;

export default function NBAPlayoffsPage(): React.JSX.Element {
  const [board, setBoard] = useState<ESPNScoreboard | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const res = await fetch('/api/nba/scoreboard', { cache: 'no-store' });
        if (!res.ok) { setError(`HTTP ${res.status}`); return; }
        const data = (await res.json()) as ESPNScoreboard;
        if (cancelled) return;
        setBoard(data);
        setUpdatedAt(Date.now());
        setError(null);
      } catch {
        if (!cancelled) setError('fetch_failed');
      }
    }
    void load();
    const id = setInterval(() => void load(), REFRESH_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const events = board?.events ?? [];
  const live = events.filter(e => e.status.type.state === 'in');
  const final = events.filter(e => e.status.type.state === 'post');
  const upcoming = events.filter(e => e.status.type.state === 'pre');
  const isPostseason = (board?.season?.type ?? 0) === 3 || events.some(e => e.season?.type === 3);

  return (
    <div className="min-h-screen bg-[#05060A] text-white" style={{ fontFamily: 'var(--font-geist-sans, system-ui)' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#05060A]/85 backdrop-blur-xl">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-baseline gap-3">
            <span className="text-[#D4A853]" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '28px', letterSpacing: '0.06em' }}>
              PER|FORM
            </span>
            <span className="text-white/60 uppercase text-[11px] tracking-[0.32em]">
              NBA Playoffs {board?.season?.year ?? 2026}
            </span>
            {isPostseason && (
              <span className="text-[#FF6B00] uppercase text-[10px] tracking-[0.32em] border border-[#FF6B00]/40 bg-[#FF6B00]/[0.06] px-2 py-0.5 rounded">
                Postseason
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-[11px] text-white/55 uppercase tracking-[0.2em]" style={{ fontFamily: 'Geist Mono, monospace' }}>
            <span className={`h-1.5 w-1.5 rounded-full ${updatedAt ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'}`} />
            {updatedAt ? `Updated ${formatAge(Date.now() - updatedAt)}` : 'Connecting'}
            {error && <span className="text-red-400/80">· {error}</span>}
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-4 lg:px-6 py-6 space-y-6">
        {/* LIVE GAMES STRIP */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-[#D4A853]" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '22px', letterSpacing: '0.08em' }}>
              LIVE NOW
            </h2>
            <span className="text-[10px] text-white/40 uppercase tracking-widest" style={{ fontFamily: 'Geist Mono, monospace' }}>
              {live.length} game{live.length === 1 ? '' : 's'}
            </span>
          </div>
          {live.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md px-6 py-8 text-center text-white/40 text-sm">
              No games live right now. Next tip-off below.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <AnimatePresence initial={false}>
                {live.map(e => <GameCard key={e.id} event={e} accent="#FF6B00" />)}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* UPCOMING */}
        {upcoming.length > 0 && (
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-white" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '22px', letterSpacing: '0.08em' }}>
                UPCOMING
              </h2>
              <span className="text-[10px] text-white/40 uppercase tracking-widest" style={{ fontFamily: 'Geist Mono, monospace' }}>
                {upcoming.length} game{upcoming.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {upcoming.map(e => <GameCard key={e.id} event={e} accent="#D4A853" />)}
            </div>
          </section>
        )}

        {/* RESULTS / FINAL */}
        {final.length > 0 && (
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-white/80" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '22px', letterSpacing: '0.08em' }}>
                RESULTS
              </h2>
              <span className="text-[10px] text-white/40 uppercase tracking-widest" style={{ fontFamily: 'Geist Mono, monospace' }}>
                {final.length} final
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {final.map(e => <GameCard key={e.id} event={e} accent="#FFFFFF" />)}
            </div>
          </section>
        )}

        {/* AWARDS WATCH — live stat-based projections (Per|Form Awards Feed) */}
        <AwardsWatch finalsInProgress={events.some(e => /finals/i.test(e.competitions[0]?.notes?.find(n => n.type === 'event')?.headline ?? ''))} />

        {/* SERIES TRACKER (extracted from competition.notes when present) */}
        <SeriesTracker events={events} />
      </main>

      <footer className="px-6 py-4 text-center text-[11px] uppercase tracking-[0.32em] text-white/40">
        <span style={{ fontFamily: 'Geist Mono, monospace' }}>Per|Form · ACHIEVEMOR · NBA Playoffs Live · Data via ESPN</span>
      </footer>
    </div>
  );
}

// ── Game Card ─────────────────────────────────────────────────────────────
function GameCard({ event, accent }: { event: ESPNEvent; accent: string }): React.JSX.Element {
  const comp = event.competitions[0];
  if (!comp) return <></>;
  const home = comp.competitors.find(c => c.homeAway === 'home');
  const away = comp.competitors.find(c => c.homeAway === 'away');
  if (!home || !away) return <></>;
  const isLive = event.status.type.state === 'in';
  const isFinal = event.status.type.state === 'post';
  const seriesNote = comp.notes?.find(n => n.type === 'event');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 240, damping: 26 }}
      className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md overflow-hidden"
      style={{ boxShadow: isLive ? `0 0 18px ${accent}30` : 'none' }}
    >
      <div className="px-4 py-3 border-b border-white/5 flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-[0.28em]" style={{ fontFamily: 'Geist Mono, monospace', color: accent }}>
          {isLive ? `Q${event.status.period} · ${event.status.displayClock}` : isFinal ? 'Final' : event.status.type.shortDetail}
        </span>
        {seriesNote && (
          <span className="text-[10px] text-white/45 uppercase tracking-widest truncate max-w-[60%]" style={{ fontFamily: 'Geist Mono, monospace' }}>
            {seriesNote.headline}
          </span>
        )}
      </div>
      <div className="px-4 py-3 space-y-2">
        <TeamLine team={away} highlight={away.winner === true || (isLive && Number(away.score) > Number(home.score))} />
        <TeamLine team={home} highlight={home.winner === true || (isLive && Number(home.score) > Number(away.score))} />
      </div>
    </motion.div>
  );
}

function TeamLine({ team, highlight }: { team: ESPNCompetitor; highlight: boolean }): React.JSX.Element {
  const recordSummary = team.records?.find(r => r.type === 'total')?.summary ?? '';
  return (
    <div className="flex items-center gap-3">
      {team.team.logo ? (
        <img src={team.team.logo} alt={team.team.abbreviation} className="h-8 w-8 object-contain" />
      ) : (
        <div className="h-8 w-8 rounded-full border border-white/10 bg-white/5" />
      )}
      <div className="flex-1 min-w-0">
        <div className={`text-[14px] truncate ${highlight ? 'text-white' : 'text-white/65'}`}>
          {team.team.shortDisplayName ?? team.team.displayName}
        </div>
        {recordSummary && (
          <div className="text-[10px] text-white/35 uppercase tracking-wider" style={{ fontFamily: 'Geist Mono, monospace' }}>
            {recordSummary}
          </div>
        )}
      </div>
      <span
        className={`tabular-nums text-right ${highlight ? 'text-[#D4A853]' : 'text-white/55'}`}
        style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '28px', letterSpacing: '0.04em' }}
      >
        {team.score || '—'}
      </span>
    </div>
  );
}

// ── Series Tracker ────────────────────────────────────────────────────────
// Surfaces the series state when ESPN annotates competitions with series notes
// (e.g. "First Round, Game 4 — Knicks lead series 2-1").
function SeriesTracker({ events }: { events: ESPNEvent[] }): React.JSX.Element {
  const seriesMap = new Map<string, { headline: string; events: ESPNEvent[] }>();
  for (const e of events) {
    const note = e.competitions[0]?.notes?.find(n => n.type === 'event')?.headline;
    if (!note) continue;
    const key = note.split('—')[0]?.trim() ?? note;
    const entry = seriesMap.get(key) ?? { headline: key, events: [] };
    entry.events.push(e);
    seriesMap.set(key, entry);
  }
  if (seriesMap.size === 0) return <></>;

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-[#D4A853]" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '22px', letterSpacing: '0.08em' }}>
          SERIES
        </h2>
        <span className="text-[10px] text-white/40 uppercase tracking-widest" style={{ fontFamily: 'Geist Mono, monospace' }}>
          {seriesMap.size} active
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[...seriesMap.values()].map(s => (
          <div key={s.headline} className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md p-4">
            <div className="text-[#D4A853] uppercase text-[10px] tracking-[0.28em] mb-2" style={{ fontFamily: 'Geist Mono, monospace' }}>
              {s.headline}
            </div>
            <div className="space-y-1">
              {s.events.slice(0, 7).map(e => (
                <div key={e.id} className="text-[12px] text-white/65 truncate">
                  {e.shortName} <span className="text-white/35">· {e.status.type.shortDetail}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatAge(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

// ── Awards Watch ──────────────────────────────────────────────────────────
// Per|Form Awards Feed — live stat-based vote-share projections per season
// award. Pulls from /api/nba/awards (ESPN byathlete + standings backed).
// Oddy Paradigm glass morphism, Framer Motion springs, Bebas Neue gold header.

interface AwardCandidateUI {
  rank: number;
  playerId: string;
  name: string;
  team: string;
  position?: string;
  headshot?: string;
  statLine: string;
  projectedVoteShare: number;
  composite: number;
}

interface AwardCategoryUI {
  key: string;
  label: string;
  short: string;
  subtitle: string;
  candidates: AwardCandidateUI[];
  active: boolean;
}

interface AwardsPayloadUI {
  season: number;
  categories: AwardCategoryUI[];
  updatedAt: string;
  source: string;
}

function AwardsWatch({ finalsInProgress }: { finalsInProgress: boolean }): React.JSX.Element {
  const [awards, setAwards] = useState<AwardsPayloadUI | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const q = finalsInProgress ? '?finals=1' : '';
        const res = await fetch(`/api/nba/awards${q}`, { cache: 'no-store' });
        if (!res.ok) { setError(`HTTP ${res.status}`); return; }
        const data = (await res.json()) as AwardsPayloadUI;
        if (cancelled) return;
        setAwards(data);
        setUpdatedAt(Date.now());
        setError(null);
      } catch {
        if (!cancelled) setError('fetch_failed');
      }
    }
    void load();
    const id = setInterval(() => void load(), 90_000); // 90s — awards move slower than scoreboard
    return () => { cancelled = true; clearInterval(id); };
  }, [finalsInProgress]);

  const visible = (awards?.categories ?? []).filter(c => c.active && c.candidates.length > 0);

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-[#D4A853]" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '22px', letterSpacing: '0.08em' }}>
          AWARDS WATCH
        </h2>
        <div className="flex items-center gap-3 text-[10px] text-white/40 uppercase tracking-widest" style={{ fontFamily: 'Geist Mono, monospace' }}>
          <span>{visible.length} categor{visible.length === 1 ? 'y' : 'ies'}</span>
          {updatedAt > 0 && <span>· {formatAge(Date.now() - updatedAt)}</span>}
          {error && <span className="text-red-400/80">· {error}</span>}
        </div>
      </div>

      {!awards && !error && (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md px-6 py-8 text-center text-white/40 text-sm">
          Loading projections…
        </div>
      )}

      {visible.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {visible.map(cat => <AwardCard key={cat.key} category={cat} />)}
        </div>
      )}
    </section>
  );
}

function AwardCard({ category }: { category: AwardCategoryUI }): React.JSX.Element {
  const leader = category.candidates[0];
  const leadShare = leader ? Math.round(leader.projectedVoteShare * 100) : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 26 }}
      className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl overflow-hidden"
      style={{ boxShadow: leadShare >= 50 ? '0 0 24px rgba(255,107,0,0.18)' : 'none' }}
    >
      <div className="px-4 py-3 border-b border-white/5 flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-[#D4A853] shrink-0" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '20px', letterSpacing: '0.06em' }}>
            {category.short}
          </span>
          <span className="text-white/60 uppercase text-[10px] tracking-[0.24em] truncate" style={{ fontFamily: 'Geist Mono, monospace' }}>
            {category.label}
          </span>
        </div>
        <span className="text-[9px] text-white/35 uppercase tracking-widest shrink-0" style={{ fontFamily: 'Geist Mono, monospace' }}>
          Top {category.candidates.length}
        </span>
      </div>

      <div className="px-4 py-3 text-[10px] text-white/45 leading-snug border-b border-white/5" style={{ fontFamily: 'Geist Mono, monospace' }}>
        {category.subtitle}
      </div>

      <div className="px-2 py-2 space-y-1.5">
        <AnimatePresence initial={false}>
          {category.candidates.map(c => <CandidateRow key={c.playerId} candidate={c} />)}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function CandidateRow({ candidate }: { candidate: AwardCandidateUI }): React.JSX.Element {
  const pct = Math.max(0, Math.min(1, candidate.projectedVoteShare));
  const isLeader = candidate.rank === 1;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 240, damping: 28 }}
      className="relative rounded-xl px-3 py-2 flex items-center gap-3"
      style={{
        background: isLeader ? 'linear-gradient(90deg, rgba(255,107,0,0.08) 0%, rgba(255,107,0,0.0) 100%)' : 'transparent',
      }}
    >
      <span
        className={`tabular-nums shrink-0 w-5 text-center ${isLeader ? 'text-[#FF6B00]' : 'text-white/40'}`}
        style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '22px', letterSpacing: '0.02em' }}
      >
        {candidate.rank}
      </span>
      {candidate.headshot ? (
        <img
          src={candidate.headshot}
          alt={candidate.name}
          className="h-10 w-10 rounded-full object-cover border border-white/10 shrink-0"
          loading="lazy"
        />
      ) : (
        <div className="h-10 w-10 rounded-full border border-white/10 bg-white/5 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className={`text-[13px] truncate ${isLeader ? 'text-white' : 'text-white/75'}`}>
            {candidate.name}
          </span>
          {candidate.team && (
            <span className="text-[9px] text-white/40 uppercase tracking-[0.2em] shrink-0" style={{ fontFamily: 'Geist Mono, monospace' }}>
              {candidate.team}{candidate.position ? ` · ${candidate.position}` : ''}
            </span>
          )}
        </div>
        <div className="text-[10px] text-white/45 truncate" style={{ fontFamily: 'Geist Mono, monospace' }}>
          {candidate.statLine}
        </div>
        <div className="mt-1 h-1 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.round(pct * 100)}%` }}
            transition={{ type: 'spring', stiffness: 160, damping: 26 }}
            className="h-full rounded-full"
            style={{ background: isLeader ? '#FF6B00' : '#D4A853' }}
          />
        </div>
      </div>
      <span
        className={`tabular-nums shrink-0 text-right ${isLeader ? 'text-[#FF6B00]' : 'text-white/55'}`}
        style={{ fontFamily: 'Geist Mono, monospace', fontSize: '12px', minWidth: '38px' }}
      >
        {Math.round(pct * 100)}%
      </span>
    </motion.div>
  );
}
