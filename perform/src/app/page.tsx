'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Clock3,
  Mic2,
  Pause,
  Play,
  Radio,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAudioPlayer, type AudioEpisode } from '@/context/AudioPlayerContext';
import { CURRENT_DRAFT_CLASS_YEAR, PLATFORM_ROUTES } from '@/lib/platform/config';
import styles from './page.module.css';

type ChannelTone = 'gold' | 'blue' | 'red' | 'amber' | 'violet';

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

interface ProspectPreview {
  id: number;
  name: string;
  school: string;
  position: string;
  overall_rank: number | null;
  class_year: string | null;
}

interface NewsArticle {
  title: string;
  url: string;
  source: string;
  publishedAt?: string;
}

interface FeedTweet {
  id: string;
  text: string;
  authorName: string;
  authorUsername: string;
  createdAt: string;
}

interface ChannelMeta {
  id: string;
  label: string;
  shortLabel: string;
  tagline: string;
  description: string;
  host: string;
  analystIds: string[];
  tone: ChannelTone;
  accentHex: string;
}

const NETWORK_CHANNELS: ChannelMeta[] = [
  {
    id: 'void-caster',
    label: 'Void Report',
    shortLabel: 'Void',
    tagline: 'Film-room breakdowns with cinematic pacing.',
    description: 'Deep draft analysis, comp work, and feature-style prospect storytelling led by The Void-Caster.',
    host: 'The Void-Caster',
    analystIds: ['void-caster'],
    tone: 'gold',
    accentHex: '#D4A853',
  },
  {
    id: 'the-haze',
    label: 'Haze & Smoke',
    shortLabel: 'Haze',
    tagline: 'Debate-driven draft takes and fast reactions.',
    description: 'The Haze network feed handles arguments, rankings friction, and fast-turn reaction shows.',
    host: 'The Haze',
    analystIds: ['the-haze', 'air-pod-host-1', 'air-pod-host-2'],
    tone: 'blue',
    accentHex: '#60A5FA',
  },
  {
    id: 'the-colonel',
    label: "Colonel's Corner",
    shortLabel: 'Colonel',
    tagline: 'Old-school scouting from the back room.',
    description: 'North Jersey scouting stories, hardline prospect opinions, and unfiltered broadcast energy.',
    host: 'The Colonel',
    analystIds: ['the-colonel'],
    tone: 'red',
    accentHex: '#EF4444',
  },
  {
    id: 'astra-novatos',
    label: 'Astra Brief',
    shortLabel: 'Astra',
    tagline: 'Luxury texture with measured scouting context.',
    description: 'Astra Novatos handles elegant long-form reads on fit, narrative, and valuation.',
    host: 'Astra Novatos',
    analystIds: ['astra-novatos'],
    tone: 'amber',
    accentHex: '#F59E0B',
  },
  {
    id: 'bun-e',
    label: 'Phone Home',
    shortLabel: 'Bun-E',
    tagline: 'Cross-discipline conversations beyond one board.',
    description: 'Bun-E stretches the network beyond one lane and keeps the station from collapsing into a single-topic loop.',
    host: 'Bun-E',
    analystIds: ['bun-e'],
    tone: 'violet',
    accentHex: '#8B5CF6',
  },
];

const ALL_CHANNEL: ChannelMeta = {
  id: 'all',
  label: 'Network Station',
  shortLabel: 'All',
  tagline: 'Every analyst feed loaded into one running station.',
  description: 'Home is now the unified listening deck. Draft work lives in Draft Desk, but every playable podcaster episode lands here first.',
  host: 'Per|Form Radio Desk',
  analystIds: [],
  tone: 'gold',
  accentHex: '#D4A853',
};

const CHANNEL_OPTIONS = [ALL_CHANNEL, ...NETWORK_CHANNELS] as const;

const CHANNEL_LOOKUP = new Map(
  NETWORK_CHANNELS.flatMap((channel) =>
    channel.analystIds.map((analystId) => [analystId, channel] as const),
  ),
);

const SURFACE_CARDS = [
  {
    id: 'draft',
    tone: 'gold' as const,
    label: 'Draft Desk',
    href: PLATFORM_ROUTES.draftHub,
    title: 'Current-class editorial front door',
    description: 'The draft homepage now lives at /draft. Rankings, wire coverage, and the 2026 board start there.',
  },
  {
    id: 'shows',
    tone: 'blue' as const,
    label: 'Shows',
    href: PLATFORM_ROUTES.shows,
    title: 'Individual program pages',
    description: 'Use the dedicated show surface when you want one channel at a time instead of the whole station queue.',
  },
  {
    id: 'players',
    tone: 'red' as const,
    label: 'Player Index',
    href: PLATFORM_ROUTES.playerIndex,
    title: 'All-class research stays separate',
    description: 'Historical and cross-class player research remains isolated from draft routing so the platform stays clean.',
  },
  {
    id: 'studio',
    tone: 'amber' as const,
    label: 'Studio',
    href: PLATFORM_ROUTES.studio,
    title: 'Live segments and debate formats',
    description: 'Open the studio when the queue turns into on-camera programming, roundtables, and generated debate segments.',
  },
];

function getChannelMeta(analystId: string): ChannelMeta {
  return CHANNEL_LOOKUP.get(analystId) ?? NETWORK_CHANNELS[0];
}

function formatDuration(seconds: number): string {
  if (!seconds || !Number.isFinite(seconds)) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function formatDate(dateString: string): string {
  if (!dateString) return 'Recent';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function timeAgo(dateString?: string): string {
  if (!dateString) return 'just updated';

  const elapsed = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(elapsed / 60000);

  if (minutes < 1) return 'just updated';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function summarizeText(value: string | null | undefined, fallback: string): string {
  const normalized = (value ?? '').replace(/\s+/g, ' ').trim();
  const base = normalized || fallback;

  if (base.length <= 220) {
    return base;
  }

  return `${base.slice(0, 217).trimEnd()}...`;
}

function playerProfileHref(player: ProspectPreview): string {
  const params = new URLSearchParams();

  if (player.class_year) {
    params.set('class_year', player.class_year);
  }

  const query = params.toString();
  return `/players/${encodeURIComponent(player.name)}${query ? `?${query}` : ''}`;
}

export default function HomePage() {
  const audio = useAudioPlayer();
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [prospects, setProspects] = useState<ProspectPreview[]>([]);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [tweets, setTweets] = useState<FeedTweet[]>([]);
  const [wireUpdatedAt, setWireUpdatedAt] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<string>(ALL_CHANNEL.id);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadHomeDeck() {
      setLoading(true);

      const [episodesResult, prospectsResult, newsResult, feedResult] = await Promise.allSettled([
        fetch('/api/podcast/episodes', { cache: 'no-store' }),
        fetch(
          `/api/players?class_year=${encodeURIComponent(CURRENT_DRAFT_CLASS_YEAR)}&sort=overall_rank:asc&limit=6`,
          { cache: 'no-store' },
        ),
        fetch('/api/news', { cache: 'no-store' }),
        fetch('/api/feed', { cache: 'no-store' }),
      ]);

      if (!active) {
        return;
      }

      if (episodesResult.status === 'fulfilled') {
        try {
          const data = await episodesResult.value.json();
          setEpisodes(data.episodes ?? []);
        } catch {
          setEpisodes([]);
        }
      } else {
        setEpisodes([]);
      }

      if (prospectsResult.status === 'fulfilled') {
        try {
          const data = await prospectsResult.value.json();
          setProspects(data.players ?? []);
        } catch {
          setProspects([]);
        }
      } else {
        setProspects([]);
      }

      if (newsResult.status === 'fulfilled') {
        try {
          const data = await newsResult.value.json();
          setArticles(data.articles ?? []);
          setWireUpdatedAt(data.updatedAt ?? '');
        } catch {
          setArticles([]);
          setWireUpdatedAt('');
        }
      } else {
        setArticles([]);
        setWireUpdatedAt('');
      }

      if (feedResult.status === 'fulfilled') {
        try {
          const data = await feedResult.value.json();
          setTweets(data.tweets ?? []);
        } catch {
          setTweets([]);
        }
      } else {
        setTweets([]);
      }

      setLoading(false);
    }

    loadHomeDeck();

    return () => {
      active = false;
    };
  }, []);

  const selectedChannelMeta = useMemo(
    () => CHANNEL_OPTIONS.find((channel) => channel.id === selectedChannel) ?? ALL_CHANNEL,
    [selectedChannel],
  );

  const channelCounts = useMemo(() => {
    const counts: Record<string, { total: number; playable: number }> = {
      [ALL_CHANNEL.id]: {
        total: episodes.length,
        playable: episodes.filter((episode) => Boolean(episode.audio_url)).length,
      },
    };

    for (const channel of NETWORK_CHANNELS) {
      const channelEpisodes = episodes.filter((episode) => channel.analystIds.includes(episode.analyst_id));
      counts[channel.id] = {
        total: channelEpisodes.length,
        playable: channelEpisodes.filter((episode) => Boolean(episode.audio_url)).length,
      };
    }

    return counts;
  }, [episodes]);

  const filteredEpisodes = useMemo(() => {
    const source =
      selectedChannel === ALL_CHANNEL.id
        ? episodes
        : episodes.filter((episode) => selectedChannelMeta.analystIds.includes(episode.analyst_id));

    return [...source].sort(
      (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
    );
  }, [episodes, selectedChannel, selectedChannelMeta]);

  const playableQueue = useMemo(
    () => filteredEpisodes.filter((episode) => Boolean(episode.audio_url)),
    [filteredEpisodes],
  );

  const playableAudioQueue = useMemo(
    () =>
      playableQueue.map((episode) => {
        const channel = getChannelMeta(episode.analyst_id);

        return {
          id: episode.id,
          title: episode.title,
          analyst: channel.host,
          analystColor: channel.accentHex,
          audioUrl: episode.audio_url,
          duration: episode.duration_seconds,
        } satisfies AudioEpisode;
      }),
    [playableQueue],
  );

  const currentEpisodeDetail = useMemo(() => {
    if (!audio.currentEpisode) return null;
    return episodes.find((episode) => episode.id === audio.currentEpisode?.id) ?? null;
  }, [audio.currentEpisode, episodes]);

  const queueMatchesCurrentSelection = useMemo(() => {
    if (audio.queue.length === 0) {
      return false;
    }

    if (audio.queue.length !== playableAudioQueue.length) {
      return false;
    }

    return audio.queue.every((episode, index) => episode.id === playableAudioQueue[index]?.id);
  }, [audio.queue, playableAudioQueue]);

  const queueContainsCurrent = Boolean(
    queueMatchesCurrentSelection &&
      currentEpisodeDetail &&
      playableQueue.some((episode) => episode.id === currentEpisodeDetail.id),
  );

  const activeQueueIndex = useMemo(() => {
    if (queueContainsCurrent && currentEpisodeDetail) {
      return playableQueue.findIndex((episode) => episode.id === currentEpisodeDetail.id);
    }

    return playableQueue.length > 0 ? 0 : -1;
  }, [currentEpisodeDetail, playableQueue, queueContainsCurrent]);

  const stationEpisode =
    (queueContainsCurrent ? currentEpisodeDetail : null) ??
    playableQueue[0] ??
    filteredEpisodes[0] ??
    currentEpisodeDetail;

  const stationChannel = stationEpisode ? getChannelMeta(stationEpisode.analyst_id) : selectedChannelMeta;
  const stationSummary = stationEpisode
    ? summarizeText(stationEpisode.transcript, stationChannel.description)
    : 'The unified station queue will populate here as soon as playable podcaster content is available.';

  const totalQueueMinutes = useMemo(
    () => Math.round(playableQueue.reduce((sum, episode) => sum + (episode.duration_seconds || 0), 0) / 60),
    [playableQueue],
  );

  const featuredArticle = articles[0] ?? null;
  const secondaryArticles = articles.slice(1, 5);
  const topProspects = prospects.slice(0, 5);
  const pulseItems = tweets.slice(0, 4);
  const upcomingQueue = activeQueueIndex >= 0 ? playableQueue.slice(activeQueueIndex + 1, activeQueueIndex + 4) : [];

  const playEpisodeAtIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= playableAudioQueue.length) return;
      audio.playCollection(playableAudioQueue, index);
    },
    [audio, playableAudioQueue],
  );

  const handlePrimaryAction = useCallback(() => {
    if (queueContainsCurrent && audio.currentEpisode) {
      audio.togglePlay();
      return;
    }

    if (playableAudioQueue[0]) {
      playEpisodeAtIndex(0);
    }
  }, [audio, playEpisodeAtIndex, playableAudioQueue, queueContainsCurrent]);

  const playPrevious = useCallback(() => {
    if (activeQueueIndex <= 0) return;
    playEpisodeAtIndex(activeQueueIndex - 1);
  }, [activeQueueIndex, playEpisodeAtIndex]);

  const playNext = useCallback(() => {
    if (activeQueueIndex < 0 || activeQueueIndex >= playableAudioQueue.length - 1) return;
    playEpisodeAtIndex(activeQueueIndex + 1);
  }, [activeQueueIndex, playEpisodeAtIndex, playableAudioQueue.length]);

  const isStationPlaying = queueContainsCurrent && audio.isPlaying;
  const canPlayStation = playableQueue.length > 0;

  return (
    <div className={styles.pageShell}>
      <div className={styles.ambientGlow} />
      <div className={styles.gridLines} />

      <Header />

      <main className="relative z-10 pb-28">
        <section className="max-w-7xl mx-auto px-4 md:px-6 pt-10 md:pt-16">
          <div className={styles.heroGrid}>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className={styles.heroCard}
            >
              <div className={styles.kickerRow}>
                <span className={styles.kickerPill}>
                  <Radio className="w-3.5 h-3.5" />
                  Per|Form Network HQ
                </span>
                <span className={styles.kickerMeta}>Home now owns the station. Draft lives at /draft.</span>
              </div>

              <h1 className={styles.heroTitle}>
                One station for every podcaster episode. One front door for the whole Per|Form network.
              </h1>

              <p className={styles.heroCopy}>
                The old home page was acting like a draft-event promo. This surface now behaves like the editorial and audio desk: the latest network queue, the current-class snapshot, and the live wire all in one place.
              </p>

              <div className={styles.actionRow}>
                <button
                  type="button"
                  onClick={handlePrimaryAction}
                  disabled={!canPlayStation}
                  className={styles.primaryAction}
                >
                  {isStationPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isStationPlaying ? 'Pause station' : canPlayStation ? 'Play station' : 'Queue empty'}
                </button>

                <Link href={PLATFORM_ROUTES.draftHub} className={styles.secondaryAction}>
                  Open Draft Desk
                </Link>

                <Link href={PLATFORM_ROUTES.shows} className={styles.ghostAction}>
                  Browse all shows
                </Link>
              </div>

              <div className={styles.metricGrid}>
                <div className={styles.metricCard}>
                  <span className={styles.metricLabel}>Playable queue</span>
                  <strong className={styles.metricValue}>{channelCounts[selectedChannel]?.playable ?? 0}</strong>
                  <span className={styles.metricHint}>Episodes ready for the shared audio player</span>
                </div>

                <div className={styles.metricCard}>
                  <span className={styles.metricLabel}>Network shows</span>
                  <strong className={styles.metricValue}>{NETWORK_CHANNELS.length}</strong>
                  <span className={styles.metricHint}>Distinct analyst channels feeding the home desk</span>
                </div>

                <div className={styles.metricCard}>
                  <span className={styles.metricLabel}>{CURRENT_DRAFT_CLASS_YEAR} board</span>
                  <strong className={styles.metricValue}>{topProspects.length}</strong>
                  <span className={styles.metricHint}>Current-class preview cards pulled into home</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.52, delay: 0.08 }}
              className={styles.stationCard}
              data-tone={stationChannel.tone}
            >
              <div className={styles.stationTopRow}>
                <div>
                  <p className={styles.stationLabel}>Unified station player</p>
                  <p className={styles.stationMetaLine}>{selectedChannelMeta.label} selected</p>
                </div>

                <div className={styles.stationStatusCluster}>
                  <span className={styles.liveBadge}>
                    <span className="w-2 h-2 rounded-full live-pulse bg-emerald-400" />
                    Queue live
                  </span>
                  <span className={styles.stationQueuePill}>{totalQueueMinutes} min deck</span>
                </div>
              </div>

              <div className={styles.stationFeature} data-tone={stationChannel.tone}>
                <div className={styles.stationFeatureMeta}>
                  <span className={styles.showTag} data-tone={stationChannel.tone}>{stationChannel.shortLabel}</span>
                  <span className={styles.stationTimestamp}>
                    {stationEpisode ? formatDate(stationEpisode.created_at) : 'Awaiting latest drop'}
                  </span>
                </div>

                <h2 className={styles.stationTitle}>
                  {stationEpisode?.title ?? 'No episode queued yet'}
                </h2>

                <p className={styles.stationHost}>{stationChannel.host}</p>
                <p className={styles.stationSummary}>{stationSummary}</p>

                <div className={styles.transportRow}>
                  <button
                    type="button"
                    onClick={playPrevious}
                    disabled={activeQueueIndex <= 0}
                    className={styles.transportButton}
                    aria-label="Play previous episode"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handlePrimaryAction}
                    disabled={!canPlayStation}
                    className={styles.transportButtonPrimary}
                    aria-label={isStationPlaying ? 'Pause station queue' : 'Play station queue'}
                  >
                    {isStationPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>

                  <button
                    type="button"
                    onClick={playNext}
                    disabled={activeQueueIndex < 0 || activeQueueIndex >= playableQueue.length - 1}
                    className={styles.transportButton}
                    aria-label="Play next episode"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>

                <div className={styles.stationStatRow}>
                  <span className={styles.stationStatBadge}>
                    <Mic2 className="w-3.5 h-3.5" />
                    {channelCounts[selectedChannel]?.total ?? 0} items in this channel
                  </span>
                  <span className={styles.stationStatBadge}>
                    <Clock3 className="w-3.5 h-3.5" />
                    {stationEpisode ? formatDuration(stationEpisode.duration_seconds) : '0:00'} latest runtime
                  </span>
                </div>
              </div>

              <div className={styles.upNextBlock}>
                <div className={styles.blockHeader}>
                  <span>Up next in queue</span>
                  <Link href={PLATFORM_ROUTES.shows} className={styles.inlineLink}>
                    Full shows view
                  </Link>
                </div>

                {upcomingQueue.length > 0 ? (
                  <div className={styles.upNextList}>
                    {upcomingQueue.map((episode) => {
                      const channel = getChannelMeta(episode.analyst_id);

                      return (
                        <button
                          key={episode.id}
                          type="button"
                          onClick={() => {
                            const queueIndex = playableQueue.findIndex((item) => item.id === episode.id);
                            if (queueIndex >= 0) {
                              playEpisodeAtIndex(queueIndex);
                            }
                          }}
                          className={styles.upNextRow}
                          data-tone={channel.tone}
                        >
                          <div className={styles.upNextCopy}>
                            <span className={styles.upNextHost}>{channel.host}</span>
                            <span className={styles.upNextTitle}>{episode.title}</span>
                          </div>
                          <span className={styles.upNextDuration}>{formatDuration(episode.duration_seconds)}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles.emptyPanelNote}>
                    Queue another channel or open the shows page for a deeper catalog.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 md:px-6 mt-8">
          <div className={styles.channelStrip}>
            {CHANNEL_OPTIONS.map((channel) => {
              const counts = channelCounts[channel.id] ?? { total: 0, playable: 0 };

              return (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => setSelectedChannel(channel.id)}
                  className={styles.channelChip}
                  data-tone={channel.tone}
                  data-active={selectedChannel === channel.id}
                >
                  <div>
                    <p className={styles.channelChipTitle}>{channel.label}</p>
                    <p className={styles.channelChipCopy}>{channel.tagline}</p>
                  </div>

                  <div className={styles.channelChipMeta}>
                    <span>{counts.playable} playable</span>
                    <span>{counts.total} total</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 md:px-6 mt-8 md:mt-10">
          <div className={styles.mainGrid}>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45 }}
              className={styles.playlistPanel}
            >
              <div className={styles.panelHeadingRow}>
                <div>
                  <p className={styles.sectionEyebrow}>Network playlist</p>
                  <h3 className={styles.sectionTitle}>{selectedChannelMeta.label}</h3>
                  <p className={styles.sectionCopy}>
                    {selectedChannelMeta.description}
                  </p>
                </div>

                <Link href={PLATFORM_ROUTES.shows} className={styles.inlineLink}>
                  Open program pages
                </Link>
              </div>

              {loading ? (
                <div className={styles.emptyState}>Loading the latest station deck...</div>
              ) : filteredEpisodes.length === 0 ? (
                <div className={styles.emptyState}>
                  No network items are available for this channel yet.
                </div>
              ) : (
                <div className={styles.episodeList}>
                  {filteredEpisodes.slice(0, 8).map((episode, index) => {
                    const channel = getChannelMeta(episode.analyst_id);
                    const isActive = audio.currentEpisode?.id === episode.id;
                    const isPlaying = isActive && audio.isPlaying;

                    return (
                      <article
                        key={episode.id}
                        className={styles.episodeRow}
                        data-tone={channel.tone}
                        data-active={isActive}
                      >
                        <div className={styles.episodeIndex}>{String(index + 1).padStart(2, '0')}</div>

                        <div className={styles.episodeBody}>
                          <div className={styles.episodeTopLine}>
                            <span className={styles.showBadge} data-tone={channel.tone}>
                              {channel.shortLabel}
                            </span>
                            <span className={styles.episodeType}>{episode.type.replace(/_/g, ' ')}</span>
                            {isPlaying ? <span className={styles.playingBadge}>Now playing</span> : null}
                          </div>

                          <h4 className={styles.episodeTitle}>{episode.title}</h4>
                          <p className={styles.episodeMetaLine}>
                            {channel.host} · {formatDuration(episode.duration_seconds)} · {formatDate(episode.created_at)}
                          </p>

                          <p className={styles.episodeSummary}>
                            {summarizeText(episode.transcript, channel.tagline)}
                          </p>
                        </div>

                        {episode.audio_url ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (isActive) {
                                audio.togglePlay();
                                return;
                              }

                              const queueIndex = playableQueue.findIndex((item) => item.id === episode.id);
                              if (queueIndex >= 0) {
                                playEpisodeAtIndex(queueIndex);
                              }
                            }}
                            className={styles.episodePlayButton}
                            aria-label={isPlaying ? 'Pause episode' : 'Play episode'}
                          >
                            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </button>
                        ) : (
                          <div className={styles.scriptBadge}>Script</div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </motion.div>

            <div className={styles.sideRail}>
              <motion.section
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45 }}
                className={styles.sideCard}
              >
                <div className={styles.panelHeadingRow}>
                  <div>
                    <p className={styles.sectionEyebrow}>Draft wire</p>
                    <h3 className={styles.sectionTitle}>What moved today</h3>
                  </div>
                  <span className={styles.inlineMeta}>{timeAgo(wireUpdatedAt)}</span>
                </div>

                {featuredArticle ? (
                  <>
                    <a
                      href={featuredArticle.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.featuredStory}
                    >
                      <span className={styles.featuredSource}>{featuredArticle.source}</span>
                      <h4 className={styles.featuredTitle}>{featuredArticle.title}</h4>
                      <span className={styles.featuredLink}>
                        Open story <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </a>

                    <div className={styles.storyList}>
                      {secondaryArticles.map((article) => (
                        <a
                          key={article.url}
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.storyRow}
                        >
                          <div>
                            <p className={styles.storySource}>{article.source}</p>
                            <p className={styles.storyTitle}>{article.title}</p>
                          </div>
                          <span className={styles.storyTime}>{timeAgo(article.publishedAt)}</span>
                        </a>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className={styles.emptyPanelNote}>Fresh draft reporting will land here when the wire updates.</div>
                )}
              </motion.section>

              <motion.section
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: 0.05 }}
                className={styles.sideCard}
              >
                <div className={styles.panelHeadingRow}>
                  <div>
                    <p className={styles.sectionEyebrow}>{CURRENT_DRAFT_CLASS_YEAR} snapshot</p>
                    <h3 className={styles.sectionTitle}>Current-class board</h3>
                  </div>
                  <Link href={PLATFORM_ROUTES.draftBoard} className={styles.inlineLink}>
                    Full board
                  </Link>
                </div>

                {topProspects.length > 0 ? (
                  <div className={styles.prospectList}>
                    {topProspects.map((player) => (
                      <Link key={player.id} href={playerProfileHref(player)} className={styles.prospectRow}>
                        <span className={styles.prospectRank}>#{player.overall_rank ?? '-'}</span>
                        <span className={styles.prospectIdentity}>
                          <strong>{player.name}</strong>
                          <span>{player.position} · {player.school}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyPanelNote}>Prospect previews will appear here once the public board is populated.</div>
                )}
              </motion.section>

              <motion.section
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: 0.08 }}
                className={styles.sideCard}
              >
                <div className={styles.panelHeadingRow}>
                  <div>
                    <p className={styles.sectionEyebrow}>Insider pulse</p>
                    <h3 className={styles.sectionTitle}>Social motion</h3>
                  </div>
                  <span className={styles.inlineMeta}>{pulseItems.length} posts</span>
                </div>

                {pulseItems.length > 0 ? (
                  <div className={styles.pulseList}>
                    {pulseItems.map((tweet) => (
                      <div key={tweet.id} className={styles.pulseRow}>
                        <div className={styles.pulseMetaRow}>
                          <span className={styles.pulseAuthor}>{tweet.authorName}</span>
                          <span className={styles.pulseHandle}>@{tweet.authorUsername}</span>
                          <span className={styles.pulseTime}>{timeAgo(tweet.createdAt)}</span>
                        </div>
                        <p className={styles.pulseText}>{tweet.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyPanelNote}>Insider posts will populate here when the feed service has data.</div>
                )}
              </motion.section>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 md:px-6 mt-10 md:mt-12">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.45 }}
            className={styles.surfaceHeader}
          >
            <div>
              <p className={styles.sectionEyebrow}>Platform map</p>
              <h3 className={styles.sectionTitle}>Each tab has a defined job now</h3>
            </div>
            <p className={styles.sectionCopy}>
              Home is the station. Draft is the current-class desk. Players remains research. Shows stays channel-first.
            </p>
          </motion.div>

          <div className={styles.surfaceGrid}>
            {SURFACE_CARDS.map((card) => (
              <Link
                key={card.id}
                href={card.href}
                className={styles.surfaceCard}
                data-tone={card.tone}
              >
                <span className={styles.surfaceLabel}>{card.label}</span>
                <h4 className={styles.surfaceTitle}>{card.title}</h4>
                <p className={styles.surfaceCopy}>{card.description}</p>
                <span className={styles.surfaceLink}>
                  Open surface <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 md:px-6 mt-10 md:mt-12">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.45 }}
            className={styles.commandDeck}
          >
            <div>
              <p className={styles.sectionEyebrow}>Control room note</p>
              <h3 className={styles.commandTitle}>The home page now routes attention correctly.</h3>
              <p className={styles.commandCopy}>
                Use the station to listen across every podcaster feed, jump into the {CURRENT_DRAFT_CLASS_YEAR} board when you need the live class, and keep the Player Index for broader football research that should never be trapped inside draft navigation.
              </p>
            </div>

            <div className={styles.commandActions}>
              <Link href={PLATFORM_ROUTES.draftSimulation} className={styles.commandPrimary}>
                Launch simulation
              </Link>
              <Link href={PLATFORM_ROUTES.playerIndex} className={styles.commandSecondary}>
                Open Player Index
              </Link>
              <Link href={PLATFORM_ROUTES.dashboard} className={styles.commandSecondary}>
                View dashboard
              </Link>
            </div>
          </motion.div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
