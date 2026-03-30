'use client';

import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  AbsoluteFill,
} from 'remotion';

export const Scene6cScale: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({ frame: Math.max(0, frame - 30), fps, config: { damping: 10 } });
  const titleOpacity = interpolate(frame, [30, 80], [0, 1], { extrapolateRight: 'clamp' });

  const subtitleOpacity = interpolate(frame, [150, 200], [0, 1], { extrapolateRight: 'clamp' });
  const subtitleY = interpolate(frame, [150, 200], [20, 0], { extrapolateRight: 'clamp' });

  const glowPulse = interpolate(frame, [300, 750], [0, Math.PI * 6], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const glowIntensity = frame >= 300 ? 0.3 + 0.3 * Math.sin(glowPulse) : 0;

  const tagOpacity = interpolate(frame, [400, 450], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0A0A0A',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"SF Mono", "Fira Code", "Cascadia Code", monospace',
      }}
    >
      <div
        style={{
          opacity: titleOpacity,
          transform: `scale(${titleScale})`,
          fontSize: 72,
          color: '#E8A020',
          fontWeight: 700,
          textAlign: 'center',
          textShadow: `0 0 ${20 + glowIntensity * 30}px rgba(232, 160, 32, ${glowIntensity})`,
          marginBottom: 30,
        }}
      >
        Scale to the Moon
      </div>

      {frame >= 150 && (
        <div
          style={{
            opacity: subtitleOpacity,
            transform: `translateY(${subtitleY}px)`,
            fontSize: 28,
            color: '#CCCCCC',
            textAlign: 'center',
            maxWidth: 700,
          }}
        >
          Deploy handles infrastructure so you can focus on growth
        </div>
      )}

      {frame >= 400 && (
        <div
          style={{
            opacity: tagOpacity,
            fontSize: 18,
            color: '#666',
            marginTop: 60,
            padding: '8px 20px',
            border: '1px solid #333',
            borderRadius: 20,
          }}
        >
          NotebookLM cinematic — coming soon
        </div>
      )}
    </AbsoluteFill>
  );
};
