'use client';

import Link from 'next/link';

export function Header() {
  return (
    <header className="flex items-center justify-between px-6 h-14 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <Link href="/" className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/perform-logo-dark.png" alt="Per|Form" className="w-7 h-7 object-contain" />
        <span className="font-outfit text-lg font-extrabold tracking-[0.15em]" style={{ color: '#D4A853' }}>
          PER<span style={{ color: '#C0C0C0', opacity: 0.6 }}>|</span>FORM
        </span>
      </Link>

      <nav className="hidden md:flex items-center gap-6">
        {[
          { label: 'Draft', href: '/draft' },
          { label: 'Analysts', href: '/analysts' },
          { label: 'Flag Football', href: '/flag-football' },
          { label: 'Podcast', href: '/podcast' },
          { label: 'Mock Draft', href: '/draft/mock' },
        ].map(item => (
          <Link key={item.href} href={item.href} className="text-xs font-mono text-white/40 hover:text-white/70 tracking-wider transition-colors">
            {item.label.toUpperCase()}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ background: '#22C55E' }} />
        <span className="text-[9px] font-mono text-white/30">LIVE</span>
      </div>
    </header>
  );
}
