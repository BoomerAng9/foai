'use client';

import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  AbsoluteFill,
  Img,
  staticFile,
} from 'remotion';

export const Scene2Acheevy: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Frame 0-60: Hero image materializes
  const logoScale = spring({ frame, fps, config: { damping: 12, stiffness: 80 } });
  const logoOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });

  // Frame 0-100: Title slides in
  const titleX = interpolate(frame, [0, 60], [-400, 0], { extrapolateRight: 'clamp' });
  const titleOpacity = interpolate(frame, [0, 60], [0, 1], { extrapolateRight: 'clamp' });

  // Frame 100-250: Subtitle
  const subtitleOpacity = interpolate(frame, [100, 140], [0, 1], { extrapolateRight: 'clamp' });
  const subtitleScale = spring({ frame: Math.max(0, frame - 100), fps, config: { damping: 12 } });

  // Frame 250-400: Chat bubbles
  const userMsgOpacity = interpolate(frame, [250, 280], [0, 1], { extrapolateRight: 'clamp' });
  const userMsgY = interpolate(frame, [250, 280], [20, 0], { extrapolateRight: 'clamp' });

  const botMsgOpacity = interpolate(frame, [310, 340], [0, 1], { extrapolateRight: 'clamp' });
  const botTypedChars = Math.floor(interpolate(frame, [310, 400], [0, 42], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }));
  const botText = "I've reviewed your project. Here's my plan...".slice(0, botTypedChars);

  // Frame 400-550: Memory text
  const memoryOpacity = interpolate(frame, [400, 440], [0, 1], { extrapolateRight: 'clamp' });
  const memoryY = interpolate(frame, [400, 440], [20, 0], { extrapolateRight: 'clamp' });

  // Frame 550-750: Agent names cascade
  const agents = ['Chicken Hawk', 'Scout_Ang', 'Edu_Ang', 'Visual Engine'];
  const agentStart = 550;
  const agentGap = 40;

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
      {/* ACHEEVY Hero Image */}
      <Img
        src={staticFile('acheevy-deploy-hero.svg')}
        style={{
          width: 360,
          height: 'auto',
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          marginBottom: 24,
          filter: 'drop-shadow(0 0 30px rgba(232, 160, 32, 0.4))',
        }}
      />

      {/* Title */}
      <div
        style={{
          transform: `translateX(${titleX}px)`,
          opacity: titleOpacity,
          fontSize: 64,
          color: '#FFFFFF',
          fontWeight: 700,
          marginBottom: 10,
        }}
      >
        Meet ACHEEVY
      </div>

      {/* Subtitle */}
      {frame >= 100 && (
        <div
          style={{
            opacity: subtitleOpacity,
            transform: `scale(${subtitleScale})`,
            fontSize: 36,
            color: '#E8A020',
            fontWeight: 600,
            marginBottom: 50,
          }}
        >
          Your Digital CEO
        </div>
      )}

      {/* Chat bubbles */}
      {frame >= 250 && (
        <div style={{ width: 700, marginBottom: 40 }}>
          {/* User message */}
          <div
            style={{
              opacity: userMsgOpacity,
              transform: `translateY(${userMsgY}px)`,
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: 16,
            }}
          >
            <div
              style={{
                backgroundColor: '#1A1A2E',
                borderRadius: 16,
                borderBottomRightRadius: 4,
                padding: '14px 20px',
                color: '#FFFFFF',
                fontSize: 22,
                maxWidth: 400,
                border: '1px solid #333',
              }}
            >
              Help me plan my next product launch
            </div>
          </div>

          {/* Bot response */}
          {frame >= 310 && (
            <div
              style={{
                opacity: botMsgOpacity,
                display: 'flex',
                justifyContent: 'flex-start',
              }}
            >
              <div
                style={{
                  backgroundColor: '#1A1A1A',
                  borderRadius: 16,
                  borderBottomLeftRadius: 4,
                  padding: '14px 20px',
                  color: '#E8A020',
                  fontSize: 22,
                  maxWidth: 450,
                  border: '1px solid #E8A020',
                }}
              >
                {botText}
                {frame < 400 && (
                  <span style={{ opacity: frame % 15 < 8 ? 1 : 0 }}>|</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Memory text */}
      {frame >= 400 && (
        <div
          style={{
            opacity: memoryOpacity,
            transform: `translateY(${memoryY}px)`,
            fontSize: 28,
            color: '#CCCCCC',
            marginBottom: 40,
            textAlign: 'center',
          }}
        >
          Remembers everything across sessions
        </div>
      )}

      {/* Agent names */}
      {frame >= agentStart && (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
          {agents.map((agent, i) => {
            const aFrame = agentStart + i * agentGap;
            const aOpacity = interpolate(frame, [aFrame, aFrame + 25], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const aY = interpolate(frame, [aFrame, aFrame + 25], [15, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const separator = i < agents.length - 1 ? ' \u2022 ' : '';
            return (
              <span
                key={agent}
                style={{
                  opacity: aOpacity,
                  transform: `translateY(${aY}px)`,
                  fontSize: 24,
                  color: '#E8A020',
                  fontWeight: 600,
                }}
              >
                {agent}{separator}
              </span>
            );
          })}
        </div>
      )}
    </AbsoluteFill>
  );
};
