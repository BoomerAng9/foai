"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { 
  Building2, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Zap,
  Globe
} from 'lucide-react';

export default function OnboardingPage() {
  const { user, profile, organization, loading, createOrg } = useAuth();
  const router = useRouter();
  const [orgName, setOrgName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1); // 1: Welcome/Naming, 2: Finalizing

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
    if (!loading && organization) {
       router.push('/board');
    }
  }, [user, organization, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setStep(2);
    try {
      await createOrg(orgName);
      // createOrg calls loadSession which sets organization, trigger useEffect redirect
    } catch (error) {
      console.error('Onboarding error:', error);
      setIsSubmitting(false);
      setStep(1);
    }
  };

  if (loading || organization) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#00A3FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00A3FF08] blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-[#6366F108] blur-[100px] rounded-full" />

      <div className="w-full max-w-xl relative z-10">
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#00A3FF]" />
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.2em]">Grammar Runtime</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            Welcome to the <span className="text-[#00A3FF]">Intelligence Layer.</span>
          </h1>
          <p className="text-slate-500 font-medium">
            Setting up your governed execution environment for {profile?.display_name || 'your team'}.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-xl p-10 relative overflow-hidden">
          {step === 1 ? (
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Name your Organization</h2>
                </div>

                <div className="relative group">
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Acme Research Lab"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#00A3FF11] focus:border-[#00A3FF] transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">Full Data Isolation</p>
                      <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">Dedicated MIM governance for your organization context.</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                    <Zap className="w-5 h-5 text-amber-500 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">Multi-Agent Slots</p>
                      <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">Assign roles across ACHEEVY and specialized Boomer_Angs.</p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={!orgName.trim() || isSubmitting}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-[0.2em] shadow-lg hover:shadow-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
              >
                Construct Environment
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          ) : (
            <div className="py-12 space-y-8 text-center animate-in fade-in zoom-in duration-500">
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-[2rem] flex items-center justify-center relative shadow-sm">
                   <div className="absolute inset-0 border-4 border-[#00A3FF] border-t-transparent rounded-[2rem] animate-spin" />
                   <Globe className="w-10 h-10 text-slate-300" />
                </div>
              </div>
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-slate-900 italic">Initializing Runtime Node...</h2>
                <div className="max-w-xs mx-auto space-y-2">
                  <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#00A3FF] w-1/2 animate-shimmer" />
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Provisioning Governed Context</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-slate-400 font-medium">
          By continuing, you agree to establish a governed GRAMMAR node under the MIM framework.
        </p>
      </div>
    </div>
  );
}
