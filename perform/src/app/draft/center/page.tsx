'use client';

/**
 * /draft/center — Per|Form Draft Center 2026
 * ============================================
 * The live broadcast surface for the 2026 NFL Draft (April 23-25, Pittsburgh).
 *
 * Composition:
 *   ┌────────────────────────────────────────────────────────────┐
 *   │  Top: <LiveTicker> (existing, SSE-subscribed)              │
 *   ├──────────────────┬──────────────────────────┬──────────────┤
 *   │  LEFT RAIL       │  CENTER STAGE            │  RIGHT RAIL  │
 *   │  Big board top   │  Current pick hero       │  Analyst     │
 *   │  ranked list,    │  + Per|Form auto-grade   │  commentary  │
 *   │  PRIME→C tier    │  (Managed Agents)        │  stream      │
 *   │  glow            │                          │  (6 voices)  │
 *   └──────────────────┴──────────────────────────┴──────────────┘
 *
 * Class B per perform/docs/ARCHITECTURE_2026_04_21.md. Hosted on the
 * `perform-draft-2026` Cloud Run service (not on the VPS).
 *
 * Brand floor: black + gold (#D4A853) + orange accent (#FF6B00). Glass
 * morphism, Framer Motion spring physics, Bebas Neue display, Geist Mono
 * ticker numbers. No corporate blandness.
 */

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LiveTicker } from '@/components/live/LiveTicker';

interface SnapshotPlayer {
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
  drafted_by_team: string | null;
  drafted_pick_number: number | null;
}

interface PickEvent {
  type: 'pick';
  player_id: number;
  player_name: string;
  position: string | null;
  school: string | null;
  drafted_by_team: string;
  pick_number: number;
  round: number | null;
  ts: number;
}

interface AnalystLine {
  id: string;
  pickNumber: number;
  analyst: string;
  body: string;
  ts: number;
}

const TIER_GLOW: Record<string, string> = {
  PRIME:    '0 0 24px rgba(212,168,83,0.55), 0 0 4px rgba(255,107,0,0.85)',
  A_PLUS:   '0 0 18px rgba(212,168,83,0.45)',
  A:        '0 0 14px rgba(212,168,83,0.30)',
  A_MINUS:  '0 0 10px rgba(212,168,83,0.20)',
  B_PLUS:   '0 0 8px  rgba(120,160,255,0.25)',
  B:        '0 0 6px  rgba(120,160,255,0.18)',
  B_MINUS:  '0 0 4px  rgba(120,160,255,0.12)',
  C_PLUS:   '0 0 3px  rgba(160,160,160,0.18)',
  C:        '0 0 2px  rgba(160,160,160,0.10)',
};

const TIER_LABEL: Record<string, string> = {
  PRIME: 'PRIME', A_PLUS: 'A+', A: 'A', A_MINUS: 'A-',
  B_PLUS: 'B+', B: 'B', B_MINUS: 'B-', C_PLUS: 'C+', C: 'C',
};

export default function DraftCenterPage(): React.JSX.Element {
  const [board, setBoard] = useState<SnapshotPlayer[]>([]);
  const [latestPick, setLatestPick] = useState<PickEvent | null>(null);
  const [pickHistory, setPickHistory] = useState<PickEvent[]>([]);
  const [analystLines, setAnalystLines] = useState<AnalystLine[]>([]);
  const [connected, setConnected] = useState(false);
  const evtRef = useRef<EventSource | null>(null);
  const analystSeqRef = useRef(0);

  useEffect(() => {
    const es = new EventSource('/api/rankings/stream');
    evtRef.current = es;

    es.addEventListener('snapshot', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { players?: SnapshotPlayer[] };
        if (data.players) setBoard(data.players);
      } catch { /* ignore parse error */ }
    });

    es.addEventListener('pick', (e: MessageEvent) => {
      try {
        const pick = JSON.parse(e.data) as PickEvent;
        setLatestPick(pick);
        setPickHistory(h => [pick, ...h].slice(0, 50));
        // Fire-and-forget Managed Agents commentary fetch
        void fetch(`/api/draft/center/commentary?pick=${pick.pick_number}&player_id=${pick.player_id}`)
          .then(r => r.ok ? r.json() : null)
          .then((commentary: { lines?: { analyst: string; body: string }[] } | null) => {
            if (!commentary?.lines) return;
            const ts = Date.now();
            const newLines: AnalystLine[] = commentary.lines.map((l, i) => ({
              id: `ana-${ts}-${analystSeqRef.current++}-${i}`,
              pickNumber: pick.pick_number,
              analyst: l.analyst,
              body: l.body,
              ts: ts + i * 80,
            }));
            setAnalystLines(prev => [...newLines, ...prev].slice(0, 80));
          })
          .catch(() => { /* commentary failure does not block live ticker */ });
      } catch { /* ignore parse error */ }
    });

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    return () => { es.close(); evtRef.current = null; };
  }, []);

  return (
    <div className="min-h-screen bg-[#05060A] text-white" style={{ fontFamily: 'var(--font-geist-sans, system-ui)' }}>
      {/* Top brand bar + LiveTicker */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#05060A]/85 backdrop-blur-xl">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-baseline gap-3">
            <span className="text-[#D4A853]" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '28px', letterSpacing: '0.06em' }}>
              PER|FORM
            </span>
            <span className="text-white/60 uppercase text-[11px] tracking-[0.32em]">Draft Center 2026</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-white/55 uppercase tracking-[0.2em]" style={{ fontFamily: 'Geist Mono, monospace' }}>
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'}`} />
            {connected ? 'Live' : 'Connecting'}
          </div>
        </div>
        <LiveTicker />
      </header>

      {/* Main 3-column grid */}
      <main className="grid grid-cols-12 gap-4 p-4 lg:p-6 max-w-[1800px] mx-auto">
        {/* LEFT RAIL — Big Board */}
        <aside className="col-span-12 lg:col-span-3 order-2 lg:order-1">
          <BoardPanel board={board} />
        </aside>

        {/* CENTER STAGE — Current pick hero */}
        <section className="col-span-12 lg:col-span-6 order-1 lg:order-2 min-h-[60vh]">
          <CenterStage pick={latestPick} pickHistory={pickHistory} board={board} />
        </section>

        {/* RIGHT RAIL — Analyst commentary stream */}
        <aside className="col-span-12 lg:col-span-3 order-3">
          <AnalystStream lines={analystLines} />
        </aside>
      </main>

      <footer className="px-6 py-4 text-center text-[11px] uppercase tracking-[0.32em] text-white/40">
        <span style={{ fontFamily: 'Geist Mono, monospace' }}>Per|Form · ACHIEVEMOR · 2026 NFL Draft Live</span>
      </footer>
    </div>
  );
}

// ── Board Panel — left rail ───────────────────────────────────────────────
function BoardPanel({ board }: { board: SnapshotPlayer[] }): React.JSX.Element {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md overflow-hidden">
      <div className="flex items-baseline justify-between px-4 py-3 border-b border-white/5">
        <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '20px', letterSpacing: '0.08em' }} className="text-[#D4A853]">
          BIG BOARD
        </span>
        <span className="text-[10px] text-white/40 uppercase tracking-widest" style={{ fontFamily: 'Geist Mono, monospace' }}>
          Top {Math.min(board.length, 100)}
        </span>
      </div>
      <div className="max-h-[78vh] overflow-y-auto">
        {board.slice(0, 100).map((p) => {
          const tier = p.tie_tier ?? 'C';
          const drafted = !!p.drafted_by_team;
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: drafted ? 0.35 : 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 240, damping: 28 }}
              className="flex items-center gap-3 px-4 py-2 border-b border-white/[0.03] hover:bg-white/[0.04] transition-colors"
              style={{ boxShadow: drafted ? 'none' : TIER_GLOW[tier] }}
            >
              <span
                className="w-9 text-right text-[#D4A853] tabular-nums"
                style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '20px' }}
              >
                {p.overall_rank ?? '—'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-white truncate">
                  {drafted && <span className="text-emerald-400 mr-1">✓</span>}
                  {p.name}
                </div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider truncate" style={{ fontFamily: 'Geist Mono, monospace' }}>
                  {p.position} · {p.school}
                </div>
              </div>
              <span
                className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider"
                style={{
                  background: 'rgba(212,168,83,0.12)',
                  color: '#D4A853',
                  fontFamily: 'Geist Mono, monospace',
                  border: '1px solid rgba(212,168,83,0.2)',
                }}
              >
                {TIER_LABEL[tier] ?? tier}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── Center Stage — current pick hero ──────────────────────────────────────
function CenterStage({
  pick, pickHistory, board,
}: { pick: PickEvent | null; pickHistory: PickEvent[]; board: SnapshotPlayer[] }): React.JSX.Element {
  const player = pick ? board.find(b => b.id === pick.player_id) : null;
  const tier = player?.tie_tier ?? 'A_PLUS';
  return (
    <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-[#0A0B12] via-[#080910] to-[#05060A] backdrop-blur-md overflow-hidden h-full">
      <div className="px-6 py-4 border-b border-white/5 flex items-baseline justify-between">
        <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '22px', letterSpacing: '0.08em' }} className="text-white">
          ON THE CLOCK
        </span>
        <span className="text-[10px] text-white/40 uppercase tracking-[0.32em]" style={{ fontFamily: 'Geist Mono, monospace' }}>
          NFL Draft 2026 · Pittsburgh
        </span>
      </div>

      <div className="px-8 pt-10 pb-12 min-h-[44vh] flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {pick ? (
            <motion.div
              key={pick.pick_number}
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 220, damping: 26 }}
              className="text-center w-full max-w-2xl"
              style={{ filter: `drop-shadow(${TIER_GLOW[tier] ?? TIER_GLOW.A_PLUS})` }}
            >
              <div className="text-[#FF6B00] uppercase text-[11px] tracking-[0.4em] mb-3" style={{ fontFamily: 'Geist Mono, monospace' }}>
                Pick #{pick.pick_number}{pick.round ? ` · Round ${pick.round}` : ''}
              </div>
              <div className="text-white" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(48px, 8vw, 88px)', lineHeight: 0.95, letterSpacing: '0.02em' }}>
                {pick.player_name}
              </div>
              <div className="mt-3 text-white/70 text-lg">
                <span className="text-[#D4A853]">{pick.position ?? '—'}</span>
                <span className="text-white/30 mx-3">·</span>
                <span>{pick.school ?? ''}</span>
              </div>
              <div className="mt-6 inline-flex items-baseline gap-3 px-5 py-2 rounded-full border border-[#D4A853]/30 bg-[#D4A853]/[0.06]">
                <span className="text-[10px] uppercase tracking-[0.32em] text-white/50" style={{ fontFamily: 'Geist Mono, monospace' }}>
                  Drafted by
                </span>
                <span className="text-white text-base" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '24px', letterSpacing: '0.08em' }}>
                  {pick.drafted_by_team}
                </span>
              </div>
              {player && (
                <div className="mt-8 grid grid-cols-3 gap-3 text-left">
                  <Stat label="TIE Grade"   value={String(player.grade ?? '—')} accent="#D4A853" />
                  <Stat label="Tier"        value={TIER_LABEL[tier] ?? tier} accent="#FF6B00" />
                  <Stat label="Board Rank"  value={`#${player.overall_rank ?? '—'}`} accent="#FFFFFF" />
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <div className="text-white/30 uppercase text-[11px] tracking-[0.4em] mb-4" style={{ fontFamily: 'Geist Mono, monospace' }}>
                Waiting for first pick
              </div>
              <div className="text-white/60" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '64px', letterSpacing: '0.04em' }}>
                THE STAGE IS SET
              </div>
              <div className="mt-3 text-white/40 text-sm">
                NFL Draft 2026 · Live broadcast layer · Per|Form
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {pickHistory.length > 0 && (
        <div className="px-6 py-3 border-t border-white/5 max-h-32 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-[0.32em] text-white/40 mb-2" style={{ fontFamily: 'Geist Mono, monospace' }}>
            Recent picks
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {pickHistory.slice(0, 8).map(p => (
              <div key={`${p.pick_number}-${p.ts}`} className="text-[12px] text-white/65 border border-white/5 rounded px-2 py-1 truncate">
                <span className="text-[#D4A853] mr-1">#{p.pick_number}</span>
                {p.drafted_by_team} → {p.player_name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }): React.JSX.Element {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-md px-3 py-2">
      <div className="text-[9px] uppercase tracking-[0.28em] text-white/40 mb-1" style={{ fontFamily: 'Geist Mono, monospace' }}>
        {label}
      </div>
      <div className="text-white" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '24px', color: accent, letterSpacing: '0.04em' }}>
        {value}
      </div>
    </div>
  );
}

// ── Analyst Stream — right rail ───────────────────────────────────────────
function AnalystStream({ lines }: { lines: AnalystLine[] }): React.JSX.Element {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md overflow-hidden">
      <div className="flex items-baseline justify-between px-4 py-3 border-b border-white/5">
        <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '20px', letterSpacing: '0.08em' }} className="text-[#FF6B00]">
          ANALYSTS
        </span>
        <span className="text-[10px] text-white/40 uppercase tracking-widest" style={{ fontFamily: 'Geist Mono, monospace' }}>
          6 Live
        </span>
      </div>
      <div className="max-h-[78vh] overflow-y-auto p-3 space-y-2">
        <AnimatePresence initial={false}>
          {lines.length === 0 ? (
            <div className="text-white/30 text-[12px] italic px-2 py-6 text-center">
              Commentary will stream here as picks land.
            </div>
          ) : (
            lines.map(l => (
              <motion.div
                key={l.id}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 240, damping: 26 }}
                className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2"
              >
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-[#D4A853] uppercase text-[10px] tracking-[0.24em]" style={{ fontFamily: 'Geist Mono, monospace' }}>
                    {l.analyst}
                  </span>
                  <span className="text-white/35 text-[10px] tabular-nums" style={{ fontFamily: 'Geist Mono, monospace' }}>
                    #{l.pickNumber}
                  </span>
                </div>
                <div className="text-white/85 text-[13px] leading-snug">
                  {l.body}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
