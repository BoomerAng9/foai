"use client";

import React, { useState } from 'react';
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
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AuthPromptTimer } from '@/components/auth/AuthPromptTimer';

const NAV = [
  { name: 'HOME', href: '/chat', icon: MessageSquare },
  { name: 'WORKFLOWS', href: '/projects', icon: FolderOpen },
  { name: 'EXECUTIONS', href: '/live', icon: Activity },
  { name: 'PLUG BIN', href: '/create', icon: Video },
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

  return (
    <div className="flex h-screen bg-bg text-fg font-sans overflow-hidden logo-watermark">
      <AuthPromptTimer />

      {/* Sidebar */}
      <aside className="w-56 bg-bg-surface border-r border-border flex flex-col">
        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-border">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 bg-accent flex items-center justify-center">
              <Terminal className="w-3.5 h-3.5 text-bg" />
            </div>
            <span className="font-mono text-xs font-bold tracking-wider uppercase">Deploy</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 text-[11px] font-mono font-medium tracking-wide transition-all ${
                  active
                    ? 'bg-accent text-bg'
                    : 'text-fg-secondary hover:text-fg hover:bg-bg-elevated'
                }`}
              >
                <item.icon className="w-3.5 h-3.5 shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Workspace + User */}
        <div className="border-t border-border">
          {/* Workspace */}
          <div className="px-4 py-3 border-b border-border">
            <p className="label-mono mb-1">Workspace</p>
            <p className="text-xs font-medium truncate">{organization?.name || 'Personal'}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="led led-live animate-pulse-dot" />
              <span className="font-mono text-[10px] text-signal-live font-semibold">LIVE</span>
            </div>
          </div>

          {/* User */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-elevated transition-colors"
            >
              <div className="w-7 h-7 bg-bg-elevated border border-border flex items-center justify-center text-[10px] font-mono font-bold">
                {profile?.display_name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-medium truncate">{profile?.display_name || 'User'}</p>
                <p className="font-mono text-[10px] text-fg-tertiary uppercase">{profile?.tier || 'free'}</p>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-fg-tertiary transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {userMenuOpen && (
              <div className="absolute bottom-full left-0 w-full bg-bg-surface border border-border shadow-lg z-50">
                <Link href="/settings" onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-mono text-fg-secondary hover:bg-bg-elevated hover:text-fg">
                  <User className="w-3.5 h-3.5" /> ACCOUNT
                </Link>
                <Link href="/pricing" onClick={() => setUserMenuOpen(false)}
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
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-bg-surface border-b border-border flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2 font-mono text-[11px] tracking-wide">
            <span className="text-fg-tertiary">~$</span>
            <span className="text-fg-secondary">deploy</span>
            <span className="text-fg-ghost">/</span>
            <span className="text-fg font-semibold">
              {NAV.find(item => pathname.startsWith(item.href))?.name || 'DASHBOARD'}
            </span>
            <span className="w-2 h-4 bg-fg animate-cursor-blink ml-1" />
          </div>

          <div className="flex items-center gap-4">
            <span className="font-mono text-[10px] text-fg-tertiary">
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
            </span>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 relative">
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
