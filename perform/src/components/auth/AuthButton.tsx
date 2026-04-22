'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/use-auth';

/**
 * Compact header-slot auth control (SHIP-CHECKLIST Gate 2).
 *
 * Unauth: "Sign in" link → /login?redirect=<current path>
 * Authed: avatar/email + "Sign out" button → clears cookie + revokes token,
 *         then routes home.
 *
 * The `redirect=` query param roundtrips the user back to the page they
 * were on before the sign-in detour (handled by /login and /signup pages).
 */

export function AuthButton() {
  const { status, user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (status === 'loading') {
    return <div className="w-16 h-6 rounded bg-white/[0.04] animate-pulse" aria-hidden />;
  }

  if (status === 'anon') {
    const redirectParam = pathname && pathname !== '/' ? `?redirect=${encodeURIComponent(pathname)}` : '';
    return (
      <Link
        href={`/login${redirectParam}`}
        className="px-3 py-1.5 rounded-md text-[11px] font-mono font-bold tracking-wider transition-colors"
        style={{
          background: 'rgba(212,168,83,0.12)',
          color: '#D4A853',
          border: '1px solid rgba(212,168,83,0.25)',
        }}
      >
        SIGN IN
      </Link>
    );
  }

  async function handleLogout() {
    await signOut();
    router.push('/');
  }

  const initial = (user?.name?.[0] || user?.email?.[0] || '?').toUpperCase();

  return (
    <div className="flex items-center gap-2">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
        style={{
          background: 'rgba(212,168,83,0.15)',
          color: '#D4A853',
          border: '1px solid rgba(212,168,83,0.3)',
        }}
        title={user?.email ?? ''}
        aria-label={`Signed in as ${user?.email ?? 'user'}`}
      >
        {initial}
      </div>
      <button
        onClick={handleLogout}
        className="px-2.5 py-1 rounded text-[10px] font-mono tracking-wider text-white/40 hover:text-white/80 transition-colors"
      >
        SIGN OUT
      </button>
    </div>
  );
}
