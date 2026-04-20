import { Suspense } from 'react';
import DestinationsCanvas from '@/components/DestinationsCanvas';

export const dynamic = 'force-dynamic';

/**
 * Destinations AI — discovery canvas entry.
 *
 * Server component fetches initial destinations + coming-soon payloads
 * at request time, hands them to the client canvas for interactive rendering.
 */
export default async function HomePage() {
  // In production behind a CDN the inner API routes carry s-maxage=60 / 300.
  // For the server render path we hit the DB directly via the server fetch
  // (Next hoists this as an origin call under Cloud Run).
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? '';
  const [destRes, comingRes] = await Promise.all([
    fetch(`${base}/api/destinations`, { cache: 'no-store' }),
    fetch(`${base}/api/coming-soon`, { cache: 'no-store' }),
  ]);

  const destinations = destRes.ok ? (await destRes.json()).data ?? [] : [];
  const comingSoon = comingRes.ok ? (await comingRes.json()).data ?? [] : [];

  return (
    <Suspense fallback={<CanvasFallback />}>
      <DestinationsCanvas
        initialDestinations={destinations}
        initialComingSoon={comingSoon}
      />
    </Suspense>
  );
}

function CanvasFallback() {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'var(--stage)' }}
      role="status"
      aria-label="Loading Destinations AI"
    >
      <div
        className="flex items-center gap-3"
        style={{
          fontFamily: 'var(--font-geist-mono), monospace',
          fontSize: 11,
          letterSpacing: '0.22em',
          color: 'var(--text-dim)',
        }}
      >
        <div className="w-1.5 h-1.5 rounded-full animate-pulse-orange bg-[#FF6B00]" />
        DESTINATIONS · LOADING CORRIDOR
      </div>
    </div>
  );
}
