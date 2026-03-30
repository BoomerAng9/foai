'use client';

import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  AbsoluteFill,
} from 'remotion';

const ACCENT = '#E8A020';
const BG = '#0A0A0A';
const MONO = '"SF Mono", "Fira Code", "Cascadia Code", monospace';

const questions: { text: string; icon: string }[] = [
  { text: 'Who are the same 1,000 people?', icon: '\u{1F465}' },
  { text: 'What will they pay $50\u2013$100/year?', icon: '\u{1F4B0}' },
  { text: 'How do I reach all 1,000?', icon: '\u{1F4E3}' },
];

export const Scene6aMarket: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- Title: "The 1,000 People Framework" (0-100) ---
  const titleProgress = spring({ frame, fps, config: { damping: 14, mass: 1.2 } });
  const titleOpacity = interpolate(frame, [0, 60], [0, 1], { extrapolateRight: 'clamp' });
  const titleRotate = interpolate(titleProgress, [0, 1], [-1.5, 0]);

  // --- Three question cards (100-250), staggered ---
  const questionCards = questions.map((_, i) => {
    const start = 100 + i * 50;
    const cardSpring = spring({ frame: Math.max(0, frame - start), fps, config: { damping: 12 } });
    const cardOpacity = interpolate(frame, [start, start + 30], [0, 1], { extrapolateRight: 'clamp' });
    return { cardSpring, cardOpacity };
  });

  // --- Arrow + answer card (250-400) ---
  const arrowOpacity = interpolate(frame, [260, 300], [0, 1], { extrapolateRight: 'clamp' });
  const arrowY = interpolate(frame, [260, 300], [-20, 0], { extrapolateRight: 'clamp' });
  const answerSpring = spring({ frame: Math.max(0, frame - 310), fps, config: { damping: 12 } });
  const answerOpacity = interpolate(frame, [310, 350], [0, 1], { extrapolateRight: 'clamp' });

  // --- ACHEEVY chat mock (400-550) ---
  const chatBubbleOpacity = interpolate(frame, [410, 440], [0, 1], { extrapolateRight: 'clamp' });
  const chatBubbleX = interpolate(frame, [410, 450], [-40, 0], { extrapolateRight: 'clamp' });
  const typingProgress = interpolate(frame, [440, 540], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const chatText = 'Research the market for indie music producers who need AI mastering';
  const visibleChars = Math.floor(typingProgress * chatText.length);

  // --- Results fly in (550-700) ---
  const results = [
    { label: 'Audience', value: '12,400', delay: 0 },
    { label: 'Pain', value: 'Manual mastering', delay: 30 },
    { label: 'Willingness', value: '$79/yr', delay: 60 },
  ];
  const resultAnimations = results.map((r) => {
    const start = 560 + r.delay;
    const s = spring({ frame: Math.max(0, frame - start), fps, config: { damping: 10, stiffness: 120 } });
    const opacity = interpolate(frame, [start, start + 20], [0, 1], { extrapolateRight: 'clamp' });
    const y = interpolate(s, [0, 1], [40, 0]);
    return { opacity, y };
  });

  // --- Closing text (700-750) ---
  const closingOpacity = interpolate(frame, [700, 730], [0, 1], { extrapolateRight: 'clamp' });
  const closingScale = spring({ frame: Math.max(0, frame - 700), fps, config: { damping: 14 } });

  // Determine visible phase for layout
  const showTitle = frame >= 0;
  const showQuestions = frame >= 100;
  const showArrow = frame >= 260;
  const showAnswer = frame >= 310;
  const showChat = frame >= 410;
  const showResults = frame >= 550;
  const showClosing = frame >= 700;

  // Fade out earlier content as chat appears
  const earlyFade = interpolate(frame, [390, 420], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // Fade out chat as closing appears
  const chatFade = interpolate(frame, [690, 710], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

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
      {/* Background grid lines */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(232,160,32,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(232,160,32,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Phase 1: Title + Questions + Arrow + Answer (fades out) */}
      {showTitle && frame < 420 && (
        <div
          style={{
            opacity: showChat ? earlyFade : 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'absolute',
            top: 60,
            left: 0,
            right: 0,
          }}
        >
          {/* Title with sketch aesthetic */}
          <div
            style={{
              opacity: titleOpacity,
              transform: `scale(${titleProgress}) rotate(${titleRotate}deg)`,
              fontSize: 52,
              color: ACCENT,
              fontWeight: 700,
              textAlign: 'center',
              border: '3px dashed rgba(232,160,32,0.6)',
              borderRadius: 12,
              padding: '16px 40px',
              textShadow: `0 0 30px rgba(232,160,32,0.3)`,
              marginBottom: 40,
            }}
          >
            The 1,000 People Framework
          </div>

          {/* Question cards */}
          {showQuestions && (
            <div style={{ display: 'flex', gap: 24, marginBottom: 30 }}>
              {questions.map((q, i) => (
                <div
                  key={i}
                  style={{
                    opacity: questionCards[i].cardOpacity,
                    transform: `scale(${questionCards[i].cardSpring}) translateY(${interpolate(questionCards[i].cardSpring, [0, 1], [30, 0])}px)`,
                    background: 'rgba(232,160,32,0.08)',
                    border: '1px solid rgba(232,160,32,0.25)',
                    borderRadius: 12,
                    padding: '20px 24px',
                    width: 260,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 36, marginBottom: 10 }}>{q.icon}</div>
                  <div style={{ fontSize: 16, color: '#E0E0E0', lineHeight: 1.4 }}>{q.text}</div>
                </div>
              ))}
            </div>
          )}

          {/* Arrow */}
          {showArrow && (
            <div
              style={{
                opacity: arrowOpacity,
                transform: `translateY(${arrowY}px)`,
                fontSize: 36,
                color: ACCENT,
                marginBottom: 16,
              }}
            >
              {'\u2193'}
            </div>
          )}

          {/* Answer card */}
          {showAnswer && (
            <div
              style={{
                opacity: answerOpacity,
                transform: `scale(${answerSpring})`,
                background: 'linear-gradient(135deg, rgba(232,160,32,0.15), rgba(232,160,32,0.05))',
                border: '2px solid rgba(232,160,32,0.4)',
                borderRadius: 16,
                padding: '18px 36px',
                fontSize: 22,
                color: '#fff',
                fontWeight: 600,
                textAlign: 'center',
              }}
            >
              Small market, simple product
            </div>
          )}
        </div>
      )}

      {/* Phase 2: ACHEEVY Chat (410-700) */}
      {showChat && frame < 710 && (
        <div
          style={{
            opacity: showClosing ? chatFade : chatBubbleOpacity,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Chat window */}
          <div
            style={{
              width: 750,
              background: 'rgba(20,20,20,0.95)',
              border: '1px solid #333',
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            {/* Chat header */}
            <div
              style={{
                padding: '12px 20px',
                borderBottom: '1px solid #333',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: '#4ADE80',
                }}
              />
              <span style={{ color: ACCENT, fontSize: 14, fontWeight: 600 }}>Chat w/ ACHEEVY</span>
            </div>

            {/* User message */}
            <div style={{ padding: 20 }}>
              <div
                style={{
                  transform: `translateX(${chatBubbleX}px)`,
                  background: 'rgba(232,160,32,0.12)',
                  border: '1px solid rgba(232,160,32,0.3)',
                  borderRadius: '16px 16px 16px 4px',
                  padding: '14px 20px',
                  fontSize: 15,
                  color: '#E0E0E0',
                  maxWidth: 600,
                  lineHeight: 1.5,
                }}
              >
                {chatText.substring(0, visibleChars)}
                {typingProgress < 1 && (
                  <span
                    style={{
                      opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0,
                      color: ACCENT,
                    }}
                  >
                    |
                  </span>
                )}
              </div>
            </div>

            {/* Results */}
            {showResults && (
              <div
                style={{
                  padding: '0 20px 20px 20px',
                  display: 'flex',
                  gap: 16,
                }}
              >
                {results.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      opacity: resultAnimations[i].opacity,
                      transform: `translateY(${resultAnimations[i].y}px)`,
                      flex: 1,
                      background: 'rgba(232,160,32,0.08)',
                      border: '1px solid rgba(232,160,32,0.2)',
                      borderRadius: 10,
                      padding: '14px 16px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                      {r.label}
                    </div>
                    <div style={{ fontSize: 18, color: '#fff', fontWeight: 700 }}>{r.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Phase 3: Closing (700-750) */}
      {showClosing && (
        <div
          style={{
            opacity: closingOpacity,
            transform: `scale(${closingScale})`,
            fontSize: 42,
            color: ACCENT,
            fontWeight: 700,
            textAlign: 'center',
            textShadow: '0 0 40px rgba(232,160,32,0.4)',
          }}
        >
          ACHEEVY finds your market.
        </div>
      )}
    </AbsoluteFill>
  );
};
