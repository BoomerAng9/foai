/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  FolderOpen,
  LayoutDashboard,
  Users,
  Shield,
  MessageSquare,
  LogOut,
  ChevronRight,
  Bell,
  Bot,
  Send,
  TrendingUp,
  Search,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '@/hooks/useAuth';
import { AuthPromptTimer } from '@/components/auth/AuthPromptTimer';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── User Dropdown ──────────────────────────────────────────

function UserDropdown() {
  const { profile, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!profile) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200"
      >
        <div className="w-8 h-8 rounded-lg bg-[#0F172A] flex items-center justify-center text-white text-xs font-bold ring-2 ring-white shadow-sm overflow-hidden">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            profile.display_name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="hidden lg:block text-left">
          <p className="text-xs font-bold text-slate-900 leading-none">{profile.display_name}</p>
          <span className={cn(
            "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mt-0.5 inline-block",
            profile.tier === 'free' ? "bg-slate-100 text-slate-500" :
            profile.tier === 'pro' ? "bg-[#00A3FF1A] text-[#00A3FF]" : "bg-amber-100 text-amber-600"
          )}>
            {profile.tier}
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 py-2 ring-1 ring-black/5">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <p className="text-xs font-bold text-slate-900">{profile.display_name}</p>
            <p className="text-[10px] text-slate-500 truncate">{profile.user_id.slice(0, 12)}...</p>
          </div>
          <Link href="/settings" className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
            <Users className="w-3.5 h-3.5" /> Account
          </Link>
          <Link href="/pricing" className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
            <LayoutDashboard className="w-3.5 h-3.5" /> Billing
          </Link>
          <div className="h-px bg-slate-100 my-1" />
          <button onClick={() => signOut()} className="flex items-center gap-2 w-full px-4 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50">
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Org Switcher ───────────────────────────────────────────

function OrgSwitcher() {
  const { organization, organizations, switchOrg } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full p-2 rounded-xl hover:bg-slate-50 transition-all border border-slate-200 shadow-sm bg-white group"
      >
        <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white text-[10px] font-black shrink-0 shadow-lg">
          {organization?.name?.charAt(0).toUpperCase() || 'C'}
        </div>
        <div className="flex-1 text-left truncate">
          <p className="text-[10px] font-extrabold text-[#00A3FF] uppercase tracking-widest leading-none mb-1">Organization</p>
          <p className="text-xs font-bold text-slate-900 truncate">{organization?.name || 'Loading...'}</p>
        </div>
        <ChevronRight className={cn("w-4 h-4 text-slate-300 transition-transform", isOpen && "rotate-90")} />
      </button>

      {isOpen && (
        <div className="absolute left-0 bottom-full mb-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 py-3 ring-1 ring-black/5">
          <div className="px-4 pb-2 mb-2 border-b border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Workspaces</p>
          </div>
          <div className="max-h-60 overflow-y-auto px-2 space-y-1">
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => { switchOrg(org.id); setIsOpen(false); }}
                className={cn(
                  "flex items-center gap-3 w-full p-2.5 rounded-xl transition-all",
                  org.id === organization?.id ? "bg-[#00A3FF08] border border-[#00A3FF22]" : "hover:bg-slate-50 border border-transparent"
                )}
              >
                <div className={cn("w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-[8px] font-bold shrink-0",
                  org.id === organization?.id ? "bg-[#00A3FF] text-white" : "text-slate-400"
                )}>
                  {org.name.charAt(0).toUpperCase()}
                </div>
                <span className={cn("text-xs font-bold truncate flex-1 text-left",
                  org.id === organization?.id ? "text-slate-900" : "text-slate-500"
                )}>
                  {org.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Talk Dock ──────────────────────────────────────────────

function TalkDock() {
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={cn("border-t border-slate-200 bg-white transition-all duration-300", isExpanded ? "h-64" : "h-16")}>
      {isExpanded && (
        <div className="flex-1 p-4 overflow-y-auto h-[calc(100%-4rem)]">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="w-4 h-4 text-[#00A3FF]" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">ACHEEVY Agent</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Ready. Send a command to route through the agent fleet. Voice and vision coming next.
          </p>
        </div>
      )}
      <div className="h-16 px-4 flex items-center gap-3 border-t border-slate-100">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          type="button"
          title={isExpanded ? "Collapse" : "Expand"}
          className="w-9 h-9 rounded-xl bg-[#00A3FF] text-white flex items-center justify-center hover:bg-[#0089D9] transition-all shadow-lg shadow-[#00A3FF33] shrink-0"
        >
          <Bot className="w-4 h-4" />
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Talk to ACHEEVY..."
          className="flex-1 h-10 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#00A3FF]/30 focus:border-[#00A3FF] transition-all"
        />
        <button
          type="button"
          title="Send"
          disabled={!input.trim()}
          className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 transition-all disabled:opacity-30 shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Dashboard Layout ───────────────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, organization, organizations, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && organizations.length === 0 && pathname !== '/pricing') {
      // Auto-provision workspace on first login handled by AuthProvider
    }
  }, [user, organizations, loading, pathname]);

  const navItems = [
    { name: 'Chat w/ ACHEEVY', href: '/chat/librechat', icon: MessageSquare },
    { name: 'Operations Floor', href: '/live', icon: Activity },
    { name: 'My Projects', href: '/projects', icon: FolderOpen },
    { name: 'Enrollments', href: '/enrollments', icon: TrendingUp },
    { name: 'Open Seats', href: '/open-seats', icon: Search },
    { name: 'My Squad', href: '/team', icon: Shield },
    { name: 'Account', href: '/settings', icon: Users },
    { name: 'Billing', href: '/pricing', icon: LayoutDashboard },
  ];

  return (
    <div className="flex h-screen bg-[#F9FAFB] text-slate-900 font-sans antialiased overflow-hidden">
      <AuthPromptTimer />

      {/* Left Sidebar */}
      <aside className="w-60 bg-white border-r border-[#E5E7EB] flex flex-col z-20">
        <div className="p-5">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-[#00A3FF] flex items-center justify-center text-white text-sm font-black">D</div>
            <span className="text-lg font-bold tracking-tight">Deploy</span>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium",
                  isActive
                    ? "bg-[#00A3FF] text-white shadow-lg shadow-[#00A3FF33]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className={cn("w-4 h-4", isActive ? "text-white" : "text-slate-400")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 space-y-3 border-t border-slate-100">
          <OrgSwitcher />
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Fleet</span>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black text-emerald-600">LIVE</span>
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-500">
              {organization?.name || 'Workspace'} &middot; {organization?.id?.slice(0, 8) || '---'}
            </p>
          </div>
        </div>
      </aside>

      {/* Main Canvas */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-14 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-6 z-10 shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">The Deploy Platform</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-slate-900 font-semibold">
              {navItems.find(item => pathname.startsWith(item.href))?.name || 'Dashboard'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button type="button" title="Notifications" className="relative text-slate-400 hover:text-slate-600">
              <Bell className="w-5 h-5" />
            </button>
            <UserDropdown />
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>

        <TalkDock />
      </main>
    </div>
  );
}
