'use client';

/**
 * Podcaster Dashboard — Circuit Box Home
 * =========================================
 * Browse-first: renders for all visitors. Auth-gated actions only.
 * Shows CircuitBoxRoom hero, editable Huddl name, nav cards, recent news.
 */

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { BackHomeNav } from '@/components/layout/BackHomeNav';
import CircuitBoxRoom from '@/components/podcasters/CircuitBoxRoom';
import { getTeam } from '@/lib/podcasters/team-assets';
import { usePodcasterAuth } from '@/hooks/usePodcasterAuth';

/* ── Theme tokens ── */
const T = {
  bg: '#06122A',
  surface: '#0B1E3F',
  border: '#1E3A5F',
  text: '#F4F6FA',
  textMuted: '#8B94A8',
  gold: '#D4A853',
  red: '#D40028',
};

interface NewsItem {
  id: number;
  headline: string;
  source: string;
  published_at: string;
  url?: string;
}

interface Delivery {
  id: number;
  deliverable_id: string;
  deliverable_type: string;
  final_score: number;
  grade: string;
  graded_at: string;
}

interface TeamDetail {
  wins_2025: number;
  losses_2025: number;
  roster_count: number;
  draft_picks_2026: unknown[];
}

const NAV_CARDS = [
  {
    title: 'War Room',
    desc: 'Team data command center',
    href: '/podcasters/war-room',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D4A853" strokeWidth="1.5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    title: 'Workbench',
    desc: 'AI-assisted show prep',
    href: '/podcasters/workbench',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D4A853" strokeWidth="1.5">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  {
    title: 'Scripts',
    desc: 'Segment outlines & talking points',
    href: '/podcasters/workbench',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D4A853" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8M8 17h5" />
      </svg>
    ),
  },
  {
    title: 'Delivery Settings',
    desc: 'Schedule, format, notifications',
    href: '/podcasters/settings',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D4A853" strokeWidth="1.5">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
];

export default function PodcasterDashboardPage() {
  const { loading, authenticated, profile: user, promptLogin, showSignInPrompt } = usePodcasterAuth();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [teamDetail, setTeamDetail] = useState<TeamDetail | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.huddl_name) setNameValue(user.huddl_name);
  }, [user?.huddl_name]);

  useEffect(() => {
    if (!user?.selected_team) return;
    const team = encodeURIComponent(user.selected_team);
    fetch(`/api/nfl/news?team=${team}&limit=5`)
      .then((r) => r.json())
      .then((d) => setNews(d.news || d.articles || []))
      .catch(() => {});
    fetch(`/api/nfl/teams/${team}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.team) {
          setTeamDetail({
            wins_2025: d.team.wins_2025 || 0,
            losses_2025: d.team.losses_2025 || 0,
            roster_count: d.roster_count || 0,
            draft_picks_2026: d.team.draft_picks_2026 || [],
          });
        }
      })
      .catch(() => {});
    fetch(`/api/podcasters/deliveries?limit=5`)
      .then((r) => r.ok ? r.json() : { deliveries: [] })
      .then((d) => setDeliveries(d.deliveries || []))
      .catch(() => {});
  }, [user?.selected_team]);

  const teamData = user ? getTeam(user.selected_team) : null;

  const saveHuddlName = () => {
    setEditingName(false);
    if (!nameValue.trim() || nameValue === user?.huddl_name) return;
    fetch('/api/podcasters/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ huddl_name: nameValue.trim() }),
    }).catch(() => {});
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: T.bg }}>
        <div className="inline-block w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: T.border, borderTopColor: T.gold }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: T.bg, color: T.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* ═══ TOP RIBBON ═══ */}
      <div style={{ background: T.bg, borderBottom: `2px solid ${T.red}` }}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between text-[11px] font-bold tracking-[0.18em] uppercase">
          <div className="flex items-center gap-3">
            <BackHomeNav />
            <span className="opacity-50">|</span>
            <span>Dashboard</span>
          </div>
          <Link href="/podcasters" className="opacity-80 hover:opacity-100 transition" style={{ color: T.gold }}>
            Podcasters Home
          </Link>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* ═══ SIGN-IN BANNER ═══ */}
        {showSignInPrompt && (
          <div
            className="rounded-lg text-center text-sm py-3 px-6"
            style={{ background: T.surface, border: `1px solid ${T.gold}`, color: T.gold }}
          >
            <span>Sign in to save your team, configure deliveries, and access full features. </span>
            <button onClick={promptLogin} className="underline font-bold hover:opacity-80">
              Sign In
            </button>
          </div>
        )}

        {/* ═══ CIRCUIT BOX ROOM HERO ═══ */}
        {teamData && (
          <CircuitBoxRoom
            teamAbbrev={teamData.abbrev}
            teamName={`${teamData.city} ${teamData.name}`}
            primaryColor={teamData.primaryColor}
            secondaryColor={teamData.secondaryColor}
            conference={teamData.conference}
            division={teamData.division}
            wins={teamDetail?.wins_2025 ?? 0}
            losses={teamDetail?.losses_2025 ?? 0}
            rosterCount={teamDetail?.roster_count ?? 0}
            draftPicks={teamDetail?.draft_picks_2026?.length ?? 0}
          />
        )}

        {/* ═══ HUDDL NAME ═══ */}
        <div className="flex items-center gap-3">
          {authenticated && editingName ? (
            <input
              ref={nameRef}
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={saveHuddlName}
              onKeyDown={(e) => e.key === 'Enter' && saveHuddlName()}
              autoFocus
              className="text-3xl md:text-4xl font-black bg-transparent border-b-2 outline-none px-1"
              style={{ color: T.gold, borderColor: T.gold, caretColor: T.gold }}
            />
          ) : (
            <h1
              className="text-3xl md:text-4xl font-black transition-colors"
              style={{ color: T.gold, cursor: authenticated ? 'pointer' : 'default' }}
              onClick={authenticated ? () => setEditingName(true) : undefined}
              title={authenticated ? 'Click to edit' : undefined}
            >
              {user?.huddl_name || 'Command Center'}
            </h1>
          )}
          {authenticated && !editingName && (
            <button
              onClick={() => setEditingName(true)}
              className="text-xs px-2 py-1 rounded transition-colors"
              style={{ color: T.textMuted, border: `1px solid ${T.border}` }}
            >
              Edit
            </button>
          )}
        </div>

        {/* ═══ NAV CARDS 2x2 ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {NAV_CARDS.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="group relative rounded-xl p-6 transition-all hover:shadow-lg hover:shadow-yellow-900/10"
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
              }}
            >
              <div className="mb-4">{card.icon}</div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold" style={{ color: T.text }}>
                  {card.title}
                </h3>
              </div>
              <p className="text-xs mt-1" style={{ color: T.textMuted }}>
                {card.desc}
              </p>
              <div
                className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: T.gold }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* ═══ NO-TEAM PLACEHOLDER ═══ */}
        {!user?.selected_team && (
          <div className="text-center py-12" style={{ color: T.textMuted }}>
            <p className="text-lg">Select a team to see your dashboard</p>
            <p className="text-sm mt-2">
              {authenticated
                ? <Link href="/podcasters/onboarding" style={{ color: T.gold }} className="underline">Complete onboarding</Link>
                : <button onClick={promptLogin} style={{ color: T.gold }} className="underline">Sign in to get started</button>
              }
            </p>
          </div>
        )}

        {/* ═══ RECENT DELIVERIES ═══ */}
        <section>
          <h2 className="text-lg font-bold tracking-wide mb-4" style={{ color: T.text }}>
            Recent Deliveries
          </h2>
          {deliveries.length === 0 ? (
            <div
              className="rounded-xl p-6 text-center"
              style={{ background: T.surface, border: `1px solid ${T.border}` }}
            >
              <p className="text-sm" style={{ color: T.textMuted }}>
                No deliveries yet. Your Producer will generate briefings based on your delivery schedule.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {deliveries.map((d) => {
                const gradeColors: Record<string, string> = {
                  S: '#FFD700', A: '#22C55E', B: '#3B82F6', C: '#F59E0B', D: '#EF4444',
                };
                return (
                  <div
                    key={d.deliverable_id}
                    className="rounded-xl p-4 text-center"
                    style={{ background: T.surface, border: `1px solid ${T.border}` }}
                  >
                    <div
                      className="text-2xl font-black mb-1"
                      style={{ color: gradeColors[d.grade] || T.textMuted }}
                    >
                      {d.grade}
                    </div>
                    <div className="text-xs font-bold uppercase tracking-wider" style={{ color: T.textMuted }}>
                      {d.deliverable_type.replace('_', ' ')}
                    </div>
                    <div className="text-[10px] mt-1" style={{ color: T.textMuted }}>
                      {d.final_score}/100
                    </div>
                    <div className="text-[9px] mt-1 opacity-50">
                      {new Date(d.graded_at).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ═══ RECENT NEWS ═══ */}
        <section>
          <h2 className="text-lg font-bold tracking-wide mb-4" style={{ color: T.text }}>
            Recent News
          </h2>
          {news.length === 0 ? (
            <p className="text-sm" style={{ color: T.textMuted }}>
              No recent news for your team.
            </p>
          ) : (
            <div className="space-y-2">
              {news.map((item, i) => (
                <a
                  key={item.id || i}
                  href={item.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg p-4 transition-colors hover:bg-white/[0.02]"
                  style={{ background: T.surface, border: `1px solid ${T.border}` }}
                >
                  <div className="text-sm font-semibold" style={{ color: T.text }}>
                    {item.headline}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] font-bold tracking-wider uppercase" style={{ color: T.textMuted }}>
                    {item.source && <span>{item.source}</span>}
                    {item.published_at && (
                      <span>{new Date(item.published_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer
        className="py-6 text-center text-[10px] font-mono tracking-[0.25em] mt-8"
        style={{ background: T.bg, color: 'rgba(255,255,255,0.3)', borderTop: `1px solid ${T.border}` }}
      >
        PER|FORM FOR PODCASTERS · DASHBOARD · PUBLISHED BY ACHIEVEMOR
      </footer>
    </div>
  );
}
