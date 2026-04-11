'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { BackHomeNav } from '@/components/layout/BackHomeNav';
import OnboardingStepper from '@/components/podcasters/OnboardingStepper';

const T = {
  bg: '#0a0a0f',
  surface: '#111118',
  gold: '#D4A853',
  text: 'rgba(255,255,255,0.9)',
  textMuted: 'rgba(255,255,255,0.4)',
  red: '#D40028',
  border: 'rgba(255,255,255,0.08)',
};

export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (!fbUser) {
        router.replace('/login?redirect=/podcasters/onboarding');
        return;
      }
      setUser(fbUser);
      setChecking(false);
    });
    return () => unsub();
  }, [router]);

  if (checking || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: T.bg }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{ borderColor: T.border, borderTopColor: T.gold }}
          />
          <span className="text-xs font-mono" style={{ color: T.textMuted }}>
            Verifying access...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: T.bg, color: T.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Top ribbon */}
      <div style={{ background: T.bg, borderBottom: `2px solid ${T.red}` }}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between text-[11px] font-bold tracking-[0.18em] uppercase">
          <div className="flex items-center gap-3">
            <BackHomeNav />
            <span className="opacity-50">|</span>
            <span>Per|Form for Podcasters</span>
            <span className="opacity-50">|</span>
            <span style={{ color: T.gold }}>Onboarding</span>
          </div>
        </div>
      </div>

      <OnboardingStepper />

      {/* Footer */}
      <footer
        className="py-6 text-center text-[10px] font-mono tracking-[0.25em] mt-8"
        style={{ background: T.bg, color: 'rgba(255,255,255,0.3)', borderTop: `1px solid ${T.border}` }}
      >
        PER|FORM FOR PODCASTERS · PUBLISHED BY ACHIEVEMOR
      </footer>
    </div>
  );
}
