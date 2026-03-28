"use client";

import React from 'react';
import { 
  BrainCircuit, 
  Database, 
  Zap, 
  HardDrive,
  Shapes,
  Maximize2
} from 'lucide-react';

export default function MemoryPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Memory</h1>
          <p className="text-sm text-slate-500 mt-1">Multi-modal knowledge and vector clustering</p>
        </div>
        <button className="flex items-center gap-2 bg-slate-900 border border-slate-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95">
          <Maximize2 className="w-4 h-4" />
          Cluster Graph View
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-lg">TLI Memory Distribution</h3>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold uppercase tracking-wider">Semantic</span>
              <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-lg text-xs font-bold uppercase tracking-wider">Associative</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-8">
            <div className="flex flex-col gap-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Vector Count</span>
              <span className="text-3xl font-bold text-slate-900">1.4M</span>
              <div className="w-full h-1 bg-slate-100 rounded-full mt-2 overflow-hidden">
                <div className="w-[65%] h-full bg-blue-500 rounded-full" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Recall Latency</span>
              <span className="text-3xl font-bold text-slate-900">12ms</span>
              <div className="w-full h-1 bg-slate-100 rounded-full mt-2 overflow-hidden">
                <div className="w-[12%] h-full bg-green-500 rounded-full" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Index Health</span>
              <span className="text-3xl font-bold text-slate-900">99.8%</span>
              <div className="w-full h-1 bg-slate-100 rounded-full mt-2 overflow-hidden">
                <div className="w-[99%] h-full bg-[#00A3FF] rounded-full" />
              </div>
            </div>
          </div>

          <div className="h-64 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex items-center justify-center relative overflow-hidden">
             {/* Mock Cluster Visual */}
             {[...Array(20)].map((_, i) => (
                <div 
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-[#00A3FF33] animate-pulse"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`
                  }}
                />
             ))}
             <Shapes className="w-12 h-12 text-slate-200 animate-spin-slow" />
             <p className="absolute bottom-4 text-[10px] font-mono text-slate-400 tracking-tighter">RENDER-ID: MEM_CLUSTER_392_ACTIVE</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col gap-6">
          <h3 className="font-bold text-slate-900">Memory Modules</h3>
          <div className="space-y-4">
            {[
              { name: 'Core Knowledge v2', size: '2.4 GB', icon: BrainCircuit, color: 'text-blue-500' },
              { name: 'User Preference Index', size: '142 MB', icon: Database, color: 'text-purple-500' },
              { name: 'Live Event Buffer', size: '4.2 GB', icon: Zap, color: 'text-amber-500' },
              { name: 'Technical Docs (TLI)', size: '840 MB', icon: HardDrive, color: 'text-green-500' },
            ].map((module, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer group">
                <div className={module.color + " bg-slate-50 p-3 rounded-xl group-hover:bg-white transition-colors border border-transparent group-hover:border-slate-100"}>
                  <module.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800">{module.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{module.size}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-auto w-full py-3 bg-slate-50 hover:bg-slate-100 rounded-2xl text-xs font-bold text-slate-600 uppercase tracking-widest transition-colors">
            Optimize Indices
          </button>
        </div>
      </div>
    </div>
  );
}
