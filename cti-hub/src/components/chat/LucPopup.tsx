'use client';

import type { LucEstimate } from '@/lib/luc/types';

interface LucPopupProps {
  estimate: LucEstimate;
  estimateCount: number;
  onAccept: () => void;
  onAdjust: () => void;
  onStop: () => void;
  onAutoAcceptChange: (enabled: boolean) => void;
  autoAcceptEnabled: boolean;
}

export function LucPopup({
  estimate,
  estimateCount,
  onAccept,
  onAdjust,
  onStop,
  onAutoAcceptChange,
  autoAcceptEnabled,
}: LucPopupProps) {
  const tierColors: Record<string, string> = {
    'premium': '#22C55E',
    'bucket-list': '#3B82F6',
    'lfg': '#F59E0B',
  };
  const tierNames: Record<string, string> = {
    'premium': 'PREMIUM',
    'bucket-list': 'BUCKET LIST',
    'lfg': 'LFG',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
      <div className="w-[400px] bg-bg-surface border border-border shadow-lg">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <div className="font-mono text-[9px] font-bold uppercase tracking-widest text-fg-tertiary">LUC</div>
            <div className="font-mono text-[22px] font-bold mt-0.5">${estimate.total_cost.toFixed(3)}</div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="led" style={{ background: tierColors[estimate.tier] || '#22C55E' }} />
            <span className="font-mono text-[9px] font-semibold uppercase tracking-wider">
              {tierNames[estimate.tier] || 'PREMIUM'}
            </span>
          </div>
        </div>

        <div className="p-4">
          <div className="font-mono text-[10px]">
            <div className="grid grid-cols-[1fr_60px] gap-1 text-fg-tertiary font-semibold mb-2 uppercase">
              <span>What&apos;s included</span>
              <span className="text-right">Cost</span>
            </div>
            {estimate.items.map((item, i) => (
              <div key={i} className="grid grid-cols-[1fr_60px] gap-1 py-1.5 border-b border-border last:border-0">
                <span className="text-fg-secondary">{item.service}</span>
                <span className="text-right text-fg-secondary">${item.cost.toFixed(3)}</span>
              </div>
            ))}
          </div>
          {estimate.total_tokens > 0 && (
            <div className="mt-3 pt-3 border-t border-border flex justify-between font-mono text-[10px]">
              <span className="text-fg-tertiary">Estimated tokens</span>
              <span className="text-fg">{estimate.total_tokens.toLocaleString()}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 px-4 pb-4">
          <button onClick={onAccept} className="btn-solid flex-1 h-10 text-[11px]">ACCEPT</button>
          <button onClick={onAdjust} className="btn-ghost w-20 h-10 text-[11px]">ADJUST</button>
          <button onClick={onStop} className="btn-ghost w-16 h-10 text-[11px] text-fg-tertiary border-fg-ghost">STOP</button>
        </div>

        {estimateCount >= 3 && (
          <div className="px-4 pb-4">
            <label className="flex items-center gap-2 p-2 bg-bg-elevated cursor-pointer">
              <input
                type="checkbox"
                checked={autoAcceptEnabled}
                onChange={(e) => onAutoAcceptChange(e.target.checked)}
                className="w-4 h-4 accent-accent"
              />
              <span className="font-mono text-[10px] text-fg-tertiary">
                Auto-accept estimates this session
              </span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
