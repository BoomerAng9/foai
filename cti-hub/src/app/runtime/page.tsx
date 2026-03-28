'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Rocket, ShieldCheck, Activity, ArrowRight, Package, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface RuntimeLaunchResponse {
  mode: 'preview' | 'execute';
  snapshot: {
    launchReadiness: number;
    blockers: string[];
    recommendedSequence: Array<{
      step: number;
      role: string;
      capability: string;
      reason: string;
      expectedOutput: string;
      agentId: string;
    }>;
  };
  state: {
    status: string;
    checkpoints: string[];
  };
  bundle?: {
    retrieval_path: string;
  } | null;
  success?: boolean;
  error?: string;
}

export default function RuntimePage() {
  const { organization } = useAuth();
  const [intent, setIntent] = useState('Add agents to this workload, clear launch blockers, and prepare the governed runtime for release.');
  const [loading, setLoading] = useState<'preview' | 'execute' | null>(null);
  const [result, setResult] = useState<RuntimeLaunchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runLaunch(mode: 'preview' | 'execute') {
    try {
      setLoading(mode);
      setError(null);

      const response = await fetch('/api/runtime/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          intent,
          orgId: organization?.id ?? 'demo-org',
        }),
      });

      const payload = (await response.json()) as RuntimeLaunchResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'Runtime launch failed');
      }

      setResult(payload);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Runtime launch failed');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-slate-900">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-12">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              <Rocket className="w-3.5 h-3.5 text-[#00A3FF]" />
              Runtime Launch Surface
            </div>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Govern the fleet, preview the launch, then execute.</h1>
            <p className="text-base text-slate-600 max-w-2xl">
              This surface runs the ACHEEVY huddle against the active organization, resolves the fleet plan, and can execute the governed launch loop end-to-end.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/agents" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
              Agent Fleet
            </Link>
            <Link href="/board" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
              System Board
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm space-y-6">
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Launch Intent</label>
              <textarea
                value={intent}
                onChange={(event) => setIntent(event.target.value)}
                rows={6}
                title="Launch intent"
                placeholder="Describe the workload you want the governed runtime to launch."
                className="mt-3 w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-medium text-slate-900 outline-none focus:border-[#00A3FF]"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                title="Preview launch plan"
                onClick={() => void runLaunch('preview')}
                disabled={loading !== null}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-4 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                {loading === 'preview' ? 'Previewing...' : 'Preview Launch'}
              </button>
              <button
                type="button"
                title="Execute governed launch"
                onClick={() => void runLaunch('execute')}
                disabled={loading !== null}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#00A3FF] px-6 py-4 text-sm font-bold text-white hover:bg-[#0089D9] disabled:opacity-50"
              >
                <ArrowRight className="w-4 h-4" />
                {loading === 'execute' ? 'Executing...' : 'Execute Launch'}
              </button>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Launch Status</h2>
              <Activity className="w-5 h-5 text-[#00A3FF]" />
            </div>

            {result ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Readiness</p>
                    <p className="mt-2 text-3xl font-black text-slate-900">{result.snapshot.launchReadiness}%</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Runtime State</p>
                    <p className="mt-2 text-3xl font-black capitalize text-slate-900">{result.state.status}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Blockers</p>
                  <div className="mt-3 space-y-2">
                    {result.snapshot.blockers.length ? result.snapshot.blockers.map((blocker) => (
                      <div key={blocker} className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex gap-2">
                        <AlertCircle className="mt-0.5 w-4 h-4 shrink-0" />
                        <span>{blocker}</span>
                      </div>
                    )) : <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">No blockers are currently flagged.</div>}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Bundle</p>
                  <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700 flex items-center gap-2">
                    <Package className="w-4 h-4 text-slate-400" />
                    {result.bundle?.retrieval_path ?? 'Preview mode: no bundle created yet.'}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-sm text-slate-500">
                Run a preview to generate a governed launch plan.
              </div>
            )}
          </section>
        </div>

        {result && (
          <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Resolved Workload</h2>
            <div className="mt-6 space-y-4">
              {result.snapshot.recommendedSequence.map((step) => (
                <div key={`${step.agentId}-${step.step}`} className="flex flex-col gap-3 rounded-2xl border border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00A3FF] text-xs font-black text-white">{step.step}</span>
                      <h3 className="font-bold capitalize text-slate-900">{step.role}</h3>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{step.capability}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{step.reason}</p>
                    <p className="mt-1 text-xs text-slate-400">Expected output: {step.expectedOutput}</p>
                  </div>
                  <div className="text-sm font-bold text-slate-500">{step.agentId}</div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}