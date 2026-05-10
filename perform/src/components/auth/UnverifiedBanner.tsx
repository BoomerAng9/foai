'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/use-auth';

/**
 * Soft-gate banner for unverified accounts (SHIP-CHECKLIST Gate 2 · Item 13).
 *
 * Renders nothing for anon users, loading users, and verified users. For
 * signed-in-but-unverified users, renders a persistent Per|Form-gold banner
 * with a "Resend verification email" CTA. The CTA calls Firebase's built-in
 * sendEmailVerification on the *current* Firebase user — there is no admin
 * path to *send* an email (admin can only generate a link), so this must
 * happen client-side.
 *
 * The hard gate lives in requireVerifiedEmail() on paid routes. This banner
 * only nudges; it never blocks navigation.
 */

export function UnverifiedBanner() {
  const { status, user } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status !== 'authed' || !user || user.emailVerified) return null;

  async function handleResend() {
    setError(null);
    setSending(true);
    try {
      const { auth } = await import('@/lib/firebase/client');
      const { sendEmailVerification } = await import('firebase/auth');
      if (!auth.currentUser) {
        setError('Sign in again to resend the verification email.');
        return;
      }
      await sendEmailVerification(auth.currentUser);
      setSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not send verification email.';
      if (msg.includes('too-many-requests')) {
        setError('Too many requests. Try again in a few minutes.');
      } else {
        setError(msg);
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="w-full px-4 py-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] font-mono"
      style={{
        background: 'rgba(212,168,83,0.08)',
        borderBottom: '1px solid rgba(212,168,83,0.2)',
        color: 'rgba(255,255,255,0.7)',
      }}
      role="status"
      aria-live="polite"
    >
      <span>
        <span style={{ color: '#D4A853', fontWeight: 700 }}>VERIFY YOUR EMAIL</span>
        {' · '}
        {sent
          ? `Verification email sent to ${user.email}. Check your inbox (and spam).`
          : `We sent a verification link to ${user.email}. Paid actions are blocked until you confirm.`}
      </span>

      {error && (
        <span style={{ color: '#EF4444' }}>{error}</span>
      )}

      {!sent && (
        <button
          onClick={handleResend}
          disabled={sending}
          className="px-3 py-1 rounded font-bold tracking-wider transition-colors disabled:opacity-50"
          style={{
            background: 'rgba(212,168,83,0.15)',
            color: '#D4A853',
            border: '1px solid rgba(212,168,83,0.3)',
          }}
        >
          {sending ? 'SENDING...' : 'RESEND EMAIL'}
        </button>
      )}
    </div>
  );
}
