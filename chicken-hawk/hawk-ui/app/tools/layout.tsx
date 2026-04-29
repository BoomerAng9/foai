import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ToolsNav } from '@/components/tools-nav';

export const metadata = {
  title: 'Tool Chest · Chicken Hawk',
  description: 'Owner-only operator console for Chicken Hawk.',
};

// Force SSR on every request — no bfcache, no stale RSC prefetch. Owner-tier
// pages must reflect live session state every navigation, including back-
// button restores. Without this, browsers were serving a cached "Signed in"
// shell after the cookie expired or after a forward/back navigation, which
// produced the "Not signed in" regression on /me prefetches.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://hawk-gateway:8000';

async function requireOwner(): Promise<void> {
  const jar = await cookies();
  const session = jar.get('ch_session')?.value;
  if (!session) {
    redirect('/login');
  }
  try {
    const res = await fetch(`${GATEWAY_URL}/me`, {
      headers: { Cookie: `ch_session=${session}` },
      cache: 'no-store',
    });
    if (!res.ok) {
      redirect('/login');
    }
  } catch {
    // Gateway unreachable — fail closed, send to /login rather than serve a
    // potentially-stale shell.
    redirect('/login');
  }
}

export default async function ToolsLayout({ children }: { children: React.ReactNode }) {
  await requireOwner();
  return (
    <div className="min-h-screen bg-foai-bg text-foai-text grid grid-cols-1 md:grid-cols-[260px_1fr]">
      <aside className="hidden md:block bg-foai-surface/60 backdrop-blur border-r border-foai-border p-6">
        <Link href="/" className="flex items-center gap-3 mb-8">
          <span className="text-2xl text-foai-gold leading-none">⌬</span>
          <div>
            <div className="font-semibold tracking-wide">Chicken Hawk</div>
            <div className="text-[11px] uppercase tracking-wider text-foai-muted">Tool Chest · Operator</div>
          </div>
        </Link>
        <ToolsNav />
        <div className="mt-10 pt-6 border-t border-foai-border/50 text-xs text-foai-muted">
          Operator console · ACHIEVEMOR
        </div>
      </aside>
      <main className="px-6 py-10 md:px-10 md:py-12 max-w-5xl w-full">{children}</main>
    </div>
  );
}
