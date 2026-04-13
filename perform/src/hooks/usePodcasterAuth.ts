'use client';

import { useEffect, useState } from 'react';

export interface PodcasterProfile {
  id: number;
  firebase_uid: string;
  selected_team: string;
  huddl_name: string | null;
  email: string;
  plan_tier: string;
}

interface AuthState {
  loading: boolean;
  authenticated: boolean;
  profile: PodcasterProfile | null;
  isOwner: boolean;
  /** Whether the delayed sign-in prompt should show */
  showSignInPrompt: boolean;
  promptLogin: () => void;
}

const OWNER_EMAILS = new Set(['jarrett.risher@gmail.com', 'bpo@achievemor.io']);
const SIGN_IN_DELAY_MS = 8000; // Show sign-in prompt after 8 seconds

export function usePodcasterAuth(): AuthState {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PodcasterProfile | null>(null);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);

  useEffect(() => {
    fetch('/api/podcasters/profile')
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (data?.user) setProfile(data.user);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Delayed sign-in prompt for unauthenticated users
  useEffect(() => {
    if (loading || profile) return;
    const timer = setTimeout(() => setShowSignInPrompt(true), SIGN_IN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [loading, profile]);

  const authenticated = profile !== null;
  const isOwner = authenticated && OWNER_EMAILS.has(profile!.email?.toLowerCase());

  function promptLogin() {
    const current = window.location.pathname;
    window.location.href = `/login?redirect=${encodeURIComponent(current)}`;
  }

  return { loading, authenticated, profile, isOwner, showSignInPrompt, promptLogin };
}
