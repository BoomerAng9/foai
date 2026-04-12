'use client';

import type { SimulationSpeed, SimulationStatus } from '@/lib/draft/types';

interface SimulationControlsProps {
  status: SimulationStatus;
  speed: SimulationSpeed;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onSpeedChange: (speed: SimulationSpeed) => void;
}

const SPEEDS: { key: SimulationSpeed; label: string }[] = [
  { key: 'realtime', label: 'Real-Time' },
  { key: 'fast', label: 'Fast' },
  { key: 'instant', label: 'Instant' },
];

export function SimulationControls({ status, speed, onStart, onPause, onResume, onSpeedChange }: SimulationControlsProps) {
  return (
    <div className="flex items-center gap-3">
      {status === 'complete' ? (
        <button onClick={onStart} className="px-4 py-2 text-xs font-bold tracking-wider uppercase rounded-lg transition-all hover:brightness-110"
          style={{ background: 'linear-gradient(135deg, #D4A853 0%, #B8912E 100%)', color: '#0A0A0F' }}>New Simulation</button>
      ) : status === 'running' ? (
        <button onClick={onPause} className="px-4 py-2 text-xs font-bold tracking-wider uppercase rounded-lg bg-white/10 text-white hover:bg-white/15 transition-all">Pause</button>
      ) : status === 'paused' ? (
        <button onClick={onResume} className="px-4 py-2 text-xs font-bold tracking-wider uppercase rounded-lg transition-all hover:brightness-110"
          style={{ background: 'linear-gradient(135deg, #D4A853 0%, #B8912E 100%)', color: '#0A0A0F' }}>Resume</button>
      ) : (
        <button onClick={onStart} className="px-5 py-2.5 text-sm font-bold tracking-wider uppercase rounded-lg transition-all hover:brightness-110"
          style={{ background: 'linear-gradient(135deg, #D4A853 0%, #B8912E 100%)', color: '#0A0A0F', boxShadow: '0 0 20px rgba(212,168,83,0.2)' }}>Start Simulation</button>
      )}
      <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        {SPEEDS.map(s => (
          <button key={s.key} onClick={() => onSpeedChange(s.key)}
            className="px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase transition-colors"
            style={{ background: speed === s.key ? 'rgba(212,168,83,0.15)' : 'transparent', color: speed === s.key ? '#D4A853' : 'rgba(255,255,255,0.3)' }}>{s.label}</button>
        ))}
      </div>
    </div>
  );
}
