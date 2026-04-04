'use client';

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

function getESPNHeadshot(name: string): string {
  // Use ESPN's public player search to find headshots
  const slug = name.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, '-');
  return `https://a.espncdn.com/combiner/i?img=/i/headshots/college-football/players/full/${slug}.png&w=96&h=70&cb=1`;
}

export function GradeCard({ name, position, school, tieScore, tieGrade, badgeColor, trend, projectedRound, label }: GradeCardProps) {
  const trendInfo = trend ? TREND_ICONS[trend] || TREND_ICONS['STEADY'] : null;
  const score = isNaN(tieScore) ? 0 : Math.round(tieScore);

  return (
    <div className="flex items-center gap-4 p-4 transition-all hover:bg-white/[0.03]" style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Player photo placeholder — initials circle */}
      <div className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center overflow-hidden" style={{ background: `${badgeColor}15`, border: `2px solid ${badgeColor}40` }}>
        <span className="font-outfit text-sm font-extrabold" style={{ color: badgeColor }}>
          {name.split(' ').map(n => n[0]).join('')}
        </span>
      </div>

      {/* Grade chip */}
      <div className="shrink-0 flex flex-col items-center gap-0.5 w-14">
        <span className="text-lg font-outfit font-extrabold" style={{ color: badgeColor }}>{score}</span>
        <span className="text-[8px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded" style={{ background: `${badgeColor}20`, color: badgeColor }}>
          {tieGrade.length > 12 ? tieGrade.slice(0, 12) : tieGrade}
        </span>
      </div>

      {/* Player info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-outfit text-sm font-bold text-white truncate">{name}</span>
          {trendInfo && <span style={{ color: trendInfo.color, fontSize: 10 }}>{trendInfo.icon}</span>}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs font-mono font-bold" style={{ color: badgeColor }}>{position}</span>
          <span className="text-[10px] text-white/30">·</span>
          <span className="text-xs text-white/40">{school}</span>
        </div>
      </div>

      {/* Round */}
      {projectedRound && (
        <div className="text-right shrink-0">
          <span className="text-[8px] font-mono text-white/25 block tracking-wider">RD</span>
          <span className="text-lg font-outfit font-extrabold" style={{ color: projectedRound <= 1 ? '#D4A853' : projectedRound <= 3 ? '#60A5FA' : 'rgba(255,255,255,0.3)' }}>{projectedRound}</span>
        </div>
      )}
    </div>
  );
}
