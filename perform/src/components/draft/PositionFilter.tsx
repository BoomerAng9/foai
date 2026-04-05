'use client';

import { positionColor, COLORS } from '@/lib/design/tokens';

const POSITIONS = ['ALL', 'QB', 'WR', 'RB', 'TE', 'OT', 'IOL', 'EDGE', 'DT', 'LB', 'CB', 'S'];

interface PositionFilterProps {
  active: string;
  onFilter: (position: string) => void;
}

export function PositionFilter({ active, onFilter }: PositionFilterProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {POSITIONS.map(pos => {
        const isActive = active === pos;
        const pc = pos === 'ALL'
          ? { primary: COLORS.gold, light: '#FFF8E1', dark: '#8B6914' }
          : positionColor(pos);

        return (
          <button
            key={pos}
            onClick={() => onFilter(pos)}
            className="px-3 py-1.5 text-[10px] font-mono font-bold tracking-wider transition-all rounded-full"
            style={{
              background: isActive ? pc.primary : 'transparent',
              color: isActive ? '#FFFFFF' : `${pc.primary}99`,
              border: `1px solid ${isActive ? pc.primary : `${pc.primary}30`}`,
              boxShadow: isActive ? `0 0 12px ${pc.primary}25` : 'none',
            }}
          >
            {pos}
          </button>
        );
      })}
    </div>
  );
}
