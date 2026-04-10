'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Auth } from 'firebase/auth';

async function getFirebaseAuth(): Promise<{ auth: Auth; signInWithPopup: typeof import('firebase/auth').signInWithPopup; GoogleAuthProvider: typeof import('firebase/auth').GoogleAuthProvider; signInWithEmailAndPassword: typeof import('firebase/auth').signInWithEmailAndPassword }> {
  const { auth } = await import('@/lib/firebase/client');
  const { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword } = await import('firebase/auth');
  return { auth, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword };
}

const COLORS = {
  bg: '#0A0A0F',
  surface: '#111118',
  gold: '#D4A853',
  goldBorder: 'rgba(212,168,83,0.2)',
  goldGlow: 'rgba(212,168,83,0.08)',
  textMuted: 'rgba(255,255,255,0.4)',
  text: 'rgba(255,255,255,0.9)',
  error: '#EF4444',
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ background: COLORS.bg, minHeight: '100vh' }} />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function postSession(idToken: string) {
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: idToken }),
    });
    if (!res.ok) throw new Error('Failed to create session');
  }

  async function handleGoogle() {
    setError('');
    setLoading(true);
    try {
      const fb = await getFirebaseAuth();
      const provider = new fb.GoogleAuthProvider();
      const result = await fb.signInWithPopup(fb.auth, provider);
      const idToken = await result.user.getIdToken();
      await postSession(idToken);
      router.push(redirectTo);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    setLoading(true);
    try {
      const fb = await getFirebaseAuth();
      const result = await fb.signInWithEmailAndPassword(fb.auth, email, password);
      const idToken = await result.user.getIdToken();
      await postSession(idToken);
      router.push(redirectTo);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign-in failed';
      if (message.includes('user-not-found') || message.includes('wrong-password') || message.includes('invalid-credential')) {
        setError('Invalid email or password');
      } else if (message.includes('too-many-requests')) {
        setError('Too many attempts. Try again later.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: COLORS.bg,
      }}
    >
      {/* Radial glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 600px 400px at 50% 30%, rgba(212,168,83,0.06), transparent)',
        }}
      />

      <div
        className="relative z-10 w-full max-w-md rounded-2xl p-8"
        style={{
          background: COLORS.surface,
          border: `1px solid ${COLORS.goldBorder}`,
          boxShadow: '0 0 80px rgba(212,168,83,0.05)',
        }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <span
            className="text-[10px] font-mono tracking-[0.4em] block mb-3"
            style={{ color: COLORS.textMuted }}
          >
            PER|FORM INTELLIGENCE
          </span>
          <h1
            className="font-outfit text-2xl font-extrabold tracking-tight"
            style={{ color: COLORS.gold }}
          >
            Sign in to Per|Form
          </h1>
        </div>

        {/* Error */}
        {error && (
          <div
            className="mb-6 px-4 py-3 rounded-lg text-xs font-mono"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: COLORS.error,
            }}
          >
            {error}
          </div>
        )}

        {/* Google Sign In */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-mono text-xs font-bold tracking-wider transition-all duration-200 hover:brightness-110 mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: COLORS.text,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 1 12c0 1.94.46 3.77 1.18 5.07l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          CONTINUE WITH GOOGLE
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px" style={{ background: COLORS.goldBorder }} />
          <span className="text-[10px] font-mono tracking-wider" style={{ color: COLORS.textMuted }}>
            OR
          </span>
          <div className="flex-1 h-px" style={{ background: COLORS.goldBorder }} />
        </div>

        {/* Email / Password Form */}
        <form onSubmit={handleEmail} className="space-y-4">
          <div>
            <label
              className="block text-[10px] font-mono tracking-wider mb-1.5"
              style={{ color: COLORS.textMuted }}
            >
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 rounded-lg font-mono text-xs outline-none transition-colors focus:ring-1"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${COLORS.goldBorder}`,
                color: COLORS.text,
              }}
            />
          </div>

          <div>
            <label
              className="block text-[10px] font-mono tracking-wider mb-1.5"
              style={{ color: COLORS.textMuted }}
            >
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-2.5 rounded-lg font-mono text-xs outline-none transition-colors focus:ring-1"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${COLORS.goldBorder}`,
                color: COLORS.text,
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 rounded-xl font-mono text-xs font-bold tracking-[0.2em] transition-all duration-200 hover:brightness-110 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: COLORS.gold,
              color: COLORS.bg,
              boxShadow: '0 0 40px rgba(212,168,83,0.2)',
            }}
          >
            {loading ? 'SIGNING IN...' : 'SIGN IN'}
          </button>
        </form>
      </div>
    </div>
  );
}
