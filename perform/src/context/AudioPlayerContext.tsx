'use client';

import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';

export interface AudioEpisode {
  id: number;
  title: string;
  analyst: string;
  analystColor: string;
  audioUrl: string | null;
  duration: number;
}

interface AudioPlayerState {
  currentEpisode: AudioEpisode | null;
  queue: AudioEpisode[];
  queueIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
}

interface AudioPlayerActions {
  play: (episode: AudioEpisode) => void;
  playCollection: (episodes: AudioEpisode[], startIndex?: number) => void;
  playNextInQueue: () => void;
  playPreviousInQueue: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setSpeed: (rate: number) => void;
  skipForward: () => void;
  skipBack: () => void;
  clearQueue: () => void;
  stop: () => void;
}

type AudioPlayerContextValue = AudioPlayerState & AudioPlayerActions;

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  return ctx;
}

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<AudioEpisode | null>(null);
  const [queue, setQueue] = useState<AudioEpisode[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const queueRef = useRef<AudioEpisode[]>([]);
  const queueIndexRef = useRef(-1);
  const playbackRateRef = useRef(1);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    queueIndexRef.current = queueIndex;
  }, [queueIndex]);

  useEffect(() => {
    playbackRateRef.current = playbackRate;
  }, [playbackRate]);

  // Ensure audio element exists
  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const el = new Audio();
      el.preload = 'metadata';
      audioRef.current = el;
    }
    return audioRef.current;
  }, []);

  const playEpisodeInternal = useCallback(
    (episode: AudioEpisode) => {
      const audio = getAudio();

      if (currentEpisode?.id === episode.id && audio.src) {
        audio.play();
        return;
      }

      if (!episode.audioUrl) return;
      const normalizedSrc = /^(https?:|\/)/i.test(episode.audioUrl)
        ? episode.audioUrl
        : `/${episode.audioUrl}`;
      audio.src = normalizedSrc;
      audio.playbackRate = playbackRateRef.current;
      audio.play();
      setCurrentEpisode(episode);
      setCurrentTime(0);
      setDuration(episode.duration || 0);
    },
    [currentEpisode, getAudio],
  );

  const clearQueue = useCallback(() => {
    queueRef.current = [];
    queueIndexRef.current = -1;
    setQueue([]);
    setQueueIndex(-1);
  }, []);

  const playNextInQueue = useCallback(() => {
    const nextIndex = queueIndexRef.current + 1;
    const nextEpisode = queueRef.current[nextIndex];

    if (!nextEpisode) return;

    queueIndexRef.current = nextIndex;
    setQueueIndex(nextIndex);
    playEpisodeInternal(nextEpisode);
  }, [playEpisodeInternal]);

  const playPreviousInQueue = useCallback(() => {
    const previousIndex = queueIndexRef.current - 1;
    const previousEpisode = queueRef.current[previousIndex];

    if (!previousEpisode) return;

    queueIndexRef.current = previousIndex;
    setQueueIndex(previousIndex);
    playEpisodeInternal(previousEpisode);
  }, [playEpisodeInternal]);

  // Sync event listeners
  useEffect(() => {
    const audio = getAudio();

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      const nextEpisode = queueRef.current[queueIndexRef.current + 1];

      if (nextEpisode) {
        queueIndexRef.current = queueIndexRef.current + 1;
        setQueueIndex(queueIndexRef.current);
        playEpisodeInternal(nextEpisode);
        return;
      }

      setIsPlaying(false);
      setCurrentTime(0);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, [getAudio, playEpisodeInternal]);

  const play = useCallback(
    (episode: AudioEpisode) => {
      clearQueue();
      playEpisodeInternal(episode);
    },
    [clearQueue, playEpisodeInternal],
  );

  const playCollection = useCallback(
    (episodes: AudioEpisode[], startIndex = 0) => {
      const playableEpisodes = episodes.filter((episode) => Boolean(episode.audioUrl));
      if (playableEpisodes.length === 0) return;

      const boundedIndex = Math.max(0, Math.min(startIndex, playableEpisodes.length - 1));
      queueRef.current = playableEpisodes;
      queueIndexRef.current = boundedIndex;
      setQueue(playableEpisodes);
      setQueueIndex(boundedIndex);
      playEpisodeInternal(playableEpisodes[boundedIndex]);
    },
    [playEpisodeInternal],
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentEpisode) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }, [currentEpisode]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(time, audio.duration || 0));
  }, []);

  const setSpeed = useCallback((rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  const skipForward = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.min(audio.currentTime + 15, audio.duration || 0);
  }, []);

  const skipBack = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(audio.currentTime - 15, 0);
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = '';
    }
    clearQueue();
    setCurrentEpisode(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [clearQueue]);

  return (
    <AudioPlayerContext.Provider
      value={{
        currentEpisode,
        queue,
        queueIndex,
        isPlaying,
        currentTime,
        duration,
        playbackRate,
        play,
        playCollection,
        playNextInQueue,
        playPreviousInQueue,
        pause,
        togglePlay,
        seek,
        setSpeed,
        skipForward,
        skipBack,
        clearQueue,
        stop,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}
