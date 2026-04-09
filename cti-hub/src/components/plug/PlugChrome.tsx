'use client';

/**
 * PlugChrome — shared navigation header used by every plug page and the
 * Deploy Platform landing. Provides:
 *
 *   - Back arrow → routes to the parent (default: /plug for plug pages,
 *     overridable for the Deploy Platform via the `backHref` prop)
 *   - Plug icon + title + optional tagline in the center
 *   - Menu button (top right) opening a dropdown panel with:
 *       Home (/), Plug Bin (/plug), Deploy Platform (/deploy-landing),
 *       Account (/account), Sign Out
 *
 * Replaces the per-plug homemade headers that all linked back to /chat
 * (the wrong destination for a plug page).
 *
 * Usage:
 *   <PlugChrome
 *     title="Teacher Twin"
 *     tagline="Multilingual Classroom Assistant"
 *     icon={<GraduationCap />}
 *     accentColor="#E8A020"
 *   />
 */

import React, { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Menu as MenuIcon, X as CloseIcon } from 'lucide-react';

interface PlugChromeProps {
  /** Plug or page name displayed center-left of the header. */
  title: string;
  /** Optional secondary line under the title. */
  tagline?: string;
  /** Optional icon shown to the left of the title. */
  icon?: ReactNode;
  /** Accent color for the back arrow hover, the icon, and the menu trigger. */
  accentColor?: string;
  /** Override the back arrow's destination. Default: /plug */
  backHref?: string;
  /** Optional override label for the back arrow tooltip. */
  backLabel?: string;
  /** Optional right-side slot for plug-specific badges or toggles. */
  rightSlot?: ReactNode;
}

const MENU_ITEMS: { label: string; href: string }[] = [
  { label: 'Home', href: '/' },
  { label: 'Plug Bin', href: '/plug' },
  { label: 'Deploy Platform', href: '/deploy-landing' },
  { label: 'Account', href: '/account' },
];

export function PlugChrome({
  title,
  tagline,
  icon,
  accentColor = '#E8A020',
  backHref = '/plug',
  backLabel = 'Back',
  rightSlot,
}: PlugChromeProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const backIsExternal = /^https?:\/\//.test(backHref);
  const BackEl: React.ElementType = backIsExternal ? 'a' : Link;
  const backProps = backIsExternal
    ? { href: backHref, rel: 'noopener' }
    : { href: backHref };

  return (
    <header className="border-b border-border px-6 py-4 relative z-30">
      <div className="max-w-7xl mx-auto flex items-center gap-4">
        {/* Back arrow */}
        <BackEl
          {...backProps}
          aria-label={backLabel}
          className="text-fg-tertiary hover:text-fg transition-colors shrink-0"
          onMouseEnter={(e: React.MouseEvent<HTMLElement>) =>
            (e.currentTarget.style.color = accentColor)
          }
          onMouseLeave={(e: React.MouseEvent<HTMLElement>) =>
            (e.currentTarget.style.color = '')
          }
        >
          <ArrowLeft className="w-5 h-5" />
        </BackEl>

        {/* Icon */}
        {icon && (
          <div className="shrink-0" style={{ color: accentColor }}>
            {icon}
          </div>
        )}

        {/* Title + tagline */}
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold tracking-tight truncate text-fg">{title}</h1>
          {tagline && (
            <p className="text-xs text-fg-tertiary font-mono truncate">{tagline}</p>
          )}
        </div>

        {/* Right slot (plug-specific badges or toggles) */}
        {rightSlot && <div className="shrink-0">{rightSlot}</div>}

        {/* Menu button */}
        <button
          type="button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="shrink-0 p-2 -mr-2 text-fg-secondary hover:text-fg transition-colors"
        >
          {menuOpen ? <CloseIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
        </button>
      </div>

      {/* Menu dropdown */}
      {menuOpen && (
        <>
          {/* Click-out overlay */}
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setMenuOpen(false)}
          />
          {/* Dropdown panel */}
          <nav
            className="absolute right-6 top-full mt-1 z-20 min-w-[220px] border border-border bg-bg-surface/95 backdrop-blur shadow-2xl"
            role="menu"
          >
            <ul className="py-2">
              {MENU_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    role="menuitem"
                    className="block px-4 py-2.5 text-sm text-fg-secondary hover:bg-bg-elevated hover:text-fg transition-colors font-mono uppercase tracking-wider"
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li className="border-t border-border mt-1 pt-1">
                <Link
                  href="/auth/logout"
                  role="menuitem"
                  className="block px-4 py-2.5 text-sm text-fg-tertiary hover:bg-bg-elevated hover:text-fg transition-colors font-mono uppercase tracking-wider"
                  onClick={() => setMenuOpen(false)}
                >
                  Sign Out
                </Link>
              </li>
            </ul>
          </nav>
        </>
      )}
    </header>
  );
}
