"use client";

import React, { useState } from 'react';
import { Check, Sparkles, Shield, Rocket } from 'lucide-react';
import { toast } from 'sonner';
import { PLAN_CONFIG } from '@/lib/billing/plans';
import { useAuth } from '@/hooks/useAuth';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function PricingPage() {
  const { profile } = useAuth();
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);
  
  const handleUpgrade = async (plan: string) => {
    setPendingPlan(plan);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to start checkout.');
      }

      if (!payload?.url || typeof payload.url !== 'string') {
        throw new Error('Stripe did not return a checkout URL.');
      }

      window.location.href = payload.url;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start checkout.';
      toast.error(message);
      setPendingPlan(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-700">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Select your Fuel Grade</h1>
        <p className="text-slate-500 max-w-2xl mx-auto font-medium">
          Scale your research capabilities with GRAMMAR&apos;s agentic infrastructure. 
          Governed, neutralized, and optimized for enterprise-grade action.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {Object.entries(PLAN_CONFIG).map(([key, plan]) => {
          const isCurrent = profile?.tier === key;
          
          return (
            <div 
              key={key} 
              className={cn(
                "relative bg-white border rounded-[2.5rem] p-8 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 flex flex-col gap-8",
                plan.highlight 
                  ? "border-[#00A3FF] shadow-xl shadow-[#00A3FF11] ring-1 ring-[#00A3FF33]" 
                  : "border-slate-200"
              )}
            >
              {plan.highlight && (
                <div className="absolute -top-4 inset-x-0 flex justify-center">
                  <span className="bg-gradient-to-r from-[#00A3FF] to-[#0089D9] text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
                    Highest Neutralization
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{plan.name}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">{plan.price}</span>
                  <span className="text-slate-500 text-sm font-medium">{plan.period}</span>
                </div>
              </div>

              <div className="space-y-4 flex-1">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center",
                      plan.highlight ? "bg-[#00A3FF1A] text-[#00A3FF]" : "bg-slate-100 text-slate-400"
                    )}>
                      <Check className="w-3 h-3" />
                    </div>
                    <span className="text-sm font-medium text-slate-600">{feature}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => !isCurrent && handleUpgrade(key)}
                disabled={isCurrent || key === 'enterprise' || pendingPlan === key}
                className={cn(
                  "w-full py-4 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] shadow-lg",
                  isCurrent 
                    ? "bg-slate-100 text-slate-400 cursor-default" 
                    : plan.highlight
                      ? "bg-[#00A3FF] text-white shadow-[#00A3FF33] hover:shadow-[#00A3FF55] hover:scale-[1.02]"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                )}
              >
                {isCurrent ? 'Current Plan' : pendingPlan === key ? 'Redirecting…' : plan.cta}
              </button>
            </div>
          );
        })}
      </div>

      {/* Trust & Governance Section */}
      <div className="bg-[#0F172A] rounded-[3rem] p-12 text-white overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#00A3FF] blur-[150px] opacity-10 group-hover:opacity-20 transition-opacity duration-1000" />
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
              <Shield className="w-4 h-4 text-[#00A3FF]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#00A3FF]">MIM Governance Protocol</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Enterprise Trust is Built-In by Design.</h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                </div>
                <h4 className="text-sm font-bold">Encrypted Intent</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed">All human intent is neutralized and encrypted before orchestration.</p>
              </div>
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                  <Rocket className="w-5 h-5 text-emerald-400" />
                </div>
                <h4 className="text-sm font-bold">Parallel Scaling</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed">Execute hundreds of agentic tasks in parallel with dedicated throughput.</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">Throughput Status</span>
              <span className="text-[10px] font-mono text-emerald-400 uppercase">Optimized</span>
            </div>
            <div className="space-y-4">
              {[
                { label: 'TLI Neural Mapping', value: 98 },
                { label: 'Context Governance', value: 100 },
                { label: 'Agent Coordination', value: 95 }
              ].map((item, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400 font-bold uppercase">{item.label}</span>
                    <span className="text-white font-mono">{item.value}%</span>
                  </div>
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" 
                      style={{ width: `${item.value}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-[#00A3FF1A] rounded-2xl border border-[#00A3FF33]">
              <p className="text-[10px] font-medium text-[#00A3FF] leading-relaxed">
                Enterprise users receive dedicated VM instances for maximum computation performance and tenant isolation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
