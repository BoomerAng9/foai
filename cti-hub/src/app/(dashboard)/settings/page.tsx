"use client";

import Link from 'next/link';
import { ChevronRight, CreditCard, Settings2, ShieldCheck, User2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function SettingsPage() {
  const { profile, organization } = useAuth();
  const isOwnerView = profile?.role === 'admin' || profile?.role === 'operator';

  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-in fade-in duration-500">
      <div className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Account</p>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Simple settings for everyday use</h1>
        <p className="max-w-2xl text-sm font-medium leading-relaxed text-slate-500">
          Chat is the main surface. Account, billing, and workspace details stay here. Advanced runtime controls remain reserved for owner access.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <User2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Profile</p>
              <h2 className="text-lg font-bold text-slate-900">{profile?.display_name || 'Your account'}</h2>
            </div>
          </div>

          <div className="mt-6 space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span className="font-medium text-slate-500">Plan</span>
              <span className="font-bold capitalize text-slate-900">{profile?.tier || 'free'}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span className="font-medium text-slate-500">Workspace</span>
              <span className="font-bold text-slate-900">{organization?.name || 'Personal Workspace'}</span>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00A3FF] text-white">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Quick actions</p>
              <h2 className="text-lg font-bold text-slate-900">What you can manage here</h2>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <Link href="/chat/librechat" className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-50">
              Open chat
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </Link>
            <Link href="/pricing" className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-50">
              Manage billing
              <CreditCard className="h-4 w-4 text-slate-400" />
            </Link>
            {isOwnerView && (
              <Link href="/board" className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-50">
                Open command center
                <ShieldCheck className="h-4 w-4 text-slate-400" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}