'use client';

import Link from 'next/link';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'var(--pf-bg)' }}
    >
      <div className="max-w-md w-full text-center">
        <div
          className="w-16 h-16 rounded-2xl mx-auto mb-8 flex items-center justify-center"
          style={{
            background: 'rgba(212,168,83,0.1)',
            border: '1px solid rgba(212,168,83,0.2)',
          }}
        >
          <span className="text-2xl font-outfit font-black" style={{ color: '#D4A853' }}>
            !
          </span>
        </div>

        <h1
          className="font-outfit text-3xl font-black tracking-tight mb-3"
          style={{ color: '#D4A853' }}
        >
          Something went wrong
        </h1>

        <p className="text-sm font-mono text-white/40 mb-10 leading-relaxed">
          An unexpected error occurred. You can try again or head back to the home page.
        </p>

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="px-6 py-2.5 rounded-lg text-xs font-mono font-bold tracking-wider transition-colors"
            style={{
              background: 'rgba(212,168,83,0.15)',
              color: '#D4A853',
              border: '1px solid rgba(212,168,83,0.3)',
            }}
          >
            TRY AGAIN
          </button>

          <Link
            href="/"
            className="px-6 py-2.5 rounded-lg text-xs font-mono font-bold tracking-wider transition-colors"
            style={{
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.5)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            GO HOME
          </Link>
        </div>
      </div>
    </div>
  );
}
