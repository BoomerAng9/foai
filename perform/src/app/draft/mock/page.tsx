'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getGradeColor } from '@/lib/tie/grades';
import { NFL_TEAM_COLORS } from '@/lib/design/tokens';

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const staggerItem = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

interface DraftPick {
  overall: number;
  round: number;
  pickInRound: number;
  teamName: string;
  teamAbbrev: string;
  playerName: string;
  position: string;
  school: string;
  tieScore: number;
  rationale: string;
}

function scoreColor(score: number): string {
  return getGradeColor(score);
}

type DraftMode = 'consensus' | 'perform';

export default function MockDraftPage() {
  const [rounds, setRounds] = useState(3);
  const [mode, setMode] = useState<DraftMode>('perform');
  const [picks, setPicks] = useState<DraftPick[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [collapsedRounds, setCollapsedRounds] = useState<Set<number>>(new Set());

  async function runSimulation() {
    setLoading(true);
    setError('');
    setPicks([]);
    setCollapsedRounds(new Set());

    try {
      const res = await fetch('/api/tie/mock-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rounds, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setPicks(data.picks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed');
    } finally {
      setLoading(false);
    }
  }

  function toggleRound(round: number) {
    setCollapsedRounds(prev => {
      const next = new Set(prev);
      if (next.has(round)) next.delete(round);
      else next.add(round);
      return next;
    });
  }

  // Group picks by round
  const byRound: Record<number, DraftPick[]> = {};
  for (const p of picks) {
    if (!byRound[p.round]) byRound[p.round] = [];
    byRound[p.round].push(p);
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0F', color: '#fff' }}>
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-widest text-center mb-1" style={{ color: '#D4A853' }}>
          MOCK DRAFT SIMULATOR
        </h1>
        <p className="text-center text-xs text-white/30 font-mono mb-6">
          TIE-POWERED DRAFT ENGINE
        </p>

        {/* Mode Toggle */}
        <div className="flex items-center justify-center gap-1 mb-8">
          <button
            onClick={() => setMode('consensus')}
            className="px-5 py-2.5 text-xs font-mono font-bold tracking-wider rounded-l-lg transition-all duration-200"
            style={{
              background: mode === 'consensus' ? 'rgba(212,168,83,0.18)' : 'rgba(255,255,255,0.03)',
              color: mode === 'consensus' ? '#D4A853' : 'rgba(255,255,255,0.35)',
              border: mode === 'consensus' ? '1px solid rgba(212,168,83,0.5)' : '1px solid rgba(255,255,255,0.08)',
              boxShadow: mode === 'consensus' ? '0 0 16px rgba(212,168,83,0.15)' : 'none',
            }}
          >
            CONSENSUS
          </button>
          <button
            onClick={() => setMode('perform')}
            className="px-5 py-2.5 text-xs font-mono font-bold tracking-wider rounded-r-lg transition-all duration-200"
            style={{
              background: mode === 'perform' ? 'rgba(212,168,83,0.18)' : 'rgba(255,255,255,0.03)',
              color: mode === 'perform' ? '#D4A853' : 'rgba(255,255,255,0.35)',
              border: mode === 'perform' ? '1px solid rgba(212,168,83,0.5)' : '1px solid rgba(255,255,255,0.08)',
              boxShadow: mode === 'perform' ? '0 0 16px rgba(212,168,83,0.15)' : 'none',
            }}
          >
            PER|FORM TAKE
          </button>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <div className="flex items-center gap-2">
            <label className="text-xs font-mono text-white/50">ROUNDS:</label>
            <select
              value={rounds}
              onChange={e => setRounds(Number(e.target.value))}
              className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-[#D4A853]/50"
            >
              {[1, 2, 3, 4, 5, 6, 7].map(r => (
                <option key={r} value={r} className="bg-[#0A0A0F]">{r}</option>
              ))}
            </select>
          </div>

          <button
            onClick={runSimulation}
            disabled={loading}
            className="px-6 py-2 rounded font-mono text-sm font-bold tracking-wider transition-all disabled:opacity-40"
            style={{
              background: loading ? 'rgba(212,168,83,0.2)' : 'rgba(212,168,83,0.15)',
              color: '#D4A853',
              border: '1px solid rgba(212,168,83,0.3)',
            }}
          >
            {loading ? 'SIMULATING...' : 'RUN SIMULATION'}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-2 border-[#D4A853]/30 border-t-[#D4A853] rounded-full animate-spin" />
            <p className="text-xs font-mono text-white/30 mt-3">RUNNING DRAFT ENGINE...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-4">
            <p className="text-sm font-mono text-red-400">{error}</p>
          </div>
        )}

        {/* Results */}
        {!loading && picks.length > 0 && (
          <div className="space-y-4">
            {Object.entries(byRound).map(([roundStr, roundPicks]) => {
              const round = Number(roundStr);
              const collapsed = collapsedRounds.has(round);
              return (
                <div key={round}>
                  {/* Round header */}
                  <button
                    onClick={() => toggleRound(round)}
                    className="w-full flex items-center gap-3 py-2 px-3 rounded transition-colors hover:bg-white/5"
                    style={{ borderBottom: '1px solid rgba(212,168,83,0.2)' }}
                  >
                    <span className="text-[10px] font-mono text-white/30">
                      {collapsed ? '\u25B6' : '\u25BC'}
                    </span>
                    <span className="text-sm font-mono font-bold tracking-wider" style={{ color: '#D4A853' }}>
                      ROUND {round}
                    </span>
                    <span className="text-[10px] font-mono text-white/20">
                      {roundPicks.length} PICKS
                    </span>
                  </button>

                  {/* Picks */}
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.div
                        className="mt-2 space-y-1"
                        variants={staggerContainer}
                        initial="hidden"
                        animate="show"
                        exit={{ opacity: 0, transition: { duration: 0.15 } }}
                      >
                        {roundPicks.map(pick => {
                          const teamColor = NFL_TEAM_COLORS[pick.teamAbbrev] || scoreColor(pick.tieScore);
                          return (
                            <motion.div
                              key={pick.overall}
                              variants={staggerItem}
                              className="flex items-center gap-3 px-3 py-2 rounded transition-colors hover:bg-white/5"
                              style={{ borderLeft: `3px solid ${teamColor}` }}
                            >
                              {/* Pick # */}
                              <span className="text-[10px] font-mono text-white/30 w-8 text-right shrink-0">
                                #{pick.overall}
                              </span>

                              {/* Team */}
                              <span
                                className="text-xs font-mono font-bold w-10 shrink-0"
                                style={{ color: teamColor }}
                              >
                                {pick.teamAbbrev}
                              </span>

                              {/* Player */}
                              <span className="text-sm font-bold text-white/90 min-w-0 shrink-0">
                                {pick.playerName}
                              </span>

                              {/* Position */}
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0"
                                style={{ background: 'rgba(212,168,83,0.1)', color: '#D4A853' }}>
                                {pick.position}
                              </span>

                              {/* School */}
                              <span className="text-xs text-white/30 font-mono hidden sm:inline shrink-0">
                                {pick.school}
                              </span>

                              {/* TIE Score */}
                              <span
                                className="text-xs font-mono font-bold ml-auto shrink-0"
                                style={{ color: scoreColor(pick.tieScore) }}
                              >
                                {pick.tieScore}
                              </span>

                              {/* Rationale */}
                              <span className="text-[10px] text-white/25 font-mono hidden md:inline max-w-[280px] truncate">
                                {pick.rationale}
                              </span>
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
