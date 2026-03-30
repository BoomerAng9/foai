'use client';

import React from 'react';
import {
  useCurrentFrame,
  interpolate,
  AbsoluteFill,
  Img,
  staticFile,
} from 'remotion';

export const Scene3Chat: React.FC = () => {
  const frame = useCurrentFrame();

  // Frame 0-100: Chat interface outline appears
  const outlineOpacity = interpolate(frame, [0, 60], [0, 1], { extrapolateRight: 'clamp' });
  const outlineScale = interpolate(frame, [0, 60], [0.95, 1], { extrapolateRight: 'clamp' });

  // Frame 100-250: Left card "Manage It"
  const manageOpacity = interpolate(frame, [100, 140], [0, 1], { extrapolateRight: 'clamp' });
  const manageGlow = frame >= 100 && frame < 250;
  const manageTextOpacity = interpolate(frame, [140, 180], [0, 1], { extrapolateRight: 'clamp' });

  // Frame 250-400: Right card "Guide Me"
  const guideOpacity = interpolate(frame, [250, 290], [0, 1], { extrapolateRight: 'clamp' });
  const guideGlow = frame >= 250 && frame < 400;
  const guideTextOpacity = interpolate(frame, [290, 330], [0, 1], { extrapolateRight: 'clamp' });

  // Frame 400-550: Input bar
  const inputOpacity = interpolate(frame, [400, 440], [0, 1], { extrapolateRight: 'clamp' });
  const inputGlow = frame >= 400 && frame < 550;
  const inputTextOpacity = interpolate(frame, [440, 480], [0, 1], { extrapolateRight: 'clamp' });

  // Frame 550-750: Closing text
  const closingOpacity = interpolate(frame, [550, 590], [0, 1], { extrapolateRight: 'clamp' });
  const closingY = interpolate(frame, [550, 590], [20, 0], { extrapolateRight: 'clamp' });

  // Pointer animation
  const pointerX = frame < 250 ? 340 : frame < 400 ? 680 : 510;
  const pointerY = frame < 400 ? 280 : 440;
  const pointerOpacity = frame >= 100 && frame < 550
    ? interpolate(frame % 60, [0, 30, 60], [1, 0.6, 1], { extrapolateRight: 'clamp' })
    : 0;

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
      {/* Chat interface mock */}
      <div
        style={{
          opacity: outlineOpacity,
          transform: `scale(${outlineScale})`,
          width: 750,
          border: '1px solid #333',
          borderRadius: 20,
          padding: 40,
          backgroundColor: '#111111',
          position: 'relative',
        }}
      >
        {/* ACHEEVY Avatar + Title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 30 }}>
          <Img
            src={staticFile('acheevy-helmet.png')}
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              border: '2px solid #E8A020',
              boxShadow: '0 0 15px rgba(232, 160, 32, 0.3)',
            }}
          />
          <div style={{ fontSize: 28, color: '#666' }}>
            How would you like to work?
          </div>
        </div>

        {/* Cards row */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 30 }}>
          {/* Manage It card */}
          <div
            style={{
              flex: 1,
              opacity: manageOpacity,
              border: manageGlow ? '2px solid #E8A020' : '1px solid #333',
              borderRadius: 14,
              padding: 24,
              backgroundColor: manageGlow ? '#1A1500' : '#0F0F0F',
              boxShadow: manageGlow ? '0 0 20px rgba(232, 160, 32, 0.2)' : 'none',
              transition: 'all 0.3s',
            }}
          >
            <div style={{ fontSize: 24, color: '#E8A020', fontWeight: 700, marginBottom: 8 }}>
              Manage It
            </div>
            <div style={{ fontSize: 16, color: '#999' }}>
              Hands-off. ACHEEVY takes charge.
            </div>
          </div>

          {/* Guide Me card */}
          <div
            style={{
              flex: 1,
              opacity: guideOpacity,
              border: guideGlow ? '2px solid #E8A020' : '1px solid #333',
              borderRadius: 14,
              padding: 24,
              backgroundColor: guideGlow ? '#1A1500' : '#0F0F0F',
              boxShadow: guideGlow ? '0 0 20px rgba(232, 160, 32, 0.2)' : 'none',
              transition: 'all 0.3s',
            }}
          >
            <div style={{ fontSize: 24, color: '#E8A020', fontWeight: 700, marginBottom: 8 }}>
              Guide Me
            </div>
            <div style={{ fontSize: 16, color: '#999' }}>
              Step by step, together.
            </div>
          </div>
        </div>

        {/* Input bar */}
        <div
          style={{
            opacity: inputOpacity,
            border: inputGlow ? '2px solid #E8A020' : '1px solid #333',
            borderRadius: 12,
            padding: '16px 24px',
            backgroundColor: inputGlow ? '#1A1500' : '#0F0F0F',
            boxShadow: inputGlow ? '0 0 20px rgba(232, 160, 32, 0.2)' : 'none',
            color: '#666',
            fontSize: 20,
          }}
        >
          Or just talk...
          <span style={{ opacity: frame % 20 < 10 ? 1 : 0, color: '#E8A020' }}>|</span>
        </div>

        {/* Pointer cursor */}
        {pointerOpacity > 0 && (
          <div
            style={{
              position: 'absolute',
              left: pointerX,
              top: pointerY,
              opacity: pointerOpacity,
              fontSize: 28,
              transform: 'rotate(-20deg)',
              filter: 'drop-shadow(0 0 4px rgba(232,160,32,0.5))',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#E8A020">
              <path d="M4 2l16 12H12l-2 8L4 2z" />
            </svg>
          </div>
        )}

        {/* Description texts */}
        {frame >= 100 && frame < 250 && (
          <div style={{ opacity: manageTextOpacity, marginTop: 24, textAlign: 'center', fontSize: 22, color: '#CCCCCC' }}>
            Give a prompt. ACHEEVY handles it.
          </div>
        )}
        {frame >= 250 && frame < 400 && (
          <div style={{ opacity: guideTextOpacity, marginTop: 24, textAlign: 'center', fontSize: 22, color: '#CCCCCC' }}>
            Work together through Q&amp;A.
          </div>
        )}
        {frame >= 400 && frame < 550 && (
          <div style={{ opacity: inputTextOpacity, marginTop: 24, textAlign: 'center', fontSize: 22, color: '#CCCCCC' }}>
            Or just talk
          </div>
        )}
      </div>

      {/* Closing text */}
      {frame >= 550 && (
        <div
          style={{
            opacity: closingOpacity,
            transform: `translateY(${closingY}px)`,
            fontSize: 36,
            color: '#E8A020',
            fontWeight: 600,
            marginTop: 40,
            textAlign: 'center',
          }}
        >
          ACHEEVY figures out the rest
        </div>
      )}
    </AbsoluteFill>
  );
};
