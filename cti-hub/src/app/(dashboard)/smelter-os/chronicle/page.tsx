'use client';

/**
 * /smelter-os/chronicle — Chronicle Ledger + Charter viewer
 * ============================================================
 * Ledger  = /smelter-os/chronicle/ledger/  (internal audit, heartbeats)
 * Charter = /smelter-os/chronicle/charter/ (customer-facing activity)
 *
 * Owner-only. Tab switch. Newest first. Inline preview per entry.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { isOwner } from '@/lib/allowlist';

type Kind = 'ledger' | 'charter';

interface Entry {
  name: string;
  modified: string | null;
  size: number | null;
  preview: string | null;
}

interface Response {
  kind: Kind;
  path: string;
  total: number;
  returned: number;
  entries: Entry[];
  error?: string;
}

export default function ChroniclePage() {
  const { user } = useAuth();
  const [kind, setKind] = useState<Kind>('ledger');
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isOwner(user.email)) return;
    setLoading(true);
    fetch(`/api/smelter-os/chronicle?kind=${kind}&limit=30`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [user, kind]);

  if (!user || !isOwner(user.email)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#050810' }}>
        <div className="text-[10px] font-mono text-white/50">Owner access required</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background: 'radial-gradient(ellipse at top, #0B1220 0%, #050810 60%)',
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      <div className="max-w-5xl mx-auto px-6 py-10">
        <Link
          href="/smelter-os"
          className="text-[10px] font-mono tracking-[0.25em] opacity-60 hover:opacity-100 inline-block mb-6"
          style={{ color: '#F5A623' }}
        >
          ← SMELTEROS BRIDGE
        </Link>

        <div className="mb-8">
          <div className="text-[10px] font-mono tracking-[0.3em] mb-2" style={{ color: '#F97316' }}>
            / CHRONICLE
          </div>
          <h1 className="text-4xl font-black tracking-tight">Chronicle Log</h1>
          <p className="text-sm mt-2" style={{ color: '#94A3B8' }}>
            {kind === 'ledger'
              ? 'Internal audit trail: heartbeats, mission events, agent activity. Never exposed to customers.'
              : 'Customer-facing activity log: mission completions, certified ingots, milestone events.'}
          </p>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-1 mb-6 p-1 border inline-flex"
          style={{
            borderColor: 'rgba(245,166,35,0.25)',
            background: 'rgba(11,18,32,0.5)',
            borderRadius: '2px',
          }}
        >
          <TabButton active={kind === 'ledger'} onClick={() => setKind('ledger')} accent="#F97316">
            LEDGER (internal)
          </TabButton>
          <TabButton active={kind === 'charter'} onClick={() => setKind('charter')} accent="#22D3EE">
            CHARTER (customer)
          </TabButton>
        </div>

        {loading && (
          <div className="text-[11px] font-mono opacity-50 py-8 text-center">Loading entries...</div>
        )}

        {!loading && data?.error && (
          <div
            className="p-4 border text-[11px] font-mono"
            style={{
              borderColor: 'rgba(239,68,68,0.4)',
              background: 'rgba(239,68,68,0.06)',
              color: '#FCA5A5',
              borderRadius: '2px',
            }}
          >
            <div className="font-bold mb-1">Chronicle unavailable</div>
            <div className="opacity-80">
              {data.error.includes('PUTER_BASE_URL')
                ? 'Puter is not configured. See BACKEND_WIRING.md Step 0 — deploy the Puter container.'
                : data.error}
            </div>
          </div>
        )}

        {!loading && data && !data.error && (
          <>
            <div className="text-[10px] font-mono opacity-60 mb-3">
              {data.returned} of {data.total} entries · newest first ·{' '}
              <span className="font-bold" style={{ color: '#F5A623' }}>
                {data.path}
              </span>
            </div>

            {data.entries.length === 0 && (
              <div
                className="p-8 text-center border text-[11px] font-mono"
                style={{
                  borderColor: 'rgba(245,166,35,0.2)',
                  background: 'rgba(11,18,32,0.4)',
                  color: '#94A3B8',
                  borderRadius: '2px',
                }}
              >
                No entries yet. {kind === 'ledger' ? 'Heartbeats will appear once the gateway is running.' : 'Customer activity will appear as missions complete.'}
              </div>
            )}

            <div className="space-y-2">
              {data.entries.map((e) => (
                <ChronicleRow
                  key={e.name}
                  entry={e}
                  expanded={expanded === e.name}
                  onToggle={() => setExpanded(expanded === e.name ? null : e.name)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  accent,
  children,
}: {
  active: boolean;
  onClick: () => void;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 text-[10px] font-mono tracking-[0.2em] font-bold transition"
      style={{
        background: active ? accent : 'transparent',
        color: active ? '#050810' : accent,
        borderRadius: '2px',
      }}
    >
      {children}
    </button>
  );
}

function ChronicleRow({
  entry,
  expanded,
  onToggle,
}: {
  entry: Entry;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="border overflow-hidden"
      style={{
        borderColor: 'rgba(245,166,35,0.2)',
        background: 'rgba(11,18,32,0.5)',
        borderRadius: '2px',
      }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.04] transition"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span>{expanded ? '▼' : '▶'}</span>
          <span className="text-[11px] font-mono truncate" style={{ color: '#F5A623' }}>
            {entry.name}
          </span>
        </div>
        <div className="text-[9px] font-mono opacity-50 shrink-0 ml-3">
          {entry.size !== null ? `${entry.size} B` : ''}
        </div>
      </button>

      {expanded && entry.preview && (
        <pre
          className="p-4 text-[10px] font-mono leading-relaxed border-t overflow-x-auto max-h-96 overflow-y-auto"
          style={{
            borderColor: 'rgba(245,166,35,0.1)',
            background: '#050810',
            color: '#E2E8F0',
          }}
        >
          {entry.preview}
        </pre>
      )}
      {expanded && !entry.preview && (
        <div
          className="p-3 text-[10px] font-mono opacity-50 border-t"
          style={{ borderColor: 'rgba(245,166,35,0.1)' }}
        >
          (no preview available)
        </div>
      )}
    </div>
  );
}
