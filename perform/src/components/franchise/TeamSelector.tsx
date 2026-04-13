'use client';

import { motion } from 'framer-motion';
import type { Sport, FranchiseTeam } from '@/lib/franchise/types';
import { groupTeams } from '@/lib/franchise/teams';

interface TeamSelectorProps {
  sport: Sport;
  selected?: string;
  onSelect: (abbr: string) => void;
}

export function TeamSelector({ sport, selected, onSelect }: TeamSelectorProps) {
  const grouped = groupTeams(sport);

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([conf, divisions]) => (
        <div key={conf}>
          <h3 className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-3">
            {conf}
          </h3>
          {Object.entries(divisions).map(([div, teams]) => (
            <div key={div} className="mb-4">
              <h4 className="text-[9px] font-mono tracking-[0.15em] text-white/25 uppercase mb-2 ml-1">
                {div}
              </h4>
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 gap-2">
                {(teams as FranchiseTeam[]).map((team) => {
                  const isSelected = selected === team.abbreviation;
                  return (
                    <motion.button
                      key={team.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onSelect(team.abbreviation)}
                      className="flex flex-col items-center gap-1 p-2 rounded-lg transition-all"
                      style={{
                        background: isSelected
                          ? `${team.primaryColor}30`
                          : 'rgba(255,255,255,0.02)',
                        border: `2px solid ${
                          isSelected ? team.primaryColor : 'rgba(255,255,255,0.05)'
                        }`,
                        boxShadow: isSelected
                          ? `0 0 20px ${team.primaryColor}20`
                          : 'none',
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-black"
                        style={{
                          background: team.primaryColor,
                          color: team.textColor,
                        }}
                      >
                        {team.abbreviation}
                      </div>
                      <span className="text-[9px] font-bold text-white/60 text-center leading-tight">
                        {team.city}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
