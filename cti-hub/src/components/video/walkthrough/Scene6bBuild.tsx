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

const ACCENT = '#E8A020';
const BG = '#0A0A0A';
const MONO = '"SF Mono", "Fira Code", "Cascadia Code", monospace';

interface PlugCard {
  name: string;
  icon: string;
  tagline: string;
  color: string;
  enterFrom: 'left' | 'right';
  startFrame: number;
}

const plugs: PlugCard[] = [
  {
    name: 'AI Music Engineer',
    icon: '\u{1F3B5}',
    tagline: 'Master my track \u2192 polished output',
    color: '#A855F7',
    enterFrom: 'left',
    startFrame: 100,
  },
  {
    name: 'Content Machine',
    icon: '\u{1F4C4}',
    tagline: 'One idea \u2192 newsletter + social posts',
    color: '#3B82F6',
    enterFrom: 'right',
    startFrame: 250,
  },
  {
    name: 'Lead Gen Agent',
    icon: '\u{1F3AF}',
    tagline: 'Find 50 prospects + draft DMs',
    color: '#10B981',
    enterFrom: 'left',
    startFrame: 400,
  },
];

export const Scene6bBuild: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- Title (0-100) ---
  const titleSpring = spring({ frame, fps, config: { damping: 14, mass: 1.1 } });
  const titleOpacity = interpolate(frame, [0, 50], [0, 1], { extrapolateRight: 'clamp' });

  // --- Plug cards animation ---
  const cardAnimations = plugs.map((plug) => {
    const s = plug.startFrame;
    const enterSpring = spring({ frame: Math.max(0, frame - s), fps, config: { damping: 12 } });
    const opacity = interpolate(frame, [s, s + 30], [0, 1], { extrapolateRight: 'clamp' });
    const xOffset = plug.enterFrom === 'left' ? -400 : 400;
    const x = interpolate(enterSpring, [0, 1], [xOffset, 0]);

    // Shrink phase (550-650): cards move to row
    const shrinkProgress = interpolate(frame, [550, 650], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

    return { enterSpring, opacity, x, shrinkProgress };
  });

  // --- Final row arrangement (550-650) ---
  const rowOpacity = interpolate(frame, [550, 580], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // --- Closing text (650-750) ---
  const closingOpacity = interpolate(frame, [660, 700], [0, 1], { extrapolateRight: 'clamp' });
  const closingSpring = spring({ frame: Math.max(0, frame - 660), fps, config: { damping: 14 } });

  // Phases
  const inShrinkPhase = frame >= 550;
  const showClosing = frame >= 660;

  // Glow pulse for cards
  const glowPulse = Math.sin(frame * 0.06) * 0.3 + 0.7;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG,
        fontFamily: MONO,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Subtle radial gradient bg */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 30%, rgba(232,160,32,0.04) 0%, transparent 70%)',
        }}
      />

      {/* ACHEEVY presenter avatar */}
      <div
        style={{
          position: 'absolute',
          top: inShrinkPhase ? 120 : '30%',
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: titleOpacity,
          zIndex: 2,
          transition: 'top 0.5s ease',
        }}
      >
        <Img
          src={staticFile('favicon-source.png')}
          style={{
            width: inShrinkPhase ? 64 : 120,
            height: 'auto',
            borderRadius: '50%',
            border: '2px solid rgba(232,160,32,0.5)',
            boxShadow: '0 0 20px rgba(232,160,32,0.3)',
            transition: 'width 0.5s ease',
          }}
        />
      </div>

      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: inShrinkPhase ? 60 : '50%',
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: titleOpacity,
          transform: inShrinkPhase
            ? `scale(${titleSpring})`
            : `scale(${titleSpring}) translateY(-50%)`,
          transition: 'top 0.5s ease',
          fontSize: inShrinkPhase ? 38 : 52,
          color: ACCENT,
          fontWeight: 700,
          textShadow: '0 0 30px rgba(232,160,32,0.3)',
        }}
      >
        {frame < 100 ? (
          <span>Build What They&apos;ll Pay For</span>
        ) : (
          <span style={{ fontSize: inShrinkPhase ? 38 : 42 }}>Build What They&apos;ll Pay For</span>
        )}
      </div>

      {/* Individual card presentations (100-550) */}
      {!inShrinkPhase &&
        plugs.map((plug, i) => {
          const anim = cardAnimations[i];
          const isActive = frame >= plug.startFrame && frame < 550;
          if (!isActive) return null;

          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: `translate(-50%, -50%) translateX(${anim.x}px)`,
                opacity: anim.opacity,
              }}
            >
              <div
                style={{
                  width: 400,
                  background: `linear-gradient(135deg, ${plug.color}15, ${plug.color}08)`,
                  border: `2px solid ${plug.color}50`,
                  borderRadius: 20,
                  padding: '36px 32px',
                  textAlign: 'center',
                  boxShadow: `0 0 ${40 * glowPulse}px ${plug.color}20`,
                }}
              >
                <div style={{ fontSize: 56, marginBottom: 16 }}>{plug.icon}</div>
                <div style={{ fontSize: 26, color: '#fff', fontWeight: 700, marginBottom: 12 }}>{plug.name}</div>
                <div style={{ fontSize: 16, color: '#BBB', lineHeight: 1.5 }}>{plug.tagline}</div>
              </div>
            </div>
          );
        })}

      {/* Row arrangement (550+) */}
      {inShrinkPhase && (
        <div
          style={{
            position: 'absolute',
            top: '42%',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 28,
            opacity: rowOpacity,
            transform: `translateY(-50%)`,
          }}
        >
          {plugs.map((plug, i) => {
            const cardScale = spring({
              frame: Math.max(0, frame - 550 - i * 15),
              fps,
              config: { damping: 12 },
            });

            return (
              <div
                key={i}
                style={{
                  transform: `scale(${cardScale})`,
                  width: 260,
                  background: `linear-gradient(135deg, ${plug.color}12, ${plug.color}06)`,
                  border: `1px solid ${plug.color}40`,
                  borderRadius: 16,
                  padding: '24px 20px',
                  textAlign: 'center',
                  boxShadow: `0 0 20px ${plug.color}15`,
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 10 }}>{plug.icon}</div>
                <div style={{ fontSize: 18, color: '#fff', fontWeight: 700, marginBottom: 8 }}>{plug.name}</div>
                <div style={{ fontSize: 13, color: '#999', lineHeight: 1.4 }}>{plug.tagline}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Closing text */}
      {showClosing && (
        <div
          style={{
            position: 'absolute',
            bottom: 120,
            left: 0,
            right: 0,
            textAlign: 'center',
            opacity: closingOpacity,
            transform: `scale(${closingSpring})`,
          }}
        >
          <div style={{ fontSize: 24, color: '#E0E0E0', fontWeight: 500, lineHeight: 1.6 }}>
            Simple product. Real value. Built in one conversation.
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
