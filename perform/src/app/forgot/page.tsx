'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Auth } from 'firebase/auth';

/**
 * Per|Form password-reset request page (SHIP-CHECKLIST Gate 2 · Item 10).
 *
 * Posts email to Firebase Auth which emails a password-reset link. We never
 * disclose whether the email is registered (anti-enumeration): the UI shows
 * a generic "if your email is registered, you'll receive a link" regardless
 * of whether Firebase returned success or user-not-found. Only truly
 * exceptional failures (invalid-email format, network) are surfaced.
 */

async function getFirebaseAuth(): Promise<{
  auth: Auth;
  sendPasswordResetEmail: typeof import('firebase/auth').sendPasswordResetEmail;
}> {
  const { auth } = await import('@/lib/firebase/client');
  const { sendPasswordResetEmail } = await import('firebase/auth');
  return { auth, sendPasswordResetEmail };
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email) {
      setError('Enter the email for your account.');
      return;
    }
    setLoading(true);
    try {
      const fb = await getFirebaseAuth();
      await fb.sendPasswordResetEmail(fb.auth, email).catch(err => {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('invalid-email')) {
          throw new Error('That email address does not look right.');
        }
        // Swallow user-not-found, user-disabled, etc. to prevent enumeration.
      });
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not send reset email.');
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
            Reset your password
          </h1>
        </div>

        {submitted ? (
          <div className="text-center space-y-4">
            <p className="text-xs font-mono leading-relaxed" style={{ color: COLORS.text }}>
              If an account exists for <span style={{ color: COLORS.gold }}>{email}</span>, we just sent a reset link.
              Check your inbox (and spam folder).
            </p>
            <p className="text-[11px] font-mono" style={{ color: COLORS.textMuted }}>
              The link is valid for 1 hour.
            </p>
            <Link
              href="/login"
              className="inline-block mt-4 px-6 py-2.5 rounded-lg text-xs font-mono font-bold tracking-wider"
              style={{
                background: 'rgba(212,168,83,0.15)',
                color: COLORS.gold,
                border: '1px solid rgba(212,168,83,0.3)',
              }}
            >
              BACK TO SIGN IN
            </Link>
          </div>
        ) : (
          <>
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

            <form onSubmit={handleSubmit} className="space-y-4">
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
                {loading ? 'SENDING...' : 'SEND RESET LINK'}
              </button>
            </form>

            <div className="mt-6 text-center text-[11px] font-mono" style={{ color: COLORS.textMuted }}>
              Remembered it?{' '}
              <Link href="/login" className="underline" style={{ color: COLORS.gold }}>
                Sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
