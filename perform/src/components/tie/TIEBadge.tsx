'use client';

interface TIEBadgeProps {
  score: number;
  grade: string;
  badgeColor: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = { sm: 40, md: 64, lg: 96 };

export function TIEBadge({ score, grade, badgeColor, size = 'md' }: TIEBadgeProps) {
  const s = SIZES[size];
  const fontSize = size === 'sm' ? 12 : size === 'md' ? 18 : 28;
  const gradeSize = size === 'sm' ? 8 : size === 'md' ? 11 : 14;

  return (
    <svg width={s} height={s} viewBox="0 0 100 100" fill="none">
      {/* Hexagon */}
      <polygon
        points="50,2 93,25 93,75 50,98 7,75 7,25"
        fill="rgba(0,0,0,0.6)"
        stroke={badgeColor}
        strokeWidth="3"
      />
      {/* Score */}
      <text x="50" y="48" textAnchor="middle" fill={badgeColor} fontSize={fontSize} fontWeight="800" fontFamily="'Outfit', sans-serif">
        {score > 100 ? '101+' : score.toFixed(0)}
      </text>
      {/* Grade */}
      <text x="50" y="68" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize={gradeSize} fontWeight="600" fontFamily="'IBM Plex Mono', monospace">
        {grade}
      </text>
    </svg>
  );
}
