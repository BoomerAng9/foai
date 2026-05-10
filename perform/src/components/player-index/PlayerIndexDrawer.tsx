'use client';

/**
 * PlayerIndexDrawer
 * ==================
 * Left-side expandable/collapsable drawer that surfaces the entire player
 * universe by sport → conference → team → roster. Owner directive 2026-04-20:
 * "side panel that is expandable/collapsable, quick access to all the players,
 *  this is the home of the player index. Sport switcher, players listed by
 *  teams/year not individually."
 *
 * Behaviour:
 *   - Collapsed: 48px rail with vertical "Player Index" label + chevron
 *   - Expanded: 360px panel
 *       Sport switcher tabs: NFL · NBA · MLB · CFB
 *       Team list (grouped by conference, search-filtered)
 *       Click team → expand roster inline
 *       Click player → deep link
 *
 * Data:
 *   GET /api/teams?sport={sport}              → populates the team list
 *   GET /api/teams/{sport}/{abbr}             → loads roster on team expand
 *
 * State persists per-tab via localStorage (last sport, last expanded team).
 */

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';

type Sport = 'nfl' | 'nba' | 'mlb' | 'cfb';

interface Team {
  id: number;
  sport: string;
  abbreviation: string;
  full_name: string;
  short_name: string | null;
  conference: string | null;
  division: string | null;
  primary_color: string | null;
  roster_count: number;
}

interface RosterPlayer {
  id: number;
  name: string;
  position: string | null;
  jersey_number: number | null;
  height: string | null;
  weight: string | null;
  class_year?: string | null;
  grade?: number | string | null;
  tie_tier?: string | null;
  overall_rank?: number | null;
  position_rank?: number | null;
}

const SPORT_LABELS: Record<Sport, string> = {
  nfl: 'NFL',
  nba: 'NBA',
  mlb: 'MLB',
  cfb: 'CFB',
};

const SPORT_ORDER: Sport[] = ['nfl', 'nba', 'mlb', 'cfb'];

const STORAGE_KEY_SPORT = 'pf-player-index-sport';
const STORAGE_KEY_OPEN = 'pf-player-index-open';

export function PlayerIndexDrawer(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [sport, setSport] = useState<Sport>('nfl');
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedTeamId, setExpandedTeamId] = useState<number | null>(null);
  const [rosterCache, setRosterCache] = useState<Record<number, RosterPlayer[]>>({});
  const [loadingRoster, setLoadingRoster] = useState<number | null>(null);

  // Restore last sport + open state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const lastSport = localStorage.getItem(STORAGE_KEY_SPORT);
    if (lastSport && (SPORT_ORDER as string[]).includes(lastSport)) setSport(lastSport as Sport);
    setOpen(localStorage.getItem(STORAGE_KEY_OPEN) === '1');
  }, []);

  // Persist sport + open state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_SPORT, sport);
  }, [sport]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_OPEN, open ? '1' : '0');
  }, [open]);

  // Load teams when sport changes (or drawer first opens)
  useEffect(() => {
    if (!open) return;
    setLoadingTeams(true);
    fetch(`/api/teams?sport=${sport}&limit=500`)
      .then(r => r.json())
      .then(data => {
        setTeams((data.teams as Team[]) || []);
        setExpandedTeamId(null);
      })
      .catch(() => setTeams([]))
      .finally(() => setLoadingTeams(false));
  }, [sport, open]);

  // Load roster on demand
  function expandTeam(team: Team): void {
    if (expandedTeamId === team.id) {
      setExpandedTeamId(null);
      return;
    }
    setExpandedTeamId(team.id);
    if (rosterCache[team.id]) return;
    setLoadingRoster(team.id);
    fetch(`/api/teams/${team.sport}/${team.abbreviation}`)
      .then(r => r.json())
      .then(data => {
        setRosterCache(prev => ({ ...prev, [team.id]: (data.roster as RosterPlayer[]) || [] }));
      })
      .catch(() => {
        setRosterCache(prev => ({ ...prev, [team.id]: [] }));
      })
      .finally(() => setLoadingRoster(null));
  }

  // Group teams by conference for nicer scanning
  const grouped = useMemo(() => {
    const filtered = search.trim()
      ? teams.filter(t => {
          const q = search.toLowerCase();
          return t.full_name.toLowerCase().includes(q) || t.abbreviation.toLowerCase().includes(q);
        })
      : teams;
    const map: Record<string, Team[]> = {};
    for (const t of filtered) {
      const k = t.conference || '—';
      if (!map[k]) map[k] = [];
      map[k].push(t);
    }
    return map;
  }, [teams, search]);

  // Player slug for deep-link
  function playerHref(p: RosterPlayer): string {
    const slug = encodeURIComponent(p.name);
    return sport === 'cfb' && p.overall_rank ? `/draft/${slug}` : `/players/${slug}`;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 60,
        display: 'flex',
        pointerEvents: 'none',
      }}
    >
      {/* Backdrop when expanded */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          aria-hidden
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(2px)',
            pointerEvents: 'auto',
            transition: 'opacity 200ms ease',
          }}
        />
      )}

      {/* Panel */}
      <aside
        style={{
          width: open ? 360 : 48,
          height: '100vh',
          background: '#0A0E1A',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          color: '#FFF',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 220ms cubic-bezier(0.16,1,0.3,1)',
          pointerEvents: 'auto',
          boxShadow: open ? '8px 0 32px rgba(0,0,0,0.45)' : 'none',
          position: 'relative',
          zIndex: 70,
        }}
      >
        {/* Toggle rail */}
        <button
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Collapse Player Index' : 'Expand Player Index'}
          style={{
            position: 'absolute',
            top: 12,
            right: open ? 8 : 4,
            width: 36,
            height: 36,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6,
            color: '#FFF',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            transition: 'background 120ms',
          }}
        >
          {open ? '◀' : '▶'}
        </button>

        {/* Collapsed: vertical label */}
        {!open && (
          <div
            style={{
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              padding: '60px 0 12px',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.3em',
              color: 'rgba(255,255,255,0.6)',
              textAlign: 'center',
            }}
          >
            PLAYER INDEX
          </div>
        )}

        {/* Expanded: full panel */}
        {open && (
          <>
            <header style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>
                PLAYER INDEX
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em' }}>
                Browse by Team
              </div>
            </header>

            {/* Sport switcher */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {SPORT_ORDER.map(s => {
                const active = s === sport;
                return (
                  <button
                    key={s}
                    onClick={() => setSport(s)}
                    style={{
                      flex: 1,
                      padding: '10px 0',
                      background: active ? '#D4A853' : 'transparent',
                      color: active ? '#0A0E1A' : 'rgba(255,255,255,0.6)',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: '0.18em',
                      transition: 'background 120ms',
                    }}
                  >
                    {SPORT_LABELS[s]}
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={`Search ${SPORT_LABELS[sport]} teams…`}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 6,
                  color: '#FFF',
                  fontSize: 12,
                  outline: 'none',
                }}
              />
            </div>

            {/* Team list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loadingTeams && (
                <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
                  Loading teams…
                </div>
              )}
              {!loadingTeams && Object.keys(grouped).length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
                  No teams found.
                </div>
              )}
              {!loadingTeams &&
                Object.entries(grouped)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([conf, list]) => (
                    <div key={conf}>
                      <div
                        style={{
                          padding: '8px 16px 4px',
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: '0.25em',
                          color: 'rgba(255,255,255,0.35)',
                          background: 'rgba(255,255,255,0.02)',
                        }}
                      >
                        {conf.toUpperCase()}
                      </div>
                      {list.map(team => {
                        const expanded = expandedTeamId === team.id;
                        const roster = rosterCache[team.id];
                        return (
                          <div key={team.id}>
                            <button
                              onClick={() => expandTeam(team)}
                              style={{
                                width: '100%',
                                padding: '10px 16px',
                                background: expanded ? 'rgba(212,168,83,0.08)' : 'transparent',
                                border: 'none',
                                borderLeft: `3px solid ${expanded ? '#D4A853' : (team.primary_color || 'transparent')}`,
                                color: '#FFF',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontSize: 13,
                                fontWeight: 600,
                                textAlign: 'left',
                                transition: 'background 80ms',
                              }}
                            >
                              <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                <span style={{
                                  fontSize: 9,
                                  fontWeight: 800,
                                  letterSpacing: '0.1em',
                                  color: 'rgba(255,255,255,0.45)',
                                  minWidth: 32,
                                }}>
                                  {team.abbreviation}
                                </span>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {team.full_name}
                                </span>
                              </span>
                              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginLeft: 8 }}>
                                {team.roster_count > 0 ? `${team.roster_count}` : ''}
                                <span style={{ marginLeft: 6 }}>{expanded ? '▾' : '▸'}</span>
                              </span>
                            </button>

                            {/* Roster expansion */}
                            {expanded && (
                              <div style={{ background: 'rgba(0,0,0,0.25)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                {loadingRoster === team.id && (
                                  <div style={{ padding: 12, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                                    Loading roster…
                                  </div>
                                )}
                                {roster && roster.length === 0 && (
                                  <div style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.55)', fontSize: 11, lineHeight: 1.5 }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>
                                      ROSTER SYNC IN PROGRESS
                                    </div>
                                    <div style={{ color: 'rgba(255,255,255,0.4)' }}>
                                      {sport === 'cfb'
                                        ? 'This school is indexed but no players match the current filter.'
                                        : 'Live 2026 roster seeding begins post-draft. Team metadata is current.'}
                                    </div>
                                  </div>
                                )}
                                {roster && roster.length > 0 && (
                                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: 320, overflowY: 'auto' }}>
                                    {roster.map(p => (
                                      <li key={p.id}>
                                        <Link
                                          href={playerHref(p)}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '6px 22px',
                                            color: 'rgba(255,255,255,0.85)',
                                            fontSize: 11,
                                            textDecoration: 'none',
                                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                                          }}
                                        >
                                          <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                            <span style={{
                                              fontSize: 9,
                                              fontWeight: 800,
                                              padding: '1px 5px',
                                              background: 'rgba(255,255,255,0.06)',
                                              borderRadius: 3,
                                              minWidth: 26,
                                              textAlign: 'center',
                                            }}>
                                              {p.position || '—'}
                                            </span>
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                              {p.name}
                                            </span>
                                          </span>
                                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {p.jersey_number != null && (
                                              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>#{p.jersey_number}</span>
                                            )}
                                            {p.tie_tier && (
                                              <span style={{
                                                fontSize: 9,
                                                fontWeight: 800,
                                                color: '#D4A853',
                                                padding: '1px 5px',
                                                background: 'rgba(212,168,83,0.12)',
                                                borderRadius: 3,
                                              }}>
                                                {p.tie_tier.replace('_', '+').replace('PLUS', '+').replace('MINUS', '-')}
                                              </span>
                                            )}
                                          </span>
                                        </Link>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
