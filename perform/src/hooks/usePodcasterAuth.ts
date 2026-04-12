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
  /** Whether auth check is still in progress */
  loading: boolean;
  /** User is logged in AND registered as a podcaster */
  authenticated: boolean;
  /** User profile data (null if not authenticated or not registered) */
  profile: PodcasterProfile | null;
  /** User is an owner (unlimited access) */
  isOwner: boolean;
  /** Trigger login flow — call on action buttons, not on page load */
  promptLogin: () => void;
}

const OWNER_EMAILS = new Set(['jarrett.risher@gmail.com', 'bpo@achievemor.io']);

export function usePodcasterAuth(): AuthState {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PodcasterProfile | null>(null);

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

  const authenticated = profile !== null;
  const isOwner = authenticated && OWNER_EMAILS.has(profile!.email?.toLowerCase());

  function promptLogin() {
    const current = window.location.pathname;
    window.location.href = `/login?redirect=${encodeURIComponent(current)}`;
  }

  return { loading, authenticated, profile, isOwner, promptLogin };
}
