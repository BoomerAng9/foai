'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';
import { isAllowedEmail } from '@/lib/allowlist';
import {
  authService,
  paywallService,
  type UserProfile,
  type Subscription,
  type TierLimits,
  type Organization,
} from '@/lib/auth-paywall';

// ─── Context Type ─────────────────────────────────────────

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  subscription: Subscription | null;
  tierLimits: TierLimits | null;
  organization: Organization | null;
  organizations: Organization[];
  loading: boolean;
  denied: boolean;  // true if user logged in but not on allowlist

  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<void>;
  signOut: () => Promise<void>;

  createOrg: (name: string) => Promise<void>;
  switchOrg: (orgId: string) => Promise<void>;

  canAccess: (feature: keyof TierLimits) => boolean;
  isFeatureGated: (feature: keyof TierLimits) => boolean;
  trackUsage: (metric: string, amount?: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Provision Bridge ─────────────────────────────────────

async function provisionFirebaseUser(firebaseUser: User): Promise<void> {
  const idToken = await firebaseUser.getIdToken();

  await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken: idToken }),
  });

  await fetch('/api/auth/provision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firebaseUid: firebaseUser.uid,
      displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
      email: firebaseUser.email,
    }),
  });
}

// ─── Provider ─────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [tierLimits, setTierLimits] = useState<TierLimits | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  const provisionWorkspace = useCallback(async (userId: string, displayName: string) => {
    const workspaceName = `${displayName || 'My'} Workspace`;
    await authService.createOrganization(userId, workspaceName);
    return authService.getUserOrganizations(userId);
  }, []);

  const hydrateProfile = useCallback(async (firebaseUser: User) => {
    const { profile: p, subscription: s } = await authService.getProfile(firebaseUser.uid);
    setProfile(p);
    setSubscription(s);

    if (p) {
      const [limits, initialOrgs] = await Promise.all([
        paywallService.getTierLimits(p.tier),
        authService.getUserOrganizations(firebaseUser.uid),
      ]);

      let orgs = initialOrgs;
      if (orgs.length === 0) {
        try {
          orgs = await provisionWorkspace(firebaseUser.uid, p.display_name);
        } catch (err) {
          console.error('[Auth] Workspace provisioning error:', err);
        }
      }

      setTierLimits(limits);
      setOrganizations(orgs);

      if (orgs.length > 0) {
        const activeOrg = orgs.find((o) => o.id === p.default_org_id) || orgs[0];
        setOrganization(activeOrg);
      }
    }
  }, [provisionWorkspace]);

  // Firebase onAuthStateChanged listener — THE auth loop
  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      try {
        if (firebaseUser) {
          // Access check — owners pass instantly, team members checked against DB
          const verifyRes = await fetch(`/api/access-keys/verify?email=${encodeURIComponent(firebaseUser.email || '')}`);
          const verifyData = await verifyRes.json().catch(() => ({ allowed: false }));

          if (!verifyData.allowed) {
            setDenied(true);
            setUser(null);
            await firebaseSignOut(getFirebaseAuth());
            await fetch('/api/auth/session', { method: 'DELETE' });
            setLoading(false);
            return;
          }

          setDenied(false);
          setUser(firebaseUser);

          // Auth loop: persist session cookie + provision in Neon
          await provisionFirebaseUser(firebaseUser);

          // Hydrate profile, subscription, orgs, tier limits
          await hydrateProfile(firebaseUser);
        } else {
          setUser(null);
          setProfile(null);
          setSubscription(null);
          setTierLimits(null);
          setOrganizations([]);
          setOrganization(null);
        }
      } catch (err) {
        console.error('[Auth] State change error:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [hydrateProfile]);

  // ─── Auth Actions ─────────────────────────────────────────

  async function signUp(email: string, password: string, displayName?: string) {
    await authService.signUp(email, password, displayName);
    // onAuthStateChanged fires automatically after signup
  }

  async function signIn(email: string, password: string) {
    await authService.signIn(email, password);
  }

  async function signInWithOAuth(provider: 'google' | 'github') {
    await authService.signInWithOAuth(provider);
  }

  async function signOut() {
    await authService.signOut();
    setUser(null);
    setProfile(null);
    setSubscription(null);
    setTierLimits(null);
    setOrganizations([]);
    setOrganization(null);
  }

  // ─── Paywall Helpers ──────────────────────────────────────

  function canAccess(feature: keyof TierLimits): boolean {
    if (!tierLimits) return false;
    const val = tierLimits[feature];
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val !== 0;
    return false;
  }

  function isFeatureGated(feature: keyof TierLimits): boolean {
    return !canAccess(feature);
  }

  async function trackUsage(metric: string, amount: number = 1) {
    if (!user) return;
    await paywallService.trackUsage(user.uid, metric, amount);
  }

  // ─── Organization Actions ─────────────────────────────────

  async function createOrg(name: string) {
    if (!user) return;
    await authService.createOrganization(user.uid, name);
    if (user) await hydrateProfile(user);
  }

  async function switchOrg(orgId: string) {
    if (!user) return;
    await authService.updateProfile(user.uid, { default_org_id: orgId });
    const nextOrg = organizations.find((o) => o.id === orgId) ?? null;
    setOrganization(nextOrg);
    setProfile((prev) => (prev ? { ...prev, default_org_id: orgId } : prev));
  }

  return (
    <AuthContext.Provider
      value={{
        user, profile, subscription, tierLimits,
        organization, organizations, loading, denied,
        signUp, signIn, signInWithOAuth, signOut,
        createOrg, switchOrg,
        canAccess, isFeatureGated, trackUsage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
