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

export const Scene4ImageGen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Frame 0-150: User types prompt
  const promptText = 'create a bull frog with a cape';
  const typedChars = Math.floor(interpolate(frame, [20, 140], [0, promptText.length], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }));
  const promptOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  // Frame 150-300: Reasoning block
  const reasonOpacity = interpolate(frame, [150, 180], [0, 1], { extrapolateRight: 'clamp' });
  const reasonY = interpolate(frame, [150, 180], [15, 0], { extrapolateRight: 'clamp' });
  const routingDots = frame >= 150 ? '.'.repeat(Math.floor(((frame - 150) % 60) / 20) + 1) : '';

  // Frame 300-450: Model selector fans out
  const models = ['GPT-Image-1', 'Gemini-Imagen', 'Flux Pro'];
  const modelStart = 300;

  // Frame 450-600: Selection + spinner
  const selectOpacity = interpolate(frame, [450, 470], [0, 1], { extrapolateRight: 'clamp' });
  const spinnerAngle = frame >= 480 ? ((frame - 480) * 8) % 360 : 0;
  const showSpinner = frame >= 480 && frame < 600;

  // Frame 600-750: Image placeholder + text
  const imageScale = spring({ frame: Math.max(0, frame - 600), fps, config: { damping: 10, stiffness: 60 } });
  const imageOpacity = interpolate(frame, [600, 630], [0, 1], { extrapolateRight: 'clamp' });
  const finalTextOpacity = interpolate(frame, [660, 700], [0, 1], { extrapolateRight: 'clamp' });

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
      {/* Chat prompt */}
      <div style={{ width: 700, marginBottom: 30 }}>
        <div
          style={{
            opacity: promptOpacity,
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
              fontSize: 24,
              border: '1px solid #333',
            }}
          >
            {promptText.slice(0, typedChars)}
            {frame < 140 && (
              <span style={{ opacity: frame % 15 < 8 ? 1 : 0, color: '#E8A020' }}>|</span>
            )}
          </div>
        </div>

        {/* Reasoning block with ACHEEVY avatar */}
        {frame >= 150 && (
          <div
            style={{
              opacity: reasonOpacity,
              transform: `translateY(${reasonY}px)`,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              backgroundColor: '#111',
              border: '1px solid #E8A020',
              borderRadius: 12,
              padding: '12px 20px',
              marginBottom: 20,
            }}
          >
            <Img
              src={staticFile('acheevy-helmet.png')}
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                border: '2px solid #E8A020',
                flexShrink: 0,
              }}
            />
            <div>
              <div style={{ fontSize: 14, color: '#E8A020', marginBottom: 4 }}>REASONING</div>
              <div style={{ fontSize: 20, color: '#CCCCCC' }}>
                Routing to Visual Engine{routingDots}
              </div>
            </div>
          </div>
        )}

        {/* Model selector */}
        {frame >= modelStart && (
          <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
            {models.map((model, i) => {
              const mFrame = modelStart + i * 40;
              const mOpacity = interpolate(frame, [mFrame, mFrame + 30], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
              const mScale = spring({
                frame: Math.max(0, frame - mFrame),
                fps,
                config: { damping: 12 },
              });
              const isSelected = frame >= 450 && i === 0;
              return (
                <div
                  key={model}
                  style={{
                    opacity: mOpacity,
                    transform: `scale(${mScale})`,
                    flex: 1,
                    border: isSelected ? '2px solid #E8A020' : '1px solid #333',
                    borderRadius: 12,
                    padding: '12px 16px',
                    backgroundColor: isSelected ? '#1A1500' : '#111',
                    textAlign: 'center',
                    boxShadow: isSelected ? '0 0 15px rgba(232,160,32,0.3)' : 'none',
                  }}
                >
                  <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>{i + 1}</div>
                  <div style={{ fontSize: 16, color: isSelected ? '#E8A020' : '#999' }}>{model}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Selection indicator */}
        {frame >= 450 && frame < 600 && (
          <div style={{ opacity: selectOpacity, textAlign: 'center', marginBottom: 16 }}>
            <span style={{ color: '#E8A020', fontSize: 20 }}>Selected: GPT-Image-1</span>
          </div>
        )}

        {/* Spinner */}
        {showSpinner && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div
              style={{
                width: 40,
                height: 40,
                border: '3px solid #333',
                borderTopColor: '#E8A020',
                borderRadius: '50%',
                transform: `rotate(${spinnerAngle}deg)`,
              }}
            />
          </div>
        )}
      </div>

      {/* Generated image placeholder */}
      {frame >= 600 && (
        <div
          style={{
            opacity: imageOpacity,
            transform: `scale(${imageScale})`,
            width: 400,
            height: 300,
            borderRadius: 20,
            background: 'linear-gradient(135deg, #1A1500, #0D2A0D, #1A1A2E)',
            border: '2px solid #E8A020',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 40px rgba(232, 160, 32, 0.2)',
            marginBottom: 24,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 64 }}>🐸</div>
            <div style={{ fontSize: 16, color: '#666', marginTop: 8 }}>generated image</div>
          </div>
        </div>
      )}

      {/* Final text */}
      {frame >= 660 && (
        <div
          style={{
            opacity: finalTextOpacity,
            fontSize: 32,
            color: '#E8A020',
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          3 engines. Your choice.
        </div>
      )}
    </AbsoluteFill>
  );
};
