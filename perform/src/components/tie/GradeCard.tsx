'use client';

import { TIEBadge } from './TIEBadge';

interface GradeCardProps {
  name: string;
  position: string;
  school: string;
  tieScore: number;
  tieGrade: string;
  badgeColor: string;
  trend?: string;
  projectedRound?: number;
  label?: string;
}

const TREND_ICONS: Record<string, { icon: string; color: string }> = {
  UP: { icon: '\u25B2', color: '#34D399' },
  DOWN: { icon: '\u25BC', color: '#EF4444' },
  STEADY: { icon: '\u2014', color: 'rgba(255,255,255,0.3)' },
  NEW: { icon: '\u2605', color: '#D4A853' },
  rising: { icon: '\u25B2', color: '#34D399' },
  falling: { icon: '\u25BC', color: '#EF4444' },
  steady: { icon: '\u2014', color: 'rgba(255,255,255,0.3)' },
};

export function GradeCard({ name, position, school, tieScore, tieGrade, badgeColor, trend, projectedRound, label }: GradeCardProps) {
  const trendInfo = trend ? TREND_ICONS[trend] || TREND_ICONS['STEADY'] : null;

  return (
    <div className="flex items-center gap-4 p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <TIEBadge score={tieScore} grade={tieGrade} badgeColor={badgeColor} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-outfit text-sm font-bold text-white truncate">{name}</span>
          {trendInfo && <span style={{ color: trendInfo.color, fontSize: 10 }}>{trendInfo.icon}</span>}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs font-mono" style={{ color: badgeColor }}>{position}</span>
          <span className="text-xs text-white/40">{school}</span>
        </div>
        {label && <span className="text-[9px] font-mono text-white/30 mt-1 block">{label}</span>}
      </div>
      {projectedRound && (
        <div className="text-right shrink-0">
          <span className="text-[9px] font-mono text-white/30 block">ROUND</span>
          <span className="text-sm font-mono font-bold" style={{ color: badgeColor }}>{projectedRound}</span>
        </div>
      )}
    </div>
  );
}
