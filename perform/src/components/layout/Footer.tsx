'use client';

import Link from 'next/link';

/**
 * Global footer (SHIP-CHECKLIST Gate 8 · Item 47).
 * Visible on every page — contact channel + legal pages + help link must
 * be reachable from any customer entry point without chasing menus.
 */

const CONTACT_EMAIL = 'bpo@achievemor.io';

export function Footer() {
  return (
    <footer
      className="px-6 py-6 mt-12"
      style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4 md:gap-8 items-center md:items-start justify-between text-[11px] font-mono">
        <div className="flex flex-col gap-1 items-center md:items-start">
          <span className="text-white/60 font-bold tracking-[0.2em]" style={{ color: '#D4A853' }}>
            PER|FORM
          </span>
          <span className="text-white/30">
            TIE-powered sports grading &amp; ranking
          </span>
          <span className="text-white/20 mt-1">
            © {new Date().getFullYear()} ACHIEVEMOR. All rights reserved.
          </span>
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-2 justify-center text-white/50">
          <Link href="/help" className="hover:text-white/80 transition-colors">
            Help &amp; FAQ
          </Link>
          <Link href="/legal/tos" className="hover:text-white/80 transition-colors">
            Terms of Service
          </Link>
          <Link href="/legal/privacy" className="hover:text-white/80 transition-colors">
            Privacy
          </Link>
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=Per%7CForm%20support`}
            className="hover:text-white/80 transition-colors"
          >
            Contact
          </a>
        </nav>
      </div>
    </footer>
  );
}
