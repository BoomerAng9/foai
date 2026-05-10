'use client';

/**
 * useAuth — client-side auth state hook.
 *
 * Subscribes to Firebase client onAuthStateChanged, tracks the current
 * user, and exposes sign-in / sign-out / session-sync helpers. After any
 * sign-in path, the client posts the ID token to /api/auth/session so the
 * server gets a verified session cookie (httpOnly, set by Firebase Admin).
 */

import { useCallback, useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

export interface UseAuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

export function useAuth(): UseAuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Sync server session cookie from the current ID token.
  const syncSession = useCallback(async (current: User): Promise<void> => {
    const idToken = await current.getIdToken(true);
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      throw new Error(detail.error ?? 'session sync failed');
    }
  }, []);

  const signInEmail = useCallback(
    async (email: string, password: string) => {
      setError(null);
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        await syncSession(cred.user);
      } catch (err) {
        setError(humanizeAuthError(err));
        throw err;
      }
    },
    [syncSession],
  );

  const signUpEmail = useCallback(
    async (email: string, password: string) => {
      setError(null);
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await syncSession(cred.user);
      } catch (err) {
        setError(humanizeAuthError(err));
        throw err;
      }
    },
    [syncSession],
  );

  const signInGoogle = useCallback(async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      await syncSession(cred.user);
    } catch (err) {
      setError(humanizeAuthError(err));
      throw err;
    }
  }, [syncSession]);

  const signOutNow = useCallback(async () => {
    setError(null);
    try {
      await fetch('/api/auth/session', { method: 'DELETE' });
      await fbSignOut(auth);
    } catch (err) {
      setError(humanizeAuthError(err));
      throw err;
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      setError(humanizeAuthError(err));
      throw err;
    }
  }, []);

  return {
    user,
    loading,
    error,
    signInEmail,
    signUpEmail,
    signInGoogle,
    signOut: signOutNow,
    resetPassword,
  };
}

function humanizeAuthError(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code: string }).code;
    switch (code) {
      case 'auth/invalid-email':
        return 'That email address looks invalid.';
      case 'auth/user-disabled':
        return 'This account has been disabled. Contact support.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Email or password is incorrect.';
      case 'auth/email-already-in-use':
        return 'An account already exists for this email.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in popup was closed before completion.';
      case 'auth/network-request-failed':
        return 'Network error — check your connection and try again.';
      default:
        return `Sign-in failed (${code}).`;
    }
  }
  return 'Sign-in failed. Please try again.';
}
