'use client';

import { useState, useCallback, useRef } from 'react';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Minimize2,
  Maximize2,
  X,
} from 'lucide-react';

const SPEEDS = [1, 1.25, 1.5, 2];

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function AudioPlayer() {
  const {
    currentEpisode,
    queue,
    queueIndex,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    togglePlay,
    playNextInQueue,
    playPreviousInQueue,
    seek,
    setSpeed,
    skipForward,
    skipBack,
    stop,
  } = useAudioPlayer();

  const [minimized, setMinimized] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const bar = progressRef.current;
      if (!bar || !duration) return;
      const rect = bar.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      seek(pct * duration);
    },
    [duration, seek],
  );

  const cycleSpeed = useCallback(() => {
    const idx = SPEEDS.indexOf(playbackRate);
    const next = SPEEDS[(idx + 1) % SPEEDS.length];
    setSpeed(next);
  }, [playbackRate, setSpeed]);

  // Hidden when no episode
  if (!currentEpisode) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const queueHasPrevious = queueIndex > 0;
  const queueHasNext = queueIndex >= 0 && queueIndex < queue.length - 1;
  const useQueueTransport = queue.length > 0 && queueIndex >= 0;

  const handleBack = useCallback(() => {
    if (useQueueTransport) {
      playPreviousInQueue();
      return;
    }

    skipBack();
  }, [playPreviousInQueue, skipBack, useQueueTransport]);

  const handleForward = useCallback(() => {
    if (useQueueTransport) {
      playNextInQueue();
      return;
    }

    skipForward();
  }, [playNextInQueue, skipForward, useQueueTransport]);

  const backDisabled = useQueueTransport ? !queueHasPrevious : false;
  const forwardDisabled = useQueueTransport ? !queueHasNext : false;
  const backTitle = useQueueTransport ? 'Previous episode' : 'Back 15s';
  const forwardTitle = useQueueTransport ? 'Next episode' : 'Forward 15s';

  // Minimized bar
  if (minimized) {
    return (
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-3 px-4"
        style={{
          height: 40,
          background: '#0A0E1A',
          borderTop: '1px solid rgba(212,168,83,0.15)',
        }}
      >
        {/* Progress thin line at top */}
        <div
          className="absolute top-0 left-0 h-[2px]"
          style={{
            width: `${progress}%`,
            background: '#D4A853',
            transition: 'width 0.3s linear',
          }}
        />

        <button
          onClick={togglePlay}
          className="shrink-0 w-6 h-6 flex items-center justify-center"
          style={{ color: '#D4A853' }}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>

        <span className="text-[11px] font-mono text-white/60 truncate flex-1">
          <span style={{ color: currentEpisode.analystColor }}>{currentEpisode.analyst}</span>
          <span className="text-white/20 mx-1.5">/</span>
          {currentEpisode.title}
        </span>

        <span className="text-[10px] font-mono text-white/30 shrink-0">
          {formatTime(currentTime)}
        </span>

        <button
          onClick={() => setMinimized(false)}
          className="shrink-0 w-6 h-6 flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
        >
          <Maximize2 size={12} />
        </button>
      </div>
    );
  }

  // Expanded bar
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        height: 64,
        background: '#0A0E1A',
        borderTop: '1px solid rgba(212,168,83,0.15)',
      }}
    >
      {/* Clickable progress bar */}
      <div
        ref={progressRef}
        onClick={handleProgressClick}
        className="absolute top-0 left-0 right-0 h-[3px] cursor-pointer group"
        style={{ background: 'rgba(255,255,255,0.08)' }}
      >
        <div
          className="h-full relative"
          style={{
            width: `${progress}%`,
            background: '#D4A853',
            transition: 'width 0.3s linear',
          }}
        >
          {/* Scrubber dot on hover */}
          <div
            className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: '#D4A853', boxShadow: '0 0 6px rgba(212,168,83,0.5)' }}
          />
        </div>
      </div>

      <div className="flex items-center h-full px-4 gap-3 pt-[3px]">
        {/* Episode info */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <p className="text-[11px] font-semibold text-white/85 truncate leading-tight">
            {currentEpisode.title}
          </p>
          <p className="text-[10px] font-mono truncate leading-tight" style={{ color: currentEpisode.analystColor }}>
            {currentEpisode.analyst}
          </p>
        </div>

        {/* Transport controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleBack}
            disabled={backDisabled}
            className="w-8 h-8 flex items-center justify-center rounded-full text-white/40 hover:text-white/70 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title={backTitle}
          >
            <SkipBack size={14} />
          </button>

          <button
            onClick={togglePlay}
            className="w-10 h-10 flex items-center justify-center rounded-full transition-all"
            style={{
              background: 'rgba(212,168,83,0.15)',
              border: '1px solid rgba(212,168,83,0.3)',
              color: '#D4A853',
            }}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
          </button>

          <button
            onClick={handleForward}
            disabled={forwardDisabled}
            className="w-8 h-8 flex items-center justify-center rounded-full text-white/40 hover:text-white/70 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title={forwardTitle}
          >
            <SkipForward size={14} />
          </button>
        </div>

        {/* Time + speed + controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-[10px] font-mono text-white/40 tabular-nums w-[72px] text-center">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <button
            onClick={cycleSpeed}
            className="text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors"
            style={{
              background: playbackRate !== 1 ? 'rgba(212,168,83,0.15)' : 'rgba(255,255,255,0.05)',
              color: playbackRate !== 1 ? '#D4A853' : 'rgba(255,255,255,0.4)',
              border: `1px solid ${playbackRate !== 1 ? 'rgba(212,168,83,0.3)' : 'rgba(255,255,255,0.08)'}`,
            }}
            title="Playback speed"
          >
            {playbackRate}x
          </button>

          <button
            onClick={() => setMinimized(true)}
            className="w-6 h-6 flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
            title="Minimize"
          >
            <Minimize2 size={12} />
          </button>

          <button
            onClick={stop}
            className="w-6 h-6 flex items-center justify-center text-white/30 hover:text-red-400/70 transition-colors"
            title="Close"
          >
            <X size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
