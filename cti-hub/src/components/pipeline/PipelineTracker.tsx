'use client';

import { useState, useEffect, useRef, useCallback, FC } from 'react';
import StageCard, { StageData, StageLog } from './StageCard';
import AcheevyStatus, { ChangeOrder } from './AcheevyStatus';

/* ── Stage Definitions ─────────────────────────────────── */

export const STAGES: Omit<StageData, 'status' | 'health' | 'logs'>[] = [
  { id: 'rfp', num: 1, name: 'RFP', sub: 'Create request' },
  { id: 'response', num: 2, name: 'RFP Response', sub: 'Initial feedback' },
  { id: 'commercial', num: 3, name: 'Commercial Proposal', sub: 'Pricing structure' },
  { id: 'technical', num: 4, name: 'Technical Proposal', sub: 'Solution details' },
  { id: 'quote', num: 5, name: 'Formal Quote', sub: 'Final pricing' },
  { id: 'po', num: 6, name: 'Purchase Order', sub: 'Official approval' },
  { id: 'assignment', num: 7, name: 'Assignment Log', sub: 'Task tracking' },
  { id: 'qa', num: 8, name: 'QA & Security', sub: 'Quality assurance' },
  { id: 'delivery', num: 9, name: 'Delivery Receipt', sub: 'Handover proof' },
  { id: 'completion', num: 10, name: 'Completion', sub: 'BAMARAM' },
];

/* ── Props ─────────────────────────────────────────────── */

interface PipelineTrackerProps {
  /** Called when user clicks "PLUG ME IN" */
  onStart?: () => void;
  /** Project ID for connecting to real data */
  projectId?: string;
  /** Initial stage data — pass pre-populated stages to skip demo mode */
  initialStages?: StageData[];
}

/* ── Connection line between stages ────────────────────── */

function ConnectionLine({ active, complete }: { active: boolean; complete: boolean }) {
  const dotClass = complete
    ? 'bg-signal-live'
    : active
      ? 'bg-accent'
      : 'bg-border';

  const lineClass = complete
    ? 'bg-signal-live'
    : active
      ? 'bg-accent'
      : 'bg-border';

  return (
    <div className="relative h-8 flex items-center justify-center">
      <div className={`w-px h-full ${lineClass} transition-colors duration-500`} style={{ opacity: active || complete ? 0.6 : 0.25 }} />
      <div className={`absolute w-[7px] h-[7px] ${dotClass} transition-all duration-400`}>
        {active && (
          <div className="absolute -inset-1 border border-accent animate-pulse-dot" style={{ opacity: 0.4 }} />
        )}
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────── */

const PipelineTracker: FC<PipelineTrackerProps> = ({ onStart, projectId, initialStages }) => {
  const [stageData, setStageData] = useState<StageData[]>(
    initialStages ?? STAGES.map((s) => ({ ...s, status: 'pending' as const, health: 0, logs: [] }))
  );
  const [activeIdx, setActiveIdx] = useState(-1);
  const [running, setRunning] = useState(false);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isComplete = stageData.every((s) => s.status === 'complete');

  /* ── Demo simulation loop (replace with WebSocket later) ── */
  useEffect(() => {
    if (!running || activeIdx < 0 || activeIdx >= STAGES.length) return;

    intervalRef.current = setInterval(() => {
      setStageData((prev) => {
        const next = [...prev];
        const cur = { ...next[activeIdx] };

        if (cur.status === 'pending') {
          cur.status = 'active';
          cur.logs = [{ msg: `Initiated — ${cur.name}` }];
        }

        if (cur.health < 100) {
          const inc = Math.random() * 3.5 + 1.5;
          cur.health = Math.min(100, cur.health + inc);

          if (cur.health >= 25 && prev[activeIdx].health < 25)
            cur.logs = [...cur.logs, { msg: 'Gate 1 passed — initial validation' }];
          if (cur.health >= 50 && prev[activeIdx].health < 50)
            cur.logs = [...cur.logs, { msg: 'Gate 2 passed — core processing' }];
          if (cur.health >= 75 && prev[activeIdx].health < 75)
            cur.logs = [...cur.logs, { msg: 'Gate 3 passed — quality check' }];
        }

        if (cur.health >= 100) {
          cur.health = 100;
          cur.status = 'complete';
          cur.logs = [...cur.logs, { msg: `${cur.name} — ALL GATES PASSED` }];
        }

        next[activeIdx] = cur;
        return next;
      });
    }, 500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, activeIdx]);

  /* ── Advance to next stage ── */
  useEffect(() => {
    if (activeIdx >= 0 && activeIdx < STAGES.length && stageData[activeIdx]?.status === 'complete') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const nextIdx = activeIdx + 1;
      if (nextIdx < STAGES.length) {
        setTimeout(() => setActiveIdx(nextIdx), 600);
      } else {
        setRunning(false);
      }
    }
  }, [stageData, activeIdx]);

  /* ── Start build ── */
  const startBuild = useCallback(() => {
    setStageData(STAGES.map((s) => ({ ...s, status: 'pending' as const, health: 0, logs: [] })));
    setChangeOrders([]);
    setActiveIdx(0);
    setRunning(true);
    onStart?.();
  }, [onStart]);

  /* ── Change order submission ── */
  const submitCO = useCallback((text: string) => {
    const co: ChangeOrder = {
      id: changeOrders.length + 1,
      stage: stageData[activeIdx]?.name || '—',
      stageNum: stageData[activeIdx]?.num || 0,
      text,
      impact: text.length > 100 ? 'Major' : text.length > 40 ? 'Moderate' : 'Minor',
    };
    setChangeOrders((p) => [...p, co]);
    if (activeIdx >= 0 && activeIdx < STAGES.length) {
      setStageData((prev) =>
        prev.map((s, i) =>
          i === activeIdx
            ? { ...s, logs: [...s.logs, { msg: `CHANGE ORDER #${co.id}: ${text.slice(0, 50)}...` }] }
            : s
        )
      );
    }
  }, [activeIdx, changeOrders.length, stageData]);

  const overallPercent = stageData.reduce((sum, s) => sum + s.health, 0) / STAGES.length;

  return (
    <div className="relative">
      {/* Header bar */}
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-border">
        <span className="label-mono">Deploy by: ACHIEVEMOR</span>
        <div className="flex items-center gap-2">
          <span
            className={`font-mono text-[9px] font-bold tracking-[2px] ${
              running ? 'text-accent' : isComplete ? 'text-signal-live' : 'text-fg-ghost'
            }`}
          >
            {running ? 'CONSTRUCTING' : isComplete ? 'BAMARAM' : 'STANDBY'}
          </span>
          <span
            className={`led ${
              running ? 'bg-accent animate-pulse-dot' : isComplete ? 'led-live' : 'led-idle'
            }`}
          />
        </div>
      </div>

      {/* Hero */}
      <div className="mb-8">
        <h2 className="text-4xl font-black leading-none">
          PLUG ME IN<span className="text-accent">.</span>
        </h2>
        {!running && !isComplete && (
          <>
            <p className="text-sm text-fg-tertiary mt-2 mb-5 leading-relaxed">
              Your aiPLUG construction pipeline. Watch each stage build in real time.
            </p>
            <button onClick={startBuild} className="btn-solid tracking-wider">
              PLUG ME IN
            </button>
          </>
        )}
        {isComplete && (
          <div className="mt-2">
            <div className="font-mono text-sm text-signal-live font-bold mb-3">
              BUILD COMPLETE — ALL 10 STAGES PASSED
            </div>
            <button onClick={startBuild} className="btn-ghost text-xs">
              NEW BUILD
            </button>
          </div>
        )}
      </div>

      {/* Overall progress bar */}
      {(running || isComplete) && (
        <div className="mb-7">
          <div className="flex justify-between mb-1.5">
            <span className="label-mono">PIPELINE</span>
            <span className="font-mono text-[9px] text-accent font-bold">
              {Math.round(overallPercent)}%
            </span>
          </div>
          <div className="h-0.5 bg-border">
            <div
              className={`h-full transition-all duration-400 ${isComplete ? 'bg-signal-live' : 'bg-accent'}`}
              style={{ width: `${overallPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Stage cards — vertical connected flow */}
      {(running || isComplete) && (
        <div>
          {stageData.map((s, i) => (
            <div key={s.id}>
              <StageCard stage={s} onClick={() => {}} />
              {i < stageData.length - 1 && (
                <ConnectionLine
                  active={stageData[i + 1]?.status === 'active'}
                  complete={s.status === 'complete'}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Change order ledger */}
      {changeOrders.length > 0 && (
        <div className="mt-7 p-4 bg-bg-surface border border-border">
          <div className="label-mono text-signal-warn mb-3">CHANGE ORDER LEDGER</div>
          {changeOrders.map((co) => (
            <div key={co.id} className="p-2.5 mb-1.5 bg-bg-elevated border border-border">
              <div className="flex justify-between mb-1">
                <span className="font-mono text-[10px] font-bold text-signal-warn">
                  CO-{String(co.id).padStart(3, '0')}
                </span>
                <span
                  className={`font-mono text-[8px] px-1.5 py-0.5 font-extrabold tracking-wider ${
                    co.impact === 'Major'
                      ? 'bg-signal-error/10 text-signal-error'
                      : co.impact === 'Moderate'
                        ? 'bg-signal-warn/10 text-signal-warn'
                        : 'bg-signal-live/10 text-signal-live'
                  }`}
                >
                  {co.impact.toUpperCase()}
                </span>
              </div>
              <div className="text-xs text-fg-secondary leading-relaxed">{co.text}</div>
              <div className="font-mono text-[9px] text-fg-ghost mt-1">
                Stage {co.stageNum}: {co.stage}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="text-center mt-12 pt-5 border-t border-border">
        <div className="font-mono text-[8px] text-fg-ghost tracking-[2px]">
          DEPLOY BY: ACHIEVEMOR — RFP &rarr; BAMARAM v2.0
        </div>
      </div>

      {/* ACHEEVY floating status FAB */}
      <AcheevyStatus
        stages={stageData}
        activeIdx={activeIdx}
        changeOrders={changeOrders}
        onChangeOrder={submitCO}
        running={running}
        complete={isComplete}
      />
    </div>
  );
};

export default PipelineTracker;
