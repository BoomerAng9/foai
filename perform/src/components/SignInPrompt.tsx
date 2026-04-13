'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * SignInPrompt — Non-blocking sign-in banner that appears on delay.
 *
 * Triggers after:
 *   - 3 page views, OR
 *   - 60 seconds of browsing
 * whichever comes first.
 *
 * Dismissable: user can continue browsing without signing in.
 * Does NOT block page content (renders as a slide-up overlay).
 *
 * Excluded from /draft/simulate routes (those require auth via tokens).
 */

const PAGE_VIEW_KEY = 'pf-page-views';
const DISMISSED_KEY = 'pf-signin-dismissed';
const PAGE_VIEW_THRESHOLD = 3;
const TIME_THRESHOLD_MS = 60_000;

function getPageViews(): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem(PAGE_VIEW_KEY) || '0', 10);
}

function incrementPageViews(): number {
  if (typeof window === 'undefined') return 0;
  const next = getPageViews() + 1;
  localStorage.setItem(PAGE_VIEW_KEY, String(next));
  return next;
}

function isDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  const ts = localStorage.getItem(DISMISSED_KEY);
  if (!ts) return false;
  // Re-show after 24 hours
  const dismissedAt = parseInt(ts, 10);
  return Date.now() - dismissedAt < 24 * 60 * 60 * 1000;
}

function isSignedIn(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.includes('firebase-auth-token=');
}

export function SignInPrompt() {
  const [visible, setVisible] = useState(false);

  const dismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  }, []);

  useEffect(() => {
    // Skip if already signed in or previously dismissed
    if (isSignedIn() || isDismissed()) return;

    // Increment page view counter
    const views = incrementPageViews();

    // Check page view threshold
    if (views >= PAGE_VIEW_THRESHOLD) {
      setVisible(true);
      return;
    }

    // Set timer for time threshold
    const timer = setTimeout(() => {
      if (!isSignedIn() && !isDismissed()) {
        setVisible(true);
      }
    }, TIME_THRESHOLD_MS);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up"
      style={{ pointerEvents: 'auto' }}
    >
      <div
        className="max-w-2xl mx-auto mb-4 mx-4 rounded-xl p-5 backdrop-blur-lg"
        style={{
          background: 'rgba(20, 20, 30, 0.95)',
          border: '1px solid rgba(212, 168, 83, 0.25)',
          boxShadow: '0 -4px 30px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3
              className="text-sm font-bold mb-1"
              style={{ color: '#D4A853' }}
            >
              Get the full Per|Form experience
            </h3>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Sign in to save your drafts, unlock War Room, and get full player data and analytics.
            </p>
          </div>
          <button
            onClick={dismiss}
            className="text-white/30 hover:text-white/60 transition-colors p-1 -mt-1 -mr-1"
            aria-label="Dismiss"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-wrap gap-3 mt-4">
          <a
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold tracking-wider uppercase rounded-lg transition-all hover:brightness-110"
            style={{
              background: 'linear-gradient(135deg, #D4A853 0%, #B8912E 100%)',
              color: '#0A0A0F',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
            </svg>
            Sign in with Google
          </a>
          <button
            onClick={dismiss}
            className="px-5 py-2.5 text-xs font-bold tracking-wider uppercase rounded-lg transition-all hover:bg-white/10"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            Continue Browsing
          </button>
        </div>
      </div>
    </div>
  );
}
