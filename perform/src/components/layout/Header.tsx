'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X, ChevronLeft, Home, Search } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AuthButton } from '@/components/auth/AuthButton';
import { PRIMARY_NAV_ITEMS, isActiveNavRoute } from '@/lib/platform/config';

type League = 'nfl' | 'ncaa' | 'nba' | 'mlb' | 'nhl';
const LEAGUES: { id: League; label: string }[] = [
  { id: 'nfl', label: 'NFL' },
  { id: 'ncaa', label: 'NCAA' },
  { id: 'nba', label: 'NBA' },
  { id: 'mlb', label: 'MLB' },
  { id: 'nhl', label: 'NHL' },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [league, setLeague] = useState<League>('nfl');
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === '/';

  // Sync body[data-league] so globals.css palette overrides engage.
  // Landing (public/landing/index.html) uses the identical attribute.
  useEffect(() => {
    const saved = (typeof window !== 'undefined' && localStorage.getItem('pf-league')) as League | null;
    const initial = saved && LEAGUES.some((l) => l.id === saved) ? saved : 'nfl';
    setLeague(initial);
    document.body.dataset.league = initial;
  }, []);

  function selectLeague(next: League) {
    setLeague(next);
    document.body.dataset.league = next;
    try { localStorage.setItem('pf-league', next); } catch { /* storage disabled */ }
  }

  return (
    <header
      className="sticky top-0 z-50 flex items-center gap-4 px-7 py-3.5 backdrop-blur"
      style={{
        background: 'rgba(7,11,20,0.9)',
        borderBottom: '1px solid var(--pf-line)',
      }}
    >
      {/* Back / Home nav — hidden on the home page */}
      {!isHome && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-0.5 px-1.5 py-1 rounded transition-colors"
            style={{ color: 'var(--pf-ink-dim)' }}
            aria-label="Go back"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline text-[11px]" style={{ fontFamily: 'var(--font-jetbrains), monospace', letterSpacing: '0.14em' }}>
              BACK
            </span>
          </button>
          <Link
            href="/"
            className="flex items-center gap-0.5 px-1.5 py-1 rounded transition-colors"
            style={{ color: 'var(--pf-ink-dim)' }}
            aria-label="Home"
          >
            <Home className="w-3.5 h-3.5" />
          </Link>
          <div className="w-px h-4 ml-1" style={{ background: 'var(--pf-line)' }} />
        </div>
      )}

      {/* Logo — matches public/landing/index.html .logo-mark exactly */}
      <Link href="/" className="flex items-center gap-2.5 shrink-0">
        <div>
          <div
            style={{
              fontFamily: 'var(--font-barlow), "Barlow Condensed", sans-serif',
              fontWeight: 900,
              fontSize: 22,
              letterSpacing: '0.02em',
              color: 'var(--pf-ink)',
              lineHeight: 1,
            }}
          >
            PER<span style={{ color: 'var(--pf-accent)' }}>|</span>FORM
            <span
              className="inline-block ml-2 px-1.5 py-0.5 align-middle"
              style={{
                fontFamily: 'var(--font-jetbrains), monospace',
                fontWeight: 700,
                fontSize: 10,
                letterSpacing: '0.18em',
                background: 'var(--pf-accent)',
                color: '#fff',
                borderRadius: 2,
              }}
            >
              TIE
            </span>
          </div>
          <div
            className="mt-0.5 hidden sm:block"
            style={{
              fontFamily: 'var(--font-jetbrains), monospace',
              fontSize: 9,
              letterSpacing: '0.2em',
              color: 'var(--pf-ink-dim)',
            }}
          >
            TALENT INTELLIGENCE ENGINE
          </div>
        </div>
      </Link>

      {/* Desktop nav */}
      <nav className="hidden lg:flex items-center gap-5 ml-2">
        {PRIMARY_NAV_ITEMS.map((item) => {
          const isActive = isActiveNavRoute(pathname, item.href, item.matchPrefixes);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative py-1.5 transition-colors"
              style={{
                fontFamily: 'var(--font-jetbrains), monospace',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: isActive ? 'var(--pf-ink)' : 'var(--pf-ink-dim)',
              }}
            >
              {item.label}
              {isActive && (
                <span
                  className="absolute left-0 right-0"
                  style={{
                    bottom: -15,
                    height: 2,
                    background: 'var(--pf-accent)',
                  }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* League tabs — mirrors landing's .league-tabs component */}
      <div
        className="hidden md:flex items-center p-0.5 ml-2 rounded"
        style={{
          gap: 2,
          background: 'var(--pf-panel)',
          border: '1px solid var(--pf-line)',
        }}
      >
        {LEAGUES.map((l) => {
          const active = league === l.id;
          return (
            <button
              key={l.id}
              onClick={() => selectLeague(l.id)}
              className="px-2.5 py-1.5 rounded-sm transition-colors"
              style={{
                fontFamily: 'var(--font-jetbrains), monospace',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: active ? '#fff' : 'var(--pf-ink-dim)',
                background: active ? 'var(--pf-accent)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {l.label}
            </button>
          );
        })}
      </div>

      {/* Mobile menu toggle */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="lg:hidden p-1 ml-auto"
        style={{ color: 'var(--pf-ink-dim)' }}
      >
        {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Right side */}
      <div className="hidden lg:flex items-center gap-2.5 ml-auto shrink-0">
        <button
          aria-label="Search"
          className="flex items-center justify-center w-8 h-8 rounded transition-colors"
          style={{
            border: '1px solid var(--pf-line)',
            color: 'var(--pf-ink-dim)',
            background: 'transparent',
          }}
        >
          <Search className="w-3.5 h-3.5" />
        </button>
        <ThemeToggle />
        <div className="flex items-center gap-1.5" title="Live">
          <div className="w-1.5 h-1.5 rounded-full live-pulse" style={{ background: 'var(--pf-red)' }} />
          <span
            style={{
              fontFamily: 'var(--font-jetbrains), monospace',
              fontSize: 9,
              letterSpacing: '0.18em',
              color: 'var(--pf-ink-faint)',
            }}
          >
            LIVE
          </span>
        </div>
        <div className="w-px h-4 mx-1" style={{ background: 'var(--pf-line)' }} />
        <AuthButton />
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div
          className="absolute left-0 right-0 py-4 px-6 flex flex-col gap-1 lg:hidden"
          style={{
            top: '100%',
            background: 'var(--pf-bg)',
            borderBottom: '1px solid var(--pf-line)',
            zIndex: 999,
          }}
        >
          {PRIMARY_NAV_ITEMS.map((item) => {
            const isActive = isActiveNavRoute(pathname, item.href, item.matchPrefixes);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="py-2 transition-colors"
                style={{
                  fontFamily: 'var(--font-jetbrains), monospace',
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: isActive ? 'var(--pf-accent)' : 'var(--pf-ink-dim)',
                }}
              >
                {item.label}
              </Link>
            );
          })}
          {/* League tabs on mobile too */}
          <div className="flex gap-1 mt-3 pt-3" style={{ borderTop: '1px solid var(--pf-line)' }}>
            {LEAGUES.map((l) => {
              const active = league === l.id;
              return (
                <button
                  key={l.id}
                  onClick={() => selectLeague(l.id)}
                  className="flex-1 px-2 py-2 rounded"
                  style={{
                    fontFamily: 'var(--font-jetbrains), monospace',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    color: active ? '#fff' : 'var(--pf-ink-dim)',
                    background: active ? 'var(--pf-accent)' : 'var(--pf-panel)',
                    border: '1px solid var(--pf-line)',
                  }}
                >
                  {l.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
