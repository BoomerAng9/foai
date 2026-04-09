"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AccountPanel } from '@/components/account/AccountPanel';
import NavChrome from '@/components/nav/NavChrome';
import {
  User,
  CreditCard,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

function CornerBracket({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const rotation = { tl: 0, tr: 90, bl: -90, br: 180 }[position];
  const pos = {
    tl: 'top-3 left-3',
    tr: 'top-3 right-3',
    bl: 'bottom-3 left-3',
    br: 'bottom-3 right-3',
  }[position];
  return (
    <svg
      className={`absolute ${pos} w-4 h-4 text-border-strong pointer-events-none`}
      style={{ transform: `rotate(${rotation}deg)` }}
      viewBox="0 0 16 16"
      fill="none"
    >
      <path d="M0 0v16M0 0h16" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, profile, organization, signOut } = useAuth();
  // Owner detection via server-side /api/me — owner emails never leak to client JS
  const [isOwnerUser, setIsOwnerUser] = useState(false);
  useEffect(() => {
    if (!user) return;
    fetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.isOwner) setIsOwnerUser(true); })
      .catch(() => {});
  }, [user]);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Full-bleed escape hatch — /smelter-os/* runs in its own visual world
  // (no sidebar, no header, no AccountPanel chrome). The Bridge owns its own nav.
  if (pathname.startsWith('/smelter-os')) {
    return <>{children}</>;
  }

  const isFullBleedContent =
    pathname === '/chat' ||
    pathname.startsWith('/chat/') ||
    pathname.startsWith('/broadcast');

  const contentPadding = isFullBleedContent ? '' : 'p-3 sm:p-4 md:p-6';

  const headerRight = (
    <span className="font-mono text-[10px] text-fg-tertiary hidden sm:inline">
      {new Date()
        .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        .toUpperCase()}
    </span>
  );

  const userMenuSlot = (
    <div className="relative border-t border-border">
      <button
        onClick={() => setUserMenuOpen(!userMenuOpen)}
        className="w-full flex items-center gap-2 px-4 md:px-2 lg:px-4 py-2 hover:bg-bg-elevated transition-colors text-fg-tertiary hover:text-fg"
      >
        <span className="text-[10px] font-mono uppercase tracking-wider flex-1 text-left md:hidden lg:inline">
          Menu
        </span>
        <ChevronDown className={`w-3 h-3 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
      </button>

      {userMenuOpen && (
        <div
          className="fixed bottom-16 left-3 w-52 bg-bg-surface border border-border shadow-lg"
          style={{ zIndex: 9999 }}
        >
          <Link
            href="/circuit-box"
            onClick={() => setUserMenuOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-mono text-fg-secondary hover:bg-bg-elevated hover:text-fg"
          >
            <User className="w-3.5 h-3.5" /> CIRCUIT BOX
          </Link>
          <Link
            href="/pricing"
            onClick={() => setUserMenuOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-mono text-fg-secondary hover:bg-bg-elevated hover:text-fg"
          >
            <CreditCard className="w-3.5 h-3.5" /> BILLING
          </Link>
          <div className="border-t border-border" />
          <button
            onClick={async e => {
              e.stopPropagation();
              await signOut();
              window.location.href = '/auth/login';
            }}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-xs font-mono text-signal-error hover:bg-bg-elevated cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> SIGN OUT
          </button>
        </div>
      )}
    </div>
  );

  return (
    <NavChrome
      userDisplayName={profile?.display_name || 'User'}
      userInitial={profile?.display_name?.charAt(0).toUpperCase() || '?'}
      userTier={profile?.tier || 'free'}
      workspaceName={organization?.name || 'Personal'}
      isOwner={isOwnerUser}
      headerRight={headerRight}
      userMenuSlot={userMenuSlot}
    >
      <div className={`relative ${contentPadding}`}>
        {!isFullBleedContent && (
          <>
            <CornerBracket position="tl" />
            <CornerBracket position="tr" />
            <CornerBracket position="bl" />
            <CornerBracket position="br" />
          </>
        )}
        <div className={isFullBleedContent ? 'h-full' : 'animate-materialize'}>
          {children}
        </div>
      </div>
      <AccountPanel />
    </NavChrome>
  );
}
