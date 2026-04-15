'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import {
  useAudioPlayer,
  type AudioEpisode,
} from '@/context/AudioPlayerContext';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronDown,
  ChevronUp,
  Radio,
  Volume2,
  VolumeX,
  ListMusic,
  Clock,
  Mic2,
  Calendar,
} from 'lucide-react';

/* ───────────────────────── types ───────────────────────── */

interface Episode {
  id: number;
  analyst_id: string;
  title: string;
  transcript: string;
  audio_url: string | null;
  duration_seconds: number;
  type: string;
  created_at: string;
}

/* ───────────────────────── show definitions ───────────────────────── */

interface ShowDef {
  id: string;
  analystIds: string[];
  name: string;
  tagline: string;
  description: string;
  gradient: string;
  initials: string;
  color: string;
  analystName: string;
}

const SHOWS: ShowDef[] = [
  {
    id: 'void-caster',
    analystIds: ['void-caster'],
    name: 'The Void Report',
    tagline: 'DEEP-DIVE PROSPECT ANALYSIS',
    description:
      'Cinematic delivery meets surgical scouting. The Void-Caster breaks down every prospect like the draft is a feature film and every pick is a plot twist.',
    gradient: 'linear-gradient(135deg, #D4A853 0%, #1a1400 100%)',
    initials: 'VC',
    color: '#D4A853',
    analystName: 'The Void-Caster',
  },
  {
    id: 'the-haze',
    analystIds: ['the-haze', 'air-pod-host-1', 'air-pod-host-2'],
    name: 'Haze & Smoke',
    tagline: 'THE DEBATE SHOW',
    description:
      'Two former Blinn College athletes argue picks, NIL readiness, and the transfer portal. North meets South. Investment meets education. Nipsey philosophy throughout.',
    gradient: 'linear-gradient(135deg, #60A5FA 0%, #0a1a3a 100%)',
    initials: 'H&S',
    color: '#60A5FA',
    analystName: 'The Haze (Duo)',
  },
  {
    id: 'the-colonel',
    analystIds: ['the-colonel'],
    name: "The Colonel's Corner",
    tagline: 'LIVE FROM MARLISECIO\'S PIZZA',
    description:
      'Old-school scouting from the back of a North Jersey pizzeria. Unfiltered takes, Union High \'87 war stories, and Gino yelling about the rent.',
    gradient: 'linear-gradient(135deg, #EF4444 0%, #2a0a0a 100%)',
    initials: 'CC',
    color: '#EF4444',
    analystName: 'The Colonel',
  },
  {
    id: 'astra-novatos',
    analystIds: ['astra-novatos'],
    name: 'The Astra Brief',
    tagline: 'ELEGANCE MEETS THE GRIDIRON',
    description:
      'Measured, refined, unhurried. Astra Novatos reads tape like cashmere threads — through the details. Fashion-meets-football for the discerning listener.',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #1a1200 100%)',
    initials: 'AN',
    color: '#F59E0B',
    analystName: 'Astra Novatos',
  },
  {
    id: 'bun-e',
    analystIds: ['bun-e'],
    name: 'Phone Home with Bun-E',
    tagline: "WOMEN'S SPORTS / TECH / LAW / BEYOND",
    description:
      "Women's flag football, women in tech and leadership, constitutional law, and a cosmic presence that defies explanation. Scholarly. Commanding. Occasionally rhymes.",
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #1a0a2a 100%)',
    initials: 'BE',
    color: '#8B5CF6',
    analystName: 'Bun-E',
  },
];

/* ───────────────────────── helpers ───────────────────────── */

function formatDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const SPEEDS = [0.5, 1, 1.25, 1.5, 2];

/* ───────────────────────── component ───────────────────────── */

export default function ShowsPage() {
  /* ── data ── */
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/podcast/episodes');
        const data = await res.json();
        setEpisodes(data.episodes || []);
      } catch {
        setEpisodes([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /* ── group episodes by show ── */
  const showEpisodes = useMemo(() => {
    const map: Record<string, Episode[]> = {};
    for (const show of SHOWS) {
      map[show.id] = episodes
        .filter((ep) => show.analystIds.includes(ep.analyst_id))
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
    }
    return map;
  }, [episodes]);

  /* ── audio context ── */
  const audio = useAudioPlayer();

  /* ── expanded show ── */
  const [expandedShow, setExpandedShow] = useState<string | null>(null);

  /* ── volume ── */
  const [muted, setMuted] = useState(false);

  const toAudioEpisode = useCallback((ep: Episode): AudioEpisode => {
    const show = SHOWS.find((s) => s.analystIds.includes(ep.analyst_id));

    return {
      id: ep.id,
      title: ep.title,
      analyst: show?.analystName || ep.analyst_id,
      analystColor: show?.color || '#888',
      audioUrl: ep.audio_url,
      duration: ep.duration_seconds,
    };
  }, []);

  /* ── play episode helper ── */
  const playEpisode = useCallback(
    (ep: Episode, collection?: Episode[]) => {
      if (!ep.audio_url) return;

      if (collection) {
        const playableEpisodes = collection.filter((episode) => Boolean(episode.audio_url));
        const startIndex = playableEpisodes.findIndex((episode) => episode.id === ep.id);

        if (startIndex >= 0) {
          audio.playCollection(playableEpisodes.map(toAudioEpisode), startIndex);
          return;
        }
      }

      audio.play(toAudioEpisode(ep));
    },
    [audio, toAudioEpisode],
  );

  /* ── play entire show ── */
  const playShow = useCallback(
    (showId: string) => {
      const eps = showEpisodes[showId] || [];
      const playable = eps.filter((e) => e.audio_url);
      if (playable.length === 0) return;
      audio.playCollection(playable.map(toAudioEpisode));
      setExpandedShow(showId);
    },
    [audio, showEpisodes, toAudioEpisode],
  );

  /* ── prev / next in queue ── */
  const playPrev = useCallback(() => {
    audio.playPreviousInQueue();
  }, [audio]);

  const playNext = useCallback(() => {
    audio.playNextInQueue();
  }, [audio]);

  /* ── scrubber ── */
  const scrubberRef = useRef<HTMLDivElement>(null);
  const handleScrub = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const bar = scrubberRef.current;
      if (!bar || !audio.duration) return;
      const rect = bar.getBoundingClientRect();
      const pct = Math.max(
        0,
        Math.min(1, (e.clientX - rect.left) / rect.width),
      );
      audio.seek(pct * audio.duration);
    },
    [audio],
  );

  const progress =
    audio.duration > 0 ? (audio.currentTime / audio.duration) * 100 : 0;

  /* ── now playing show context ── */
  const nowPlayingShow = useMemo(() => {
    if (!audio.currentEpisode) return null;
    const ep = episodes.find((e) => e.id === audio.currentEpisode?.id);
    if (!ep) return null;
    return SHOWS.find((s) => s.analystIds.includes(ep.analyst_id)) || null;
  }, [audio.currentEpisode, episodes]);

  /* ── up next ── */
  const upNext = useMemo(() => {
    if (audio.queueIndex < 0) return [];

    return audio.queue
      .slice(audio.queueIndex + 1, audio.queueIndex + 4)
      .map((queueEpisode) => episodes.find((episode) => episode.id === queueEpisode.id) ?? null)
      .filter((episode): episode is Episode => Boolean(episode));
  }, [audio.queue, audio.queueIndex, episodes]);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--pf-bg)', color: 'var(--pf-text)' }}
    >
      <Header />

      <main className="flex-1 w-full pb-8">
        {/* ══════════════════ HERO ══════════════════ */}
        <section
          className="relative overflow-hidden"
          style={{
            background:
              'linear-gradient(180deg, #0d1117 0%, #0A0A0F 100%)',
            borderBottom: '1px solid rgba(212,168,83,0.1)',
          }}
        >
          {/* Scanline overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(212,168,83,0.4) 2px, rgba(212,168,83,0.4) 3px)',
            }}
          />
          {/* Radial glow */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(212,168,83,0.06) 0%, transparent 70%)',
            }}
          />

          <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24 text-center">
            {/* Network badge */}
            <div className="inline-flex items-center gap-2 mb-6">
              <Radio size={14} style={{ color: '#D4A853' }} />
              <span
                className="text-[10px] font-mono tracking-[0.3em] uppercase"
                style={{ color: 'rgba(212,168,83,0.6)' }}
              >
                Live Broadcast Network
              </span>
              <Radio size={14} style={{ color: '#D4A853' }} />
            </div>

            {/* Title */}
            <h1
              className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-[0.15em] leading-none mb-4"
              style={{
                fontFamily: 'Outfit, sans-serif',
                color: '#D4A853',
                textShadow: '0 0 60px rgba(212,168,83,0.15)',
              }}
            >
              PER|FORM
            </h1>
            <h2
              className="text-lg md:text-2xl font-bold tracking-[0.35em] mb-3"
              style={{
                fontFamily: 'Outfit, sans-serif',
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              BROADCAST NETWORK
            </h2>
            <p
              className="text-xs font-mono tracking-[0.2em] max-w-xl mx-auto"
              style={{ color: 'rgba(255,255,255,0.25)' }}
            >
              FIVE SHOWS. FIVE VOICES. ONE DRAFT. EVERY ANGLE COVERED.
            </p>

            {/* Gold rule */}
            <div
              className="mt-8 mx-auto w-48 h-px"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(212,168,83,0.4), transparent)',
              }}
            />
          </div>
        </section>

        {/* ══════════════════ NOW PLAYING / UP NEXT ══════════════════ */}
        {audio.currentEpisode && (
          <section className="max-w-6xl mx-auto px-4 mt-8">
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: 'rgba(212,168,83,0.03)',
                border: '1px solid rgba(212,168,83,0.12)',
              }}
            >
              {/* Now playing header */}
              <div className="px-6 pt-5 pb-2 flex items-center gap-3">
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: '#EF4444' }}
                />
                <span
                  className="text-[10px] font-mono tracking-[0.25em] uppercase"
                  style={{ color: '#D4A853' }}
                >
                  Now Playing
                </span>
                {nowPlayingShow && (
                  <span
                    className="text-[10px] font-mono tracking-wider ml-auto"
                    style={{ color: nowPlayingShow.color, opacity: 0.6 }}
                  >
                    {nowPlayingShow.name.toUpperCase()}
                  </span>
                )}
              </div>

              {/* Episode info + transport */}
              <div className="px-6 pb-6">
                <h3
                  className="text-lg md:text-xl font-bold mb-1"
                  style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--pf-text)' }}
                >
                  {audio.currentEpisode.title}
                </h3>
                <p
                  className="text-xs font-mono mb-5"
                  style={{ color: audio.currentEpisode.analystColor }}
                >
                  {audio.currentEpisode.analyst}
                </p>

                {/* Scrubber */}
                <div
                  ref={scrubberRef}
                  onClick={handleScrub}
                  className="relative h-2 rounded-full cursor-pointer group mb-3"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  <div
                    className="h-full rounded-full relative"
                    style={{
                      width: `${progress}%`,
                      background:
                        'linear-gradient(90deg, #D4A853, #f0d08a)',
                      transition: 'width 0.3s linear',
                    }}
                  >
                    <div
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        background: '#D4A853',
                        boxShadow: '0 0 8px rgba(212,168,83,0.5)',
                      }}
                    />
                  </div>
                </div>

                {/* Time labels */}
                <div className="flex justify-between text-[10px] font-mono text-white/30 mb-5 tabular-nums">
                  <span>{formatDuration(audio.currentTime)}</span>
                  <span>{formatDuration(audio.duration)}</span>
                </div>

                {/* Transport controls */}
                <div className="flex items-center justify-center gap-4">
                  {/* Speed */}
                  <div className="flex items-center gap-1">
                    {SPEEDS.map((spd) => (
                      <button
                        key={spd}
                        onClick={() => audio.setSpeed(spd)}
                        className="text-[10px] font-mono px-2 py-1 rounded transition-all"
                        style={{
                          background:
                            audio.playbackRate === spd
                              ? 'rgba(212,168,83,0.2)'
                              : 'rgba(255,255,255,0.03)',
                          color:
                            audio.playbackRate === spd
                              ? '#D4A853'
                              : 'rgba(255,255,255,0.3)',
                          border: `1px solid ${
                            audio.playbackRate === spd
                              ? 'rgba(212,168,83,0.3)'
                              : 'rgba(255,255,255,0.06)'
                          }`,
                        }}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>

                  {/* Prev */}
                  <button
                    onClick={playPrev}
                    className="w-10 h-10 flex items-center justify-center rounded-full text-white/40 hover:text-white/70 transition-colors"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                    title="Previous episode"
                    disabled={audio.queueIndex <= 0}
                  >
                    <SkipBack size={16} />
                  </button>

                  {/* Play / Pause */}
                  <button
                    onClick={audio.togglePlay}
                    className="w-14 h-14 flex items-center justify-center rounded-full transition-all"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(212,168,83,0.25), rgba(212,168,83,0.1))',
                      border: '1px solid rgba(212,168,83,0.4)',
                      boxShadow: '0 0 20px rgba(212,168,83,0.08)',
                      color: '#D4A853',
                    }}
                  >
                    {audio.isPlaying ? (
                      <Pause size={24} />
                    ) : (
                      <Play size={24} className="ml-1" />
                    )}
                  </button>

                  {/* Next */}
                  <button
                    onClick={playNext}
                    className="w-10 h-10 flex items-center justify-center rounded-full text-white/40 hover:text-white/70 transition-colors"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                    title="Next episode"
                    disabled={
                      audio.queueIndex < 0 || audio.queueIndex >= audio.queue.length - 1
                    }
                  >
                    <SkipForward size={16} />
                  </button>

                  {/* Volume */}
                  <button
                    onClick={() => setMuted(!muted)}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-white/30 hover:text-white/60 transition-colors"
                    title={muted ? 'Unmute' : 'Mute'}
                  >
                    {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                </div>
              </div>

              {/* Up next */}
              {upNext.length > 0 && (
                <div
                  className="px-6 py-4"
                  style={{
                    background: 'rgba(0,0,0,0.2)',
                    borderTop: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <ListMusic
                      size={12}
                      style={{ color: 'rgba(255,255,255,0.3)' }}
                    />
                    <span className="text-[10px] font-mono tracking-[0.2em] text-white/30 uppercase">
                      Up Next
                    </span>
                  </div>
                  <div className="space-y-2">
                    {upNext.map((ep) => {
                      const show = SHOWS.find((s) =>
                        s.analystIds.includes(ep.analyst_id),
                      );
                      return (
                        <button
                          key={ep.id}
                          onClick={() => playEpisode(ep)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all hover:bg-white/[0.03]"
                        >
                          <Play
                            size={10}
                            style={{
                              color: show?.color || 'rgba(255,255,255,0.3)',
                            }}
                          />
                          <span className="text-xs text-white/60 truncate flex-1">
                            {ep.title}
                          </span>
                          <span
                            className="text-[10px] font-mono"
                            style={{
                              color: show?.color || 'rgba(255,255,255,0.3)',
                              opacity: 0.5,
                            }}
                          >
                            {show?.analystName}
                          </span>
                          <span className="text-[10px] font-mono text-white/20">
                            {formatDuration(ep.duration_seconds)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ══════════════════ SHOW CARDS ══════════════════ */}
        <section className="max-w-6xl mx-auto px-4 mt-12">
          <div className="flex items-center gap-3 mb-8">
            <Mic2 size={16} style={{ color: '#D4A853' }} />
            <h2
              className="text-sm font-mono tracking-[0.3em] uppercase"
              style={{ color: '#D4A853' }}
            >
              Show Lineup
            </h2>
            <div
              className="flex-1 h-px"
              style={{ background: 'rgba(212,168,83,0.12)' }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {SHOWS.map((show) => {
              const eps = showEpisodes[show.id] || [];
              const isExpanded = expandedShow === show.id;
              const isActiveShow =
                nowPlayingShow?.id === show.id;

              return (
                <div
                  key={show.id}
                  className={`rounded-xl overflow-hidden transition-all ${
                    isExpanded ? 'md:col-span-2 lg:col-span-3' : ''
                  }`}
                  style={{
                    background: isActiveShow
                      ? 'rgba(212,168,83,0.04)'
                      : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${
                      isActiveShow
                        ? 'rgba(212,168,83,0.2)'
                        : 'rgba(255,255,255,0.06)'
                    }`,
                  }}
                >
                  {/* Card top */}
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Artwork placeholder */}
                      <div
                        className="shrink-0 w-20 h-20 rounded-lg flex items-center justify-center relative overflow-hidden"
                        style={{ background: show.gradient }}
                      >
                        <span
                          className="text-2xl font-extrabold relative z-10"
                          style={{
                            fontFamily: 'Outfit, sans-serif',
                            color: 'rgba(255,255,255,0.9)',
                            textShadow: `0 0 20px ${show.color}40`,
                          }}
                        >
                          {show.initials}
                        </span>
                        {/* Noise overlay */}
                        <div
                          className="absolute inset-0 opacity-20"
                          style={{
                            backgroundImage:
                              'radial-gradient(circle at 30% 40%, rgba(255,255,255,0.15), transparent 60%)',
                          }}
                        />
                        {isActiveShow && (
                          <div
                            className="absolute inset-0 animate-pulse"
                            style={{
                              border: `2px solid ${show.color}`,
                              borderRadius: '0.5rem',
                            }}
                          />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3
                          className="text-base font-bold leading-tight mb-0.5"
                          style={{
                            fontFamily: 'Outfit, sans-serif',
                            color: show.color,
                          }}
                        >
                          {show.name}
                        </h3>
                        <p className="text-[10px] font-mono tracking-[0.15em] text-white/30 mb-2">
                          {show.analystName.toUpperCase()}
                        </p>
                        <p
                          className="text-xs leading-relaxed text-white/40 line-clamp-2"
                          style={{ fontFamily: 'Inter, sans-serif' }}
                        >
                          {show.description}
                        </p>
                      </div>
                    </div>

                    {/* Meta + actions */}
                    <div className="flex items-center gap-3 mt-4">
                      <span className="text-[10px] font-mono text-white/20">
                        {eps.length} {eps.length === 1 ? 'EPISODE' : 'EPISODES'}
                      </span>
                      {eps.length > 0 && (
                        <span className="text-[10px] font-mono text-white/20">
                          {formatDuration(
                            eps.reduce(
                              (acc, e) => acc + e.duration_seconds,
                              0,
                            ),
                          )}{' '}
                          TOTAL
                        </span>
                      )}
                      <div className="flex-1" />

                      {eps.filter((e) => e.audio_url).length > 0 && (
                        <button
                          onClick={() => playShow(show.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono tracking-wider transition-all"
                          style={{
                            background: `${show.color}18`,
                            color: show.color,
                            border: `1px solid ${show.color}33`,
                          }}
                        >
                          <Play size={10} />
                          LISTEN NOW
                        </button>
                      )}

                      {eps.length > 0 && (
                        <button
                          onClick={() =>
                            setExpandedShow(isExpanded ? null : show.id)
                          }
                          className="flex items-center gap-1 px-2 py-1.5 rounded text-[10px] font-mono text-white/30 hover:text-white/50 transition-colors"
                        >
                          {isExpanded ? (
                            <>
                              COLLAPSE <ChevronUp size={10} />
                            </>
                          ) : (
                            <>
                              ALL EPISODES <ChevronDown size={10} />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ── Episode sequencer (expanded) ── */}
                  {isExpanded && (
                    <div
                      className="px-5 pb-5"
                      style={{
                        borderTop: '1px solid rgba(255,255,255,0.04)',
                      }}
                    >
                      <div className="flex items-center gap-2 pt-4 pb-3">
                        <ListMusic
                          size={12}
                          style={{ color: show.color, opacity: 0.5 }}
                        />
                        <span
                          className="text-[10px] font-mono tracking-[0.2em] uppercase"
                          style={{ color: show.color, opacity: 0.5 }}
                        >
                          Episode Playlist
                        </span>
                      </div>

                      {eps.length === 0 ? (
                        <p className="text-xs font-mono text-white/20 py-4 text-center">
                          No episodes yet. Recording in progress.
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {eps.map((ep, idx) => {
                            const isNowPlaying =
                              audio.currentEpisode?.id === ep.id;
                            const hasAudio = !!ep.audio_url;

                            return (
                              <button
                                key={ep.id}
                                onClick={() => {
                                  if (!hasAudio) return;
                                  playEpisode(ep, eps);
                                }}
                                disabled={!hasAudio}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all group"
                                style={{
                                  background: isNowPlaying
                                    ? `${show.color}0d`
                                    : 'transparent',
                                  border: isNowPlaying
                                    ? `1px solid ${show.color}22`
                                    : '1px solid transparent',
                                  opacity: hasAudio ? 1 : 0.4,
                                  cursor: hasAudio ? 'pointer' : 'default',
                                }}
                              >
                                {/* Track number or playing indicator */}
                                <span className="w-6 text-center shrink-0">
                                  {isNowPlaying && audio.isPlaying ? (
                                    <span
                                      className="inline-flex gap-[2px] items-end h-3"
                                      style={{ color: show.color }}
                                    >
                                      <span className="w-[2px] h-1 bg-current animate-pulse rounded-full" />
                                      <span
                                        className="w-[2px] h-2 bg-current animate-pulse rounded-full"
                                        style={{ animationDelay: '0.15s' }}
                                      />
                                      <span
                                        className="w-[2px] h-3 bg-current animate-pulse rounded-full"
                                        style={{ animationDelay: '0.3s' }}
                                      />
                                      <span
                                        className="w-[2px] h-1.5 bg-current animate-pulse rounded-full"
                                        style={{ animationDelay: '0.45s' }}
                                      />
                                    </span>
                                  ) : (
                                    <span className="text-[11px] font-mono text-white/20 group-hover:hidden">
                                      {idx + 1}
                                    </span>
                                  )}
                                  {!isNowPlaying && hasAudio && (
                                    <Play
                                      size={11}
                                      className="hidden group-hover:inline-block"
                                      style={{ color: show.color }}
                                    />
                                  )}
                                </span>

                                {/* Title */}
                                <span
                                  className="text-xs truncate flex-1"
                                  style={{
                                    color: isNowPlaying
                                      ? show.color
                                      : 'rgba(255,255,255,0.6)',
                                    fontFamily: 'Inter, sans-serif',
                                  }}
                                >
                                  {ep.title}
                                </span>

                                {/* Date */}
                                <span className="text-[10px] font-mono text-white/15 shrink-0 hidden sm:inline">
                                  {formatDate(ep.created_at)}
                                </span>

                                {/* Duration */}
                                <span className="text-[10px] font-mono text-white/20 shrink-0 w-10 text-right">
                                  {formatDuration(ep.duration_seconds)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ══════════════════ SHOW SCHEDULE ══════════════════ */}
        <section className="max-w-6xl mx-auto px-4 mt-16 mb-8">
          <div className="flex items-center gap-3 mb-8">
            <Calendar size={16} style={{ color: '#D4A853' }} />
            <h2
              className="text-sm font-mono tracking-[0.3em] uppercase"
              style={{ color: '#D4A853' }}
            >
              Upcoming
            </h2>
            <div
              className="flex-1 h-px"
              style={{ background: 'rgba(212,168,83,0.12)' }}
            />
          </div>

          <div
            className="rounded-xl p-6 md:p-8"
            style={{
              background: 'rgba(255,255,255,0.015)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  show: 'The Void Report',
                  color: '#D4A853',
                  note: 'Draft night special drops live during Round 1',
                  when: 'DRAFT NIGHT',
                },
                {
                  show: 'Haze & Smoke',
                  color: '#60A5FA',
                  note: 'Post-draft reaction episode with NIL breakdown',
                  when: 'DAY AFTER DRAFT',
                },
                {
                  show: "The Colonel's Corner",
                  color: '#EF4444',
                  note: 'Live from Marlisecio\'s on pick night. Gino confirmed.',
                  when: 'DRAFT NIGHT',
                },
                {
                  show: 'The Astra Brief',
                  color: '#F59E0B',
                  note: 'Post-draft brand positioning analysis for top 10 picks',
                  when: 'POST-DRAFT WEEK',
                },
                {
                  show: 'Phone Home with Bun-E',
                  color: '#8B5CF6',
                  note: "Flag football preview + women's sports roundup",
                  when: 'WEEKLY',
                },
                {
                  show: 'NETWORK SPECIAL',
                  color: '#D4A853',
                  note: 'All five analysts, one board, one draft class. The full roundtable.',
                  when: 'DRAFT EVE',
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-4 rounded-lg"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <div
                    className="shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full"
                    style={{ background: item.color }}
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-[10px] font-mono tracking-wider"
                        style={{ color: item.color }}
                      >
                        {item.show.toUpperCase()}
                      </span>
                      <span
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          color: 'rgba(255,255,255,0.25)',
                        }}
                      >
                        {item.when}
                      </span>
                    </div>
                    <p
                      className="text-xs text-white/35 leading-relaxed"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      {item.note}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Tagline */}
            <div className="mt-8 text-center">
              <p
                className="text-[10px] font-mono tracking-[0.25em] uppercase"
                style={{ color: 'rgba(212,168,83,0.3)' }}
              >
                New episodes drop every draft day. Stay locked in.
              </p>
            </div>
          </div>
        </section>

        {/* ══════════════════ LOADING STATE ══════════════════ */}
        {loading && (
          <div className="text-center py-16">
            <div className="inline-block w-8 h-8 border-2 border-[#D4A853]/30 border-t-[#D4A853] rounded-full animate-spin" />
            <p className="text-xs font-mono text-white/30 mt-3">
              LOADING BROADCAST LINEUP...
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
