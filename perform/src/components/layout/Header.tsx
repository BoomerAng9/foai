'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

const NAV_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'Draft Board', href: '/draft' },
  { label: 'Mock Draft', href: '/draft/mock' },
  { label: 'War Room', href: '/studio' },
  { label: 'Analysts', href: '/analysts' },
  { label: 'Rankings', href: '/rankings' },
  { label: 'Players', href: '/players' },
  { label: 'Film Room', href: '/film' },
  { label: 'Flag Football', href: '/flag-football' },
  { label: 'Data', href: '/data' },
  { label: 'Dashboard', href: '/dashboard' },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative px-6 h-14 shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <Link href="/" className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/perform-logo-dark.png" alt="Per|Form" className="w-7 h-7 object-contain" />
        <span className="font-outfit text-lg font-extrabold tracking-[0.15em]" style={{ color: '#D4A853' }}>
          PER<span style={{ color: '#C0C0C0', opacity: 0.6 }}>|</span>FORM
        </span>
      </Link>

      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-6">
        {NAV_ITEMS.map(item => (
          <Link key={item.href} href={item.href} className="text-xs font-mono text-white/40 hover:text-white/70 tracking-wider transition-colors">
            {item.label.toUpperCase()}
          </Link>
        ))}
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
        <div className="absolute top-14 left-0 right-0 py-4 px-6 flex flex-col gap-1 md:hidden" style={{ background: '#0A0A0F', borderBottom: '1px solid rgba(255,255,255,0.08)', zIndex: 999 }}>
          {NAV_ITEMS.map(item => (
            <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="text-sm font-mono text-white/50 hover:text-white/80 py-2 tracking-wider transition-colors">
              {item.label.toUpperCase()}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
