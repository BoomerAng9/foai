"use client";

import React from 'react';
import { 
  Search, 
  Cpu, 
  Zap,
  Activity,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAgentFleet } from '@/hooks/useAgentFleet';

function getHealthWidthClass(health: number) {
  if (health >= 98) return 'w-full';
  if (health >= 95) return 'w-[95%]';
  if (health >= 90) return 'w-[90%]';
  if (health >= 80) return 'w-[80%]';
  return 'w-[70%]';
}

export default function AgentsPage() {
  const { organization } = useAuth();
  const { snapshot, loading, error } = useAgentFleet(
    organization?.id,
    'Add agents to this workload and push the runtime through launch.',
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Active Fleet</h1>
          <p className="text-sm text-slate-500 mt-1">Launch-facing agent workload and lifecycle management</p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Filter agents..." 
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00A3FF33] transition-all"
            />
          </div>
          <button className="bg-[#00A3FF] hover:bg-[#0089D9] text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-[#00A3FF33] transition-all active:scale-95">
            Refresh Fleet
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">Launch Snapshot</p>
              <h2 className="text-xl font-bold text-slate-900 mt-2">Workload is now agent-backed</h2>
              <p className="text-sm text-slate-500 mt-2 max-w-2xl">
                GRAMMAR now exposes a real fleet plan for the active organization, with explicit execution sequencing and launch blockers instead of static agent cards.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 min-w-40">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Launch Readiness</p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-3xl font-black text-slate-900">{loading ? '--' : `${snapshot.launchReadiness}%`}</span>
                <span className="text-xs font-bold text-emerald-600 mb-1">go-live score</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Active Agents', value: snapshot.activeAgents, icon: Activity },
              { label: 'Ready Agents', value: snapshot.readyAgents, icon: ShieldCheck },
              { label: 'Launch Blockers', value: snapshot.blockers.length, icon: AlertCircle },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-[#00A3FF] mb-4">
                  <item.icon className="w-5 h-5" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
                <p className="text-2xl font-black text-slate-900 mt-2">{loading ? '--' : item.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Recommended Workload</h3>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Governed Sequence</span>
            </div>
            <div className="divide-y divide-slate-100">
              {snapshot.recommendedSequence.map((step) => (
                <div key={`${step.agentId}-${step.step}`} className="p-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-[#00A3FF] text-white text-xs font-black flex items-center justify-center">{step.step}</span>
                      <h4 className="font-bold text-slate-900 capitalize">{step.role}</h4>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{step.capability}</span>
                    </div>
                    <p className="text-sm text-slate-600">{step.reason}</p>
                    <p className="text-xs text-slate-400">Expected output: {step.expectedOutput}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                    <span>{step.agentId}</span>
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900">Launch Blockers</h3>
              <p className="text-sm text-slate-500 mt-1">Items still preventing a clean launch handoff</p>
            </div>
            <AlertCircle className="w-5 h-5 text-amber-500" />
          </div>

          <div className="mt-5 space-y-3">
            {snapshot.blockers.map((blocker) => (
              <div key={blocker} className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-sm text-amber-900">
                {blocker}
              </div>
            ))}
            {!snapshot.blockers.length && !loading && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                No launch blockers are currently flagged.
              </div>
            )}
            {error && (
              <div className="rounded-2xl border border-red-100 bg-red-50/70 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {snapshot.agents.map((agent) => (
          <div key={agent.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-[#00A3FF66] transition-all group flex flex-col gap-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-[#00A3FF] transition-colors">
                  <Cpu className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{agent.name}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{agent.role}</p>
                </div>
              </div>
              <div className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest ${
                agent.workloadStatus === 'active'
                  ? 'bg-green-50 text-green-600' 
                  : agent.status === 'ready' || agent.status === 'running' ? 'bg-blue-50 text-blue-500' : 'bg-slate-100 text-slate-500'
              }`}>
                {agent.workloadStatus === 'active' ? 'Active' : agent.status}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Provider</span>
                <span className="font-semibold text-slate-900">{agent.provider}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Health Score</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full bg-green-500 rounded-full ${getHealthWidthClass(agent.health)}`} />
                  </div>
                  <span className="font-mono text-[10px] font-bold">{agent.health}%</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{agent.description}</p>
            </div>

            <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-center">Tasks Handled</span>
                <span className="text-lg font-bold text-slate-900 text-center">{agent.tasksHandled.toLocaleString()}</span>
              </div>
              <button className="flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-[10px] font-bold text-slate-600 tracking-widest transition-colors">
                <Zap className="w-3 h-3" />
                {agent.workloadStatus === 'active' ? 'IN WORKLOAD' : 'STANDBY'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
