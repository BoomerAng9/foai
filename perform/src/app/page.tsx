'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Clock3, Radio, Zap, Upload } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getGradeForScore } from '@/lib/tie/grades';
import { scoreMoments, seasonTint, type ScoredMoment } from '@/lib/season/featured-moments';
import { timeAgo, freshnessDot } from '@/lib/time/freshness';
import { heroStagger, heroItem, staggerContainer, staggerItem } from '@/lib/motion';

interface Prospect {
  id: number;
  name: string;
  school: string;
  position: string;
  overall_rank: number | null;
  projected_round: number | null;
  tie_grade: string | null;
  grade: string | null;
  nfl_comparison: string | null;
  tie_tier?: string | null;
  versatility_flex?: string | null;
  prime_sub_tags?: string[] | null;
  attribute_badges?: string[] | null;
}

interface Episode {
  id: number;
  analyst_id: string;
  title: string;
  audio_url: string | null;
  duration_seconds: number;
  created_at: string;
}

interface TeamNeed {
  team: string;
  pick: number;
  record: string;
  needs: string[];
  keyLosses?: string;
  consensusPick?: { player: string; position: string; school: string; confidence: number };
}

function useTicker() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function useCountdown(targetIso: string, now: Date) {
  const target = new Date(targetIso).getTime();
  const diff = Math.max(0, target - now.getTime());
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  const secs = Math.floor((diff % 60_000) / 1000);
  return { days, hours, mins, secs, live: diff === 0 };
}

function GradePill({ value }: { value: string | number | null }) {
  if (value == null) return <span className="font-mono text-[10px] text-white/25">--</span>;
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return <span className="font-mono text-[10px] text-white/25">--</span>;
  const info = getGradeForScore(num);
  return (
    <span className="inline-flex items-center px-2 py-[2px] rounded-full text-[10px] font-mono font-bold tabular-nums"
      style={{ background: `${info.badgeColor}18`, color: info.badgeColor }}>
      {num.toFixed(1)}
    </span>
  );
}

const ANALYSTS: Record<string, { name: string; color: string }> = {
  'void-caster': { name: 'The Void-Caster', color: '#D4A853' },
  'the-haze': { name: 'The Haze', color: '#60A5FA' },
  'air-pod-host-1': { name: 'The Haze', color: '#60A5FA' },
  'air-pod-host-2': { name: 'The Haze', color: '#60A5FA' },
  'the-colonel': { name: 'The Colonel', color: '#EF4444' },
  'astra-novatos': { name: 'Astra Novatos', color: '#F59E0B' },
  'bun-e': { name: 'Bun-E', color: '#8B5CF6' },
};

const SPORT_LABEL: Record<string, string> = {
  nfl: 'NFL', cfb: 'College Football', nba: 'NBA', cbb: 'College Basketball',
  mlb: 'MLB', cbaseball: 'College Baseball', nhl: 'NHL',
};

function formatDuration(sec?: number) {
  if (!sec || sec <= 0) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function FreshnessBadge({ iso, now, label }: { iso?: string | null; now: Date; label?: string }) {
  if (!iso) return null;
  const dot = freshnessDot(iso, now);
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono tracking-wider uppercase text-white/40">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
      {label ? `${label} · ` : ''}Updated {timeAgo(iso, now)}
    </span>
  );
}

/* ═════════════════════════════════════════════════════
 *  HOMEPAGE — season-aware, algorithmic featured hub
 * ═════════════════════════════════════════════════════ */
export default function HomePage() {
  // Respect ?redirect=/some/path from auth or share links — forward the
  // browser immediately so /?redirect=%2Fbasketball%2Fnba doesn't land
  // users on the NFL Draft hero when they asked for NBA.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const target = new URL(window.location.href).searchParams.get('redirect');
    if (!target) return;
    if (!target.startsWith('/') || target.startsWith('//')) return; // only same-origin paths
    window.location.replace(target);
  }, []);

  const now = useTicker();
  const tint = useMemo(() => seasonTint(now), [now]);
  const moments = useMemo(() => scoreMoments(now), [now]);
  const hero = moments[0];
  const secondary = moments.slice(1, 4);

  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [teamNeeds, setTeamNeeds] = useState<TeamNeed[]>([]);
  const [freshness, setFreshness] = useState<{ players?: string; podcasts?: string; teamNeeds?: string; prospects?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/players?limit=10&sort=overall_rank:asc&sport=football').then(r => r.json()).catch(() => ({})),
      fetch('/api/podcast/episodes?limit=5').then(r => r.json()).catch(() => ({})),
      fetch('/api/draft/team-needs').then(r => r.ok ? r.json() : { teams: [] }).catch(() => ({ teams: [] })),
      fetch('/api/platform/freshness').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([playersJson, epsJson, needsJson, freshJson]) => {
      setProspects(playersJson.players || []);
      setEpisodes(epsJson.episodes || []);
      setTeamNeeds(needsJson.teams || []);
      setFreshness(freshJson);
      setLoading(false);
    });
  }, []);

  const latestByShow = useMemo(() => {
    const seen = new Set<string>();
    const out: Episode[] = [];
    for (const ep of episodes) {
      const key = ep.analyst_id.startsWith('air-pod-host') ? 'the-haze' : ep.analyst_id;
      if (seen.has(key) || !ANALYSTS[ep.analyst_id]) continue;
      seen.add(key);
      out.push(ep);
      if (out.length >= 4) break;
    }
    return out;
  }, [episodes]);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--pf-bg)', color: 'var(--pf-text)' }}
      data-season={tint.label}
    >
      <Header />

      <main className="flex-1">
        {/* ═══ HERO — featured moment (algorithmic) ═══ */}
        {hero && <HeroMoment moment={hero} now={now} tint={tint} />}

        {/* ═══ SECONDARY MOMENT STRIP ═══ */}
        {secondary.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 md:px-8 pb-12">
            <motion.div
              variants={staggerContainer}
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}
              className="grid grid-cols-1 md:grid-cols-3 gap-3"
            >
              {secondary.map(m => (
                <motion.div key={m.id} variants={staggerItem}>
                  <Link href={m.href} className="block p-5 rounded-xl transition-colors hover:bg-white/[0.04]"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`w-1.5 h-1.5 rounded-full ${m.state === 'live' ? 'animate-pulse' : ''}`}
                        style={{ background: tint.accent }} />
                      <span className="text-[10px] font-mono tracking-[0.25em] uppercase" style={{ color: tint.accent }}>
                        {m.state === 'live' ? 'LIVE' : m.state === 'upcoming' ? `${m.daysAway}d AWAY` : SPORT_LABEL[m.sport]}
                      </span>
                    </div>
                    <h3 className="font-outfit text-lg font-extrabold tracking-tight mb-1" style={{ color: 'var(--pf-text)' }}>
                      {m.name}
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--pf-text-muted)' }}>{m.tagline}</p>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </section>
        )}

        {/* ═══ TEAM NEEDS BOARD (when NFL Draft is featured) ═══ */}
        {hero?.sport === 'nfl' && hero.kind === 'draft' && teamNeeds.length > 0 && (
          <TeamNeedsBoard teams={teamNeeds} freshness={freshness?.teamNeeds} now={now} />
        )}

        {/* ═══ PRIME FEATURE — flagship #1 player hero ═══ */}
        {!loading && prospects[0] && <PrimeFeatureCard prospect={prospects[0]} tint={tint} />}

        {/* ═══ TIE + NIL INVITE ═══ */}
        <TieNilInviteBanner />

        {/* ═══ TOP 10 BIG BOARD ═══ */}
        <section className="max-w-7xl mx-auto px-4 md:px-8 pb-16">
          <motion.div
            variants={staggerContainer}
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}
            className="flex items-end justify-between gap-4 mb-6"
          >
            <motion.div variants={staggerItem}>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-white/30">
                  Per|Form Big Board · Top 10
                </span>
                <FreshnessBadge iso={freshness?.prospects} now={now} />
              </div>
              <h2 className="font-outfit text-2xl md:text-3xl font-extrabold tracking-tight" style={{ color: 'var(--pf-text)' }}>
                30,000+ players. These 10 lead the 2026 class.
              </h2>
            </motion.div>
            <motion.div variants={staggerItem}>
              <Link href="/players" className="text-xs font-mono font-bold tracking-wider uppercase hover:underline" style={{ color: tint.accent }}>
                Full Index &rarr;
              </Link>
            </motion.div>
          </motion.div>

          {loading && <div className="py-16 text-center text-xs font-mono text-white/30 animate-pulse">LOADING BIG BOARD...</div>}

          {!loading && prospects.length > 0 && (
            <motion.div
              variants={staggerContainer} initial="hidden"
              whileInView="visible" viewport={{ once: true, margin: '-40px' }}
              className="grid gap-2"
            >
              {prospects.map(p => (
                <motion.div key={p.id} variants={staggerItem}
                  className="grid gap-3 items-center px-4 py-3 rounded-lg transition-colors hover:bg-white/[0.03]"
                  style={{
                    gridTemplateColumns: '40px 2fr 1fr 60px 70px 1.5fr',
                    background: 'rgba(255,255,255,0.015)',
                    border: '1px solid rgba(255,255,255,0.04)',
                  }}>
                  <span className="font-outfit text-2xl font-extrabold tabular-nums"
                    style={{ color: p.overall_rank && p.overall_rank <= 3 ? tint.accent : 'rgba(255,255,255,0.25)' }}>
                    {p.overall_rank ?? '-'}
                  </span>
                  <Link href={`/draft/${encodeURIComponent(p.name)}`}
                    className="font-outfit text-sm md:text-base font-bold hover:text-[color:var(--pf-gold)] transition-colors truncate"
                    style={{ color: 'var(--pf-text)' }}>
                    {p.name}
                  </Link>
                  <span className="font-mono text-[11px] truncate" style={{ color: 'var(--pf-text-muted)' }}>{p.school}</span>
                  <span className="font-mono text-[10px] font-bold tracking-wider" style={{ color: tint.accent }}>{p.position}</span>
                  <GradePill value={p.grade ?? p.tie_grade} />
                  <span className="font-mono text-[10px] truncate" style={{ color: 'var(--pf-text-subtle)' }}>
                    {p.nfl_comparison || `R${p.projected_round ?? '--'}`}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>

        {/* ═══ EXPERIENCE TILES ═══ */}
        <section className="max-w-7xl mx-auto px-4 md:px-8 pb-20">
          <motion.div
            variants={staggerContainer}
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3"
          >
            {[
              { title: 'Player Index', copy: 'Every FBS & FCS player. Year-round.', href: '/players', accent: '#D4A853' },
              { title: 'Franchise Sim', copy: 'Claude Managed Agents run the outcomes.', href: '/franchise', accent: '#60A5FA' },
              { title: 'Mock Draft', copy: '1st round, all 32 picks.', href: '/draft/mock', accent: '#8B5CF6' },
              { title: 'War Room', copy: 'Live draft night, real NFL feel.', href: '/draft/war-room', accent: '#EF4444' },
              { title: 'Shows', copy: 'Daily draft coverage from our analysts.', href: '/podcast/shows', accent: '#F59E0B' },
            ].map(tile => (
              <motion.div key={tile.href} variants={staggerItem}>
                <Link href={tile.href} className="block h-full p-4 rounded-xl transition-all hover:-translate-y-0.5"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                    style={{ background: `${tile.accent}18`, border: `1px solid ${tile.accent}40` }}>
                    <span className="font-outfit text-xs font-extrabold" style={{ color: tile.accent }}>{tile.title[0]}</span>
                  </div>
                  <h3 className="font-outfit text-sm font-extrabold tracking-tight mb-1" style={{ color: 'var(--pf-text)' }}>
                    {tile.title}
                  </h3>
                  <p className="text-[11px]" style={{ color: 'var(--pf-text-muted)' }}>{tile.copy}</p>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ═══ LATEST FROM THE SHOWS — small strip ═══ */}
        {latestByShow.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 md:px-8 pb-20">
            <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}
              className="flex items-end justify-between gap-4 mb-4">
              <motion.div variants={staggerItem} className="flex items-center gap-3">
                <Radio className="w-4 h-4" style={{ color: tint.accent }} />
                <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-white/30">Latest from the shows</span>
                <FreshnessBadge iso={freshness?.podcasts} now={now} />
              </motion.div>
              <motion.div variants={staggerItem}>
                <Link href="/podcast/shows" className="text-xs font-mono font-bold tracking-wider uppercase hover:underline" style={{ color: tint.accent }}>
                  All shows &rarr;
                </Link>
              </motion.div>
            </motion.div>

            <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-30px' }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {latestByShow.map(ep => {
                const meta = ANALYSTS[ep.analyst_id] || { name: ep.analyst_id, color: '#888' };
                return (
                  <motion.div key={ep.id} variants={staggerItem}>
                    <Link href="/podcast/shows" className="block p-4 rounded-xl transition-colors hover:bg-white/[0.04]"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
                        <span className="text-[10px] font-mono tracking-wider uppercase" style={{ color: meta.color }}>{meta.name}</span>
                      </div>
                      <h4 className="font-outfit text-sm font-bold line-clamp-2 mb-3" style={{ color: 'var(--pf-text)' }}>{ep.title}</h4>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-white/30">
                        <Clock3 className="w-3 h-3" />
                        {formatDuration(ep.duration_seconds)}
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}

/* ── Hero Moment component ─────────────────────────── */
function HeroMoment({ moment, now, tint }: { moment: ScoredMoment; now: Date; tint: ReturnType<typeof seasonTint> }) {
  const { days, hours, mins, secs, live } = useCountdown(moment.startIso, now);
  const showCountdown = moment.state === 'upcoming' && moment.daysAway <= 60;
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-40"
        style={{ background: `radial-gradient(ellipse at top, ${tint.accentDim.replace('0.08', '0.25').replace('0.10', '0.25')} 0%, transparent 60%)` }} />
      <motion.div variants={heroStagger} initial="hidden" animate="visible"
        className="relative max-w-7xl mx-auto px-4 md:px-8 pt-12 md:pt-20 pb-16">
        <motion.div variants={heroItem}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono tracking-[0.2em] uppercase mb-6"
          style={{
            background: tint.accentDim,
            border: `1px solid ${tint.accent}40`,
            color: tint.accent,
          }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: tint.accent }} />
          {moment.state === 'live' ? `${SPORT_LABEL[moment.sport]} — LIVE` :
            moment.state === 'upcoming' ? `${SPORT_LABEL[moment.sport]}${moment.location ? ' · ' + moment.location : ''}` :
            `${SPORT_LABEL[moment.sport]} — wrapped ${Math.abs(moment.daysAway)}d ago`}
        </motion.div>

        <motion.h1 variants={heroItem}
          className="font-outfit text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95] mb-6"
          style={{ color: 'var(--pf-text)' }}>
          {live || moment.state === 'live' ? <>Right now: <span style={{ color: tint.accent }}>{moment.name}</span></> :
           moment.state === 'upcoming' ? <>{moment.name.split(' ').slice(0, -1).join(' ')} <span style={{ color: tint.accent }}>{moment.name.split(' ').slice(-1)}</span></> :
           <>Recapping <span style={{ color: tint.accent }}>{moment.name}</span></>}
        </motion.h1>

        {showCountdown && (
          <motion.div variants={heroItem} className="flex flex-wrap gap-4 md:gap-8 mb-8">
            {[
              { label: 'Days', value: days },
              { label: 'Hours', value: hours },
              { label: 'Min', value: mins },
              { label: 'Sec', value: secs },
            ].map(u => (
              <div key={u.label} className="flex flex-col">
                <span className="font-outfit text-5xl md:text-7xl font-extrabold tabular-nums leading-none" style={{ color: tint.accent }}>
                  {String(u.value).padStart(2, '0')}
                </span>
                <span className="mt-2 text-[10px] md:text-xs font-mono tracking-[0.25em] uppercase text-white/40">{u.label}</span>
              </div>
            ))}
          </motion.div>
        )}

        <motion.p variants={heroItem} className="text-base md:text-lg max-w-2xl mb-8" style={{ color: 'var(--pf-text-muted)' }}>
          {moment.tagline}
        </motion.p>

        <motion.div variants={heroItem} className="flex flex-wrap gap-3">
          <Link href={moment.href}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-mono font-bold tracking-wider uppercase transition-all hover:scale-[1.02]"
            style={{
              background: `linear-gradient(135deg, ${tint.accent} 0%, ${tint.accent}CC 100%)`,
              color: '#0A0A0F',
              boxShadow: `0 0 30px ${tint.accent}33`,
            }}>
            Go to {moment.name} <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/players"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-mono font-bold tracking-wider uppercase transition-colors"
            style={{ background: tint.accentDim, border: `1px solid ${tint.accent}40`, color: tint.accent }}>
            Player Index <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/franchise"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-mono font-bold tracking-wider uppercase transition-colors hover:bg-white/[0.04]"
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--pf-text)' }}>
            Franchise Sim
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ── Team Needs Board ───────────────────────────────── */
function TeamNeedsBoard({ teams, freshness, now }: { teams: TeamNeed[]; freshness?: string | null; now: Date }) {
  const top12 = teams.slice(0, 12);
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 pb-16">
      <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}
        className="flex items-end justify-between gap-4 mb-6">
        <motion.div variants={staggerItem}>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-white/30">
              Draft Order · Top 12 picks
            </span>
            <FreshnessBadge iso={freshness} now={now} />
          </div>
          <h2 className="font-outfit text-2xl md:text-3xl font-extrabold tracking-tight" style={{ color: 'var(--pf-text)' }}>
            Who's taking whom?
          </h2>
        </motion.div>
        <motion.div variants={staggerItem}>
          <Link href="/draft" className="text-xs font-mono font-bold tracking-wider uppercase hover:underline text-[#D4A853]">
            Full board &rarr;
          </Link>
        </motion.div>
      </motion.div>

      <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-30px' }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {top12.map(t => (
          <motion.div key={t.pick} variants={staggerItem}
            className="p-4 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-outfit text-xl font-extrabold tabular-nums text-[#D4A853]">#{t.pick}</span>
                  <span className="font-outfit text-sm font-bold truncate" style={{ color: 'var(--pf-text)' }}>{t.team}</span>
                </div>
                <span className="text-[10px] font-mono text-white/30">{t.record}</span>
              </div>
              {t.consensusPick && (
                <div className="text-right">
                  <span className="inline-block text-[9px] font-mono font-bold px-2 py-[2px] rounded-full"
                    style={{ background: 'rgba(212,168,83,0.12)', color: '#D4A853' }}>
                    {t.consensusPick.confidence}%
                  </span>
                </div>
              )}
            </div>
            {t.consensusPick && (
              <div className="mb-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-white/30">Consensus</span>
                <div className="font-outfit text-sm font-bold truncate" style={{ color: 'var(--pf-text)' }}>
                  {t.consensusPick.player}
                </div>
                <span className="text-[11px] font-mono" style={{ color: 'var(--pf-text-muted)' }}>
                  {t.consensusPick.position} · {t.consensusPick.school}
                </span>
              </div>
            )}
            <div className="flex flex-wrap gap-1">
              {t.needs.slice(0, 5).map(n => (
                <span key={n} className="inline-block text-[9px] font-mono font-bold px-2 py-[2px] rounded-full"
                  style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)' }}>
                  {n}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

/* ── PRIME Feature Card — flagship #1 player ──────────────────── */
const PRIME_SUB_TAG_ICON: Record<string, { icon: string; label: string }> = {
  franchise_cornerstone:     { icon: '🏗️', label: 'Franchise Cornerstone' },
  talent_character_concerns: { icon: '⚠️', label: 'Talent w/ Character Concerns' },
  nil_ready:                 { icon: '🎤', label: 'NIL Ready' },
  quiet_but_elite:           { icon: '🔒', label: 'Quiet but Elite' },
  ultra_competitive:         { icon: '🤯', label: 'Ultra-Competitive' },
};

function PrimeFeatureCard({ prospect, tint }: { prospect: Prospect; tint: ReturnType<typeof seasonTint> }) {
  const grade = prospect.grade ? parseFloat(prospect.grade) : 0;
  const isPrime = prospect.tie_tier === 'PRIME' || grade >= 101;
  const primeTags = (prospect.prime_sub_tags ?? []).map(t => PRIME_SUB_TAG_ICON[t]).filter(Boolean);
  const badgeCount = prospect.attribute_badges?.length ?? 0;
  const hofBadges = (prospect.attribute_badges ?? []).filter(b => b.endsWith('_hof')).length;
  const versatility = prospect.versatility_flex && prospect.versatility_flex !== 'none' ? prospect.versatility_flex : null;
  const accent = isPrime ? '#F4D47A' : tint.accent;
  const accentSoft = isPrime ? 'rgba(244,212,122,0.14)' : `${tint.accent}22`;
  const accentBorder = isPrime ? 'rgba(244,212,122,0.55)' : `${tint.accent}60`;

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 pb-10">
      <motion.div
        variants={staggerContainer}
        initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }}
      >
        <motion.div
          variants={staggerItem}
          className="rounded-2xl overflow-hidden backdrop-blur-xl relative"
          style={{
            border: `1px solid ${accentBorder}`,
            background: `linear-gradient(135deg, ${accentSoft} 0%, rgba(255,255,255,0.02) 55%, rgba(255,255,255,0.01) 100%)`,
            boxShadow: isPrime ? `0 0 48px rgba(244,212,122,0.22)` : `0 0 28px ${accentSoft}`,
          }}
        >
          <div
            className="absolute top-0 left-0 right-0"
            style={{
              height: '2px',
              background: `linear-gradient(90deg, transparent 0%, ${accent} 20%, ${accent} 80%, transparent 100%)`,
            }}
          />
          <div className="grid md:grid-cols-[1fr_auto] gap-6 p-6 md:p-8">
            <div className="min-w-0">
              <div className="flex items-baseline gap-3 mb-2 flex-wrap">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                  style={{
                    fontFamily: 'Geist Mono, monospace',
                    fontSize: '10px',
                    letterSpacing: '0.2em',
                    background: accentSoft,
                    color: accent,
                    border: `1px solid ${accentBorder}`,
                    textTransform: 'uppercase',
                  }}
                >
                  <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: accent, boxShadow: `0 0 8px ${accent}` }} />
                  {isPrime ? 'PRIME — Generational Talent' : 'Per|Form #1 Overall'}
                </span>
                {versatility && (
                  <span
                    className="text-[9px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-full"
                    style={{ fontFamily: 'Geist Mono, monospace', background: 'rgba(147,197,253,0.10)', color: '#93C5FD', border: '1px solid rgba(147,197,253,0.35)' }}
                  >
                    {versatility.replace('_', '-')}
                  </span>
                )}
              </div>

              <h2
                className="font-outfit font-extrabold tracking-tight mb-1"
                style={{ color: accent, fontSize: 'clamp(44px, 6vw, 76px)', lineHeight: 1.02 }}
              >
                {prospect.name}
                {isPrime && <span className="ml-3" style={{ fontSize: '0.7em' }}>🛸</span>}
                {primeTags.map(t => (
                  <span key={t.label} className="ml-2" style={{ fontSize: '0.5em' }} title={t.label}>{t.icon}</span>
                ))}
              </h2>
              <div className="flex items-baseline gap-3 mb-4 text-white/70 text-sm font-mono uppercase tracking-widest">
                <span>{prospect.position}</span>
                <span>·</span>
                <span>{prospect.school}</span>
                {prospect.projected_round && (
                  <>
                    <span>·</span>
                    <span>Projected R{prospect.projected_round}</span>
                  </>
                )}
              </div>
              {primeTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {primeTags.map(t => (
                    <span
                      key={t.label}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] uppercase tracking-[0.18em]"
                      style={{
                        fontFamily: 'Geist Mono, monospace',
                        background: accentSoft,
                        color: accent,
                        border: `1px solid ${accentBorder}`,
                      }}
                    >
                      <span style={{ fontSize: '11px' }}>{t.icon}</span>
                      {t.label}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3 flex-wrap">
                <Link
                  href="/draft/center"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-mono font-bold tracking-wider uppercase transition-all hover:scale-[1.02]"
                  style={{ background: accent, color: '#0A0A0F', boxShadow: `0 0 24px ${accent}44` }}
                >
                  Open Draft Desk <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href={`/players/${encodeURIComponent(prospect.name)}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-mono font-bold tracking-wider uppercase transition-colors"
                  style={{ background: accentSoft, border: `1px solid ${accentBorder}`, color: accent }}
                >
                  See full sheet
                </Link>
              </div>
            </div>
            <div className="flex flex-col items-end justify-between gap-4">
              <div className="text-right">
                <div className="text-[10px] font-mono tracking-[0.25em] uppercase text-white/40 mb-1">Grade</div>
                <div
                  className="font-outfit font-extrabold tabular-nums"
                  style={{ color: accent, fontSize: 'clamp(56px, 8vw, 104px)', lineHeight: 1, textShadow: isPrime ? `0 0 28px ${accent}66` : 'none' }}
                >
                  {grade.toFixed(1)}
                </div>
                <div className="text-right font-mono uppercase tracking-[0.2em] text-white/60 text-xs mt-1">
                  {prospect.tie_grade ?? '--'}
                </div>
              </div>
              {badgeCount > 0 && (
                <div className="text-right">
                  <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 mb-1">Badges</div>
                  <div className="flex items-center gap-2 text-[11px] font-mono" style={{ color: accent }}>
                    <span>{badgeCount} total</span>
                    <span className="text-white/30">·</span>
                    <span>{hofBadges} HOF</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ── TIE + NIL Invite Banner — schools/teams/players upload CTA ─────── */
function TieNilInviteBanner() {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 pb-12">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        className="rounded-2xl overflow-hidden relative"
        style={{
          border: '1px solid rgba(255,107,0,0.28)',
          background: 'linear-gradient(120deg, rgba(255,107,0,0.10) 0%, rgba(212,168,83,0.08) 40%, rgba(96,165,250,0.06) 100%)',
          boxShadow: '0 0 32px rgba(255,107,0,0.12)',
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: 'linear-gradient(90deg, transparent 0%, #FF6B00 20%, #D4A853 50%, #60A5FA 80%, transparent 100%)' }}
        />
        <div className="grid md:grid-cols-[auto_1fr_auto] gap-5 items-center p-5 md:p-7">
          <div
            className="inline-flex items-center justify-center rounded-xl shrink-0"
            style={{
              width: 56, height: 56,
              background: 'rgba(255,107,0,0.15)',
              border: '1px solid rgba(255,107,0,0.45)',
            }}
          >
            <Upload className="w-6 h-6" style={{ color: '#FF6B00' }} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-3.5 h-3.5" style={{ color: '#FF6B00' }} />
              <span className="text-[10px] font-mono tracking-[0.24em] uppercase" style={{ color: '#FF6B00' }}>
                TIE + NIL · Open to players, schools, teams, agents
              </span>
            </div>
            <h3 className="font-outfit text-xl md:text-2xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--pf-text)' }}>
              Get your TIE grade + NIL cohort valuation.
            </h3>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--pf-text-muted)' }}>
              Upload a player profile (combine numbers + scout ratings) and Per|Form grades it through the canonical
              40/30/30 Performance·Attributes·Intangibles engine. Returns an NIL valuation anchored to peers at the
              same class + position + tier.
            </p>
          </div>
          <div className="flex md:justify-end">
            <Link
              href="/tie/submit"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-xs font-mono font-bold tracking-wider uppercase transition-all hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, #FF6B00 0%, #D4A853 100%)',
                color: '#1A0F00',
                boxShadow: '0 0 24px rgba(255,107,0,0.4)',
              }}
            >
              Run TIE + NIL <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
