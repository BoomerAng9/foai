'use client';

/**
 * Roster Room — Drag-and-drop roster management.
 * Left: Depth chart / formation with player cards in position slots.
 * Right: Personnel Pool with search, position filters, and draggable cards.
 * Bottom: Simulation buttons + real-time impact badges.
 */

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  type DragStartEvent,
  type DragEndEvent,
  closestCenter,
} from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { BackHomeNav } from '@/components/layout/BackHomeNav';
import { RosterBoard } from '@/components/franchise/RosterBoard';
import { PersonnelPool } from '@/components/franchise/PersonnelPool';
import { PlayerCard } from '@/components/franchise/PlayerCard';
import { TeamSelector } from '@/components/franchise/TeamSelector';
import { SimulationButton } from '@/components/franchise/SimulationButton';
import { getRosterLayout, getPositionFilters } from '@/lib/franchise/positions';
import { getTeamByAbbr } from '@/lib/franchise/teams';
import { getMockFreeAgents, getMockRosterPlayers } from '@/lib/franchise/mock-data';
import type { Sport, Player, RosterSlot, SimulationResult } from '@/lib/franchise/types';

type MobileTab = 'roster' | 'pool' | 'results';

function RosterRoomInner() {
  const searchParams = useSearchParams();
  const sportParam = (searchParams.get('sport') as Sport) || 'nfl';
  const teamParam = searchParams.get('team') || undefined;

  const [sport, setSport] = useState<Sport>(sportParam);
  const [selectedTeam, setSelectedTeam] = useState<string | undefined>(teamParam);
  const [slots, setSlots] = useState<RosterSlot[]>([]);
  const [pool, setPool] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [activePlayer, setActivePlayer] = useState<Player | null>(null);
  const [poolOpen, setPoolOpen] = useState(true);
  const [mobileTab, setMobileTab] = useState<MobileTab>('roster');
  const [showTeamPicker, setShowTeamPicker] = useState(!teamParam);

  const team = selectedTeam ? getTeamByAbbr(sport, selectedTeam) : undefined;
  const posFilters = useMemo(() => getPositionFilters(sport), [sport]);

  // Load roster and pool data
  const loadData = useCallback(async (s: Sport, t?: string) => {
    setLoading(true);
    setResult(null);

    // Try API first, fall back to mock
    try {
      const res = await fetch(`/api/franchise/teams?sport=${s}&team=${t || ''}`);
      if (res.ok) {
        const data = await res.json();
        if (data.roster) {
          setSlots(data.roster);
          setPool(data.pool || []);
          setLoading(false);
          return;
        }
      }
    } catch {
      // API not available, use mock data
    }

    // Mock fallback
    const layout = getRosterLayout(s);
    const rosterPlayers = getMockRosterPlayers(s, t || '');
    const freeAgents = getMockFreeAgents(s);

    // Auto-assign roster players to slots
    const usedIds = new Set<string>();
    const filledSlots = layout.map((slot) => {
      const basePos = slot.position.replace(/[0-9]/g, '');
      const match = rosterPlayers.find(
        (p) =>
          !usedIds.has(p.id) &&
          (p.position === slot.position ||
            p.position === basePos ||
            p.position.replace(/[0-9]/g, '') === basePos)
      );
      if (match) {
        usedIds.add(match.id);
        return { ...slot, player: match };
      }
      return { ...slot };
    });

    setSlots(filledSlots);
    setPool([...freeAgents, ...rosterPlayers.filter((p) => !usedIds.has(p.id))]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      loadData(sport, selectedTeam);
      setShowTeamPicker(false);
    }
  }, [sport, selectedTeam, loadData]);

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === 'player') {
      setActivePlayer(data.player);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActivePlayer(null);
    const { active, over } = event;
    if (!over) return;

    const dragData = active.data.current;
    const dropData = over.data.current;

    if (dragData?.type !== 'player' || dropData?.type !== 'roster-slot') return;

    const player: Player = dragData.player;
    const targetPos: string = dropData.position;

    setSlots((prev) => {
      const updated = prev.map((s) => {
        if (s.position === targetPos) {
          // If slot already has a player, return them to pool
          if (s.player) {
            setPool((p) => [...p, s.player!]);
          }
          return { ...s, player };
        }
        // If the player was in another slot, clear it
        if (s.player?.id === player.id) {
          return { ...s, player: undefined };
        }
        return s;
      });
      return updated;
    });

    // Remove from pool if dragged from there
    setPool((prev) => prev.filter((p) => p.id !== player.id));

    // Compute mock impact
    setResult({
      capImpact: player.contract?.perYear ? player.contract.perYear : Math.round(Math.random() * 20 - 5),
      fitScore: Math.round(60 + Math.random() * 35),
      winImpact: parseFloat((Math.random() * 4 - 1).toFixed(1)),
    });
  };

  // Mobile tap-to-select for adding players to roster
  const [pendingSlot, setPendingSlot] = useState<string | null>(null);

  const handleMobileTapPlayer = (player: Player) => {
    if (!pendingSlot) return;
    setSlots((prev) =>
      prev.map((s) => {
        if (s.position === pendingSlot) {
          if (s.player) setPool((p) => [...p, s.player!]);
          return { ...s, player };
        }
        if (s.player?.id === player.id) return { ...s, player: undefined };
        return s;
      })
    );
    setPool((prev) => prev.filter((p) => p.id !== player.id));
    setPendingSlot(null);
    setMobileTab('roster');
    setResult({
      capImpact: player.contract?.perYear || Math.round(Math.random() * 15),
      fitScore: Math.round(60 + Math.random() * 35),
      winImpact: parseFloat((Math.random() * 4 - 1).toFixed(1)),
    });
  };

  const handleMobileTapSlot = (pos: string) => {
    setPendingSlot(pos);
    setMobileTab('pool');
  };

  const handleReset = () => {
    if (selectedTeam) loadData(sport, selectedTeam);
  };

  const handleSimulate = async () => {
    // Placeholder for Managed Agents simulation
    await new Promise((r) => setTimeout(r, 2000));
    setResult({
      capImpact: Math.round(Math.random() * 30 - 10),
      fitScore: Math.round(50 + Math.random() * 50),
      winImpact: parseFloat((Math.random() * 6 - 2).toFixed(1)),
    });
  };

  // Team picker phase
  if (showTeamPicker) {
    return (
      <>
        <Header />
        <main className="min-h-screen" style={{ background: 'var(--pf-bg)' }}>
          <div className="max-w-5xl mx-auto px-6 py-10">
            <div className="flex items-center gap-3 mb-6">
              <BackHomeNav />
              <h1 className="text-xl font-outfit font-bold text-white">
                Roster Room — Select Team
              </h1>
            </div>

            {/* Sport toggle */}
            <div className="flex gap-2 mb-8">
              {(['nfl', 'nba', 'mlb'] as Sport[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSport(s)}
                  className="px-4 py-1.5 text-[11px] font-bold tracking-wider uppercase rounded-md transition-all"
                  style={{
                    background: sport === s ? 'rgba(212,168,83,0.15)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${sport === s ? 'rgba(212,168,83,0.4)' : 'rgba(255,255,255,0.06)'}`,
                    color: sport === s ? '#D4A853' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  {s.toUpperCase()}
                </button>
              ))}
            </div>

            <TeamSelector sport={sport} selected={selectedTeam} onSelect={setSelectedTeam} />
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen" style={{ background: 'var(--pf-bg)' }}>
        {/* Top bar */}
        <div
          className="px-6 py-3 flex items-center gap-3 flex-wrap"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <BackHomeNav />
          <h2 className="text-sm font-outfit font-bold text-white">
            Roster Room
          </h2>
          {team && (
            <div className="flex items-center gap-2 ml-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black"
                style={{ background: team.primaryColor, color: team.textColor }}
              >
                {team.abbreviation}
              </div>
              <span className="text-xs text-white/50">{team.name}</span>
            </div>
          )}
          <button
            onClick={() => setShowTeamPicker(true)}
            className="text-[10px] text-white/30 hover:text-white/50 transition-colors ml-2"
          >
            Change
          </button>

          {/* Sport pills */}
          <div className="flex gap-1 ml-auto">
            {(['nfl', 'nba', 'mlb'] as Sport[]).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSport(s);
                  setSelectedTeam(undefined);
                  setShowTeamPicker(true);
                }}
                className="px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase rounded transition-all"
                style={{
                  background: sport === s ? 'rgba(212,168,83,0.15)' : 'transparent',
                  color: sport === s ? '#D4A853' : 'rgba(255,255,255,0.25)',
                  border: `1px solid ${sport === s ? 'rgba(212,168,83,0.3)' : 'transparent'}`,
                }}
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile tab bar */}
        <div className="flex md:hidden border-b border-white/[0.06]">
          {(['roster', 'pool', 'results'] as MobileTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className="flex-1 py-2.5 text-[10px] font-bold tracking-wider uppercase transition-all"
              style={{
                color: mobileTab === tab ? '#D4A853' : 'rgba(255,255,255,0.3)',
                borderBottom: mobileTab === tab ? '2px solid #D4A853' : '2px solid transparent',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-1">
            {/* Desktop layout */}
            <div className="hidden md:flex w-full" style={{ height: 'calc(100vh - 120px)' }}>
              {/* Left: Roster Board */}
              <div
                className="overflow-y-auto scrollbar-none p-6"
                style={{ width: poolOpen ? '65%' : '100%', transition: 'width 0.3s' }}
              >
                <RosterBoard slots={slots} teamColor={team?.primaryColor} result={result} />
              </div>

              {/* Toggle button */}
              <button
                onClick={() => setPoolOpen(!poolOpen)}
                className="flex items-center px-1 hover:bg-white/[0.03] transition-colors"
                style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}
              >
                {poolOpen ? (
                  <PanelRightClose className="w-4 h-4 text-white/20" />
                ) : (
                  <PanelRightOpen className="w-4 h-4 text-white/20" />
                )}
              </button>

              {/* Right: Personnel Pool */}
              <AnimatePresence>
                {poolOpen && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: '35%', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                    style={{
                      borderLeft: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div className="h-full p-4 overflow-y-auto scrollbar-none">
                      <PersonnelPool
                        mode="players"
                        players={pool}
                        positionFilters={posFilters}
                        loading={loading}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile layout */}
            <div className="md:hidden w-full" style={{ minHeight: 'calc(100vh - 170px)' }}>
              {mobileTab === 'roster' && (
                <div className="p-4">
                  {pendingSlot && (
                    <div className="mb-3 px-3 py-2 rounded-lg text-[11px] text-amber-400/80"
                      style={{ background: 'rgba(212,168,83,0.08)', border: '1px solid rgba(212,168,83,0.2)' }}>
                      Tap a player in the Pool tab to fill <strong>{pendingSlot}</strong>
                    </div>
                  )}
                  <RosterBoard
                    slots={slots}
                    teamColor={team?.primaryColor}
                    result={result}
                    onTapSelect={handleMobileTapSlot}
                  />
                </div>
              )}
              {mobileTab === 'pool' && (
                <div className="p-4 h-[calc(100vh-170px)]">
                  <PersonnelPool
                    mode="players"
                    players={pool}
                    positionFilters={posFilters}
                    loading={loading}
                    onTapSelect={(item) => handleMobileTapPlayer(item as Player)}
                  />
                </div>
              )}
              {mobileTab === 'results' && (
                <div className="p-4">
                  {result ? (
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider">
                        Impact Analysis
                      </h3>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div className="text-lg font-black" style={{ color: result.fitScore >= 80 ? '#22C55E' : result.fitScore >= 50 ? '#F59E0B' : '#EF4444' }}>
                            {result.fitScore}
                          </div>
                          <div className="text-[9px] text-white/30 uppercase">Fit Score</div>
                        </div>
                        <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div className="text-lg font-black" style={{ color: result.capImpact > 0 ? '#EF4444' : '#22C55E' }}>
                            {result.capImpact > 0 ? '+' : ''}${result.capImpact}M
                          </div>
                          <div className="text-[9px] text-white/30 uppercase">Cap Impact</div>
                        </div>
                        <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div className="text-lg font-black" style={{ color: result.winImpact >= 0 ? '#22C55E' : '#EF4444' }}>
                            {result.winImpact > 0 ? '+' : ''}{result.winImpact}
                          </div>
                          <div className="text-[9px] text-white/30 uppercase">Win Impact</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16 text-white/15 text-sm">
                      Make roster changes to see impact analysis
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Drag overlay */}
          <DragOverlay dropAnimation={null}>
            {activePlayer && (
              <PlayerCard
                player={activePlayer}
                isDragOverlay
                teamColor={team?.primaryColor}
              />
            )}
          </DragOverlay>
        </DndContext>

        {/* Bottom bar */}
        <div
          className="sticky bottom-0 px-6 py-3 flex items-center gap-3 flex-wrap"
          style={{
            background: 'rgba(10,10,15,0.95)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <SimulationButton label="Simulate Season" onClick={handleSimulate} />
          <SimulationButton label="Simulate Playoffs" onClick={handleSimulate} variant="secondary" />
          <button
            onClick={handleReset}
            className="px-4 py-2 text-[11px] font-bold tracking-wider uppercase text-white/30 hover:text-white/50 transition-colors rounded-lg"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}
          >
            Reset Changes
          </button>
        </div>
      </main>
    </>
  );
}

export default function RosterRoomPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: 'var(--pf-bg)' }} />}>
      <RosterRoomInner />
    </Suspense>
  );
}
