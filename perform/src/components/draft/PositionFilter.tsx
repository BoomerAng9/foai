'use client';

const POSITIONS = ['ALL', 'QB', 'WR', 'RB', 'TE', 'OT', 'IOL', 'EDGE', 'DT', 'LB', 'CB', 'S'];

interface PositionFilterProps {
  active: string;
  onFilter: (position: string) => void;
}

export function PositionFilter({ active, onFilter }: PositionFilterProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {POSITIONS.map(pos => (
        <button
          key={pos}
          onClick={() => onFilter(pos)}
          className="px-3 py-1.5 text-[10px] font-mono font-bold tracking-wider transition-all"
          style={{
            background: active === pos ? '#D4A853' : 'transparent',
            color: active === pos ? '#0A0A0F' : 'rgba(255,255,255,0.4)',
            border: `1px solid ${active === pos ? '#D4A853' : 'rgba(255,255,255,0.1)'}`,
          }}
        >
          {pos}
        </button>
      ))}
    </div>
  );
}
