'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';

export function HawkFooter() {
  const reduce = useReducedMotion();

  return (
    <motion.footer
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="relative mt-24 border-t border-foai-border bg-foai-bg/80 backdrop-blur"
    >
      <div className="mx-auto max-w-6xl px-6 py-12 grid gap-10 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl text-foai-gold leading-none">⌬</span>
            <span className="font-semibold tracking-wide text-foai-text">Chicken Hawk</span>
          </div>
          <p className="text-sm text-foai-muted leading-relaxed">
            Direct, capable, good-humored. The kind of help you'd hire if you could.
          </p>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wider text-foai-muted font-semibold mb-3">
            Get started
          </div>
          <ul className="space-y-2 text-sm">
            <li><Link href="/" className="hover:text-foai-gold transition-colors">Start a conversation</Link></li>
            <li><Link href="/about" className="hover:text-foai-gold transition-colors">What can Chicken Hawk do?</Link></li>
            <li><Link href="/login" className="hover:text-foai-gold transition-colors">Operator sign-in</Link></li>
          </ul>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wider text-foai-muted font-semibold mb-3">
            How it works
          </div>
          <ul className="space-y-2 text-sm">
            <li className="text-foai-muted">Acts on the routine</li>
            <li className="text-foai-muted">Pauses on the consequential</li>
            <li className="text-foai-muted">Leaves a verifiable trail</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-foai-border">
        <div className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between text-xs text-foai-muted">
          <span>Built and run by ACHIEVEMOR.</span>
          <span className="font-mono">© {new Date().getFullYear()} ACHIEVEMOR</span>
        </div>
      </div>
    </motion.footer>
  );
}
