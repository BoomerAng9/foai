'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/lib/auth-paywall';
import { ArrowRight, Github, Eye, EyeOff } from 'lucide-react';
// CTI HUB login

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextRoute = searchParams.get('redirectTo') || '/board';
  
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        await authService.signUp(email, password, displayName);
        setMessage('Check your email to confirm your account.');
      } else {
        await authService.signIn(email, password);
        router.replace(nextRoute);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: 'google' | 'github') {
    try {
      await authService.signInWithOAuth(provider);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'OAuth failed');
    }
  }

  return (
    <div className="min-h-screen flex bg-[#F9FAFB] font-sans">
      {/* Left: Brand Panel */}
      <div className="hidden lg:flex lg:w-[480px] bg-white border-r border-[#E5E7EB] flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-[#00A3FF] flex items-center justify-center text-white text-lg font-black">C</div>
            <span className="text-2xl font-bold tracking-tight text-slate-900">CTI HUB</span>
          </div>

          <h1 className="text-3xl font-bold leading-tight mb-4 text-slate-900 font-sans tracking-tight">
            AI-Managed Solutions<br />for Education.
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed max-w-sm font-medium">
            MindEdge enrollments, Open Seat contracting, and workforce development —
            managed by autonomous AI agents through one command surface.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span>All systems operational</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
            <span>CTI HUB</span>
            <span>&middot;</span>
            <span>FOAI-AIMS</span>
          </div>
        </div>
      </div>

      {/* Right: Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-8 h-8 rounded-lg bg-[#00A3FF] flex items-center justify-center text-white text-sm font-black">C</div>
            <span className="text-lg font-bold tracking-tight text-slate-900">CTI HUB</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight">
            {mode === 'signin' ? 'Welcome back' : 'Create your CTI HUB account'}
          </h2>
          <p className="text-sm text-slate-500 mb-8 font-medium">
            {mode === 'signin'
              ? 'Sign in to access your workspace.'
              : 'Start with the free tier. Upgrade anytime.'}
          </p>

          {/* OAuth Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              className="flex items-center justify-center gap-2 h-11 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuth('github')}
              className="flex items-center justify-center gap-2 h-11 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
            >
              <Github className="w-4 h-4" />
              GitHub
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <span className="bg-[#F9FAFB] px-3">or continue with email</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00A3FF]/30 focus:border-[#00A3FF] transition-all shadow-sm"
                  placeholder="Your name"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00A3FF]/30 focus:border-[#00A3FF] transition-all shadow-sm"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full h-11 px-4 pr-11 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00A3FF]/30 focus:border-[#00A3FF] transition-all shadow-sm"
                  placeholder="Min 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 font-medium">
                {error}
              </div>
            )}
            {message && (
              <div className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 font-medium">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-[#00A3FF] text-white text-sm font-bold hover:bg-[#0089D9] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#00A3FF33]"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'signin' ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle mode */}
          <p className="text-center text-sm text-slate-500 mt-6">
            {mode === 'signin' ? (
              <>
                Don&apos;t have an account?{' '}
                <button onClick={() => { setMode('signup'); setError(''); }} className="text-[#00A3FF] font-medium hover:underline">
                  Sign up free
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button onClick={() => { setMode('signin'); setError(''); }} className="text-[#00A3FF] font-medium hover:underline">
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}


export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F9FAFB]" />}>
      <LoginPageContent />
    </Suspense>
  );
}
