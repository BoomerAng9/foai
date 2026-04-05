'use client';

import { useState, useCallback } from 'react';
import {
  Monitor,
  Play,
  PlayCircle,
  Globe,
  MousePointer,
  Type,
  Eye,
  FileText,
  CheckCircle2,
  Loader2,
  Circle,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type StepStatus = 'pending' | 'running' | 'done';

interface AutomationStep {
  id: number;
  action: string;
  description: string;
  status: StepStatus;
}

/* ------------------------------------------------------------------ */
/*  Action icon helper                                                 */
/* ------------------------------------------------------------------ */

function actionIcon(action: string) {
  const cls = 'w-3.5 h-3.5 shrink-0';
  switch (action) {
    case 'navigate':
      return <Globe className={cls} />;
    case 'click':
      return <MousePointer className={cls} />;
    case 'type':
      return <Type className={cls} />;
    case 'read':
    case 'extract':
      return <Eye className={cls} />;
    case 'compile':
    case 'export':
      return <FileText className={cls} />;
    default:
      return <Play className={cls} />;
  }
}

/* ------------------------------------------------------------------ */
/*  Status LED                                                         */
/* ------------------------------------------------------------------ */

function StatusLED({ status }: { status: StepStatus }) {
  if (status === 'done') return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
  if (status === 'running')
    return <Loader2 className="w-4 h-4 text-accent animate-spin shrink-0" />;
  return <Circle className="w-4 h-4 text-fg-tertiary shrink-0" />;
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function AutomationPage() {
  const [task, setTask] = useState('');
  const [steps, setSteps] = useState<AutomationStep[]>([]);
  const [planning, setPlanning] = useState(false);
  const [running, setRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<number | null>(null);

  /* ---- Plan ---- */
  const handlePlan = useCallback(async () => {
    if (!task.trim()) return;
    setPlanning(true);
    setSteps([]);
    setCurrentStep(null);

    try {
      const res = await fetch('/api/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'plan', task }),
      });

      if (!res.ok) throw new Error('Plan request failed');
      const data = await res.json();

      const planned: AutomationStep[] = (data.steps ?? []).map(
        (s: { action: string; description: string }, i: number) => ({
          id: i + 1,
          action: s.action,
          description: s.description,
          status: 'pending' as StepStatus,
        }),
      );
      setSteps(planned);
    } catch {
      /* Fallback demo steps when API is not yet wired */
      setSteps([
        { id: 1, action: 'navigate', description: 'Open Google Maps and search for HVAC companies in Pooler GA', status: 'pending' },
        { id: 2, action: 'extract', description: 'Scrape business names, phone numbers, and ratings', status: 'pending' },
        { id: 3, action: 'navigate', description: 'Visit each company website for additional details', status: 'pending' },
        { id: 4, action: 'read', description: 'Extract services offered and contact information', status: 'pending' },
        { id: 5, action: 'compile', description: 'Compile results into a structured list', status: 'pending' },
        { id: 6, action: 'export', description: 'Format and deliver the final report', status: 'pending' },
      ]);
    } finally {
      setPlanning(false);
    }
  }, [task]);

  /* ---- Run all (animated placeholder) ---- */
  const handleRunAll = useCallback(async () => {
    if (steps.length === 0 || running) return;
    setRunning(true);

    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(i);
      setSteps((prev) =>
        prev.map((s, idx) =>
          idx === i ? { ...s, status: 'running' } : s,
        ),
      );

      // simulate work
      await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800));

      setSteps((prev) =>
        prev.map((s, idx) =>
          idx === i ? { ...s, status: 'done' } : s,
        ),
      );
    }

    setCurrentStep(null);
    setRunning(false);
  }, [steps, running]);

  /* ---- Derived ---- */
  const allDone = steps.length > 0 && steps.every((s) => s.status === 'done');

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-mono">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold tracking-wider text-fg">AUTOMATION</h1>
        <p className="text-xs text-fg-tertiary mt-1 tracking-wide">
          Watch AI handle your tasks autonomously
        </p>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left — Task input + Steps */}
        <div className="space-y-4">
          {/* Task input */}
          <div className="bg-bg-surface border border-border p-4 space-y-3">
            <label className="text-[11px] font-semibold tracking-wider text-fg-secondary uppercase">
              Describe your task
            </label>
            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              rows={4}
              placeholder="e.g. Research HVAC companies in Pooler GA and compile a list"
              className="w-full bg-bg border border-border text-fg text-xs p-3 resize-none focus:outline-none focus:border-accent placeholder:text-fg-tertiary font-mono"
            />
            <button
              onClick={handlePlan}
              disabled={planning || !task.trim()}
              className="w-full py-2.5 text-[11px] font-bold tracking-widest uppercase bg-accent text-bg hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {planning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  PLANNING...
                </>
              ) : (
                <>
                  <Monitor className="w-3.5 h-3.5" />
                  EXECUTE
                </>
              )}
            </button>
          </div>

          {/* Steps panel */}
          {steps.length > 0 && (
            <div className="bg-bg-surface border border-border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-wider text-fg-secondary uppercase">
                  Planned steps
                </span>
                <span className="text-[10px] text-fg-tertiary">
                  {steps.filter((s) => s.status === 'done').length}/{steps.length} complete
                </span>
              </div>

              {/* Timeline */}
              <div className="relative space-y-0">
                {steps.map((step, idx) => (
                  <div key={step.id} className="relative flex items-start gap-3 group">
                    {/* Vertical line */}
                    {idx < steps.length - 1 && (
                      <div className="absolute left-[7.5px] top-5 bottom-0 w-px bg-border" />
                    )}

                    {/* LED */}
                    <div className="relative z-10 mt-0.5">
                      <StatusLED status={step.status} />
                    </div>

                    {/* Content */}
                    <div
                      className={`flex-1 pb-4 ${
                        step.status === 'running' ? 'text-accent' : step.status === 'done' ? 'text-fg' : 'text-fg-secondary'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-bold tracking-wider uppercase opacity-60">
                          {step.id}.
                        </span>
                        {actionIcon(step.action)}
                        <span className="text-[10px] font-semibold tracking-wider uppercase bg-bg-elevated border border-border px-1.5 py-0.5">
                          {step.action}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Run All */}
              <button
                onClick={handleRunAll}
                disabled={running || allDone}
                className="w-full py-2.5 text-[11px] font-bold tracking-widest uppercase border border-accent text-accent hover:bg-accent hover:text-bg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {running ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    RUNNING STEP {(currentStep ?? 0) + 1} OF {steps.length}...
                  </>
                ) : allDone ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    ALL STEPS COMPLETE
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-3.5 h-3.5" />
                    RUN ALL
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Right — Live browser preview */}
        <div className="bg-bg-surface border border-border flex flex-col">
          {/* Preview header */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
            <Monitor className="w-3.5 h-3.5 text-fg-tertiary" />
            <span className="text-[11px] font-semibold tracking-wider text-fg-secondary uppercase">
              Live preview
            </span>
            {running && (
              <span className="ml-auto flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <span className="text-[10px] text-accent tracking-wider font-semibold">ACTIVE</span>
              </span>
            )}
          </div>

          {/* Preview area */}
          <div className="flex-1 min-h-[320px] lg:min-h-[480px] flex items-center justify-center p-6 bg-bg">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto border-2 border-dashed border-border flex items-center justify-center">
                <Globe className="w-6 h-6 text-fg-tertiary" />
              </div>
              <p className="text-xs text-fg-tertiary leading-relaxed max-w-xs">
                Browser view will appear here when connected
              </p>
              <p className="text-[10px] text-fg-tertiary opacity-60">
                Playwright session streams live to this panel
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
