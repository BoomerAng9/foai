'use client';

import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  AbsoluteFill,
} from 'remotion';

export const Scene1Platform: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Frame 0-60: Logo materializes with scale spring
  const logoScale = spring({ frame, fps, config: { damping: 12, stiffness: 80 } });
  const logoOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });

  // Frame 60-200: Tagline fades in
  const taglineOpacity = interpolate(frame, [60, 100], [0, 1], { extrapolateRight: 'clamp' });
  const taglineY = interpolate(frame, [60, 100], [20, 0], { extrapolateRight: 'clamp' });

  // Frame 200-400: List items appear one by one
  const listItems = ['Research.', 'Build.', 'Deploy.', 'Monitor.'];
  const listStart = 200;
  const listGap = 50;

  // Frame 400-600: Bottom text
  const bottomTextOpacity = interpolate(frame, [400, 440], [0, 1], { extrapolateRight: 'clamp' });
  const bottomTextY = interpolate(frame, [400, 440], [30, 0], { extrapolateRight: 'clamp' });

  // Frame 600-750: Logo pulses with glow
  const pulsePhase = interpolate(frame, [600, 750], [0, Math.PI * 4], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const glowIntensity = frame >= 600 ? 0.5 + 0.5 * Math.sin(pulsePhase) : 0;

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
      {/* Terminal icon / logo */}
      <div
        style={{
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
          width: 120,
          height: 120,
          borderRadius: 24,
          backgroundColor: '#E8A020',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 40,
          boxShadow: frame >= 600
            ? `0 0 ${30 + glowIntensity * 40}px rgba(232, 160, 32, ${0.3 + glowIntensity * 0.4})`
            : '0 0 30px rgba(232, 160, 32, 0.3)',
        }}
      >
        <span style={{ fontSize: 60, color: '#0A0A0A', fontWeight: 700 }}>&gt;_</span>
      </div>

      {/* Tagline */}
      {frame >= 60 && (
        <div
          style={{
            opacity: taglineOpacity,
            transform: `translateY(${taglineY}px)`,
            fontSize: 48,
            color: '#FFFFFF',
            fontWeight: 600,
            marginBottom: 50,
            textAlign: 'center',
          }}
        >
          An AI-native application factory
        </div>
      )}

      {/* Animated list */}
      {frame >= listStart && (
        <div style={{ display: 'flex', gap: 40, marginBottom: 50 }}>
          {listItems.map((item, i) => {
            const itemFrame = listStart + i * listGap;
            const itemOpacity = interpolate(frame, [itemFrame, itemFrame + 30], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const itemY = interpolate(frame, [itemFrame, itemFrame + 30], [20, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            return (
              <span
                key={item}
                style={{
                  opacity: itemOpacity,
                  transform: `translateY(${itemY}px)`,
                  fontSize: 36,
                  color: '#E8A020',
                  fontWeight: 700,
                }}
              >
                {item}
              </span>
            );
          })}
        </div>
      )}

      {/* Bottom text */}
      {frame >= 400 && (
        <div
          style={{
            opacity: bottomTextOpacity,
            transform: `translateY(${bottomTextY}px)`,
            fontSize: 32,
            color: '#CCCCCC',
            textAlign: 'center',
            maxWidth: 800,
          }}
        >
          From conversation to production — no devops required
        </div>
      )}
    </AbsoluteFill>
  );
};
