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

export const Scene5LUC: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Frame 0-100: LUC badge pulses
  const badgeScale = spring({ frame, fps, config: { damping: 8, stiffness: 60 } });
  const badgePulse = frame < 100
    ? 1 + 0.05 * Math.sin(frame * 0.15)
    : 1;

  // Frame 100-250: "Every action has a cost"
  const costTextOpacity = interpolate(frame, [100, 140], [0, 1], { extrapolateRight: 'clamp' });
  const costTextY = interpolate(frame, [100, 140], [20, 0], { extrapolateRight: 'clamp' });

  // Frame 250-450: Animated cost ticker
  const tickerValue = interpolate(frame, [250, 450], [0.0001, 0.0005], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const tickerOpacity = interpolate(frame, [250, 270], [0, 1], { extrapolateRight: 'clamp' });

  // Frame 450-600: Budget bar
  const budgetOpacity = interpolate(frame, [450, 480], [0, 1], { extrapolateRight: 'clamp' });
  const budgetWidth = interpolate(frame, [480, 580], [100, 99.75], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const budgetValue = interpolate(frame, [480, 580], [20.0, 19.95], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Frame 600-750: Final text
  const finalOpacity = interpolate(frame, [600, 640], [0, 1], { extrapolateRight: 'clamp' });
  const finalY = interpolate(frame, [600, 640], [20, 0], { extrapolateRight: 'clamp' });

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
      {/* LUC Badge with ACHEEVY avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 40 }}>
        <Img
          src={staticFile('acheevy-helmet.png')}
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            border: '2px solid #E8A020',
            opacity: interpolate(frame, [0, 60], [0, 1], { extrapolateRight: 'clamp' }),
            boxShadow: '0 0 12px rgba(232, 160, 32, 0.3)',
          }}
        />
        <div
          style={{
            transform: `scale(${badgeScale * badgePulse})`,
            width: 140,
            height: 140,
            borderRadius: '50%',
            border: '3px solid #E8A020',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 ${20 + 10 * Math.sin(frame * 0.1)}px rgba(232, 160, 32, 0.3)`,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, color: '#E8A020', fontWeight: 700 }}>LUC</div>
            <div style={{ fontSize: 12, color: '#999' }}>UNITS</div>
          </div>
        </div>
      </div>

      {/* "Every action has a cost" */}
      {frame >= 100 && (
        <div
          style={{
            opacity: costTextOpacity,
            transform: `translateY(${costTextY}px)`,
            fontSize: 40,
            color: '#FFFFFF',
            fontWeight: 600,
            marginBottom: 50,
          }}
        >
          Every action has a cost
        </div>
      )}

      {/* Cost ticker */}
      {frame >= 250 && (
        <div
          style={{
            opacity: tickerOpacity,
            fontSize: 64,
            color: '#E8A020',
            fontWeight: 700,
            marginBottom: 50,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          ${tickerValue.toFixed(4)}
        </div>
      )}

      {/* Budget bar */}
      {frame >= 450 && (
        <div style={{ opacity: budgetOpacity, width: 600, marginBottom: 50 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 18, color: '#999' }}>Budget</span>
            <span style={{ fontSize: 18, color: '#E8A020', fontVariantNumeric: 'tabular-nums' }}>
              ${budgetValue.toFixed(2)}
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: 20,
              backgroundColor: '#1A1A1A',
              borderRadius: 10,
              overflow: 'hidden',
              border: '1px solid #333',
            }}
          >
            <div
              style={{
                width: `${budgetWidth}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #E8A020, #D4941A)',
                borderRadius: 10,
                transition: 'width 0.1s',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 14, color: '#666' }}>$0.00</span>
            <span style={{ fontSize: 14, color: '#666' }}>$20.00</span>
          </div>
        </div>
      )}

      {/* Final text */}
      {frame >= 600 && (
        <div
          style={{
            opacity: finalOpacity,
            transform: `translateY(${finalY}px)`,
            fontSize: 32,
            color: '#CCCCCC',
            textAlign: 'center',
          }}
        >
          Full transparency. Every token counted.
        </div>
      )}
    </AbsoluteFill>
  );
};
