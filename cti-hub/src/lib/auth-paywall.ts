/**
 * Auth & paywall service — Firebase Auth (client SDK) + API routes for DB access.
 * All database operations go through server API routes (postgres.js on server).
 */
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  GithubAuthProvider,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';

export { PLAN_CONFIG, type PlanFeature } from '@/lib/billing/plans';

// ─── Types ────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  role: 'user' | 'admin' | 'operator';
  tier: 'free' | 'pro' | 'enterprise';
  stripe_customer_id: string | null;
  default_org_id: string | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

export interface TierLimits {
  max_sources: number;
  max_research_queries_per_day: number;
  max_agents: number;
  max_storage_mb: number;
  deep_research: boolean;
  custom_models: boolean;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface MIMPolicy {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  type: 'technical' | 'operational' | 'security';
  rules: unknown[];
  is_active: boolean;
  created_at: string;
}

interface PolicyMutationResult<T> {
  data: T | null;
  error: unknown;
}

async function syncServerSessionCookie(idToken: string | null) {
  if (typeof window === 'undefined' || !idToken) return;

  const response = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken: idToken }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.error || 'Failed to persist auth session.');
  }
}

async function getIdToken(): Promise<string | null> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

// ─── Auth Service ─────────────────────────────────────────

export const authService = {
  async signUp(email: string, password: string, displayName?: string) {
    const auth = getFirebaseAuth();
    const { user } = await createUserWithEmailAndPassword(auth, email, password);

    // Provision profile + subscription via server API
    await fetch('/api/auth/provision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firebaseUid: user.uid,
        displayName: displayName || email.split('@')[0],
        email,
      }),
    });

    const idToken = await user.getIdToken();
    await syncServerSessionCookie(idToken);
    return { user };
  },

  async signIn(email: string, password: string) {
    const auth = getFirebaseAuth();
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await user.getIdToken();
    await syncServerSessionCookie(idToken);
    return { user };
  },

  async signInWithOAuth(provider: 'google' | 'github') {
    const auth = getFirebaseAuth();
    const authProvider = provider === 'google' ? new GoogleAuthProvider() : new GithubAuthProvider();
    const { user } = await signInWithPopup(auth, authProvider);
    const idToken = await user.getIdToken();

    // Provision if first login
    await fetch('/api/auth/provision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firebaseUid: user.uid,
        displayName: user.displayName || user.email?.split('@')[0],
        email: user.email,
      }),
    });

    await syncServerSessionCookie(idToken);
    return { user };
  },

  async signOut() {
    const auth = getFirebaseAuth();
    await firebaseSignOut(auth);
    if (typeof window !== 'undefined') {
      await fetch('/api/auth/session', { method: 'DELETE' });
    }
  },

  async getSession(): Promise<{ user: User } | null> {
    const auth = getFirebaseAuth();
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user ? { user } : null);
      });
    });
  },

  async getProfile(userId: string): Promise<{ profile: UserProfile | null; subscription: Subscription | null }> {
    try {
      const idToken = await getIdToken();
      const res = await fetch(`/api/auth/profile?userId=${userId}`, {
        headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
      });
      if (!res.ok) return { profile: null, subscription: null };
      return res.json();
    } catch {
      return { profile: null, subscription: null };
    }
  },

  async updateProfile(userId: string, updates: Partial<Pick<UserProfile, 'display_name' | 'avatar_url' | 'default_org_id'>>) {
    const idToken = await getIdToken();
    const res = await fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify({ userId, updates }),
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return true;
  },

  async createOrganization(userId: string, name: string) {
    const idToken = await getIdToken();
    const res = await fetch('/api/auth/organization', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify({ userId, name }),
    });
    if (!res.ok) throw new Error('Failed to create organization');
    return res.json();
  },

  async getUserOrganizations(userId: string): Promise<Organization[]> {
    try {
      const idToken = await getIdToken();
      const res = await fetch(`/api/auth/organization?userId=${userId}`, {
        headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.organizations ?? [];
    } catch {
      return [];
    }
  },
};

// ─── Paywall Service ──────────────────────────────────────

export const paywallService = {
  async getTierLimits(tier: string): Promise<TierLimits> {
    try {
      const res = await fetch(`/api/paywall/tier-limits?tier=${tier}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    } catch {
      return {
        max_sources: 3,
        max_research_queries_per_day: 10,
        max_agents: 1,
        max_storage_mb: 50,
        deep_research: false,
        custom_models: false,
      };
    }
  },

  async checkAccess(userId: string, feature: keyof TierLimits): Promise<boolean> {
    try {
      const res = await fetch(`/api/paywall/check-access?userId=${userId}&feature=${feature}`);
      if (!res.ok) return false;
      const data = await res.json();
      return data.allowed ?? false;
    } catch {
      return false;
    }
  },

  async trackUsage(userId: string, metric: string, amount: number = 1) {
    await fetch('/api/paywall/track-usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, metric, amount }),
    });
  },

  async getUsage(userId: string) {
    try {
      const res = await fetch(`/api/paywall/usage?userId=${userId}`);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },

  async getPolicies(orgId: string): Promise<PolicyMutationResult<MIMPolicy[]>> {
    try {
      const res = await fetch(`/api/paywall/policies?orgId=${orgId}`);
      if (!res.ok) return { data: null, error: 'Request failed' };
      const data = await res.json();
      return { data: data.policies, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async createPolicy(policy: Omit<MIMPolicy, 'id' | 'created_at'>): Promise<PolicyMutationResult<MIMPolicy>> {
    try {
      const res = await fetch('/api/paywall/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policy),
      });
      if (!res.ok) return { data: null, error: 'Request failed' };
      const data = await res.json();
      return { data: data.policy, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async updatePolicy(id: string, updates: Partial<MIMPolicy>): Promise<PolicyMutationResult<MIMPolicy>> {
    try {
      const res = await fetch(`/api/paywall/policies`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates }),
      });
      if (!res.ok) return { data: null, error: 'Request failed' };
      const data = await res.json();
      return { data: data.policy, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};
