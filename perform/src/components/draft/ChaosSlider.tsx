'use client';

interface ChaosSliderProps { value: number; onChange: (value: number) => void; }

export function ChaosSlider({ value, onChange }: ChaosSliderProps) {
  const label = value < 20 ? 'Chalk' : value < 40 ? 'Conservative' : value < 60 ? 'Moderate' : value < 80 ? 'Wild' : 'Chaos';
  const color = value < 30 ? '#22C55E' : value < 60 ? '#F59E0B' : '#EF4444';
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold tracking-[0.15em] text-white/40 uppercase">Chaos Factor</span>
        <span className="text-xs font-bold" style={{ color }}>{value} — {label}</span>
      </div>
      <input type="range" min={0} max={100} value={value} onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ background: 'linear-gradient(90deg, #22C55E 0%, #F59E0B 50%, #EF4444 100%)', accentColor: color }} />
      <div className="flex justify-between text-[9px] text-white/20 mt-0.5"><span>Consensus</span><span>Madness</span></div>
    </div>
  );
}
