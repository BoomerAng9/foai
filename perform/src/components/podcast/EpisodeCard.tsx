'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Play, Pause, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { useAudioPlayer, type AudioEpisode } from '@/context/AudioPlayerContext';

interface EpisodeCardProps {
  episode: {
    id: number;
    analyst_id: string;
    title: string;
    transcript: string;
    audio_url: string | null;
    duration_seconds: number;
    type: string;
    created_at: string;
  };
  meta: {
    name: string;
    color: string;
    imagePath: string;
  };
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function typeLabel(t: string): string {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function EpisodeCard({ episode, meta }: EpisodeCardProps) {
  const { currentEpisode, isPlaying, play, togglePlay } = useAudioPlayer();
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  const isActive = currentEpisode?.id === episode.id;
  const isCurrentlyPlaying = isActive && isPlaying;
  const hasAudio = !!episode.audio_url;

  function handlePlay() {
    if (isActive) {
      togglePlay();
      return;
    }

    if (!hasAudio) return;

    const audioEpisode: AudioEpisode = {
      id: episode.id,
      title: episode.title,
      analyst: meta.name,
      analystColor: meta.color,
      audioUrl: episode.audio_url,
      duration: episode.duration_seconds,
    };
    play(audioEpisode);
  }

  return (
    <div
      className="rounded-lg p-4 transition-all"
      style={{
        background: isActive
          ? 'rgba(212,168,83,0.06)'
          : 'rgba(255,255,255,0.025)',
        border: `1px solid ${isActive ? 'rgba(212,168,83,0.2)' : 'rgba(255,255,255,0.06)'}`,
      }}
    >
      <div className="flex items-start gap-3">
        {/* Analyst avatar */}
        <div
          className="shrink-0 w-12 h-12 rounded-full overflow-hidden relative"
          style={{ border: `2px solid ${meta.color}44` }}
        >
          {meta.imagePath ? (
            <Image
              src={meta.imagePath}
              alt={meta.name}
              fill
              className="object-cover"
              sizes="48px"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-xs font-bold"
              style={{ background: `${meta.color}22`, color: meta.color }}
            >
              {meta.name[0]}
            </div>
          )}
          {/* Now-playing ring */}
          {isCurrentlyPlaying && (
            <div
              className="absolute inset-0 rounded-full animate-pulse"
              style={{ border: `2px solid ${meta.color}`, opacity: 0.6 }}
            />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-mono font-bold" style={{ color: meta.color }}>
              {meta.name}
            </span>
            <span
              className="text-[9px] font-mono px-1.5 py-0.5 rounded"
              style={{
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.3)',
              }}
            >
              {typeLabel(episode.type)}
            </span>
            {isCurrentlyPlaying && (
              <span
                className="text-[9px] font-mono px-1.5 py-0.5 rounded animate-pulse"
                style={{
                  background: 'rgba(212,168,83,0.15)',
                  color: '#D4A853',
                  border: '1px solid rgba(212,168,83,0.25)',
                }}
              >
                NOW PLAYING
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-white/85 truncate mb-1">
            {episode.title}
          </h3>
          <div className="flex items-center gap-3 text-[10px] font-mono text-white/30">
            <span>{formatDuration(episode.duration_seconds)}</span>
            <span>{formatDate(episode.created_at)}</span>
          </div>
        </div>

        {/* Play button */}
        {hasAudio ? (
          <button
            onClick={handlePlay}
            className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all"
            style={{
              background: isActive
                ? 'rgba(212,168,83,0.2)'
                : 'rgba(255,255,255,0.06)',
              border: `1px solid ${isActive ? 'rgba(212,168,83,0.4)' : 'rgba(255,255,255,0.1)'}`,
            }}
            title={isCurrentlyPlaying ? 'Pause' : 'Play'}
          >
            {isCurrentlyPlaying ? (
              <Pause size={14} style={{ color: '#D4A853' }} />
            ) : (
              <Play size={14} className="ml-0.5" style={{ color: isActive ? '#D4A853' : 'rgba(255,255,255,0.6)' }} />
            )}
          </button>
        ) : (
          <button
            onClick={() => episode.transcript && setTranscriptOpen(!transcriptOpen)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all"
            style={{
              background: 'rgba(167,139,250,0.08)',
              border: '1px solid rgba(167,139,250,0.2)',
            }}
            title={transcriptOpen ? 'Collapse transcript' : 'Read transcript'}
          >
            <FileText size={12} style={{ color: 'rgba(167,139,250,0.7)' }} />
            <span
              className="text-[9px] font-mono font-bold tracking-wider"
              style={{ color: 'rgba(167,139,250,0.7)' }}
            >
              SCRIPT ONLY
            </span>
            {episode.transcript && (
              transcriptOpen
                ? <ChevronUp size={10} style={{ color: 'rgba(167,139,250,0.5)' }} />
                : <ChevronDown size={10} style={{ color: 'rgba(167,139,250,0.5)' }} />
            )}
          </button>
        )}
      </div>

      {/* Expandable transcript when no audio */}
      {!hasAudio && transcriptOpen && episode.transcript && (
        <div
          className="mt-3 pt-3 text-xs text-white/50 leading-relaxed font-mono max-h-64 overflow-y-auto"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          {episode.transcript.split('\n').map((line, i) => (
            <p key={i} className="mb-1">
              {line || '\u00A0'}
            </p>
          ))}
        </div>
      )}

      {/* Expanded transcript when active and playing */}
      {isCurrentlyPlaying && episode.transcript && (
        <div
          className="mt-3 pt-3 text-xs text-white/50 leading-relaxed font-mono max-h-48 overflow-y-auto"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          {episode.transcript.split('\n').map((line, i) => (
            <p key={i} className="mb-1">
              {line || '\u00A0'}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
