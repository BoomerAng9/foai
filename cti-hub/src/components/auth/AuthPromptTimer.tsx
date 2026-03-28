'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

const PROMPT_DELAY_MS = 50_000;
const SESSION_DISMISS_KEY = 'cti_auth_prompt_dismissed';

export function AuthPromptTimer() {
  const { user, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (loading || user) return;
    if (typeof window !== 'undefined' && sessionStorage.getItem(SESSION_DISMISS_KEY) === '1') return;

    const timer = window.setTimeout(() => setIsOpen(true), PROMPT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [loading, user]);

  if (!isOpen || loading || user) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/45 backdrop-blur-sm p-4 flex items-center justify-center">
      <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        <div className="p-6 space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">The Deploy Platform</p>
          <h3 className="text-2xl font-bold text-slate-900">Sign in to access your workspace</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Create an account to manage enrollments, track open seats, and run AI-managed operations.
          </p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { sessionStorage.setItem(SESSION_DISMISS_KEY, '1'); setIsOpen(false); }}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 text-sm font-semibold hover:bg-slate-50"
            >
              Continue browsing
            </button>
            <Link
              href="/auth/login"
              className="flex-1 text-center px-4 py-2.5 rounded-xl bg-[#00A3FF] text-white text-sm font-bold hover:bg-[#0089D9]"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
