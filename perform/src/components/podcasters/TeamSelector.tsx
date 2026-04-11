'use client';

import { useState } from 'react';
import type { NFLTeam } from '@/lib/podcasters/team-assets';

const T = {
  bg: '#0a0a0f',
  surface: '#111118',
  surfaceAlt: '#1a1a24',
  border: 'rgba(255,255,255,0.08)',
  text: 'rgba(255,255,255,0.9)',
  textMuted: 'rgba(255,255,255,0.4)',
  gold: '#D4A853',
  goldBorder: 'rgba(212,168,83,0.3)',
};

const CONFERENCES = ['AFC', 'NFC'] as const;
const DIVISIONS = ['East', 'North', 'South', 'West'] as const;

interface TeamSelectorProps {
  teams: NFLTeam[];
  selected: string | null;
  onSelect: (abbrev: string) => void;
}

export default function TeamSelector({ teams, selected, onSelect }: TeamSelectorProps) {
  const [activeConf, setActiveConf] = useState<'AFC' | 'NFC'>('AFC');

  const confTeams = teams.filter((t) => t.conference === activeConf);

  return (
    <div>
      {/* Conference tabs */}
      <div className="flex gap-2 mb-6">
        {CONFERENCES.map((conf) => {
          const active = activeConf === conf;
          return (
            <button
              key={conf}
              onClick={() => setActiveConf(conf)}
              className="px-6 py-2.5 text-xs font-bold tracking-[0.2em] uppercase rounded-lg transition-all"
              style={{
                background: active ? T.gold : T.surface,
                color: active ? T.bg : T.textMuted,
                border: `1px solid ${active ? T.gold : T.border}`,
              }}
            >
              {conf}
            </button>
          );
        })}
      </div>

      {/* Divisions */}
      <div className="space-y-6">
        {DIVISIONS.map((div) => {
          const divTeams = confTeams.filter((t) => t.division === div);
          if (divTeams.length === 0) return null;
          return (
            <div key={div}>
              <div
                className="text-[10px] font-bold tracking-[0.25em] uppercase mb-3"
                style={{ color: T.textMuted }}
              >
                {activeConf} {div}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {divTeams.map((team) => {
                  const isSelected = selected === team.abbrev;
                  return (
                    <button
                      key={team.abbrev}
                      onClick={() => onSelect(team.abbrev)}
                      className="relative text-left rounded-lg p-4 transition-all hover:scale-[1.02]"
                      style={{
                        background: T.surface,
                        border: isSelected
                          ? `2px solid ${T.gold}`
                          : `1px solid ${T.border}`,
                        borderLeft: `4px solid ${team.primaryColor}`,
                        boxShadow: isSelected
                          ? `0 0 20px ${T.goldBorder}`
                          : 'none',
                      }}
                    >
                      {isSelected && (
                        <div
                          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: T.gold }}
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={T.bg}
                            strokeWidth="3"
                          >
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        </div>
                      )}
                      <div
                        className="text-sm font-bold leading-tight"
                        style={{ color: T.text }}
                      >
                        {team.city}
                      </div>
                      <div
                        className="text-xs font-semibold mt-0.5"
                        style={{ color: team.primaryColor }}
                      >
                        {team.name}
                      </div>
                      <div
                        className="text-[10px] mt-1 font-mono"
                        style={{ color: T.textMuted }}
                      >
                        {team.abbrev}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
