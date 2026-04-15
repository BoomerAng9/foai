'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { hasAccess, checkOwnerBypass, setOwnerVerified } from '@/lib/paywall';

export default function PaywallGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'granted' | 'denied'>('checking');

  useEffect(() => {
    if (checkOwnerBypass() || hasAccess()) {
      setStatus('granted');
      return;
    }

    // Try server-side verification
    fetch('/api/podcasters/profile')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.user) {
          setOwnerVerified(true);
          setStatus('granted');
        } else {
          setStatus('denied');
          router.replace('/access');
        }
      })
      .catch(() => {
        setStatus('denied');
        router.replace('/access');
      });
  }, [router]);

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--pf-bg)' }}>
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

  if (status === 'denied') return null;

  return <>{children}</>;
}
