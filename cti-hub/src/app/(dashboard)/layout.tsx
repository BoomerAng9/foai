/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Terminal,
  FlaskConical,
  MessageSquare,
  LogOut,
  ChevronRight,
  Bell,
  Play,
  Bot,
  Send,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '@/hooks/useAuth';
import { useWhiteLabel } from '@/hooks/useWhiteLabel';
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
        <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 py-2 overflow-hidden ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <p className="text-xs font-bold text-slate-900 leading-none mb-1">{profile.display_name}</p>
            <p className="text-[10px] text-slate-500 font-medium truncate">UID: {profile.user_id.slice(0, 12)}...</p>
          </div>
          <div className="py-1">
            <Link href="/settings" className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
              <Users className="w-3.5 h-3.5" /> Account Settings
            </Link>
            <Link href="/pricing" className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
              <LayoutDashboard className="w-3.5 h-3.5" /> Billing
            </Link>
          </div>
          <div className="h-px bg-slate-100 my-1" />
          <button onClick={() => signOut()} className="flex items-center gap-2 w-full px-4 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors">
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
        <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white text-[10px] font-black shrink-0 shadow-lg group-hover:scale-110 transition-transform">
          {organization?.name?.charAt(0).toUpperCase() || 'G'}
        </div>
        <div className="flex-1 text-left truncate">
          <p className="text-[10px] font-extrabold text-[#00A3FF] uppercase tracking-widest leading-none mb-1">Organization</p>
          <p className="text-xs font-bold text-slate-900 truncate">{organization?.name || 'Loading...'}</p>
        </div>
        <ChevronRight className={cn("w-4 h-4 text-slate-300 transition-transform", isOpen && "rotate-90")} />
      </button>

      {isOpen && (
        <div className="absolute left-0 bottom-full mb-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 py-3 overflow-hidden ring-1 ring-black/5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="px-4 pb-2 mb-2 border-b border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Select Runtime</p>
          </div>
          <div className="max-h-60 overflow-y-auto px-2 space-y-1">
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => { switchOrg(org.id); setIsOpen(false); }}
                className={cn(
                  "flex items-center gap-3 w-full p-2.5 rounded-xl transition-all group",
                  org.id === organization?.id ? "bg-[#00A3FF08] border border-[#00A3FF22]" : "hover:bg-slate-50 border border-transparent"
                )}
              >
                <div className={cn("w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-[8px] font-bold shrink-0",
                  org.id === organization?.id ? "bg-[#00A3FF] text-white" : "text-slate-400 group-hover:text-slate-600"
                )}>
                  {org.name.charAt(0).toUpperCase()}
                </div>
                <span className={cn("text-xs font-bold truncate flex-1 text-left",
                  org.id === organization?.id ? "text-slate-900" : "text-slate-500 group-hover:text-slate-900"
                )}>
                  {org.name}
                </span>
                {org.id === organization?.id && <div className="w-1.5 h-1.5 rounded-full bg-[#00A3FF] shadow-[0_0_8px_rgba(0,163,255,0.6)]" />}
              </button>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 px-2">
            <Link href="/onboarding" className="flex items-center gap-2 w-full p-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all border border-dashed border-slate-200">
              <div className="w-6 h-6 rounded bg-slate-50 flex items-center justify-center text-slate-400">+</div>
              Create Organization
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Talk Dock (persistent bottom agent interaction) ─────────

function TalkDock() {
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={cn(
      "border-t border-slate-200 bg-white transition-all duration-300",
      isExpanded ? "h-64" : "h-16"
    )}>
      {isExpanded && (
        <div className="flex-1 p-4 overflow-y-auto h-[calc(100%-4rem)]">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="w-4 h-4 text-[#00A3FF]" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">ACHEEVY Agent</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Ready. Send a directive to route through the governed runtime.
          </p>
        </div>
      )}

      <div className="h-16 px-4 flex items-center gap-3 border-t border-slate-100">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          type="button"
          title={isExpanded ? "Collapse talk dock" : "Expand talk dock"}
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
          title="Send message"
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
  const { config } = useWhiteLabel();
  const isOwnerView = profile?.role === 'admin' || profile?.role === 'operator';

  useEffect(() => {
    if (!loading && user && organizations.length === 0 && pathname !== '/pricing') {
      router.push('/onboarding');
    }
  }, [user, organizations, loading, pathname, router]);

  const primaryNavItems = [
    { name: 'Chat w/ ACHEEVY', href: '/chat/librechat', icon: MessageSquare },
    { name: 'Account', href: '/settings', icon: Users },
    { name: 'Billing', href: '/pricing', icon: LayoutDashboard },
  ];

  const ownerNavItems = [
    { name: 'Board', href: '/board', icon: LayoutDashboard },
    { name: 'Run', href: '/manager', icon: Play },
    { name: 'Agents', href: '/agents', icon: Users },
    { name: 'Memory', href: '/memory', icon: ShieldCheck },
    { name: 'Policies', href: '/policies', icon: ShieldCheck },
    { name: 'Logs', href: '/logs', icon: Terminal },
    { name: 'Research Lab', href: '/research', icon: FlaskConical },
  ];

  const navItems = isOwnerView ? [...primaryNavItems, ...ownerNavItems] : primaryNavItems;

  return (
    <div className="flex h-screen bg-[#F9FAFB] text-slate-900 font-sans antialiased overflow-hidden">
      <AuthPromptTimer />

      {/* ─── Left Sidebar: Org Navigation ─── */}
      <aside className="w-64 bg-white border-r border-[#E5E7EB] flex flex-col z-20">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Image
              src="/grammar-logo.svg"
              alt="GRAMMAR Logo"
              className="w-auto h-9 object-contain"
              width={120}
              height={40}
              priority
            />
          </Link>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/board' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name + item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-sm font-medium",
                  isActive
                    ? "text-white shadow-lg shadow-[#00A3FF33]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
                style={isActive ? { backgroundColor: config.primaryColor } : {}}
              >
                <item.icon className={cn("w-4 h-4 transition-colors", isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 space-y-4 border-t border-slate-100">
          <OrgSwitcher />

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Runtime</span>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-emerald-600">LIVE</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-slate-500">Governance</span>
                <span className="text-slate-900 font-mono">ACTIVE</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-slate-500">Org ID</span>
                <span className="text-slate-900 font-mono truncate ml-4">{organization?.id?.slice(0, 8) || '---'}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── Main: Central Canvas (Run) + Header ─── */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-6 z-10 shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400 px-1">CTI HUB</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-slate-900 font-semibold px-1">
              {navItems.find(item => item.href === pathname)?.name ||
               (pathname === '/settings' ? 'Settings' :
                pathname === '/pricing' ? 'Subscription' : 'Dashboard')}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button type="button" title="Notifications" className="relative text-slate-400 hover:text-slate-600">
              <Bell className="w-5 h-5" />
              <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
            </button>
            <UserDropdown />
          </div>
        </header>

        {/* Execution Canvas */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>

        {/* ─── Bottom Dock: Talk to ACHEEVY ─── */}
        <TalkDock />
      </main>
    </div>
  );
}
