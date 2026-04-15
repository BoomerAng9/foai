'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X, ChevronLeft, Home } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { PRIMARY_NAV_ITEMS, isActiveNavRoute } from '@/lib/platform/config';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === '/';

  return (
    <header className="relative px-6 h-14 shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-center gap-2">
        {/* Back / Home nav — hidden on the home page */}
        {!isHome && (
          <div className="flex items-center gap-1 mr-2">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-0.5 px-1.5 py-1 rounded text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors md:text-xs text-sm"
              aria-label="Go back"
            >
              <ChevronLeft className="w-4 h-4 md:w-3.5 md:h-3.5" />
              <span className="hidden sm:inline text-[11px] font-mono tracking-wide">BACK</span>
            </button>
            <Link
              href="/"
              className="flex items-center gap-0.5 px-1.5 py-1 rounded text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors"
              aria-label="Home"
            >
              <Home className="w-3.5 h-3.5" />
            </Link>
            <div className="w-px h-4 bg-white/10 ml-1" />
          </div>
        )}
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/perform-logo-dark.png" alt="Per|Form" className="w-7 h-7 object-contain" />
          <span className="font-outfit text-lg font-extrabold tracking-[0.15em]" style={{ color: '#D4A853' }}>
            PER<span style={{ color: '#C0C0C0', opacity: 0.6 }}>|</span>FORM
          </span>
        </Link>
      </div>

      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-6">
        {PRIMARY_NAV_ITEMS.map(item => {
          const isActive = isActiveNavRoute(pathname, item.href, item.matchPrefixes);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`text-xs font-mono tracking-wider transition-colors ${
                isActive ? 'text-white' : 'text-white/40 hover:text-white/70'
              }`}
              style={isActive ? { color: '#D4A853' } : undefined}
            >
              {item.label.toUpperCase()}
            </Link>
          );
        })}
      </nav>

      {/* Mobile menu toggle */}
      <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-1 text-white/50 hover:text-white/80">
        {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <div className="hidden md:flex items-center gap-3">
        <ThemeToggle />
        <div className="w-2 h-2 rounded-full" style={{ background: '#22C55E' }} />
        <span className="text-[9px] font-mono text-white/30">LIVE</span>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="absolute top-14 left-0 right-0 py-4 px-6 flex flex-col gap-1 md:hidden" style={{ background: 'var(--pf-bg)', borderBottom: '1px solid rgba(255,255,255,0.08)', zIndex: 999 }}>
          {PRIMARY_NAV_ITEMS.map(item => {
            const isActive = isActiveNavRoute(pathname, item.href, item.matchPrefixes);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`text-sm font-mono py-2 tracking-wider transition-colors ${
                  isActive ? 'text-white' : 'text-white/50 hover:text-white/80'
                }`}
                style={isActive ? { color: '#D4A853' } : undefined}
              >
                {item.label.toUpperCase()}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
