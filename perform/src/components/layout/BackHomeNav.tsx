'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Home } from 'lucide-react';

/**
 * Compact back + home navigation cluster for ribbon bars.
 *
 * Two variants:
 *  - "dark"  (default): white text on dark navy ribbon
 *  - "light": dark text on light/white ribbon
 */
export function BackHomeNav({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const router = useRouter();

  const baseText = variant === 'dark' ? 'text-white/50 hover:text-white/90' : 'text-black/40 hover:text-black/80';
  const divider = variant === 'dark' ? 'bg-white/20' : 'bg-black/15';

  return (
    <div className="flex items-center gap-1 mr-3">
      <button
        onClick={() => router.back()}
        className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded transition-colors ${baseText}`}
        aria-label="Go back"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        <span className="text-[10px] font-bold tracking-[0.12em] uppercase">Back</span>
      </button>
      <Link
        href="/"
        className={`flex items-center px-1 py-0.5 rounded transition-colors ${baseText}`}
        aria-label="Home"
      >
        <Home className="w-3 h-3" />
      </Link>
      <div className={`w-px h-3.5 ${divider} ml-1`} />
    </div>
  );
}
