'use client';

import { getTeam } from '@/lib/draft/teams';
import type { DraftPick } from '@/lib/draft/types';

interface DraftGradeProps { teamAbbr: string; grade: string; score: number; picks: DraftPick[]; summary: string; }

function gradeColor(grade: string): string {
  if (grade.startsWith('A')) return '#22C55E';
  if (grade.startsWith('B')) return '#3B82F6';
  if (grade.startsWith('C')) return '#F59E0B';
  return '#EF4444';
}

export function DraftGrade({ teamAbbr, grade, score, picks, summary }: DraftGradeProps) {
  const team = getTeam(teamAbbr);
  const gc = gradeColor(grade);
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${team.primaryColor}20` }}>
      <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
          style={{ background: team.primaryColor, color: team.textColor }}>{teamAbbr}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white truncate">{team.name}</div>
          <div className="text-[10px] text-white/40">{picks.length} picks</div>
        </div>
        <div className="flex flex-col items-center flex-shrink-0">
          <span className="text-2xl font-black" style={{ color: gc }}>{grade}</span>
          <span className="text-[9px] font-mono text-white/20">{score}/100</span>
        </div>
      </div>
      <div className="p-3 space-y-1">
        {picks.slice(0, 5).map(pick => (
          <div key={pick.pick_number} className="flex items-center gap-2 text-[10px]">
            <span className="font-mono text-white/30 w-6 text-right">#{pick.pick_number}</span>
            <span className="font-bold text-white">{pick.player_name}</span>
            <span className="text-white/30">{pick.position}</span>
          </div>
        ))}
        {picks.length > 5 && <div className="text-[9px] text-white/20 pl-8">+{picks.length - 5} more</div>}
      </div>
      <div className="px-4 py-2 text-[10px] text-white/30" style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}>{summary}</div>
    </div>
  );
}
