'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { LayoutDashboard, LogOut } from 'lucide-react';

const items = [
  { href: '/', label: 'Home' },
  { href: '/lil-hawks', label: 'Lil_Hawks' },
  { href: '/sqwaadrun', label: 'Sqwaadrun' },
  { href: '/about', label: 'About' },
];

export function MenuNavLinks({ signedIn, owner }: { signedIn: boolean; owner: string | null }) {
  const pathname = usePathname();
  return (
    <header className="relative z-30 sticky top-0 backdrop-blur-md bg-foai-bg/80 border-b border-foai-border">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/chicken-hawk.svg"
            alt="Chicken Hawk"
            width={36}
            height={36}
            className="size-9"
            priority
          />
          <span className="font-semibold tracking-tight text-foai-text text-base hidden sm:inline">
            Chicken Hawk
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {items.map((it) => {
            const active = pathname === it.href || (it.href !== '/' && pathname.startsWith(it.href));
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cn(
                  'px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors',
                  active
                    ? 'text-foai-gold bg-foai-gold-tint'
                    : 'text-foai-muted hover:text-foai-text hover:bg-foai-surface-2',
                )}
              >
                {it.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {signedIn ? (
            <>
              <Link
                href="/tools"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-medium text-foai-text bg-foai-surface-2 hover:bg-foai-surface border border-foai-border transition-colors"
                title={owner ? `Signed in as ${owner}` : 'Tool Chest'}
              >
                <LayoutDashboard className="size-3.5" />
                Tool Chest
              </Link>
              <form action="/api/auth/sign-out" method="POST" className="hidden sm:inline-flex">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-medium text-foai-muted hover:text-foai-text hover:bg-foai-surface-2 transition-colors"
                >
                  <LogOut className="size-3.5" />
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center px-4 py-1.5 rounded-md text-sm font-semibold text-white bg-foai-gold hover:bg-foai-gold-hover shadow-amber-soft hover:shadow-amber-press transition-all"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
