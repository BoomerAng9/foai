'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { Auth } from 'firebase/auth';

/**
 * Per|Form sign-up page (SHIP-CHECKLIST Gate 2 · Item 8).
 *
 * Flow:
 *   1. Email + password (>=8) + name + ToS/Privacy consent checkbox (MIM §45)
 *   2. createUserWithEmailAndPassword → Firebase creates the account
 *   3. sendEmailVerification → Firebase emails a verification link (β enforces)
 *   4. POST /api/auth/session → server sets httpOnly cookie
 *   5. Redirect to /dashboard (or ?redirect= target)
 *
 * Google OAuth is also available — same consent/TOS is implied by Google's
 * own ToS surface, so we don't require an extra checkbox there.
 */

async function getFirebaseAuth(): Promise<{
  auth: Auth;
  signInWithPopup: typeof import('firebase/auth').signInWithPopup;
  GoogleAuthProvider: typeof import('firebase/auth').GoogleAuthProvider;
  createUserWithEmailAndPassword: typeof import('firebase/auth').createUserWithEmailAndPassword;
  sendEmailVerification: typeof import('firebase/auth').sendEmailVerification;
  updateProfile: typeof import('firebase/auth').updateProfile;
}> {
  const { auth } = await import('@/lib/firebase/client');
  const {
    signInWithPopup,
    GoogleAuthProvider,
    createUserWithEmailAndPassword,
    sendEmailVerification,
    updateProfile,
  } = await import('firebase/auth');
  return {
    auth,
    signInWithPopup,
    GoogleAuthProvider,
    createUserWithEmailAndPassword,
    sendEmailVerification,
    updateProfile,
  };
}

const COLORS = {
  bg: 'var(--pf-bg)',
  surface: '#111118',
  gold: '#D4A853',
  goldBorder: 'rgba(212,168,83,0.2)',
  textMuted: 'rgba(255,255,255,0.4)',
  text: 'rgba(255,255,255,0.9)',
  error: '#EF4444',
};

const MIN_PASSWORD_LENGTH = 8;

export default function SignupPage() {
  return (
    <Suspense fallback={<div style={{ background: COLORS.bg, minHeight: '100vh' }} />}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirect');
  const redirectTo =
    rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') && !rawRedirect.includes('://')
      ? rawRedirect
      : '/dashboard';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
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
      setError(err instanceof Error ? err.message : 'Google sign-up failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email || !password || !name) {
      setError('Name, email, and password are required');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (!consent) {
      setError('You must accept the Terms of Service and Privacy Policy');
      return;
    }

    setLoading(true);
    try {
      const fb = await getFirebaseAuth();
      const result = await fb.createUserWithEmailAndPassword(fb.auth, email, password);
      await fb.updateProfile(result.user, { displayName: name }).catch(() => {
        // Non-fatal — account exists, display name is cosmetic.
      });
      await fb.sendEmailVerification(result.user).catch(() => {
        // Non-fatal on sign-up path — β PR enforces verification at paid actions.
      });
      const idToken = await result.user.getIdToken();
      await postSession(idToken);
      router.push(redirectTo);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign-up failed';
      if (msg.includes('email-already-in-use')) {
        setError('An account with this email already exists. Try signing in.');
      } else if (msg.includes('invalid-email')) {
        setError('That email address does not look right.');
      } else if (msg.includes('weak-password')) {
        setError('Password is too weak. Use at least 8 characters with a mix of letters and numbers.');
      } else if (msg.includes('too-many-requests')) {
        setError('Too many attempts. Try again later.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: COLORS.bg }}>
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 600px 400px at 50% 30%, rgba(212,168,83,0.06), transparent)' }}
      />

      <div
        className="relative z-10 w-full max-w-md rounded-2xl p-8"
        style={{
          background: COLORS.surface,
          border: `1px solid ${COLORS.goldBorder}`,
          boxShadow: '0 0 80px rgba(212,168,83,0.05)',
        }}
      >
        <div className="text-center mb-8">
          <span className="text-[10px] font-mono tracking-[0.4em] block mb-3" style={{ color: COLORS.textMuted }}>
            PER|FORM INTELLIGENCE
          </span>
          <h1 className="font-outfit text-2xl font-extrabold tracking-tight" style={{ color: COLORS.gold }}>
            Create your account
          </h1>
        </div>

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

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px" style={{ background: COLORS.goldBorder }} />
          <span className="text-[10px] font-mono tracking-wider" style={{ color: COLORS.textMuted }}>OR</span>
          <div className="flex-1 h-px" style={{ background: COLORS.goldBorder }} />
        </div>

        <form onSubmit={handleEmail} className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono tracking-wider mb-1.5" style={{ color: COLORS.textMuted }}>
              NAME
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
              className="w-full px-4 py-2.5 rounded-lg font-mono text-xs outline-none transition-colors focus:ring-1"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${COLORS.goldBorder}`,
                color: COLORS.text,
              }}
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono tracking-wider mb-1.5" style={{ color: COLORS.textMuted }}>
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full px-4 py-2.5 rounded-lg font-mono text-xs outline-none transition-colors focus:ring-1"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${COLORS.goldBorder}`,
                color: COLORS.text,
              }}
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono tracking-wider mb-1.5" style={{ color: COLORS.textMuted }}>
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              autoComplete="new-password"
              className="w-full px-4 py-2.5 rounded-lg font-mono text-xs outline-none transition-colors focus:ring-1"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${COLORS.goldBorder}`,
                color: COLORS.text,
              }}
            />
            <p className="mt-1.5 text-[10px] font-mono" style={{ color: COLORS.textMuted }}>
              {password.length > 0 && password.length < MIN_PASSWORD_LENGTH
                ? `${MIN_PASSWORD_LENGTH - password.length} more characters needed`
                : `Minimum ${MIN_PASSWORD_LENGTH} characters`}
            </p>
          </div>

          <label className="flex items-start gap-3 text-xs cursor-pointer" style={{ color: COLORS.textMuted }}>
            <input
              type="checkbox"
              checked={consent}
              onChange={e => setConsent(e.target.checked)}
              className="mt-0.5 accent-amber-600"
            />
            <span className="leading-relaxed">
              I agree to the{' '}
              <Link href="/legal/tos" className="underline" style={{ color: COLORS.gold }} target="_blank">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/legal/privacy" className="underline" style={{ color: COLORS.gold }} target="_blank">
                Privacy Policy
              </Link>
              .
            </span>
          </label>

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
            {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <div className="mt-6 text-center text-[11px] font-mono" style={{ color: COLORS.textMuted }}>
          Already have an account?{' '}
          <Link href="/login" className="underline" style={{ color: COLORS.gold }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
