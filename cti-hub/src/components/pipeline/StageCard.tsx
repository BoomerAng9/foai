'use client';

import { FC } from 'react';

/* ── Types ─────────────────────────────────────────────── */
export interface StageLog {
  msg: string;
}

export interface StageData {
  id: string;
  num: number;
  name: string;
  sub: string;
  status: 'pending' | 'active' | 'complete';
  health: number;
  logs: StageLog[];
}

interface StageCardProps {
  stage: StageData;
  onClick?: () => void;
}

/* ── Sub-components ────────────────────────────────────── */

function PlugIcon({ active, complete, size = 22 }: { active: boolean; complete: boolean; size?: number }) {
  const colorClass = complete
    ? 'text-signal-live'
    : active
      ? 'text-accent'
      : 'text-fg-ghost';

  // Use currentColor via stroke/fill
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" className={colorClass}>
      <rect x="8" y="2" width="4" height="10" rx="0" fill="currentColor" opacity={complete || active ? 1 : 0.3} />
      <rect x="24" y="2" width="4" height="10" rx="0" fill="currentColor" opacity={complete || active ? 1 : 0.3} />
      <rect x="4" y="10" width="28" height="16" rx="0" stroke="currentColor" strokeWidth="1.5" fill="none" opacity={complete || active ? 1 : 0.4} />
      <rect x="14" y="26" width="8" height="6" rx="0" fill="currentColor" opacity={complete || active ? 1 : 0.3} />
      {(active || complete) && (
        <circle cx="18" cy="18" r="3" fill="currentColor">
          {active && <animate attributeName="opacity" values="0.4;1;0.4" dur="1.5s" repeatCount="indefinite" />}
        </circle>
      )}
    </svg>
  );
}

function HealthArc({ percent, active, complete, size = 44 }: { percent: number; active: boolean; complete: boolean; size?: number }) {
  const r = (size - 5) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;

  const strokeColor = complete
    ? 'var(--signal-live)'
    : active
      ? 'var(--accent)'
      : 'var(--border)';

  const trackColor = 'var(--border)';

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={2.5} opacity={0.4} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={strokeColor} strokeWidth={2.5}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="butt"
        style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s' }}
      />
    </svg>
  );
}

/* ── StageCard ─────────────────────────────────────────── */

const StageCard: FC<StageCardProps> = ({ stage, onClick }) => {
  const isActive = stage.status === 'active';
  const isComplete = stage.status === 'complete';
  const isPending = stage.status === 'pending';

  const borderClass = isActive
    ? 'border-accent'
    : isComplete
      ? 'border-signal-live'
      : 'border-border';

  const bgClass = isActive
    ? 'bg-bg-elevated'
    : isComplete
      ? 'bg-bg-surface'
      : 'bg-bg-surface';

  return (
    <div
      onClick={onClick}
      className={`relative ${bgClass} border ${borderClass} p-4 cursor-pointer transition-all duration-500 ${isPending ? 'opacity-35' : 'opacity-100'}`}
    >
      {/* Top accent line */}
      {(isActive || isComplete) && (
        <div
          className={`absolute top-0 left-[20%] right-[20%] h-px ${isComplete ? 'bg-signal-live' : 'bg-accent'}`}
          style={{ opacity: 0.5 }}
        />
      )}

      <div className="flex items-center gap-3.5">
        {/* Health arc wrapping plug icon */}
        <div className="relative w-[44px] h-[44px] flex-shrink-0">
          <HealthArc percent={stage.health} active={isActive} complete={isComplete} size={44} />
          <div className="absolute inset-0 flex items-center justify-center">
            <PlugIcon active={isActive} complete={isComplete} size={22} />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`font-mono text-[9px] font-extrabold tracking-[2px] ${
                isActive ? 'text-accent' : isComplete ? 'text-signal-live' : 'text-fg-ghost'
              }`}
            >
              {String(stage.num).padStart(2, '0')}
            </span>
            <span className={`text-sm font-bold ${isPending ? 'text-fg-ghost' : 'text-fg'}`}>
              {stage.name}
            </span>
          </div>
          <div
            className={`font-mono text-[11px] mt-0.5 ${
              isActive ? 'text-accent' : 'text-fg-tertiary'
            }`}
          >
            {isActive ? `Building... ${Math.round(stage.health)}%` : isComplete ? 'Complete' : stage.sub}
          </div>
        </div>

        {/* Status LED */}
        <div className="flex-shrink-0">
          {isComplete ? (
            <span className="led led-live" />
          ) : isActive ? (
            <span className="led bg-accent animate-pulse-dot" />
          ) : (
            <span className="led led-idle" />
          )}
        </div>
      </div>

      {/* Active stage log tail */}
      {isActive && stage.logs.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-border">
          {stage.logs.slice(-3).map((l, i) => (
            <div
              key={i}
              className={`font-mono text-[10px] leading-relaxed ${
                l.msg.includes('CHANGE') ? 'text-signal-warn' : 'text-fg-tertiary'
              }`}
            >
              {l.msg}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StageCard;
