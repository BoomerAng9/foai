"use client";

import React from 'react';
import { 
  Activity,
  Layers, 
  CheckSquare, 
  AlertCircle,
  Clock,
  Rocket,
  ShieldCheck,
} from 'lucide-react';
import { useSystemStatus } from '@/hooks/useSystemStatus';
import { useAuth } from '@/hooks/useAuth';
import { useAgentFleet } from '@/hooks/useAgentFleet';
import Link from 'next/link';

export default function BoardPage() {
  const { organization } = useAuth();
  const { stats, recentEvents } = useSystemStatus();
  const { snapshot } = useAgentFleet(
    organization?.id,
    'Add agents to this workload and push the runtime through launch.',
  );

  const mockActivity = [
    { action: "Deployment of TLI Module v1.2", status: "Completed", time: "2 mins ago" },
    { action: "Agent 'Picker_Ang' optimized routing", status: "Success", time: "14 mins ago" },
    { action: "MIM Policy Refresh - Global Context", status: "Pending", time: "1 hour ago" },
    { action: "Hardware scale detected - Scaling workers", status: "Active", time: "2 hours ago" }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Board</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time orchestration overview</p>
        </div>
        <Link href="/runtime" className="inline-flex items-center gap-2 rounded-2xl bg-[#00A3FF] px-4 py-2 text-sm font-bold text-white hover:bg-[#0089D9]">
          <Rocket className="w-4 h-4" />
          Open Launch Surface
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        {[
          { label: 'Active Jobs', value: stats.activeJobs.toString(), icon: Layers, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Checkpoints', value: stats.checkpoints.toString(), icon: CheckSquare, color: 'text-green-500', bg: 'bg-green-50' },
          { label: 'System Load', value: `${stats.systemLoad}%`, icon: Activity, color: 'text-purple-500', bg: 'bg-purple-50' },
          { label: 'Open Issues', value: stats.openIssues.toString(), icon: AlertCircle, color: 'text-slate-400', bg: 'bg-slate-50' },
          { label: 'Launch Readiness', value: `${snapshot.launchReadiness}%`, icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4">
            <div className={stat.bg + " w-10 h-10 rounded-xl flex items-center justify-center " + stat.color}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Recent Board Activity</h3>
            <button className="text-xs font-bold text-[#00A3FF] hover:underline uppercase tracking-widest">View All</button>
          </div>
          <div className="divide-y divide-slate-100">
            {(recentEvents.length > 0 ? recentEvents.map(e => ({ action: e.event, status: "Live", time: e.time })) : mockActivity).map((row, i) => (
              <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-slate-400" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">{row.action}</span>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{row.time}</span>
                  <span className="px-3 py-1 rounded-full bg-green-50 text-green-600 text-[10px] font-bold uppercase tracking-widest">
                    {row.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 bg-slate-50/30">
            <h3 className="font-bold text-slate-900">Launch Blockers</h3>
            <p className="text-sm text-slate-500 mt-1">Current blockers identified by the agent fleet.</p>
          </div>
          <div className="p-6 space-y-3">
            {snapshot.blockers.length ? snapshot.blockers.map((blocker) => (
              <div key={blocker} className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {blocker}
              </div>
            )) : (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                No blockers are currently flagged.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
