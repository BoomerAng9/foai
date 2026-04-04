'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { hasAccess, checkOwnerBypass } from '@/lib/paywall';

export default function PaywallGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'granted' | 'denied'>('checking');

  useEffect(() => {
    // Check owner bypass first, then localStorage
    if (checkOwnerBypass() || hasAccess()) {
      setStatus('granted');
    } else {
      setStatus('denied');
      router.replace('/access');
    }
  }, [router]);

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0F' }}>
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'rgba(212,168,83,0.3)', borderTopColor: 'transparent' }}
          />
          <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Checking access...
          </span>
        </div>
      </div>
    );
  }

  if (status === 'denied') {
    // Redirecting — show nothing
    return null;
  }

  return <>{children}</>;
}
