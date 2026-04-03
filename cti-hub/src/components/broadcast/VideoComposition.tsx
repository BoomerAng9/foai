'use client';

import { AbsoluteFill, Video, Sequence, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import type { TimelineClip } from './Timeline';

export interface TransitionDef {
  type: 'cut' | 'crossfade' | 'wipe' | 'dissolve' | 'slide';
  duration: number; // frames
}

export interface CompositionProps {
  clips: TimelineClip[];
  transitions: Record<string, TransitionDef>; // keyed by "clipA-clipB"
  fps: number;
  width: number;
  height: number;
}

function CrossfadeTransition({ children, durationInFrames }: { children: React.ReactNode[]; durationInFrames: number }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, durationInFrames], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: 1 - opacity }}>{children[0]}</AbsoluteFill>
      <AbsoluteFill style={{ opacity }}>{children[1]}</AbsoluteFill>
    </AbsoluteFill>
  );
}

function WipeTransition({ children, durationInFrames }: { children: React.ReactNode[]; durationInFrames: number }) {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, durationInFrames], [0, 100], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill>
      <AbsoluteFill>{children[0]}</AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `inset(0 ${100 - progress}% 0 0)` }}>{children[1]}</AbsoluteFill>
    </AbsoluteFill>
  );
}

function SlideTransition({ children, durationInFrames }: { children: React.ReactNode[]; durationInFrames: number }) {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const offset = interpolate(frame, [0, durationInFrames], [width, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill>
      <AbsoluteFill>{children[0]}</AbsoluteFill>
      <AbsoluteFill style={{ transform: `translateX(${offset}px)` }}>{children[1]}</AbsoluteFill>
    </AbsoluteFill>
  );
}

/**
 * Main Remotion composition built from timeline state.
 * Each clip becomes a <Sequence>, transitions are overlapping sequences.
 */
export function BroadcastComposition({ clips, transitions, fps }: CompositionProps) {
  // Sort clips by start time
  const sorted = [...clips].filter(c => c.type === 'video' && c.videoUrl).sort((a, b) => a.startTime - b.startTime);

  if (sorted.length === 0) {
    return (
      <AbsoluteFill style={{ background: '#0A0A0F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', fontSize: 14 }}>No clips to render</p>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {sorted.map((clip, i) => {
        const startFrame = Math.round(clip.startTime * fps);
        const durationFrames = Math.round(clip.duration * fps);
        const nextClip = sorted[i + 1];
        const transKey = nextClip ? `${clip.id}-${nextClip.id}` : null;
        const transition = transKey ? transitions[transKey] : null;

        return (
          <Sequence key={clip.id} from={startFrame} durationInFrames={durationFrames}>
            <AbsoluteFill>
              <Video src={clip.videoUrl!} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}

/**
 * Build Remotion render config from timeline state.
 */
export function buildRenderConfig(clips: TimelineClip[], transitions: Record<string, TransitionDef>, resolution: string) {
  const fps = 30;
  const videoClips = clips.filter(c => c.type === 'video');
  const totalDuration = videoClips.reduce((max, c) => Math.max(max, c.startTime + c.duration), 0);
  const totalFrames = Math.ceil(totalDuration * fps);

  const dims = resolution === '4K UHD' ? { width: 3840, height: 2160 }
    : resolution === '1080p' ? { width: 1920, height: 1080 }
    : { width: 1280, height: 720 };

  return {
    fps,
    durationInFrames: Math.max(totalFrames, 1),
    ...dims,
    clips: videoClips,
    transitions,
  };
}
