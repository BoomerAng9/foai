'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { hasAccess, grantAccess, checkOwnerBypass } from '@/lib/paywall';

export default function AccessPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Owner bypass via ?access=owner
    if (checkOwnerBypass() || hasAccess()) {
      router.replace('/draft');
      return;
    }
    setChecking(false);
  }, [router]);

  function handleEnter() {
    // For now, simulate Stripe checkout by granting access via localStorage.
    // Stripe integration replaces this later.
    grantAccess();
    router.push('/draft');
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0F' }}>
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'rgba(212,168,83,0.3)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#0A0A0F' }}>
      {/* Subtle radial glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 600px 400px at 50% 40%, rgba(212,168,83,0.06), transparent)',
        }}
      />

      <div className="relative z-10 max-w-lg w-full text-center">
        {/* Logo / brand */}
        <div className="mb-8">
          <span
            className="text-[10px] font-mono tracking-[0.4em]"
            style={{ color: 'rgba(255,255,255,0.25)' }}
          >
            WELCOME TO
          </span>
          <h1
            className="font-outfit text-5xl md:text-6xl font-black tracking-tight mt-2"
            style={{ color: '#D4A853' }}
          >
            PER|FORM
          </h1>
        </div>

        {/* Price block */}
        <div
          className="inline-flex flex-col items-center justify-center rounded-2xl px-12 py-8 mb-8"
          style={{
            background: 'rgba(212,168,83,0.06)',
            border: '1px solid rgba(212,168,83,0.2)',
          }}
        >
          <span
            className="font-outfit text-7xl md:text-8xl font-black"
            style={{ color: '#D4A853' }}
          >
            $7
          </span>
          <span
            className="text-xs font-mono tracking-[0.3em] mt-2"
            style={{ color: 'rgba(212,168,83,0.7)' }}
          >
            ONE-TIME ENTRY
          </span>
        </div>

        {/* Copy */}
        <p className="text-sm leading-relaxed text-white/50 max-w-md mx-auto mb-10">
          Per|Form runs around the clock &mdash; scraping, grading, and publishing so you
          don&apos;t have to. To keep the lights on, we ask for a one-time $7 entry.
          That&apos;s less than a large coconut latte for our team.
        </p>

        {/* CTA */}
        <button
          onClick={handleEnter}
          className="w-full max-w-xs mx-auto block px-8 py-4 rounded-xl text-sm font-outfit font-bold tracking-[0.2em] transition-all duration-200 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: '#D4A853',
            color: '#0A0A0F',
            boxShadow: '0 0 32px rgba(212,168,83,0.25)',
          }}
        >
          ENTER PER|FORM
        </button>

        {/* Already have access */}
        <button
          onClick={() => {
            if (hasAccess()) {
              router.push('/draft');
            } else {
              alert('No access found. Complete your entry to continue.');
            }
          }}
          className="mt-6 text-xs font-mono tracking-wider transition-colors duration-200 hover:text-white/60"
          style={{ color: 'rgba(255,255,255,0.25)' }}
        >
          Already have access?
        </button>
      </div>
    </div>
  );
}
