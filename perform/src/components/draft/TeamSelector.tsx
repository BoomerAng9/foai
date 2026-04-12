'use client';

import { motion } from 'framer-motion';
import { NFL_TEAMS_FULL } from '@/lib/draft/teams';

interface TeamSelectorProps { selected?: string; onSelect: (abbr: string) => void; }

export function TeamSelector({ selected, onSelect }: TeamSelectorProps) {
  const conferences = {
    AFC: NFL_TEAMS_FULL.filter(t => t.conference === 'AFC'),
    NFC: NFL_TEAMS_FULL.filter(t => t.conference === 'NFC'),
  };
  return (
    <div className="space-y-6">
      {(['AFC', 'NFC'] as const).map(conf => (
        <div key={conf}>
          <h3 className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-3">{conf}</h3>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {conferences[conf].map(team => {
              const isSelected = selected === team.abbreviation;
              return (
                <motion.button key={team.abbreviation} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => onSelect(team.abbreviation)}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg transition-all"
                  style={{
                    background: isSelected ? `${team.primaryColor}30` : 'rgba(255,255,255,0.02)',
                    border: `2px solid ${isSelected ? team.primaryColor : 'rgba(255,255,255,0.05)'}`,
                    boxShadow: isSelected ? `0 0 20px ${team.primaryColor}20` : 'none',
                  }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-black"
                    style={{ background: team.primaryColor, color: team.textColor }}>{team.abbreviation}</div>
                  <span className="text-[9px] font-bold text-white/60 text-center leading-tight">{team.city}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
