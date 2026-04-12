'use client';

/**
 * War Room Page — Interactive Draft Experience
 * User selects a team and controls their picks.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DraftBoard } from '@/components/draft/DraftBoard';
import { PickClock } from '@/components/draft/PickClock';
import { ProspectPool } from '@/components/draft/ProspectPool';
import { PickHistory } from '@/components/draft/PickHistory';
import { TradeTicker } from '@/components/draft/TradeTicker';
import { TeamSelector } from '@/components/draft/TeamSelector';
import { ChaosSlider } from '@/components/draft/ChaosSlider';
import { PickCard } from '@/components/draft/PickCard';
import { BackHomeNav } from '@/components/layout/BackHomeNav';
import type { SimulationState, DraftPick, Prospect } from '@/lib/draft/types';
import { getTeam, FIRST_ROUND_ORDER } from '@/lib/draft/teams';

type Phase = 'team-select' | 'drafting' | 'complete';

export default function WarRoomPage() {
  const [phase, setPhase] = useState<Phase>('team-select');
  const [selectedTeam, setSelectedTeam] = useState<string | undefined>();
  const [chaos, setChaos] = useState(40);
  const [sim, setSim] = useState<SimulationState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedPick, setSelectedPick] = useState<DraftPick | null>(null);

  const currentPickTeam = sim ? FIRST_ROUND_ORDER[(sim.current_pick - 1) % 32] : '';
  const isUserTurn = currentPickTeam === selectedTeam && sim?.status === 'running';
  const team = selectedTeam ? getTeam(selectedTeam) : null;

  const startWarRoom = useCallback(async () => {
    if (!selectedTeam) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/draft/simulate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'war-room', team: selectedTeam, chaos_factor: chaos, rounds: 3 }),
      });
      if (!res.ok) throw new Error('Failed to start war room');
      const data = await res.json();
      const stateRes = await fetch(`/api/draft/simulate/${data.simulation_id}`);
      if (!stateRes.ok) throw new Error('Failed to load simulation');
      const state: SimulationState = await stateRes.json();
      setSim(state); setPhase('drafting');
    } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong'); }
    finally { setLoading(false); }
  }, [selectedTeam, chaos]);

  const handleDraftPlayer = useCallback(async (prospect: Prospect) => {
    if (!sim || !isUserTurn) return;
    try {
      const res = await fetch(`/api/draft/simulate/${sim.id}/pick`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: prospect.id }),
      });
      if (!res.ok) throw new Error('Failed to make pick');
      const stateRes = await fetch(`/api/draft/simulate/${sim.id}`);
      const state: SimulationState = await stateRes.json();
      setSim(state);
      if (state.status === 'complete') setPhase('complete');
    } catch (err) { setError(err instanceof Error ? err.message : 'Pick failed'); }
  }, [sim, isUserTurn]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0a0f', color: '#FFFFFF' }}>
      <div style={{ background: 'linear-gradient(180deg, rgba(15,15,22,1) 0%, rgba(10,10,15,1) 100%)', borderBottom: team ? `2px solid ${team.primaryColor}40` : '1px solid rgba(212,168,83,0.15)' }}>
        <div className="max-w-[1920px] mx-auto px-4 py-3 flex items-center gap-4">
          <BackHomeNav />
          <div className="h-6 w-px bg-white/10" />
          <span className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase">War Room</span>
          {team && (
            <>
              <div className="h-6 w-px bg-white/10" />
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black"
                style={{ background: team.primaryColor, color: team.textColor }}>{selectedTeam}</div>
              <span className="text-sm font-bold">{team.name}</span>
            </>
          )}
        </div>
      </div>

      {/* Team select */}
      {phase === 'team-select' && (
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <div className="text-[10px] font-bold tracking-[0.3em] text-amber-500/60 uppercase mb-3">War Room Mode</div>
              <h1 className="text-3xl md:text-4xl font-black">Select Your Team</h1>
              <p className="text-sm text-white/40 mt-2">You control all draft picks and trade decisions for your team.</p>
            </div>
            <TeamSelector selected={selectedTeam} onSelect={setSelectedTeam} />
            {selectedTeam && team && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="mt-8 p-6 rounded-xl space-y-5" style={{ background: `${team.primaryColor}08`, border: `1px solid ${team.primaryColor}20` }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black"
                    style={{ background: team.primaryColor, color: team.textColor }}>{selectedTeam}</div>
                  <div>
                    <div className="text-lg font-bold">{team.name}</div>
                    <div className="text-xs text-white/40">Needs: {team.needs.join(', ')}</div>
                  </div>
                </div>
                <ChaosSlider value={chaos} onChange={setChaos} />
                <button onClick={startWarRoom} disabled={loading}
                  className="w-full py-3 text-sm font-bold tracking-wider uppercase rounded-lg transition-all hover:brightness-110 disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${team.primaryColor} 0%, ${team.secondaryColor} 100%)`, color: team.textColor, boxShadow: `0 0 30px ${team.primaryColor}20` }}>
                  {loading ? 'Setting up war room...' : 'Enter War Room'}
                </button>
                {error && <div className="text-xs text-red-400 text-center">{error}</div>}
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Drafting */}
      {phase === 'drafting' && sim && (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {isUserTurn && (
            <div className="md:hidden px-4 py-3" style={{ background: `${team!.primaryColor}15`, borderBottom: `1px solid ${team!.primaryColor}30` }}>
              <PickClock teamAbbr={selectedTeam!} pickNumber={sim.current_pick} round={sim.current_round} isActive />
              <div className="mt-2 text-center text-sm font-bold text-amber-400">YOUR PICK — Select a prospect below</div>
            </div>
          )}
          <div className="hidden md:block md:w-[55%] p-4 overflow-y-auto">
            {isUserTurn && <div className="mb-3"><PickClock teamAbbr={selectedTeam!} pickNumber={sim.current_pick} round={sim.current_round} isActive /></div>}
            <DraftBoard picks={sim.picks} currentPick={sim.current_pick} rounds={3} onPickClick={setSelectedPick} />
          </div>
          <div className="flex-1 flex flex-col border-l border-white/5">
            <div className="flex-1 p-4 overflow-hidden">
              <ProspectPool prospects={sim.available_prospects} onSelect={handleDraftPlayer} selectable={isUserTurn} />
            </div>
            <div className="h-64 p-4 border-t border-white/5 overflow-hidden">
              <PickHistory picks={sim.picks} onPickClick={setSelectedPick} />
            </div>
          </div>
          <TradeTicker trades={sim.trades} />
        </div>
      )}

      {/* Complete */}
      {phase === 'complete' && sim && (
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-black mb-2">Draft Complete</h2>
            <p className="text-white/40 text-sm mb-8">{sim.picks.length} picks made across {sim.current_round} rounds.</p>
            <a href={`/draft/results/${sim.id}`} className="inline-flex px-6 py-3 text-sm font-bold tracking-wider uppercase rounded-lg transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #D4A853 0%, #B8912E 100%)', color: '#0A0A0F' }}>View Full Results</a>
            <div className="mt-8 space-y-2 text-left">
              <h3 className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-3">Your Picks</h3>
              {sim.picks.filter(p => p.team_abbr === selectedTeam).map(pick => (
                <div key={pick.pick_number} className="flex items-center gap-3 p-3 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span className="font-mono text-white/30 text-sm">#{pick.pick_number}</span>
                  <span className="font-bold">{pick.player_name}</span>
                  <span className="text-white/40 text-xs">{pick.position} · {pick.school}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
