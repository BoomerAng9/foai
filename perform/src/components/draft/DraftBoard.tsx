'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DraftPick } from '@/lib/draft/types';
import { getTeam, FIRST_ROUND_ORDER } from '@/lib/draft/teams';

interface DraftBoardProps {
  picks: DraftPick[];
  currentPick: number;
  rounds?: number;
  onPickClick?: (pick: DraftPick) => void;
}

export function DraftBoard({ picks, currentPick, rounds = 7, onPickClick }: DraftBoardProps) {
  const [selectedRound, setSelectedRound] = useState(1);
  const pickMap = new Map<number, DraftPick>();
  for (const pick of picks) pickMap.set(pick.pick_number, pick);

  const startPick = (selectedRound - 1) * 32 + 1;

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 mb-3 overflow-x-auto scrollbar-none">
        {Array.from({ length: rounds }, (_, i) => i + 1).map(r => {
          const isActive = selectedRound === r;
          const roundPicks = picks.filter(p => p.round === r);
          const isComplete = roundPicks.length >= 32;
          return (
            <button key={r} onClick={() => setSelectedRound(r)}
              className="px-3 py-1.5 text-[10px] font-bold tracking-wider rounded transition-all whitespace-nowrap"
              style={{
                background: isActive ? 'rgba(212,168,83,0.2)' : 'rgba(255,255,255,0.03)',
                color: isActive ? '#D4A853' : 'rgba(255,255,255,0.4)',
                border: `1px solid ${isActive ? 'rgba(212,168,83,0.3)' : 'rgba(255,255,255,0.06)'}`,
              }}>
              RD {r}{isComplete && <span className="ml-1 text-green-400">&#10003;</span>}
            </button>
          );
        })}
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-none">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
          {Array.from({ length: 32 }, (_, i) => {
            const pickNum = startPick + i;
            const pick = pickMap.get(pickNum);
            const isCurrent = pickNum === currentPick;
            const teamAbbr = FIRST_ROUND_ORDER[i % 32];
            const team = getTeam(pick?.team_abbr || teamAbbr);
            return (
              <motion.div key={pickNum} initial={false} animate={pick ? { opacity: 1 } : { opacity: 0.4 }}
                className={`relative rounded-lg overflow-hidden cursor-pointer transition-all ${isCurrent ? 'ring-2 ring-amber-400 heartbeat' : ''}`}
                style={{
                  background: pick ? `linear-gradient(135deg, ${team.primaryColor}20 0%, ${team.primaryColor}08 100%)` : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${pick ? `${team.primaryColor}30` : 'rgba(255,255,255,0.05)'}`,
                }}
                onClick={() => pick && onPickClick?.(pick)}>
                <div className="h-0.5" style={{ background: pick ? team.primaryColor : 'rgba(255,255,255,0.05)' }} />
                <div className="p-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[7px] font-black"
                      style={{ background: pick ? team.primaryColor : 'rgba(255,255,255,0.1)', color: pick ? team.textColor : 'rgba(255,255,255,0.3)' }}>
                      {pick?.team_abbr || teamAbbr}
                    </div>
                    <span className="text-[10px] font-mono font-bold text-white/20">#{pickNum}</span>
                  </div>
                  {pick ? (
                    <AnimatePresence mode="wait">
                      <motion.div key={pick.player_name} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                        <div className="text-xs font-bold text-white truncate">{pick.player_name}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[9px] font-bold px-1 rounded" style={{ background: `${team.primaryColor}40`, color: '#FFFFFF' }}>{pick.position}</span>
                          <span className="text-[9px] text-white/30 truncate">{pick.school}</span>
                        </div>
                        {pick.is_trade && <div className="text-[8px] font-bold text-amber-400 mt-0.5">TRADE</div>}
                      </motion.div>
                    </AnimatePresence>
                  ) : (
                    <div className="text-[10px] text-white/15 italic">{isCurrent ? 'On the clock...' : '---'}</div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
