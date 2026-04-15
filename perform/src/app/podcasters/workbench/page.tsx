'use client';

/**
 * Workbench — Script Editor & Content Hub
 * ==========================================
 * Auth-gated. Episode templates, script editor, content list, distribution cards.
 * Professional dark broadcast theme with monospace editor.
 */

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { BackHomeNav } from '@/components/layout/BackHomeNav';
import { usePodcasterAuth } from '@/hooks/usePodcasterAuth';

/* ── Theme tokens ── */
const T = {
  bg: 'var(--pf-bg)',
  surface: '#0B1E3F',
  border: '#1E3A5F',
  text: '#F4F6FA',
  textMuted: '#8B94A8',
  gold: '#D4A853',
  red: '#D40028',
  editorBg: '#070E1E',
};

/* ── Episode templates ── */
const TEMPLATES: Record<string, { label: string; icon: string; sections: string[] }> = {
  weekly_recap: {
    label: 'Weekly Recap',
    icon: '📅',
    sections: ['INTRO', "THIS WEEK'S NEWS", 'KEY MATCHUP', 'BOLD PREDICTION', 'OUTRO'],
  },
  draft_analysis: {
    label: 'Draft Analysis',
    icon: '🎯',
    sections: ['INTRO', 'TOP PROSPECTS', 'TEAM NEEDS', 'MOCK PICKS', 'SLEEPER ALERT', 'OUTRO'],
  },
  player_spotlight: {
    label: 'Player Spotlight',
    icon: '⭐',
    sections: ['INTRO', 'PLAYER BACKGROUND', 'TAPE BREAKDOWN', 'NFL COMPARISON', 'GRADE', 'OUTRO'],
  },
  hot_take: {
    label: 'Hot Take',
    icon: '🔥',
    sections: ['INTRO', 'THE TAKE', 'THE EVIDENCE', 'THE COUNTER', 'FINAL VERDICT', 'OUTRO'],
  },
  free_form: {
    label: 'Free Form',
    icon: '✏️',
    sections: [],
  },
};

function buildBody(sections: string[]): string {
  if (!sections.length) return '';
  return sections.map((s) => `=== ${s} ===\n\n`).join('\n');
}

/* ── Distribution channels ── */
const CHANNELS = [
  { name: 'YouTube', icon: '▶', color: '#FF0000' },
  { name: 'Instagram', icon: '📷', color: '#E1306C' },
  { name: 'TikTok', icon: '♪', color: '#69C9D0' },
  { name: 'Twitter / X', icon: '𝕏', color: '#FFFFFF' },
];

/* ── Types ── */
interface ContentItem {
  id: number;
  title: string;
  content_type: string;
  body: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function WorkbenchPage() {
  const { loading, authenticated, profile, promptLogin, showSignInPrompt } = usePodcasterAuth();
  const [scripts, setScripts] = useState<ContentItem[]>([]);
  const [scriptsLoading, setScriptsLoading] = useState(true);

  // Editor state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [warRoomNotice, setWarRoomNotice] = useState(false);
  const [warRoomLoading, setWarRoomLoading] = useState(false);

  const userTeam = profile?.selected_team || null;

  // Fetch scripts
  const fetchScripts = useCallback(() => {
    setScriptsLoading(true);
    fetch('/api/podcasters/content')
      .then((r) => r.json())
      .then((d) => setScripts(d.content || []))
      .catch(() => {})
      .finally(() => setScriptsLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) fetchScripts();
  }, [loading, fetchScripts]);

  // Apply template
  const applyTemplate = (key: string) => {
    const tmpl = TEMPLATES[key];
    if (!tmpl) return;
    setActiveTemplate(key);
    setTitle(tmpl.label + ' — ' + new Date().toLocaleDateString());
    setBody(buildBody(tmpl.sections));
    setLastSaved(null);
  };

  // Load existing script
  const loadScript = (item: ContentItem) => {
    setTitle(item.title);
    setBody(item.body || '');
    setActiveTemplate(null);
    setLastSaved(new Date(item.updated_at).toLocaleTimeString());
  };

  // Save draft
  const saveDraft = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/podcasters/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content_type: 'script', body }),
      });
      if (res.ok) {
        setLastSaved(new Date().toLocaleTimeString());
        fetchScripts();
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: T.bg }}>
        <div
          className="inline-block w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: T.border, borderTopColor: T.gold }}
        />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: T.bg, color: T.text, fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* ═══ TOP RIBBON ═══ */}
      <div style={{ background: T.bg, borderBottom: `2px solid ${T.red}` }}>
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between text-[11px] font-bold tracking-[0.18em] uppercase">
          <div className="flex items-center gap-3">
            <BackHomeNav />
            <span className="opacity-50">|</span>
            <span>Workbench</span>
          </div>
          <Link
            href="/podcasters/dashboard"
            className="opacity-80 hover:opacity-100 transition"
            style={{ color: T.gold }}
          >
            Dashboard
          </Link>
        </div>
      </div>

      {/* ═══ MAIN LAYOUT ═══ */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-[1600px] mx-auto w-full">
        {/* ── LEFT SIDEBAR ── */}
        <aside
          className="w-full lg:w-[340px] flex-shrink-0 p-6 overflow-y-auto"
          style={{ borderRight: `1px solid ${T.border}` }}
        >
          {/* Episode Templates */}
          <h3
            className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3"
            style={{ color: T.textMuted }}
          >
            Episode Templates
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 mb-8">
            {Object.entries(TEMPLATES).map(([key, tmpl]) => (
              <button
                key={key}
                onClick={() => applyTemplate(key)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all hover:shadow-md"
                style={{
                  background: activeTemplate === key ? `${T.gold}18` : T.surface,
                  border: `1px solid ${activeTemplate === key ? T.gold : T.border}`,
                }}
              >
                <span className="text-lg flex-shrink-0">{tmpl.icon}</span>
                <span className="text-sm font-semibold" style={{ color: T.text }}>
                  {tmpl.label}
                </span>
              </button>
            ))}
          </div>

          {/* My Scripts */}
          <h3
            className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3"
            style={{ color: T.textMuted }}
          >
            My Scripts
          </h3>
          {scriptsLoading ? (
            <div className="flex items-center gap-2 text-xs" style={{ color: T.textMuted }}>
              <div
                className="w-3 h-3 rounded-full border animate-spin"
                style={{ borderColor: T.border, borderTopColor: T.gold }}
              />
              Loading...
            </div>
          ) : scripts.length === 0 ? (
            <p className="text-xs" style={{ color: T.textMuted }}>
              No scripts yet. Pick a template to start.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
              {scripts.map((item) => (
                <button
                  key={item.id}
                  onClick={() => loadScript(item)}
                  className="w-full text-left px-3 py-2.5 rounded-lg transition-colors hover:bg-white/[0.03]"
                  style={{ border: `1px solid ${T.border}` }}
                >
                  <div className="text-sm font-semibold truncate" style={{ color: T.text }}>
                    {item.title}
                  </div>
                  <div
                    className="text-[10px] font-bold tracking-wider uppercase mt-0.5"
                    style={{ color: T.textMuted }}
                  >
                    {new Date(item.updated_at).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* ── MAIN EDITOR ── */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Title input */}
          <div className="px-6 pt-6 pb-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Episode title..."
              className="w-full text-2xl md:text-3xl font-black bg-transparent outline-none placeholder-opacity-30"
              style={{
                color: T.gold,
                caretColor: T.gold,
              }}
            />
          </div>

          {/* Editor area */}
          <div className="flex-1 px-6 pb-4">
            <div
              className="relative h-full min-h-[400px] rounded-xl overflow-hidden"
              style={{ background: T.editorBg, border: `1px solid ${T.border}` }}
            >
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Start writing your script..."
                className="w-full h-full min-h-[400px] resize-none p-6 bg-transparent outline-none leading-relaxed"
                style={{
                  color: T.text,
                  fontFamily: "'IBM Plex Mono', 'Fira Code', 'Consolas', monospace",
                  fontSize: '14px',
                  caretColor: T.gold,
                }}
              />
              {/* Line accent */}
              <div
                className="absolute top-0 left-0 w-[3px] h-full"
                style={{ background: `linear-gradient(180deg, ${T.gold}, transparent)` }}
              />
            </div>
          </div>

          {/* Insert from War Room */}
          <div className="px-6 pb-4">
            <button
              disabled={warRoomLoading || !userTeam}
              onClick={async () => {
                if (!userTeam) { setWarRoomNotice(true); setTimeout(() => setWarRoomNotice(false), 3000); return; }
                setWarRoomLoading(true);
                try {
                  const [teamRes, rosterRes, newsRes] = await Promise.all([
                    fetch(`/api/nfl/teams/${userTeam}`).then(r => r.json()),
                    fetch(`/api/nfl/teams/${userTeam}/roster?position=`).then(r => r.json()),
                    fetch(`/api/nfl/news?team=${userTeam}&limit=5`).then(r => r.json()),
                  ]);
                  const team = teamRes;
                  const starters = (rosterRes.roster || []).filter((p: Record<string, unknown>) => p.depth_chart_rank === 1).slice(0, 10);
                  const headlines = (newsRes.news || []).map((n: Record<string, unknown>) => n.headline).slice(0, 5);

                  const injection = [
                    `\n\n--- WAR ROOM DATA: ${team.city} ${team.name} (${team.abbrev}) ---`,
                    `Record: ${team.wins_2025}-${team.losses_2025} | HC: ${team.head_coach || 'TBD'} | OC: ${team.offensive_coordinator || 'TBD'} | DC: ${team.defensive_coordinator || 'TBD'}`,
                    `Top Needs: ${(team.top_needs || []).join(', ') || 'N/A'}`,
                    `\nKey Players:`,
                    ...starters.map((p: Record<string, unknown>) => `  ${p.position} #${p.jersey_number || '?'} ${p.player_name} (${p.college}, ${p.experience || '?'} yrs)`),
                    `\nLatest News:`,
                    ...headlines.map((h: string) => `  - ${h}`),
                    `\n--- END WAR ROOM DATA ---\n`,
                  ].join('\n');

                  setBody(prev => prev + injection);
                } catch {
                  setWarRoomNotice(true);
                  setTimeout(() => setWarRoomNotice(false), 3000);
                } finally {
                  setWarRoomLoading(false);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-colors hover:bg-white/[0.03]"
              style={{ border: `1px solid ${T.border}`, color: warRoomLoading ? T.gold : T.textMuted }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              {warRoomLoading ? 'Loading...' : 'Insert from War Room'}
            </button>
            {warRoomNotice && (
              <p className="text-xs mt-2 px-1" style={{ color: T.gold }}>
                {userTeam ? 'Failed to fetch War Room data' : 'Select a team in onboarding first'}
              </p>
            )}
          </div>

          {/* Bottom bar */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderTop: `1px solid ${T.border}` }}
          >
            <div className="flex items-center gap-4">
              <button
                onClick={authenticated ? saveDraft : promptLogin}
                disabled={authenticated ? (saving || !title.trim()) : false}
                className="px-5 py-2.5 rounded-lg text-sm font-bold tracking-wider uppercase transition-all disabled:opacity-40"
                style={{
                  background: T.gold,
                  color: '#0A0A0F',
                }}
              >
                {!authenticated ? 'Sign In to Save' : saving ? 'Saving...' : 'Save Draft'}
              </button>
              {lastSaved && (
                <span className="text-xs" style={{ color: T.textMuted }}>
                  Last saved: {lastSaved}
                </span>
              )}
            </div>
            <div className="text-xs tabular-nums" style={{ color: T.textMuted }}>
              {body.length.toLocaleString()} chars
            </div>
          </div>

          {/* Distribution section */}
          <div className="px-6 pb-8">
            <h3
              className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3"
              style={{ color: T.textMuted }}
            >
              Distribution
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {CHANNELS.map((ch) => (
                <div
                  key={ch.name}
                  className="relative rounded-xl p-4 text-center opacity-60"
                  style={{ background: T.surface, border: `1px solid ${T.border}` }}
                >
                  <div className="text-2xl mb-2">{ch.icon}</div>
                  <div className="text-xs font-bold" style={{ color: T.text }}>
                    {ch.name}
                  </div>
                  <span
                    className="absolute top-2 right-2 px-1.5 py-0.5 text-[8px] font-bold tracking-wider rounded"
                    style={{ background: T.border, color: T.textMuted }}
                  >
                    SOON
                  </span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* ═══ FOOTER ═══ */}
      <footer
        className="py-6 text-center text-[10px] font-mono tracking-[0.25em]"
        style={{ background: T.bg, color: 'rgba(255,255,255,0.3)', borderTop: `1px solid ${T.border}` }}
      >
        PER|FORM WORKBENCH · SCRIPT EDITOR · PUBLISHED BY ACHIEVEMOR
      </footer>
    </div>
  );
}
