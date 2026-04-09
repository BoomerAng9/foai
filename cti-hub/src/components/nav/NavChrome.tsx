'use client';

/**
 * NavChrome — grouped left-panel nav + header with back/home
 * ============================================================
 * Replaces the flat 24-item NAV array that lived in the dashboard
 * layout. Reads the sitemap, filters by host + owner status, and
 * renders a collapsible branch tree with stable IDs.
 *
 * Every page gets:
 *   - Back arrow (router.back())
 *   - Home button (routes to /)
 *   - Current-branch auto-expand based on pathname
 *   - Mobile drawer behavior preserved
 */

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ExternalLink,
  Home,
  Menu,
  Pin,
  PinOff,
  X,
} from 'lucide-react';
import {
  NAV_BRANCHES,
  TOP_LEVEL_ENTRIES,
  EXTERNAL_REROUTES,
  filterSitemap,
  hostVariantFromHostname,
  type NavHost,
  type NavBranch,
  type NavEntry,
} from '@/lib/nav/sitemap';

interface NavChromeProps {
  /** Display name for the signed-in user (falls back to "User") */
  userDisplayName?: string;
  /** Signed-in email initial for the avatar block */
  userInitial?: string;
  /** Tier label shown under the user name */
  userTier?: string;
  /** Workspace/organization name */
  workspaceName?: string;
  /** True if the signed-in user is an admin or operator */
  isOwner: boolean;
  /** Rendered inside the main content area */
  children: React.ReactNode;
  /** Optional header-right slot (date, status, etc.) */
  headerRight?: React.ReactNode;
  /** Optional footer slot under the user menu */
  userMenuSlot?: React.ReactNode;
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

function branchHasActiveChild(pathname: string, branch: NavBranch): boolean {
  return branch.entries.some(e => isActive(pathname, e.href));
}

/** Detect the current host variant at mount time */
function useHostVariant(): NavHost {
  const [host, setHost] = useState<NavHost>('cti');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHost(hostVariantFromHostname(window.location.hostname));
    }
  }, []);
  return host;
}

export default function NavChrome({
  userDisplayName = 'User',
  userInitial = '?',
  userTier = 'free',
  workspaceName = 'Personal',
  isOwner,
  children,
  headerRight,
  userMenuSlot,
}: NavChromeProps) {
  const pathname = usePathname();
  const router = useRouter();
  const host = useHostVariant();

  const sitemap = useMemo(() => filterSitemap(host, isOwner), [host, isOwner]);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [manuallyExpanded, setManuallyExpanded] = useState<Set<string>>(new Set());

  // Auto-expand the branch containing the active route
  const autoExpandedBranchId = useMemo(() => {
    const match = sitemap.branches.find(b => branchHasActiveChild(pathname, b));
    return match?.id ?? null;
  }, [pathname, sitemap.branches]);

  const isBranchExpanded = (branchId: string) =>
    manuallyExpanded.has(branchId) || branchId === autoExpandedBranchId;

  const toggleBranch = (branchId: string) => {
    setManuallyExpanded(prev => {
      const next = new Set(prev);
      if (next.has(branchId)) next.delete(branchId);
      else next.add(branchId);
      return next;
    });
  };

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
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const sidebarExpanded = sidebarHovered || sidebarPinned;
  const canGoBack = pathname !== '/' && pathname !== '/chat';

  // Active entry label for the header
  const activeLabel = useMemo(() => {
    // Top-level
    const top = TOP_LEVEL_ENTRIES.find(e => isActive(pathname, e.href));
    if (top) return top.label;
    // Branches
    for (const b of NAV_BRANCHES) {
      const hit = b.entries.find(e => isActive(pathname, e.href));
      if (hit) return `${b.label} · ${hit.label}`;
    }
    // Externals (unlikely to be the active pathname, but covered)
    const ext = EXTERNAL_REROUTES.find(e => isActive(pathname, e.href));
    if (ext) return ext.label;
    return 'Dashboard';
  }, [pathname]);

  return (
    <div className="flex h-screen bg-bg text-fg font-sans overflow-hidden">
      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ═══ SIDEBAR ═══ */}
      <aside
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        className={`
          bg-bg-surface border-r border-border flex flex-col shrink-0 z-50
          transition-all duration-200 ease-in-out
          fixed inset-y-0 left-0 md:relative
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
          w-64 md:w-14 ${sidebarExpanded ? 'lg:w-64' : 'md:w-14'} lg:w-64
        `}
      >
        {/* Logo + close */}
        <div className="h-14 flex items-center px-5 md:px-3 md:justify-center lg:px-5 lg:justify-start border-b border-border">
          <Link
            href="/"
            className="flex items-center gap-2.5 group"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className="w-7 h-7 bg-accent flex items-center justify-center shrink-0">
              <ChevronsLeft className="w-3.5 h-3.5 text-bg" />
            </div>
            <span
              className={`font-mono text-xs font-bold tracking-wider uppercase md:hidden ${
                sidebarExpanded ? 'md:inline' : ''
              } lg:inline`}
            >
              {host === 'cti' ? 'CTI Hub' : 'Deploy'}
            </span>
          </Link>
          {/* Pin/expand toggle for condensed/split-window mode */}
          <button
            onClick={() => setSidebarPinned(prev => !prev)}
            title={sidebarPinned ? 'Collapse sidebar' : 'Pin sidebar open'}
            className={`ml-auto hidden md:flex items-center justify-center p-1 rounded text-fg-tertiary hover:text-fg hover:bg-bg-elevated transition-all ${
              sidebarExpanded ? '' : 'md:hidden'
            } lg:flex`}
          >
            {sidebarPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          </button>
          {/* Mobile close */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="ml-auto md:hidden text-fg-tertiary hover:text-fg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation tree */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {/* Top-level entries (Home, Chat) */}
          {sitemap.topLevel.map(entry => {
            const active = isActive(pathname, entry.href);
            const Icon = entry.icon;
            return (
              <Link
                key={entry.id}
                href={entry.href}
                onClick={() => setMobileMenuOpen(false)}
                title={entry.description}
                className={`flex items-center gap-3 px-3 md:px-0 md:justify-center lg:px-3 lg:justify-start py-2 text-[11px] font-mono font-medium tracking-wide transition-all rounded ${
                  active
                    ? 'bg-accent text-bg'
                    : 'text-fg-secondary hover:text-fg hover:bg-bg-elevated'
                } ${sidebarExpanded ? 'md:px-3 md:justify-start' : ''}`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span
                  className={`md:hidden ${
                    sidebarExpanded ? 'md:inline' : ''
                  } lg:inline uppercase`}
                >
                  {entry.label}
                </span>
              </Link>
            );
          })}

          {/* Branches (collapsible) */}
          {sitemap.branches.map(branch => {
            const expanded = isBranchExpanded(branch.id);
            const hasActive = branchHasActiveChild(pathname, branch);
            const Icon = branch.icon;
            return (
              <div key={branch.id} className="pt-2">
                <button
                  type="button"
                  onClick={() => toggleBranch(branch.id)}
                  title={branch.description}
                  className={`w-full flex items-center gap-3 px-3 md:px-0 md:justify-center lg:px-3 lg:justify-start py-2 text-[10px] font-mono font-bold tracking-[0.15em] uppercase transition-all rounded ${
                    hasActive
                      ? 'text-accent'
                      : 'text-fg-tertiary hover:text-fg'
                  } ${sidebarExpanded ? 'md:px-3 md:justify-start' : ''}`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span
                    className={`flex-1 text-left md:hidden ${
                      sidebarExpanded ? 'md:inline' : ''
                    } lg:inline`}
                  >
                    {branch.label}
                  </span>
                  <span
                    className={`md:hidden ${
                      sidebarExpanded ? 'md:inline' : ''
                    } lg:inline`}
                  >
                    {expanded ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </span>
                </button>
                {expanded && (
                  <div className="mt-0.5 ml-2 pl-3 border-l border-border space-y-0.5">
                    {branch.entries.map(entry => {
                      const active = isActive(pathname, entry.href);
                      const EntryIcon = entry.icon;
                      return (
                        <Link
                          key={entry.id}
                          href={entry.href}
                          onClick={() => setMobileMenuOpen(false)}
                          title={entry.description}
                          className={`flex items-center gap-2.5 px-2 py-1.5 text-[11px] font-mono transition-all rounded ${
                            active
                              ? 'bg-accent text-bg font-medium'
                              : 'text-fg-secondary hover:text-fg hover:bg-bg-elevated'
                          }`}
                        >
                          <EntryIcon className="w-3 h-3 shrink-0 opacity-70" />
                          <span className="truncate md:hidden lg:inline">
                            {entry.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* External reroutes */}
          {sitemap.externals.length > 0 && (
            <div className="pt-4 mt-2 border-t border-border">
              <div
                className={`px-3 pb-1 text-[9px] font-mono font-bold tracking-[0.18em] uppercase text-fg-tertiary md:hidden ${
                  sidebarExpanded ? 'md:block' : ''
                } lg:block`}
              >
                External
              </div>
              {sitemap.externals.map(entry => {
                const Icon = entry.icon;
                return (
                  <a
                    key={entry.id}
                    href={entry.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={entry.description}
                    className="flex items-center gap-3 px-3 md:px-0 md:justify-center lg:px-3 lg:justify-start py-2 text-[11px] font-mono text-fg-secondary hover:text-fg hover:bg-bg-elevated transition-all rounded"
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span
                      className={`flex-1 md:hidden ${
                        sidebarExpanded ? 'md:inline' : ''
                      } lg:inline uppercase`}
                    >
                      {entry.label}
                    </span>
                    <ExternalLink
                      className={`w-3 h-3 shrink-0 opacity-50 md:hidden ${
                        sidebarExpanded ? 'md:inline' : ''
                      } lg:inline`}
                    />
                  </a>
                );
              })}
            </div>
          )}
        </nav>

        {/* Workspace + User footer */}
        <div className="border-t border-border">
          <div className="px-4 md:px-2 lg:px-4 py-3 border-b border-border">
            <p
              className={`text-[9px] font-mono font-bold tracking-[0.15em] uppercase text-fg-tertiary mb-1 md:hidden ${
                sidebarExpanded ? 'md:block' : ''
              } lg:block`}
            >
              Workspace
            </p>
            <p
              className={`text-xs font-medium truncate md:hidden ${
                sidebarExpanded ? 'md:block' : ''
              } lg:block`}
            >
              {workspaceName}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 md:justify-center lg:justify-start">
              <span className="w-1.5 h-1.5 bg-signal-live rounded-full animate-pulse" />
              <span
                className={`font-mono text-[10px] text-signal-live font-semibold md:hidden ${
                  sidebarExpanded ? 'md:inline' : ''
                } lg:inline`}
              >
                LIVE
              </span>
            </div>
          </div>
          <div className="px-4 md:px-2 lg:px-4 py-3 flex items-center gap-3">
            <div className="w-7 h-7 bg-bg-elevated border border-border flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
              {userInitial}
            </div>
            <div
              className={`flex-1 text-left min-w-0 md:hidden ${
                sidebarExpanded ? 'md:block' : ''
              } lg:block`}
            >
              <p className="text-xs font-medium truncate">{userDisplayName}</p>
              <p className="font-mono text-[10px] text-fg-tertiary uppercase">
                {userTier}
              </p>
            </div>
          </div>
          {userMenuSlot}
        </div>
      </aside>

      {/* ═══ MAIN ═══ */}
      <main className="flex-1 flex flex-col relative overflow-hidden w-full">
        {/* Header with back + home + active page label */}
        <header className="h-14 bg-bg-surface border-b border-border flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-2 font-mono text-[11px] tracking-wide">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden mr-2 text-fg-secondary hover:text-fg"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={() => (canGoBack ? router.back() : null)}
              disabled={!canGoBack}
              title="Back"
              aria-label="Back"
              className={`p-1.5 rounded transition-all ${
                canGoBack
                  ? 'text-fg-secondary hover:text-fg hover:bg-bg-elevated'
                  : 'text-fg-tertiary opacity-40 cursor-not-allowed'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <Link
              href="/"
              title="Home"
              aria-label="Home"
              className="p-1.5 rounded text-fg-secondary hover:text-fg hover:bg-bg-elevated transition-all"
            >
              <Home className="w-4 h-4" />
            </Link>
            <span className="text-border-strong mx-1">/</span>
            <span className="text-fg font-semibold truncate max-w-[50vw]">
              {activeLabel}
            </span>
          </div>

          <div className="flex items-center gap-4">{headerRight}</div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto relative">{children}</div>
      </main>
    </div>
  );
}
