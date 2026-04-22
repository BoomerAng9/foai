'use client';

import { useEffect, useState } from 'react';

/**
 * Client-side auth state hook (SHIP-CHECKLIST Gate 2).
 *
 * Fetches /api/auth/verify once on mount and surfaces the result as a
 * tri-state: 'loading' | 'authed' | 'anon'. Cheap to mount — the route
 * handler just decodes the cookie via firebase-admin.
 *
 * Usage:
 *   const { status, user, signOut } = useAuth();
 *   if (status === 'authed') { ... }
 */

export type AuthUser = {
  uid: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  emailVerified: boolean;
};

export type AuthStatus = 'loading' | 'authed' | 'anon';

export function useAuth(): {
  status: AuthStatus;
  user: AuthUser | null;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
} {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  async function refresh(): Promise<void> {
    try {
      const res = await fetch('/api/auth/verify', { cache: 'no-store' });
      if (!res.ok) {
        setUser(null);
        setStatus('anon');
        return;
      }
      const data = (await res.json()) as { authenticated?: boolean; user?: AuthUser };
      if (data.authenticated && data.user) {
        setUser(data.user);
        setStatus('authed');
      } else {
        setUser(null);
        setStatus('anon');
      }
    } catch {
      setUser(null);
      setStatus('anon');
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function signOut(): Promise<void> {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore — we still clear local state below.
    }
    // Firebase client-side signOut clears the in-memory auth object too.
    try {
      const { auth } = await import('@/lib/firebase/client');
      const { signOut: fbSignOut } = await import('firebase/auth');
      await fbSignOut(auth);
    } catch {
      // Non-fatal — cookie is gone, server-side session is dead.
    }
    setUser(null);
    setStatus('anon');
  }

  return { status, user, signOut, refresh };
}
