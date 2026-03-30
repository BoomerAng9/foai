'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Check, AlertCircle, Shield, ArrowRight } from 'lucide-react';

type Step = 'disclaimer' | 'signup' | 'redeeming' | 'success' | 'error';

function RedeemContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const keyFromUrl = searchParams.get('key') || '';
  const { user, signInWithOAuth } = useAuth();

  const [step, setStep] = useState<Step>('disclaimer');
  const [error, setError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  // Auto-redeem when user signs in with a key
  useEffect(() => {
    if (user && keyFromUrl && step === 'signup') {
      redeemKey();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function redeemKey() {
    setStep('redeeming');
    try {
      const res = await fetch('/api/access-keys/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: keyFromUrl.trim().toUpperCase() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Redemption failed');
        setStep('error');
      } else {
        setStep('success');
        setTimeout(() => router.replace('/auth/welcome'), 2500);
      }
    } catch {
      setError('Network error. Please try again.');
      setStep('error');
    }
  }

  async function handleGoogleSignIn() {
    setSigningIn(true);
    try {
      await signInWithOAuth('google');
      // onAuthStateChanged will fire, useEffect above handles redeem
    } catch {
      setError('Sign in failed. Try again.');
      setSigningIn(false);
    }
  }

  if (!keyFromUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="text-center px-6">
          <Shield className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Invalid Invite Link</h1>
          <p className="text-sm text-slate-400">This link is missing an access key. Ask the admin for a new invite.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.ico" alt="" className="w-10 h-10" />
          <span className="text-xl font-bold text-white tracking-tight font-mono">THE DEPLOY PLATFORM</span>
        </div>

        {/* Disclaimer */}
        {step === 'disclaimer' && (
          <div className="bg-[#111] border border-white/10 p-8">
            <h2 className="text-lg font-bold text-white mb-1">Welcome to the Beta Test</h2>
            <p className="text-xs text-slate-400 mb-6">You&apos;ve been invited to test an AI-native operations platform.</p>

            <div className="space-y-3 mb-8">
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-[#E8A020] mt-1.5 shrink-0" />
                <p className="text-sm text-slate-300">This is a <strong className="text-white">beta test environment</strong>. Things may break.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-[#E8A020] mt-1.5 shrink-0" />
                <p className="text-sm text-slate-300">Your <strong className="text-white">usage will be tracked</strong> to improve the platform.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-[#E8A020] mt-1.5 shrink-0" />
                <p className="text-sm text-slate-300">We may <strong className="text-white">collect feedback and analytics</strong> from your sessions.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-[#E8A020] mt-1.5 shrink-0" />
                <p className="text-sm text-slate-300"><strong className="text-white">Push the boundaries</strong> — we want to know what breaks.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('signup')}
                className="flex-1 h-12 bg-[#E8A020] text-black text-sm font-bold hover:bg-[#D4901A] transition-colors flex items-center justify-center gap-2"
              >
                ACCEPT & SIGN UP <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => router.replace('/')}
                className="px-6 h-12 border border-white/10 text-sm font-mono text-slate-400 hover:text-white hover:border-white/20 transition-colors"
              >
                DECLINE
              </button>
            </div>
          </div>
        )}

        {/* Signup */}
        {step === 'signup' && (
          <div className="bg-[#111] border border-white/10 p-8">
            <h2 className="text-lg font-bold text-white mb-2 text-center">Create Your Account</h2>
            <p className="text-xs text-slate-400 text-center mb-6">Sign up to activate your beta access.</p>

            <button
              onClick={handleGoogleSignIn}
              disabled={signingIn}
              className="w-full h-12 bg-white text-black text-sm font-bold hover:bg-gray-100 transition-colors flex items-center justify-center gap-3 mb-4"
            >
              {signingIn ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Continue with Google
                </>
              )}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
              <div className="relative flex justify-center"><span className="bg-[#111] px-3 text-[10px] text-slate-500 font-mono">OR</span></div>
            </div>

            <p className="text-center text-xs text-slate-500">
              Phone auth coming soon. Use Google for now.
            </p>

            <button
              onClick={() => setStep('disclaimer')}
              className="w-full mt-4 text-xs text-slate-500 hover:text-white transition-colors"
            >
              &larr; Back
            </button>
          </div>
        )}

        {/* Redeeming */}
        {step === 'redeeming' && (
          <div className="bg-[#111] border border-white/10 p-8 text-center">
            <div className="w-10 h-10 border-2 border-[#E8A020] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white font-bold">Activating your access...</p>
            <p className="text-xs text-slate-400 mt-1">Setting up your beta account</p>
          </div>
        )}

        {/* Success */}
        {step === 'success' && (
          <div className="bg-[#111] border border-white/10 p-8 text-center">
            <Check className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-lg font-bold text-white">You&apos;re In</p>
            <p className="text-xs text-slate-400 mt-1">Loading your walkthrough...</p>
          </div>
        )}

        {/* Error */}
        {step === 'error' && (
          <div className="bg-[#111] border border-white/10 p-8 text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-lg font-bold text-white mb-2">Something went wrong</p>
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={() => { setError(''); setStep('disclaimer'); }}
              className="mt-4 text-xs text-slate-400 hover:text-white transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        <p className="text-center text-[10px] text-slate-600 mt-6 font-mono">
          BUILT BY ACHIEVEMOR
        </p>
      </div>
    </div>
  );
}

export default function RedeemPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="w-8 h-8 border-2 border-[#E8A020] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RedeemContent />
    </Suspense>
  );
}
