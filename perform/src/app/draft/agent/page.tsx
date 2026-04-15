/**
 * /draft/agent — Claude Managed Agent Draft Night (Gamified)
 * ============================================================
 * Customer-facing entry to the Managed Agent draft session. Picks
 * stream live via SSE; user can talk back when their team is on the
 * clock. Fantasy-scored at the end (no gambling, no money).
 *
 * Coexists with the existing /draft/war-room which uses the legacy
 * simulation engine. Agent mode is the new, streaming, conversational
 * experience.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BackHomeNav } from '@/components/layout/BackHomeNav';

interface DraftEvent {
  type: 'pick' | 'trade' | 'commentary' | 'question' | 'user_turn' | 'status' | 'error';
  content: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

interface Session {
  sessionId: string;
  status: string;
  mode: string;
  userTeam?: string;
  chaosFactor: number;
}

const FIELD: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: 'var(--pf-text)',
  fontSize: 13,
};

export default function DraftAgentPage() {
  const [mode, setMode] = useState<'auto' | 'pick-team' | 'war-room'>('war-room');
  const [userTeam, setUserTeam] = useState('Bears');
  const [chaosFactor, setChaosFactor] = useState(30);
  const [session, setSession] = useState<Session | null>(null);
  const [events, setEvents] = useState<DraftEvent[]>([]);
  const [input, setInput] = useState('');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const esRef = useRef<EventSource | null>(null);

  async function startSession() {
    setError('');
    setStarting(true);
    setEvents([]);
    try {
      const res = await fetch('/api/draft/agent/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, userTeam: mode === 'auto' ? undefined : userTeam, chaosFactor, rounds: 1 }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || 'Could not start session');
        return;
      }
      setSession(json.session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setStarting(false);
    }
  }

  // Open SSE stream when a session starts
  useEffect(() => {
    if (!session) return;
    const es = new EventSource(`/api/draft/agent/${session.sessionId}/stream`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data) as DraftEvent;
        setEvents((prev) => [...prev, ev]);
      } catch { /* skip */ }
    };
    es.addEventListener('done', () => es.close());
    es.addEventListener('error', () => es.close());

    return () => { es.close(); esRef.current = null; };
  }, [session]);

  async function sendUserMessage() {
    if (!session || !input.trim()) return;
    const msg = input.trim();
    setInput('');
    setEvents((prev) => [...prev, { type: 'question', content: `> ${msg}`, timestamp: new Date().toISOString() }]);
    await fetch(`/api/draft/agent/${session.sessionId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg }),
    });
  }

  return (
    <main style={{ background: 'var(--pf-bg)', color: 'var(--pf-text)', minHeight: '100vh', padding: '32px 24px' }}>
      <BackHomeNav />

      <section style={{ maxWidth: 1080, margin: '0 auto' }}>
        <header style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.3em', color: 'var(--pf-gold)', textTransform: 'uppercase' }}>
            Draft Night · Agent Mode
          </p>
          <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.02em', margin: '8px 0 8px' }}>
            Live, conversational, fantasy-scored.
          </h1>
          <p style={{ color: 'var(--pf-text-muted)', fontSize: 14, lineHeight: 1.6, maxWidth: 720 }}>
            A Claude Managed Agent runs the entire draft. Talk to it when your team is on the clock —
            ask for trade offers, request a top-5 board, or just call out a name.
            Picks scored against canonical TIE grades when the round ends.
            <strong> No gambling. No real money. League points only.</strong>
          </p>
        </header>

        {!session && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 24 }}>
            <select style={FIELD} value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
              <option value="war-room">War Room — I control my team</option>
              <option value="pick-team">Pick Team — I make picks via prompts</option>
              <option value="auto">Auto — agent runs whole draft</option>
            </select>
            {mode !== 'auto' && (
              <input style={FIELD} value={userTeam} onChange={(e) => setUserTeam(e.target.value)} placeholder="Team" />
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--pf-text-muted)' }}>
              Chaos
              <input
                type="range"
                min={0}
                max={100}
                value={chaosFactor}
                onChange={(e) => setChaosFactor(parseInt(e.target.value, 10))}
              />
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: 'var(--pf-gold)', fontWeight: 700 }}>
                {chaosFactor}
              </span>
            </label>
            <button
              onClick={startSession}
              disabled={starting}
              style={{
                padding: '10px 22px',
                borderRadius: 999,
                background: 'var(--pf-gold)',
                color: 'var(--pf-navy-deep)',
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontSize: 12,
                border: 'none',
                cursor: starting ? 'wait' : 'pointer',
                opacity: starting ? 0.5 : 1,
              }}
            >
              {starting ? 'Starting…' : 'Start Draft'}
            </button>
            {error && <span style={{ color: '#F87171', fontSize: 12 }}>{error}</span>}
          </div>
        )}

        {session && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, fontSize: 12, color: 'var(--pf-text-muted)' }}>
              <span>
                Session <code>{session.sessionId.slice(0, 8)}</code> · {session.mode}
                {session.userTeam ? ` · ${session.userTeam}` : ''} · chaos {session.chaosFactor}
              </span>
              <Link href="/draft/war-room" style={{ color: 'var(--pf-gold)', textDecoration: 'none' }}>
                Switch to legacy War Room →
              </Link>
            </div>
            <div
              style={{
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                padding: 16,
                background: 'var(--pf-bg-secondary)',
                minHeight: 480,
                maxHeight: 640,
                overflowY: 'auto',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              {events.length === 0 && <p style={{ color: 'var(--pf-text-muted)' }}>Waiting for the commissioner…</p>}
              {events.map((e, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: 12,
                    paddingLeft: 12,
                    borderLeft: `3px solid ${
                      e.type === 'pick' ? 'var(--pf-gold)' :
                      e.type === 'trade' ? '#34D399' :
                      e.type === 'user_turn' ? '#F59E0B' :
                      e.type === 'commentary' ? '#7C3AED' :
                      e.type === 'error' ? '#F87171' :
                      'rgba(255,255,255,0.2)'
                    }`,
                    color: e.type === 'error' ? '#F87171' : 'var(--pf-text)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {e.content}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input
                style={{ ...FIELD, flex: 1 }}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') sendUserMessage(); }}
                placeholder="Make a pick, propose a trade, or ask the commissioner…"
              />
              <button
                onClick={sendUserMessage}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  background: 'var(--pf-gold)',
                  color: 'var(--pf-navy-deep)',
                  fontWeight: 800,
                  fontSize: 12,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Send
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
