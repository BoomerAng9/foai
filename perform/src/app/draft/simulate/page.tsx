'use client';

/**
 * Draft Simulation Page — Broadcast-Grade Draft Experience
 * Full-screen ESPN/NFL Network draft night feel.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DraftBoard } from '@/components/draft/DraftBoard';
import { PickClock } from '@/components/draft/PickClock';
import { ProspectPool } from '@/components/draft/ProspectPool';
import { PickHistory } from '@/components/draft/PickHistory';
import { TradeTicker } from '@/components/draft/TradeTicker';
import { TradeAlert } from '@/components/draft/TradeAlert';
import { ChaosSlider } from '@/components/draft/ChaosSlider';
import { SimulationControls } from '@/components/draft/SimulationControls';
import { PickCard } from '@/components/draft/PickCard';
import { BackHomeNav } from '@/components/layout/BackHomeNav';
import type { SimulationState, DraftPick, TradeDetails, SimulationSpeed } from '@/lib/draft/types';

type MobileTab = 'board' | 'picks' | 'prospects' | 'trades';

export default function SimulatePage() {
  const [sim, setSim] = useState<SimulationState | null>(null);
  const [chaos, setChaos] = useState(30);
  const [speed, setSpeed] = useState<SimulationSpeed>('fast');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedPick, setSelectedPick] = useState<DraftPick | null>(null);
  const [activeTradeAlert, setActiveTradeAlert] = useState<TradeDetails | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>('board');
  const [displayedPicks, setDisplayedPicks] = useState<DraftPick[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const streamRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const streamPicks = useCallback((allPicks: DraftPick[], spd: SimulationSpeed) => {
    if (spd === 'instant') { setDisplayedPicks(allPicks); setIsStreaming(false); return; }
    setIsStreaming(true); setDisplayedPicks([]);
    const delay = spd === 'realtime' ? 2000 : 300;
    let idx = 0;
    const tick = () => {
      if (idx >= allPicks.length) { setIsStreaming(false); return; }
      const pick = allPicks[idx];
      setDisplayedPicks(prev => [...prev, pick]);
      if (pick.is_trade && pick.trade_details) {
        setActiveTradeAlert(pick.trade_details);
        setTimeout(() => setActiveTradeAlert(null), 3000);
      }
      idx++;
      streamRef.current = setTimeout(tick, delay);
    };
    tick();
  }, []);

  useEffect(() => () => { if (streamRef.current) clearTimeout(streamRef.current); }, []);

  const startSimulation = useCallback(async () => {
    setLoading(true); setError(''); setSelectedPick(null); setDisplayedPicks([]);
    try {
      const res = await fetch('/api/draft/simulate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'auto', chaos_factor: chaos, rounds: 7 }),
      });
      if (!res.ok) throw new Error('Failed to start simulation');
      const data = await res.json();
      const stateRes = await fetch(`/api/draft/simulate/${data.simulation_id}`);
      if (!stateRes.ok) throw new Error('Failed to load simulation');
      const state: SimulationState = await stateRes.json();
      setSim(state);
      streamPicks(state.picks, speed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally { setLoading(false); }
  }, [chaos, speed, streamPicks]);

  const currentPick = isStreaming ? displayedPicks.length + 1 : (sim?.current_pick ?? 0);
  const currentPickData = sim?.picks[displayedPicks.length] || null;
  const trades = sim?.trades.filter(t => displayedPicks.some(p => p.trade_details?.trade_id === t.trade_id)) ?? [];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0a0f', color: '#FFFFFF' }}>
      {/* Top bar */}
      <div style={{ background: 'linear-gradient(180deg, rgba(15,15,22,1) 0%, rgba(10,10,15,1) 100%)', borderBottom: '1px solid rgba(212,168,83,0.15)' }}>
        <div className="max-w-[1920px] mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <BackHomeNav />
            <div className="h-6 w-px bg-white/10" />
            <span className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase">Per|Form Draft Simulator</span>
            <div className="flex-1" />
            {sim && displayedPicks.length > 0 && <div className="text-[10px] font-mono text-white/30">{displayedPicks.length} / {sim.total_picks} picks</div>}
          </div>
          {isStreaming && currentPickData && (
            <div className="mt-3"><PickClock teamAbbr={currentPickData.team_abbr} pickNumber={currentPick} round={currentPickData.round} isActive={isStreaming} /></div>
          )}
        </div>
      </div>

      {/* Pre-sim setup */}
      {!sim && !loading && (
        <div className="flex-1 flex items-center justify-center p-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg w-full space-y-8 text-center">
            <div>
              <div className="text-[10px] font-bold tracking-[0.3em] text-amber-500/60 uppercase mb-3">Per|Form Draft Experience</div>
              <h1 className="text-4xl md:text-5xl font-black leading-[0.95]">
                2026 NFL Draft<br />
                <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #D4A853 0%, #F5D89A 50%, #D4A853 100%)' }}>Simulation</span>
              </h1>
              <p className="text-sm text-white/40 mt-4 max-w-md mx-auto">Watch all 7 rounds unfold with trades, surprises, and cascading effects powered by TIE intelligence.</p>
            </div>
            <div className="space-y-5 p-6 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <ChaosSlider value={chaos} onChange={setChaos} />
              <div className="flex items-center justify-center gap-4">
                <SimulationControls status="paused" speed={speed} onStart={startSimulation} onPause={() => {}} onResume={() => {}} onSpeedChange={setSpeed} />
              </div>
            </div>
            {error && <div className="text-xs text-red-400 bg-red-400/10 rounded-lg px-4 py-2">{error}</div>}
          </motion.div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block w-8 h-8 rounded-full border-2 animate-spin mb-3" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: '#D4A853' }} />
            <div className="text-xs font-mono text-white/40">Generating draft...</div>
          </div>
        </div>
      )}

      {/* Main simulation view */}
      {sim && !loading && (
        <>
          {/* Mobile tabs */}
          <div className="md:hidden flex border-b border-white/5">
            {(['board', 'picks', 'prospects', 'trades'] as MobileTab[]).map(tab => (
              <button key={tab} onClick={() => setMobileTab(tab)}
                className="flex-1 py-2 text-[10px] font-bold tracking-wider uppercase transition-colors"
                style={{ color: mobileTab === tab ? '#D4A853' : 'rgba(255,255,255,0.3)', borderBottom: mobileTab === tab ? '2px solid #D4A853' : '2px solid transparent' }}>
                {tab}{tab === 'trades' && trades.length > 0 && <span className="ml-1 text-amber-400">({trades.length})</span>}
              </button>
            ))}
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Left: Draft Board 60% */}
            <div className={`${mobileTab === 'board' ? 'block' : 'hidden'} md:block md:w-[60%] p-4 overflow-y-auto`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase">Draft Board</h2>
                <SimulationControls status={isStreaming ? 'running' : sim.status} speed={speed} onStart={startSimulation}
                  onPause={() => { if (streamRef.current) clearTimeout(streamRef.current); setIsStreaming(false); }}
                  onResume={() => { if (sim) streamPicks(sim.picks.slice(displayedPicks.length), speed); }}
                  onSpeedChange={setSpeed} />
              </div>
              <DraftBoard picks={displayedPicks} currentPick={currentPick} rounds={7} onPickClick={setSelectedPick} />
            </div>

            {/* Right: Prospects + Picks 40% */}
            <div className={`${['picks', 'prospects'].includes(mobileTab) ? 'block' : 'hidden'} md:block md:w-[40%] flex flex-col border-l border-white/5`}>
              <div className={`${mobileTab === 'prospects' ? 'block' : 'hidden'} md:block h-1/2 p-4 border-b border-white/5 overflow-hidden`}>
                <ProspectPool prospects={sim.available_prospects} />
              </div>
              <div className={`${mobileTab === 'picks' ? 'block' : 'hidden'} md:block h-1/2 p-4 overflow-hidden`}>
                <PickHistory picks={displayedPicks} onPickClick={setSelectedPick} />
              </div>
            </div>
          </div>

          {mobileTab === 'trades' && (
            <div className="flex-1 p-4 md:hidden overflow-y-auto space-y-3">
              {trades.length === 0 ? <div className="text-center py-12 text-[10px] text-white/20">No trades yet</div> : trades.map(t => <TradeAlert key={t.trade_id} trade={t} />)}
            </div>
          )}

          <TradeTicker trades={trades} />

          <AnimatePresence>
            {activeTradeAlert && (
              <div className="fixed top-20 right-4 z-50 w-80">
                <TradeAlert trade={activeTradeAlert} onClose={() => setActiveTradeAlert(null)} />
              </div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {selectedPick && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedPick(null)}>
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="w-full max-w-md" onClick={e => e.stopPropagation()}>
                  <PickCard pick={selectedPick} />
                  <button onClick={() => setSelectedPick(null)} className="mt-3 w-full py-2 text-xs font-bold text-white/40 rounded-lg bg-white/5 hover:bg-white/10 transition">Close</button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
