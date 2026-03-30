'use client';

import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  AbsoluteFill,
} from 'remotion';

export const Scene7Feedback: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Frame 0-150: "This is a beta"
  const betaOpacity = interpolate(frame, [20, 70], [0, 1], { extrapolateRight: 'clamp' });
  const betaScale = spring({ frame: Math.max(0, frame - 20), fps, config: { damping: 10 } });

  // Frame 150-300: "Push the boundaries"
  const pushOpacity = interpolate(frame, [150, 200], [0, 1], { extrapolateRight: 'clamp' });
  const pushY = interpolate(frame, [150, 200], [20, 0], { extrapolateRight: 'clamp' });

  // Frame 300-500: Animated list
  const listItems = ['Break things.', 'Request features.', "Tell us what's missing."];
  const listStart = 300;
  const listGap = 60;

  // Frame 500-650: Feedback button pulses
  const btnOpacity = interpolate(frame, [500, 530], [0, 1], { extrapolateRight: 'clamp' });
  const btnPulse = frame >= 500 && frame < 650
    ? 1 + 0.04 * Math.sin((frame - 500) * 0.2)
    : 1;

  // Frame 650-750: Thank you + logo
  const thankOpacity = interpolate(frame, [650, 690], [0, 1], { extrapolateRight: 'clamp' });
  const thankY = interpolate(frame, [650, 690], [20, 0], { extrapolateRight: 'clamp' });
  const logoScale = spring({ frame: Math.max(0, frame - 680), fps, config: { damping: 12 } });

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
      {/* "This is a beta" */}
      <div
        style={{
          opacity: betaOpacity,
          transform: `scale(${betaScale})`,
          fontSize: 56,
          color: '#FFFFFF',
          fontWeight: 700,
          marginBottom: 20,
        }}
      >
        This is a beta
      </div>

      {/* "Push the boundaries" */}
      {frame >= 150 && (
        <div
          style={{
            opacity: pushOpacity,
            transform: `translateY(${pushY}px)`,
            fontSize: 36,
            color: '#E8A020',
            fontWeight: 600,
            marginBottom: 50,
          }}
        >
          Push the boundaries
        </div>
      )}

      {/* Animated list */}
      {frame >= listStart && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 50, alignItems: 'center' }}>
          {listItems.map((item, i) => {
            const iFrame = listStart + i * listGap;
            const iOpacity = interpolate(frame, [iFrame, iFrame + 30], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const iX = interpolate(frame, [iFrame, iFrame + 30], [-30, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            return (
              <div
                key={item}
                style={{
                  opacity: iOpacity,
                  transform: `translateX(${iX}px)`,
                  fontSize: 30,
                  color: '#CCCCCC',
                }}
              >
                {item}
              </div>
            );
          })}
        </div>
      )}

      {/* Feedback button */}
      {frame >= 500 && (
        <div
          style={{
            opacity: btnOpacity,
            transform: `scale(${btnPulse})`,
            backgroundColor: '#E8A020',
            color: '#0A0A0A',
            fontSize: 22,
            fontWeight: 700,
            padding: '14px 40px',
            borderRadius: 12,
            marginBottom: 40,
            boxShadow: `0 0 ${15 + 10 * Math.sin((frame - 500) * 0.15)}px rgba(232, 160, 32, 0.4)`,
          }}
        >
          Send Feedback
        </div>
      )}

      {/* Thank you + logo */}
      {frame >= 650 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            style={{
              opacity: thankOpacity,
              transform: `translateY(${thankY}px)`,
              fontSize: 28,
              color: '#CCCCCC',
              marginBottom: 20,
            }}
          >
            Thank you for testing
          </div>
          <div
            style={{
              transform: `scale(${logoScale})`,
              width: 60,
              height: 60,
              borderRadius: 14,
              backgroundColor: '#E8A020',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 30, color: '#0A0A0A', fontWeight: 700 }}>&gt;_</span>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
