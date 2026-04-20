'use client';

/**
 * AuthForm — sign-in / sign-up / reset flows in a single form.
 *
 * Glassmorphic card matching the discovery canvas aesthetic. Supports
 * Firebase email+password and Google OAuth. Post-success redirects the
 * caller to the `returnTo` query param or '/' by default.
 */

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/hooks/useAuth';

export type AuthMode = 'sign-in' | 'sign-up';

export interface AuthFormProps {
  mode: AuthMode;
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') ?? '/';

  const { signInEmail, signUpEmail, signInGoogle, resetPassword, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localNotice, setLocalNotice] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setLocalNotice(null);
    try {
      if (mode === 'sign-in') {
        await signInEmail(email, password);
      } else {
        await signUpEmail(email, password);
      }
      router.push(returnTo);
    } catch {
      // error is surfaced via useAuth().error
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogle = async () => {
    if (submitting) return;
    setSubmitting(true);
    setLocalNotice(null);
    try {
      await signInGoogle();
      router.push(returnTo);
    } catch {
      /* surfaced via error */
    } finally {
      setSubmitting(false);
    }
  };

  const onReset = async () => {
    if (!email) {
      setLocalNotice('Enter your email first, then click Reset.');
      return;
    }
    try {
      await resetPassword(email);
      setLocalNotice(`Password reset email sent to ${email}.`);
    } catch {
      /* surfaced via error */
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      className="w-[360px] rounded-2xl border backdrop-blur-2xl overflow-hidden"
      style={{
        background: 'var(--panel-bg)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--panel-shadow)',
      }}
    >
      <div
        className="px-5 pt-4 pb-3 border-b"
        style={{ borderColor: 'var(--divider)' }}
      >
        <div
          className="text-zinc-500 mb-0.5"
          style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 9, letterSpacing: '0.22em' }}
        >
          DESTINATIONS AI
        </div>
        <h1 className="text-white font-bold tracking-tight text-[22px] leading-tight">
          {mode === 'sign-in' ? 'Sign in to continue' : 'Create your account'}
        </h1>
        <p className="text-zinc-500 text-xs mt-1">
          {mode === 'sign-in'
            ? 'Resume your shortlist, intentions, and waitlist notifications.'
            : 'Start your relocation discovery with a saved workspace.'}
        </p>
      </div>

      <form onSubmit={submit} className="p-5 space-y-3">
        <Field label="EMAIL">
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-transparent text-white text-sm outline-none"
            placeholder="name@domain.tld"
          />
        </Field>
        <Field label="PASSWORD">
          <input
            type="password"
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-transparent text-white text-sm outline-none"
            placeholder={mode === 'sign-in' ? 'your password' : 'at least 6 characters'}
          />
        </Field>

        {error && <Notice tone="error">{error}</Notice>}
        {localNotice && <Notice tone="info">{localNotice}</Notice>}

        <motion.button
          type="submit"
          disabled={submitting}
          whileHover={{ scale: submitting ? 1 : 1.02 }}
          whileTap={{ scale: submitting ? 1 : 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="w-full py-2.5 rounded-xl border text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          style={{
            background: 'linear-gradient(180deg, rgba(255,107,0,0.3), rgba(255,107,0,0.12))',
            borderColor: 'rgba(255,107,0,0.55)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 0 18px rgba(255,107,0,0.25)',
          }}
        >
          {submitting
            ? mode === 'sign-in'
              ? 'Signing in…'
              : 'Creating account…'
            : mode === 'sign-in'
            ? 'Sign in'
            : 'Create account'}
        </motion.button>

        <div
          className="flex items-center gap-3 text-zinc-600"
          style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 9, letterSpacing: '0.18em' }}
        >
          <div className="flex-1 h-px bg-white/10" />
          OR
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <motion.button
          type="button"
          onClick={onGoogle}
          disabled={submitting}
          whileHover={{ scale: submitting ? 1 : 1.02 }}
          whileTap={{ scale: submitting ? 1 : 0.98 }}
          className="w-full py-2.5 rounded-xl border border-white/12 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          style={{
            background: 'rgba(255,255,255,0.04)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#EA4335" d="M9 3.48c1.69 0 3.2.58 4.39 1.72l3.29-3.29C14.64.87 12.01 0 9 0 5.48 0 2.44 2.02.96 4.96l3.82 2.97C5.49 5.65 7.08 3.48 9 3.48z" />
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.12-.84 2.07-1.79 2.71l2.9 2.26C16.57 14.21 17.64 11.92 17.64 9.2z" />
            <path fill="#FBBC05" d="M4.78 10.71c-.22-.64-.35-1.32-.35-2.02s.13-1.38.35-2.02L.96 3.7C.35 4.97 0 6.44 0 8s.35 3.03.96 4.3l3.82-2.97z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.9-2.26c-.81.54-1.82.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72L.96 13.68C2.44 16.64 5.48 18 9 18z" />
          </svg>
          Continue with Google
        </motion.button>

        {mode === 'sign-in' && (
          <div className="flex items-center justify-between pt-1 text-xs">
            <button
              type="button"
              onClick={onReset}
              className="text-zinc-500 hover:text-white underline-offset-4 hover:underline"
            >
              Reset password
            </button>
            <a
              href={`/sign-up${returnTo !== '/' ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`}
              className="text-[#FF8A3D] hover:text-[#FFB073]"
            >
              Create account →
            </a>
          </div>
        )}

        {mode === 'sign-up' && (
          <div className="flex items-center justify-end pt-1 text-xs">
            <a
              href={`/sign-in${returnTo !== '/' ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`}
              className="text-[#FF8A3D] hover:text-[#FFB073]"
            >
              ← Sign in instead
            </a>
          </div>
        )}
      </form>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div
        className="text-zinc-500 mb-1.5"
        style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 9, letterSpacing: '0.16em' }}
      >
        {label}
      </div>
      <div
        className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2"
        style={{
          background: 'rgba(255,255,255,0.03)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        {children}
      </div>
    </label>
  );
}

function Notice({
  tone,
  children,
}: {
  tone: 'error' | 'info';
  children: React.ReactNode;
}) {
  const color = tone === 'error' ? '#FF6B6B' : '#9AE66E';
  return (
    <div
      className="px-3 py-2 rounded-lg border text-xs"
      style={{
        background: tone === 'error' ? 'rgba(255,107,107,0.08)' : 'rgba(154,230,110,0.08)',
        borderColor: tone === 'error' ? 'rgba(255,107,107,0.35)' : 'rgba(154,230,110,0.35)',
        color,
      }}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {children}
    </div>
  );
}
