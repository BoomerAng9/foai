'use client';

import Link from 'next/link';

/**
 * Global footer (SHIP-CHECKLIST Gate 8 · Item 47).
 * Visible on every page — contact channel + legal pages + help link must
 * be reachable from any customer entry point without chasing menus.
 *
 * Styled to match public/landing/index.html (PR γ, broadcast parity):
 * JetBrains Mono 11px, --pf-ink-faint color, --pf-line divider.
 */

const CONTACT_EMAIL = 'bpo@achievemor.io';

export function Footer() {
  return (
    <footer
      className="px-6 py-6 mt-12"
      style={{ borderTop: '1px solid var(--pf-line)' }}
    >
      <div
        className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4 md:gap-8 items-center md:items-start justify-between"
        style={{
          fontFamily: 'var(--font-jetbrains), monospace',
          fontSize: 11,
          letterSpacing: '0.02em',
        }}
      >
        <div className="flex flex-col gap-1 items-center md:items-start">
          <span
            style={{
              fontFamily: 'var(--font-barlow), "Barlow Condensed", sans-serif',
              fontWeight: 900,
              fontSize: 16,
              letterSpacing: '0.14em',
              color: 'var(--pf-ink)',
            }}
          >
            PER<span style={{ color: 'var(--pf-accent)' }}>|</span>FORM
          </span>
          <span style={{ color: 'var(--pf-ink-dim)' }}>
            TIE-powered talent intelligence
          </span>
          <span style={{ color: 'var(--pf-ink-faint)', marginTop: 2 }}>
            © {new Date().getFullYear()} ACHIEVEMOR. All rights reserved.
          </span>
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-2 justify-center" style={{ color: 'var(--pf-ink-dim)' }}>
          <Link href="/help" className="transition-colors hover:opacity-90" style={{ color: 'inherit' }}>
            Help &amp; FAQ
          </Link>
          <Link href="/legal/tos" className="transition-colors" style={{ color: 'inherit' }}>
            Terms of Service
          </Link>
          <Link href="/legal/privacy" className="transition-colors" style={{ color: 'inherit' }}>
            Privacy
          </Link>
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=Per%7CForm%20support`}
            className="transition-colors"
            style={{ color: 'inherit' }}
          >
            Contact
          </a>
        </nav>
      </div>
    </footer>
  );
}
