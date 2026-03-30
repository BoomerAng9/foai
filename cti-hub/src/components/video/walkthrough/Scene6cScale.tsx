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

interface AgentNode {
  name: string;
  role: string;
  task: string;
  color: string;
  angle: number;
}

const agents: AgentNode[] = [
  { name: 'Chicken Hawk', role: 'ops', task: 'Deploy', color: '#F97316', angle: -50 },
  { name: 'Scout_Ang', role: 'research', task: 'Research', color: '#3B82F6', angle: -15 },
  { name: 'Edu_Ang', role: 'training', task: 'Onboard', color: '#22C55E', angle: 15 },
  { name: 'Money Engine', role: 'revenue', task: 'Invoice', color: '#EAB308', angle: 50 },
];

export const Scene6cScale: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- Title (0-100) ---
  const titleSpring = spring({ frame, fps, config: { damping: 14, mass: 1.1 } });
  const titleOpacity = interpolate(frame, [0, 50], [0, 1], { extrapolateRight: 'clamp' });
  // Title moves up when ACHEEVY appears
  const titleY = interpolate(frame, [80, 130], [0, -80], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // --- ACHEEVY node (100-200) ---
  const acheevySpring = spring({ frame: Math.max(0, frame - 100), fps, config: { damping: 10, stiffness: 100 } });
  const acheevyOpacity = interpolate(frame, [100, 140], [0, 1], { extrapolateRight: 'clamp' });
  const acheevyPulse = Math.sin(frame * 0.08) * 0.15 + 1;

  // --- Agent nodes (200-350), staggered ---
  const agentAnimations = agents.map((_, i) => {
    const start = 200 + i * 38;
    const nodeSpring = spring({ frame: Math.max(0, frame - start), fps, config: { damping: 12 } });
    const opacity = interpolate(frame, [start, start + 25], [0, 1], { extrapolateRight: 'clamp' });

    // Task labels (350-500)
    const taskStart = 360 + i * 35;
    const taskOpacity = interpolate(frame, [taskStart, taskStart + 25], [0, 1], { extrapolateRight: 'clamp' });
    const taskSpring = spring({ frame: Math.max(0, frame - taskStart), fps, config: { damping: 10 } });

    // Pulse glow (350-500)
    const pulseActive = frame >= taskStart && frame < 500;
    const pulseIntensity = pulseActive ? Math.sin((frame - taskStart) * 0.15) * 0.5 + 0.5 : 0;

    return { nodeSpring, opacity, taskOpacity, taskSpring, pulseIntensity };
  });

  // --- All agents light up (500-600) ---
  const allLitOpacity = interpolate(frame, [500, 530], [0, 1], { extrapolateRight: 'clamp' });
  const allLitSpring = spring({ frame: Math.max(0, frame - 500), fps, config: { damping: 14 } });
  const ceoTextOpacity = interpolate(frame, [520, 560], [0, 1], { extrapolateRight: 'clamp' });

  // --- Final text (600-750) ---
  const finalOpacity = interpolate(frame, [610, 650], [0, 1], { extrapolateRight: 'clamp' });
  const finalSpring = spring({ frame: Math.max(0, frame - 610), fps, config: { damping: 14 } });

  // Layout
  const centerX = 540; // approx half of 1080
  const acheevyY = 200;
  const agentY = 440;
  const agentSpread = 220;

  // Simultaneous glow at 500+
  const simultaneousGlow = frame >= 500 ? 0.6 + Math.sin(frame * 0.1) * 0.4 : 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG,
        fontFamily: MONO,
        overflow: 'hidden',
      }}
    >
      {/* Background grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle at 50% 40%, rgba(232,160,32,0.05) 0%, transparent 60%)',
        }}
      />

      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: 50,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: titleOpacity,
          transform: `scale(${titleSpring}) translateY(${titleY}px)`,
          fontSize: 44,
          color: ACCENT,
          fontWeight: 700,
          textShadow: '0 0 30px rgba(232,160,32,0.3)',
        }}
      >
        From Solo Plug to Full Organization
      </div>

      {/* ACHEEVY squad image (replaces circle node) */}
      {frame >= 100 && (
        <div
          style={{
            position: 'absolute',
            left: centerX - 100,
            top: acheevyY - 70,
            opacity: acheevyOpacity,
            transform: `scale(${acheevySpring * (frame >= 500 ? acheevyPulse : 1)})`,
            textAlign: 'center',
          }}
        >
          <Img
            src={staticFile('acheevy-chat-hero.png')}
            style={{
              width: 200,
              height: 'auto',
              borderRadius: 16,
              border: '2px solid rgba(232,160,32,0.5)',
              boxShadow: `0 0 ${30 + simultaneousGlow * 40}px rgba(232,160,32,${0.3 + simultaneousGlow * 0.4})`,
            }}
          />
          <div style={{ fontSize: 14, fontWeight: 800, color: ACCENT, marginTop: 6, letterSpacing: 0.5 }}>ACHEEVY</div>
        </div>
      )}

      {/* Connection lines + Agent nodes */}
      {agents.map((agent, i) => {
        const anim = agentAnimations[i];
        const agentX = centerX + (i - 1.5) * agentSpread;

        return (
          <React.Fragment key={i}>
            {/* Connection line from ACHEEVY to agent */}
            {frame >= 200 + i * 38 && (
              <svg
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
              >
                <line
                  x1={centerX}
                  y1={acheevyY + 55}
                  x2={agentX}
                  y2={agentY - 40}
                  stroke={agent.color}
                  strokeWidth={2}
                  strokeDasharray="6,4"
                  opacity={anim.opacity * 0.5}
                />
                {/* Arrow head */}
                <polygon
                  points={`${agentX},${agentY - 40} ${agentX - 6},${agentY - 52} ${agentX + 6},${agentY - 52}`}
                  fill={agent.color}
                  opacity={anim.opacity * 0.6}
                />
              </svg>
            )}

            {/* Agent node */}
            {frame >= 200 + i * 38 && (
              <div
                style={{
                  position: 'absolute',
                  left: agentX - 60,
                  top: agentY - 40,
                  width: 120,
                  opacity: anim.opacity,
                  transform: `scale(${anim.nodeSpring})`,
                  textAlign: 'center',
                }}
              >
                {/* Circle */}
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${agent.color}30, ${agent.color}10)`,
                    border: `2px solid ${agent.color}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto',
                    boxShadow: frame >= 500
                      ? `0 0 ${20 + simultaneousGlow * 30}px ${agent.color}60`
                      : `0 0 ${anim.pulseIntensity * 25}px ${agent.color}40`,
                  }}
                >
                  <span style={{ fontSize: 10, color: '#fff', fontWeight: 700, lineHeight: 1.2 }}>{agent.name}</span>
                </div>

                {/* Role label */}
                <div
                  style={{
                    fontSize: 11,
                    color: agent.color,
                    marginTop: 6,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    fontWeight: 600,
                  }}
                >
                  {agent.role}
                </div>

                {/* Task label */}
                {frame >= 360 + i * 35 && (
                  <div
                    style={{
                      opacity: anim.taskOpacity,
                      transform: `scale(${anim.taskSpring})`,
                      marginTop: 10,
                      padding: '4px 12px',
                      background: `${agent.color}20`,
                      border: `1px solid ${agent.color}50`,
                      borderRadius: 8,
                      fontSize: 12,
                      color: '#fff',
                      fontWeight: 600,
                      display: 'inline-block',
                    }}
                  >
                    {agent.task}
                  </div>
                )}
              </div>
            )}
          </React.Fragment>
        );
      })}

      {/* "One CEO. Unlimited agents." text (500-600) */}
      {frame >= 500 && (
        <div
          style={{
            position: 'absolute',
            bottom: frame >= 610 ? 160 : 120,
            left: 0,
            right: 0,
            textAlign: 'center',
            opacity: frame >= 610 ? interpolate(frame, [610, 640], [ceoTextOpacity, 0], { extrapolateRight: 'clamp' }) : ceoTextOpacity,
            transform: `scale(${allLitSpring})`,
          }}
        >
          <div
            style={{
              fontSize: 34,
              color: '#fff',
              fontWeight: 700,
            }}
          >
            One CEO. <span style={{ color: ACCENT }}>Unlimited agents.</span>
          </div>
        </div>
      )}

      {/* Final text (600-750) */}
      {frame >= 610 && (
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            left: 0,
            right: 0,
            textAlign: 'center',
            opacity: finalOpacity,
            transform: `scale(${finalSpring})`,
          }}
        >
          <div
            style={{
              fontSize: 28,
              color: '#E0E0E0',
              fontWeight: 500,
              lineHeight: 1.6,
            }}
          >
            Zero overhead. <span style={{ color: ACCENT, fontWeight: 700 }}>Deploy</span> manages it all.
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
