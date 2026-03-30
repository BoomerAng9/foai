'use client';

import { FC, useState } from 'react';
import type { StageData } from './StageCard';

interface AcheevyStatusProps {
  stages: StageData[];
  activeIdx: number;
  changeOrders: ChangeOrder[];
  onChangeOrder: (text: string) => void;
  running: boolean;
  complete: boolean;
}

export interface ChangeOrder {
  id: number;
  stage: string;
  stageNum: number;
  text: string;
  impact: 'Minor' | 'Moderate' | 'Major';
}

const AcheevyStatus: FC<AcheevyStatusProps> = ({
  stages,
  activeIdx,
  changeOrders,
  onChangeOrder,
  running,
  complete,
}) => {
  const [open, setOpen] = useState(false);
  const [coText, setCoText] = useState('');
  const [showCO, setShowCO] = useState(false);

  const completedCount = stages.filter((s) => s.status === 'complete').length;
  const currentStage = activeIdx >= 0 && activeIdx < stages.length ? stages[activeIdx] : null;

  const statusText = complete
    ? 'All 10 stages passed. Your plug is delivered. BAMARAM.'
    : running && currentStage
      ? `Building Stage ${currentStage.num}: ${currentStage.name} — ${Math.round(currentStage.health)}% complete. ${completedCount} of 10 stages done.`
      : 'Ready to build. Press PLUG ME IN to start your pipeline.';

  const ledClass = running ? 'bg-accent' : complete ? 'led-live' : 'led-idle';

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {/* ACHEEVY FAB */}
      <button
        onClick={() => setOpen(!open)}
        className="w-12 h-12 bg-bg-surface border border-border flex items-center justify-center cursor-pointer transition-all duration-300 hover:border-border-strong"
      >
        <span className="font-mono text-[10px] font-black text-accent">AC</span>
      </button>

      {/* Status panel */}
      {open && (
        <div className="absolute bottom-14 right-0 w-80 bg-bg-surface border border-border p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-2.5">
            <span className={`led ${ledClass}`} />
            <span className="font-mono text-[9px] font-extrabold tracking-[2px] text-accent">
              ACHEEVY STATUS
            </span>
          </div>

          <p className="text-xs text-fg-secondary leading-relaxed mb-3">
            {statusText}
          </p>

          {changeOrders.length > 0 && (
            <div className="font-mono text-[10px] text-signal-warn mb-2.5">
              {changeOrders.length} change order{changeOrders.length > 1 ? 's' : ''} on record
            </div>
          )}

          {running && !showCO && (
            <button
              onClick={() => setShowCO(true)}
              className="btn-ghost w-full text-[11px] h-9"
            >
              Request Change Order
            </button>
          )}

          {showCO && (
            <div>
              <textarea
                value={coText}
                onChange={(e) => setCoText(e.target.value)}
                placeholder="Describe your change..."
                rows={3}
                className="input-field h-auto py-2 text-xs resize-none"
              />
              <div className="flex gap-1.5 mt-2">
                <button
                  onClick={() => setShowCO(false)}
                  className="btn-ghost flex-1 h-8 text-[10px]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (coText.trim()) {
                      onChangeOrder(coText.trim());
                      setCoText('');
                      setShowCO(false);
                    }
                  }}
                  disabled={!coText.trim()}
                  className="btn-solid flex-1 h-8 text-[10px] bg-signal-warn text-fg"
                >
                  Submit
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AcheevyStatus;
