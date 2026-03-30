"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageSquare,
  Activity,
  FolderOpen,
  Video,
  TrendingUp,
  Search,
  Shield,
  User,
  CreditCard,
  LogOut,
  ChevronDown,
  Terminal,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AuthPromptTimer } from '@/components/auth/AuthPromptTimer';

const NAV = [
  { name: 'HOME', href: '/chat', icon: MessageSquare },
  { name: 'WORKFLOWS', href: '/projects', icon: FolderOpen },
  { name: 'EXECUTIONS', href: '/live', icon: Activity },
  { name: 'PLUG BIN', href: '/plug-bin', icon: Video },
  { name: 'MARKETPLACE', href: '/open-seats', icon: Search },
  { name: 'ENROLLMENTS', href: '/enrollments', icon: TrendingUp },
  { name: 'SQUAD', href: '/team', icon: Shield },
  { name: 'ACCOUNT', href: '/settings', icon: User },
  { name: 'BILLING', href: '/pricing', icon: CreditCard },
];

function CornerBracket({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const rotation = { tl: 0, tr: 90, bl: -90, br: 180 }[position];
  const pos = {
    tl: 'top-3 left-3',
    tr: 'top-3 right-3',
    bl: 'bottom-3 left-3',
    br: 'bottom-3 right-3',
  }[position];
  return (
    <svg className={`absolute ${pos} w-4 h-4 text-border-strong`} style={{ transform: `rotate(${rotation}deg)` }} viewBox="0 0 16 16" fill="none">
      <path d="M0 0v16M0 0h16" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile, organization, signOut } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const sidebarExpanded = sidebarHovered;

  return (
    <div className="flex h-screen bg-bg text-fg font-sans overflow-hidden logo-watermark">
      {/* AuthPromptTimer removed — CTI Hub is owner-operated */}

      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        className={`
          bg-bg-surface border-r border-border flex flex-col shrink-0 z-50
          transition-all duration-200 ease-in-out
          fixed inset-y-0 left-0 md:relative
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
          w-56 md:w-14 ${sidebarExpanded ? 'lg:w-56' : 'md:w-14'} lg:w-56
        `}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-5 md:px-3 md:justify-center lg:px-5 lg:justify-start border-b border-border">
          <Link href="/" className="flex items-center gap-2.5 group" onClick={() => setMobileMenuOpen(false)}>
            <div className="w-7 h-7 bg-accent flex items-center justify-center shrink-0">
              <Terminal className="w-3.5 h-3.5 text-bg" />
            </div>
            <span className={`font-mono text-xs font-bold tracking-wider uppercase md:hidden ${sidebarExpanded ? 'md:inline' : ''} lg:inline`}>Deploy</span>
          </Link>
          {/* Mobile close button */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="ml-auto md:hidden text-fg-tertiary hover:text-fg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 md:px-1.5 lg:px-3 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                title={item.name}
                className={`flex items-center gap-3 px-3 md:px-0 md:justify-center lg:px-3 lg:justify-start py-2 text-[11px] font-mono font-medium tracking-wide transition-all ${
                  active
                    ? 'bg-accent text-bg'
                    : 'text-fg-secondary hover:text-fg hover:bg-bg-elevated'
                } ${sidebarExpanded ? 'md:px-3 md:justify-start' : ''}`}
              >
                <item.icon className="w-3.5 h-3.5 shrink-0" />
                <span className={`md:hidden ${sidebarExpanded ? 'md:inline' : ''} lg:inline`}>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Workspace + User */}
        <div className="border-t border-border">
          {/* Workspace */}
          <div className={`px-4 md:px-2 lg:px-4 py-3 border-b border-border ${sidebarExpanded ? 'md:px-4' : ''}`}>
            <p className={`label-mono mb-1 md:hidden ${sidebarExpanded ? 'md:block' : ''} lg:block`}>Workspace</p>
            <p className={`text-xs font-medium truncate md:hidden ${sidebarExpanded ? 'md:block' : ''} lg:block`}>{organization?.name || 'Personal'}</p>
            <div className="flex items-center gap-1.5 mt-1.5 md:justify-center lg:justify-start">
              <span className="led led-live animate-pulse-dot" />
              <span className={`font-mono text-[10px] text-signal-live font-semibold md:hidden ${sidebarExpanded ? 'md:inline' : ''} lg:inline`}>LIVE</span>
            </div>
          </div>

          {/* User */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center gap-3 px-4 md:px-2 md:justify-center lg:px-4 lg:justify-start py-3 hover:bg-bg-elevated transition-colors"
            >
              <div className="w-7 h-7 bg-bg-elevated border border-border flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                {profile?.display_name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className={`flex-1 text-left min-w-0 md:hidden ${sidebarExpanded ? 'md:block' : ''} lg:block`}>
                <p className="text-xs font-medium truncate">{profile?.display_name || 'User'}</p>
                <p className="font-mono text-[10px] text-fg-tertiary uppercase">{profile?.tier || 'free'}</p>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-fg-tertiary transition-transform md:hidden ${sidebarExpanded ? 'md:block' : ''} lg:block ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {userMenuOpen && (
              <div className="absolute bottom-full left-0 w-full bg-bg-surface border border-border shadow-lg z-50">
                <Link href="/settings" onClick={() => { setUserMenuOpen(false); setMobileMenuOpen(false); }}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-mono text-fg-secondary hover:bg-bg-elevated hover:text-fg">
                  <User className="w-3.5 h-3.5" /> ACCOUNT
                </Link>
                <Link href="/pricing" onClick={() => { setUserMenuOpen(false); setMobileMenuOpen(false); }}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-mono text-fg-secondary hover:bg-bg-elevated hover:text-fg">
                  <CreditCard className="w-3.5 h-3.5" /> BILLING
                </Link>
                <div className="border-t border-border" />
                <button onClick={() => signOut()}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-xs font-mono text-signal-error hover:bg-bg-elevated">
                  <LogOut className="w-3.5 h-3.5" /> SIGN OUT
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col relative overflow-hidden w-full">
        {/* Header */}
        <header className="h-14 bg-bg-surface border-b border-border flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-2 font-mono text-[11px] tracking-wide">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden mr-2 text-fg-secondary hover:text-fg"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-fg-tertiary hidden sm:inline">~$</span>
            <span className="text-fg-secondary hidden sm:inline">deploy</span>
            <span className="text-fg-ghost hidden sm:inline">/</span>
            <span className="text-fg font-semibold">
              {NAV.find(item => pathname.startsWith(item.href))?.name || 'DASHBOARD'}
            </span>
            <span className="w-2 h-4 bg-fg animate-cursor-blink ml-1 hidden sm:inline-block" />
          </div>

          <div className="flex items-center gap-4">
            <span className="font-mono text-[10px] text-fg-tertiary hidden sm:inline">
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
            </span>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 relative">
          <CornerBracket position="tl" />
          <CornerBracket position="tr" />
          <CornerBracket position="bl" />
          <CornerBracket position="br" />
          <div className="animate-materialize">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
