'use client';

/**
 * War Room — Team Intelligence Center
 * ======================================
 * Auth-gated. 8 collapsible panels fetching team data independently.
 * Broadcast-grade dark theme with gold accents and team color highlights.
 */

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { BackHomeNav } from '@/components/layout/BackHomeNav';
import WarRoomPanel from '@/components/podcasters/WarRoomPanel';
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

/* ── Types ── */
interface RosterPlayer {
  id?: number;
  name: string;
  position: string;
  jersey_number?: number | string;
  age?: number;
  college?: string;
  experience?: number | string;
}

interface TeamDetail {
  head_coach?: string;
  offensive_coordinator?: string;
  defensive_coordinator?: string;
  top_needs?: string[];
  draft_picks_2026?: Array<{ round: number; pick?: number; source?: string }>;
  wins_2025?: number;
  losses_2025?: number;
}

interface NewsItem {
  id?: number;
  headline: string;
  source?: string;
  published_at?: string;
  url?: string;
}

interface Prospect {
  id?: number;
  name: string;
  position: string;
  school: string;
  grade?: number;
  overall_rank?: number;
}

/* ── Position group ordering for roster sort ── */
const POS_ORDER: Record<string, number> = {
  QB: 1, RB: 2, FB: 3, WR: 4, TE: 5,
  OT: 6, OG: 7, OL: 8, C: 9, IOL: 10,
  EDGE: 11, DE: 12, DT: 13, DL: 14, NT: 15,
  LB: 16, ILB: 17, OLB: 18, MLB: 19,
  CB: 20, S: 21, FS: 22, SS: 23, DB: 24,
  K: 25, P: 26, LS: 27,
};

function posOrder(pos: string): number {
  return POS_ORDER[pos?.toUpperCase()] ?? 99;
}

export default function WarRoomPage() {
  const { loading: authLoading, authenticated, profile, promptLogin } = usePodcasterAuth();
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  // Panel states
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [rosterLoading, setRosterLoading] = useState(true);

  const [teamDetail, setTeamDetail] = useState<TeamDetail | null>(null);
  const [teamLoading, setTeamLoading] = useState(true);

  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [prospectsLoading, setProspectsLoading] = useState(true);

  // Set team from profile when available
  useEffect(() => {
    if (profile?.selected_team) setSelectedTeam(profile.selected_team);
  }, [profile?.selected_team]);

  // Fetch team data when selected_team is known
  const fetchTeamData = useCallback((team: string) => {
    // Roster
    fetch(`/api/nfl/teams/${encodeURIComponent(team)}/roster`)
      .then((r) => r.json())
      .then((d) => setRoster(d.roster || d.players || []))
      .catch(() => {})
      .finally(() => setRosterLoading(false));

    // Team detail
    fetch(`/api/nfl/teams/${encodeURIComponent(team)}`)
      .then((r) => r.json())
      .then((d) => setTeamDetail(d.team || d))
      .catch(() => {})
      .finally(() => setTeamLoading(false));

    // News
    fetch(`/api/nfl/news?team=${encodeURIComponent(team)}&limit=10`)
      .then((r) => r.json())
      .then((d) => setNews(d.news || d.articles || []))
      .catch(() => {})
      .finally(() => setNewsLoading(false));

    // Top prospects (general)
    fetch('/api/players?limit=10&sort=grade')
      .then((r) => r.json())
      .then((d) => setProspects(d.players || []))
      .catch(() => {})
      .finally(() => setProspectsLoading(false));
  }, []);

  useEffect(() => {
    if (selectedTeam) fetchTeamData(selectedTeam);
  }, [selectedTeam, fetchTeamData]);

  const teamAsset = selectedTeam ? getTeam(selectedTeam) : null;
  const accent = teamAsset?.primaryColor || T.gold;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: T.bg }}>
        <div className="inline-block w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: T.border, borderTopColor: T.gold }} />
      </div>
    );
  }

  if (!selectedTeam) {
    return (
      <div className="min-h-screen" style={{ background: T.bg, color: T.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div style={{ background: T.bg, borderBottom: `2px solid ${T.red}` }}>
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between text-[11px] font-bold tracking-[0.18em] uppercase">
            <div className="flex items-center gap-3">
              <BackHomeNav />
              <span className="opacity-50">|</span>
              <span>War Room</span>
            </div>
            <Link href="/podcasters/dashboard" className="opacity-80 hover:opacity-100 transition" style={{ color: T.gold }}>
              Dashboard
            </Link>
          </div>
        </div>
        <div className="text-center py-20" style={{ color: T.textMuted }}>
          <h2 className="text-3xl font-black mb-4" style={{ color: T.text }}>Pick a Team</h2>
          <p className="mb-8 text-lg">Select a team to see their War Room intel</p>
          {authenticated
            ? <Link href="/podcasters/onboarding" className="px-8 py-4 text-sm font-bold tracking-wider uppercase rounded-lg inline-block" style={{ background: T.gold, color: T.bg }}>Complete Setup</Link>
            : <button onClick={promptLogin} className="px-8 py-4 text-sm font-bold tracking-wider uppercase rounded-lg" style={{ background: T.gold, color: T.bg }}>Sign In to Select Your Team</button>
          }
        </div>
      </div>
    );
  }

  const sortedRoster = [...roster].sort((a, b) => posOrder(a.position) - posOrder(b.position));
  const starPlayers = [...roster]
    .sort((a, b) => (Number(b.experience) || 0) - (Number(a.experience) || 0))
    .slice(0, 5);
  const draftPicks = teamDetail?.draft_picks_2026 || [];

  return (
    <div className="min-h-screen" style={{ background: T.bg, color: T.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* ═══ TOP RIBBON ═══ */}
      <div style={{ background: T.bg, borderBottom: `2px solid ${T.red}` }}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between text-[11px] font-bold tracking-[0.18em] uppercase">
          <div className="flex items-center gap-3">
            <BackHomeNav />
            <span className="opacity-50">|</span>
            <span>War Room</span>
            {teamAsset && (
              <>
                <span className="opacity-50">|</span>
                <span style={{ color: accent }}>{teamAsset.city} {teamAsset.name}</span>
              </>
            )}
          </div>
          <Link href="/podcasters/dashboard" className="opacity-80 hover:opacity-100 transition" style={{ color: T.gold }}>
            Dashboard
          </Link>
        </div>
      </div>

      {/* ═══ HEADER ═══ */}
      <header className="relative overflow-hidden" style={{ background: T.surface }}>
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 80px, #FFFFFF 80px, #FFFFFF 81px)',
          }}
        />
        {/* Team color wash */}
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundColor: accent }} />
        <div className="relative max-w-7xl mx-auto px-6 py-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="px-2.5 py-1 text-[10px] font-bold tracking-[0.2em] rounded" style={{ background: T.red, color: '#FFF' }}>
              WAR ROOM
            </span>
            <span className="text-[11px] font-semibold tracking-[0.15em] uppercase" style={{ color: T.textMuted }}>
              Team Intelligence Center
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black leading-[0.92] tracking-tight">
            {teamAsset ? `${teamAsset.city} ` : ''}
            <span style={{ color: accent }}>{teamAsset?.name || 'War Room'}</span>
          </h1>
        </div>
      </header>

      {/* ═══ PANELS ═══ */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* 1. Current Roster */}
          <div className="lg:col-span-2">
            <WarRoomPanel title="Current Roster" icon="📋" loading={rosterLoading}>
              {sortedRoster.length === 0 ? (
                <p className="text-sm" style={{ color: T.textMuted }}>No roster data available.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                        <th className="text-left py-2 pr-3 font-bold tracking-wider uppercase" style={{ color: T.textMuted, fontSize: 10 }}>Pos</th>
                        <th className="text-left py-2 pr-3 font-bold tracking-wider uppercase" style={{ color: T.textMuted, fontSize: 10 }}>#</th>
                        <th className="text-left py-2 pr-3 font-bold tracking-wider uppercase" style={{ color: T.textMuted, fontSize: 10 }}>Name</th>
                        <th className="text-left py-2 pr-3 font-bold tracking-wider uppercase hidden sm:table-cell" style={{ color: T.textMuted, fontSize: 10 }}>Age</th>
                        <th className="text-left py-2 pr-3 font-bold tracking-wider uppercase hidden md:table-cell" style={{ color: T.textMuted, fontSize: 10 }}>College</th>
                        <th className="text-left py-2 font-bold tracking-wider uppercase hidden md:table-cell" style={{ color: T.textMuted, fontSize: 10 }}>Exp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedRoster.map((p, i) => (
                        <tr key={`${p.name}-${i}`} className="transition-colors hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${T.border}20` }}>
                          <td className="py-2 pr-3">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider" style={{ background: accent, color: '#FFF' }}>
                              {p.position}
                            </span>
                          </td>
                          <td className="py-2 pr-3 font-bold tabular-nums" style={{ color: T.textMuted }}>{p.jersey_number ?? '—'}</td>
                          <td className="py-2 pr-3 font-semibold" style={{ color: T.text }}>{p.name}</td>
                          <td className="py-2 pr-3 hidden sm:table-cell" style={{ color: T.textMuted }}>{p.age ?? '—'}</td>
                          <td className="py-2 pr-3 hidden md:table-cell" style={{ color: T.textMuted }}>{p.college ?? '—'}</td>
                          <td className="py-2 hidden md:table-cell" style={{ color: T.textMuted }}>{p.experience ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </WarRoomPanel>
          </div>

          {/* 2. Coaching Staff */}
          <WarRoomPanel title="Coaching Staff" icon="🎯" loading={teamLoading}>
            {teamDetail ? (
              <div className="space-y-3">
                <CoachRow label="Head Coach" name={teamDetail.head_coach} accent={accent} />
                <CoachRow label="OC" name={teamDetail.offensive_coordinator} accent={accent} />
                <CoachRow label="DC" name={teamDetail.defensive_coordinator} accent={accent} />
              </div>
            ) : (
              <p className="text-sm" style={{ color: T.textMuted }}>No coaching data available.</p>
            )}
          </WarRoomPanel>

          {/* 3. Team Needs */}
          <WarRoomPanel title="Team Needs" icon="🔍" loading={teamLoading}>
            {teamDetail?.top_needs && teamDetail.top_needs.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {teamDetail.top_needs.map((need, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide"
                    style={{ background: `${accent}20`, color: accent, border: `1px solid ${accent}40` }}
                  >
                    {need}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: T.textMuted }}>No team needs data available.</p>
            )}
          </WarRoomPanel>

          {/* 4. 2026 Draft Picks */}
          <WarRoomPanel title="2026 Draft Picks" icon="🏈" loading={teamLoading}>
            {draftPicks.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {draftPicks.map((pick, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center px-4 py-3 rounded-lg"
                    style={{ background: '#0A0E1A', border: `1px solid ${T.border}` }}
                  >
                    <span className="text-[9px] font-bold tracking-wider uppercase" style={{ color: T.textMuted }}>
                      Round {pick.round}
                    </span>
                    <span className="text-lg font-black tabular-nums" style={{ color: T.gold }}>
                      #{pick.pick ?? '—'}
                    </span>
                    {pick.source && (
                      <span className="text-[8px] mt-0.5" style={{ color: T.textMuted }}>{pick.source}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: T.textMuted }}>No draft pick data available.</p>
            )}
          </WarRoomPanel>

          {/* 5. Star Players */}
          <WarRoomPanel title="Star Players" icon="⭐" loading={rosterLoading}>
            {starPlayers.length > 0 ? (
              <div className="space-y-2">
                {starPlayers.map((p, i) => (
                  <div
                    key={`${p.name}-${i}`}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg"
                    style={{ background: '#0A0E1A', border: `1px solid ${T.border}` }}
                  >
                    <span className="text-lg font-black tabular-nums" style={{ color: T.gold }}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate" style={{ color: T.text }}>{p.name}</div>
                      <div className="text-[10px]" style={{ color: T.textMuted }}>
                        {p.position} {p.jersey_number ? `#${p.jersey_number}` : ''} {p.experience ? `· ${p.experience} yrs` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: T.textMuted }}>No roster data available.</p>
            )}
          </WarRoomPanel>

          {/* 6. Last Season */}
          <WarRoomPanel title="Last Season" icon="📊" loading={teamLoading}>
            {teamDetail ? (
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-[10px] font-bold tracking-wider uppercase" style={{ color: T.textMuted }}>Wins</div>
                  <div className="text-4xl font-black tabular-nums" style={{ color: '#22C55E' }}>
                    {teamDetail.wins_2025 ?? '—'}
                  </div>
                </div>
                <div className="text-2xl font-black" style={{ color: T.border }}>-</div>
                <div className="text-center">
                  <div className="text-[10px] font-bold tracking-wider uppercase" style={{ color: T.textMuted }}>Losses</div>
                  <div className="text-4xl font-black tabular-nums" style={{ color: T.red }}>
                    {teamDetail.losses_2025 ?? '—'}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm" style={{ color: T.textMuted }}>No season data available.</p>
            )}
          </WarRoomPanel>

          {/* 7. Breaking News */}
          <WarRoomPanel title="Breaking News" icon="📰" loading={newsLoading}>
            {news.length > 0 ? (
              <div className="space-y-2">
                {news.map((item, i) => (
                  <a
                    key={item.id || i}
                    href={item.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-3 py-2 rounded-lg transition-colors hover:bg-white/[0.02]"
                    style={{ border: `1px solid ${T.border}` }}
                  >
                    <div className="text-sm font-semibold" style={{ color: T.text }}>
                      {item.headline}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] font-bold tracking-wider uppercase" style={{ color: T.textMuted }}>
                      {item.source && <span>{item.source}</span>}
                      {item.published_at && <span>{new Date(item.published_at).toLocaleDateString()}</span>}
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: T.textMuted }}>No news available.</p>
            )}
          </WarRoomPanel>

          {/* 8. Incoming Draft Class */}
          <WarRoomPanel title="Incoming Draft Class" icon="🎓" loading={prospectsLoading}>
            {prospects.length > 0 ? (
              <div className="space-y-2">
                {prospects.map((p, i) => (
                  <div
                    key={p.id || i}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg"
                    style={{ background: '#0A0E1A', border: `1px solid ${T.border}` }}
                  >
                    <span className="text-sm font-black tabular-nums w-6 text-center" style={{ color: T.gold }}>
                      {p.overall_rank ?? i + 1}
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider flex-shrink-0"
                      style={{ background: accent, color: '#FFF' }}
                    >
                      {p.position}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate" style={{ color: T.text }}>{p.name}</div>
                      <div className="text-[10px]" style={{ color: T.textMuted }}>{p.school}</div>
                    </div>
                    {p.grade != null && (
                      <span className="text-xs font-black tabular-nums" style={{ color: T.gold }}>
                        {Number(p.grade).toFixed(1)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: T.textMuted }}>No prospect data available.</p>
            )}
          </WarRoomPanel>

        </div>
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer
        className="py-6 text-center text-[10px] font-mono tracking-[0.25em] mt-8"
        style={{ background: T.bg, color: 'rgba(255,255,255,0.3)', borderTop: `1px solid ${T.border}` }}
      >
        PER|FORM WAR ROOM · TEAM INTELLIGENCE CENTER · PUBLISHED BY ACHIEVEMOR
      </footer>
    </div>
  );
}

/* ── Helper Components ── */

function CoachRow({ label, name, accent }: { label: string; name?: string; accent: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-bold tracking-wider uppercase w-20 flex-shrink-0" style={{ color: '#8B94A8' }}>
        {label}
      </span>
      <span className="text-sm font-semibold" style={{ color: name ? '#F4F6FA' : '#5A6478' }}>
        {name || 'Unknown'}
      </span>
    </div>
  );
}
