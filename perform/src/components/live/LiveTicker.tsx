'use client';

/**
 * LiveTicker
 * ===========
 * Horizontal marquee ticker subscribed to /api/rankings/stream SSE.
 * Renders recent draft picks (and snapshot of top board on connect) as a
 * scrolling line at the top of /rankings and /draft/board.
 *
 * Idle behaviour: shows the current top 5 names cycling. Once picks start
 * landing during the live draft, picks take over the rotation.
 */

import { useEffect, useState, useRef } from 'react';

interface PickEvent {
  type: 'pick';
  player_name: string;
  position: string | null;
  school: string | null;
  drafted_by_team: string;
  pick_number: number;
  round: number | null;
  ts: number;
}

interface SnapshotPlayer {
  id: number;
  name: string;
  position: string | null;
  school: string | null;
  overall_rank: number | null;
  tie_tier: string | null;
  drafted_by_team?: string | null;
}

interface TickerItem {
  key: string;
  text: string;
  accent: string;
  isPick: boolean;
}

const PICK_ACCENT = '#22C55E';
const RANK_ACCENT = '#D4A853';

export function LiveTicker(): React.JSX.Element {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [connected, setConnected] = useState(false);
  const evtRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource('/api/rankings/stream');
    evtRef.current = es;

    es.addEventListener('snapshot', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { players?: SnapshotPlayer[] };
        const top = (data.players ?? []).slice(0, 12).map(p => ({
          key: `snap-${p.id}`,
          text: p.drafted_by_team
            ? `#${p.overall_rank ?? '-'} ${p.name} → ${p.drafted_by_team}`
            : `#${p.overall_rank ?? '-'} ${p.name} · ${p.school ?? ''} · ${p.position ?? ''}`,
          accent: p.drafted_by_team ? PICK_ACCENT : RANK_ACCENT,
          isPick: !!p.drafted_by_team,
        }));
        setItems(top);
        setConnected(true);
      } catch {
        // ignore malformed snapshot
      }
    });

    es.addEventListener('pick', (e: MessageEvent) => {
      try {
        const ev = JSON.parse(e.data) as PickEvent;
        const item: TickerItem = {
          key: `pick-${ev.ts}-${ev.pick_number}`,
          text: `R${ev.round ?? '?'}/${ev.pick_number} · ${ev.drafted_by_team} → ${ev.player_name} (${ev.position ?? '?'}) · ${ev.school ?? ''}`,
          accent: PICK_ACCENT,
          isPick: true,
        };
        setItems(prev => [item, ...prev].slice(0, 30));
      } catch {
        // ignore malformed pick
      }
    });

    es.addEventListener('heartbeat', () => {
      setConnected(true);
    });

    es.onerror = () => {
      setConnected(false);
    };

    return () => {
      es.close();
      evtRef.current = null;
    };
  }, []);

  if (items.length === 0) {
    return (
      <div
        style={{
          background: '#06122A',
          color: 'rgba(255,255,255,0.4)',
          padding: '6px 16px',
          fontSize: 11,
          letterSpacing: '0.2em',
          fontFamily: 'monospace',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        ⏳ CONNECTING TO LIVE BOARD...
      </div>
    );
  }

  // Duplicate items for seamless marquee
  const marquee = [...items, ...items];

  return (
    <div
      style={{
        position: 'relative',
        background: '#06122A',
        borderBottom: `1px solid ${connected ? PICK_ACCENT : 'rgba(255,255,255,0.08)'}`,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 16px',
          gap: 12,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.18em',
          color: connected ? PICK_ACCENT : 'rgba(255,255,255,0.4)',
          fontFamily: 'monospace',
          background: 'linear-gradient(90deg, #06122A 0%, transparent 4%)',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 2,
        }}
      >
        <span style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: connected ? PICK_ACCENT : 'rgba(255,255,255,0.2)',
          boxShadow: connected ? `0 0 8px ${PICK_ACCENT}` : 'none',
          animation: connected ? 'pulse 1.6s ease-in-out infinite' : 'none',
        }} />
        LIVE
      </div>

      <div
        className="pf-ticker-track"
        style={{
          display: 'flex',
          gap: 32,
          padding: '8px 16px 8px 80px',
          whiteSpace: 'nowrap',
          animation: 'pf-ticker-marquee 60s linear infinite',
          willChange: 'transform',
        }}
      >
        {marquee.map((it, idx) => (
          <span
            key={`${it.key}-${idx}`}
            style={{
              fontSize: 12,
              fontFamily: 'monospace',
              color: it.accent,
              textShadow: it.isPick ? '0 0 8px rgba(34,197,94,0.4)' : 'none',
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.25)', marginRight: 12 }}>•</span>
            {it.text}
          </span>
        ))}
      </div>

      <style jsx>{`
        @keyframes pf-ticker-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
