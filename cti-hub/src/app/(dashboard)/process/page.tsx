'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/* ═══════════════════════════════════════════════════════════════
   RFP-to-BAMARAM PROCESS FLOW
   The Deploy Platform — Every build's journey from request to delivery
   Iller_Ang Design Language — PMO-PRISM
   ═══════════════════════════════════════════════════════════════ */

// ─── DESIGN TOKENS ───

const T = {
  bg: '#0A0A0F',
  surface: 'rgba(255,255,255,0.03)',
  glass: 'rgba(255,255,255,0.05)',
  glassBorder: 'rgba(255,255,255,0.08)',
  glassLit: 'rgba(255,255,255,0.10)',
  accent: '#E8A020',
  accentGlow: 'rgba(232,160,32,0.15)',
  accentDim: 'rgba(232,160,32,0.06)',
  cyan: '#00E5CC',
  cyanGlow: 'rgba(0,229,204,0.12)',
  green: '#10B981',
  greenGlow: 'rgba(16,185,129,0.15)',
  text: '#E2E8F0',
  soft: '#8B9DB8',
  dim: '#4A5B73',
  faint: '#1C2330',
};

// ─── STAGE DATA ───

interface Stage {
  num: number;
  name: string;
  fullName: string;
  description: string;
  agents: { name: string; emoji: string }[];
  output: string;
  estimatedTime: string;
  color: string;
  glow: string;
}

const STAGES: Stage[] = [
  {
    num: 1, name: 'RFP', fullName: 'Request for Proposal',
    description: 'User describes what they want. Grammar/NTNTN converts the request to a structured spec. Consult_Ang confirms understanding and clarifies intent.',
    agents: [
      { name: 'Consult_Ang', emoji: '\uD83D\uDDE3\uFE0F' },
      { name: 'Grammar', emoji: '\uD83D\uDCDD' },
    ],
    output: 'Structured specification document with clear requirements, scope, and acceptance criteria.',
    estimatedTime: '5-15 min',
    color: T.accent, glow: T.accentGlow,
  },
  {
    num: 2, name: 'ASSESS', fullName: 'Feasibility Assessment',
    description: 'ACHEEVY evaluates feasibility, identifies required agents, estimates cost and timeline. Risk analysis included. Every constraint is surfaced before committing resources.',
    agents: [
      { name: 'ACHEEVY', emoji: '\u2699\uFE0F' },
    ],
    output: 'Feasibility report: cost estimate, timeline, risk matrix, required agent roster.',
    estimatedTime: '2-5 min',
    color: T.cyan, glow: T.cyanGlow,
  },
  {
    num: 3, name: 'PLAN', fullName: 'Project Plan',
    description: 'Project plan drafted: role, mission, vision, objective for each step. Agent assignments determined. ACHEEVY presents the plan to user for approval before any work begins.',
    agents: [
      { name: 'ACHEEVY', emoji: '\u2699\uFE0F' },
    ],
    output: 'Approved project plan with agent assignments, milestones, and deliverable schedule.',
    estimatedTime: '3-10 min',
    color: '#A78BFA', glow: 'rgba(167,139,250,0.12)',
  },
  {
    num: 4, name: 'MOBILIZE', fullName: 'Agent Mobilization',
    description: 'Boomer_Angs and Lil_Hawks are dispatched. Each agent receives their assignment with clear deliverables and deadlines. Resources allocated, environments provisioned.',
    agents: [
      { name: 'Boomer_Angs', emoji: '\uD83E\uDE83' },
      { name: 'Lil_Hawks', emoji: '\uD83D\uDC26' },
    ],
    output: 'Dispatched agent fleet with assignment manifests and deadline commitments.',
    estimatedTime: '1-3 min',
    color: '#F97316', glow: 'rgba(249,115,22,0.12)',
  },
  {
    num: 5, name: 'BUILD', fullName: 'Execution',
    description: 'Agents execute. Code written, content created, research compiled, designs produced. Live progress visible in Agent HQ. Every action logged with lineage.',
    agents: [
      { name: 'Boomer_Angs', emoji: '\uD83E\uDE83' },
      { name: 'Lil_Hawks', emoji: '\uD83D\uDC26' },
      { name: 'BuildSmith', emoji: '\uD83D\uDD28' },
    ],
    output: 'Raw deliverables: code, content, research, designs — each tagged to its producing agent.',
    estimatedTime: '10 min - 48 hrs',
    color: T.accent, glow: T.accentGlow,
  },
  {
    num: 6, name: 'REVIEW', fullName: 'Quality Gate',
    description: 'Hermes evaluation engine scores every deliverable. Quality gate enforced. Review_Hone validates outputs against the original spec. Nothing passes without meeting the bar.',
    agents: [
      { name: 'Hermes', emoji: '\uD83D\uDCCA' },
      { name: 'Review_Hone', emoji: '\uD83D\uDD0D' },
    ],
    output: 'Quality scores per deliverable, pass/fail status, revision notes if needed.',
    estimatedTime: '5-15 min',
    color: T.cyan, glow: T.cyanGlow,
  },
  {
    num: 7, name: 'ASSEMBLE', fullName: 'Package Assembly',
    description: 'BuildSmith compiles all deliverables into a single package. Evidence manifest with lineage for every contributing agent. Full audit trail from spec to output.',
    agents: [
      { name: 'BuildSmith', emoji: '\uD83D\uDD28' },
    ],
    output: 'Unified build package with evidence manifest and complete agent lineage.',
    estimatedTime: '3-10 min',
    color: '#A78BFA', glow: 'rgba(167,139,250,0.12)',
  },
  {
    num: 8, name: 'TEST', fullName: 'Sandbox Testing',
    description: 'Sandboxed testing. The build runs in isolation. Functional checks, performance validation, compliance verification. Nothing touches production until it passes.',
    agents: [
      { name: 'Hermes', emoji: '\uD83D\uDCCA' },
      { name: 'BuildSmith', emoji: '\uD83D\uDD28' },
    ],
    output: 'Test report: functional pass/fail, performance metrics, compliance status.',
    estimatedTime: '5-20 min',
    color: '#F97316', glow: 'rgba(249,115,22,0.12)',
  },
  {
    num: 9, name: 'DEPLOY', fullName: 'Live Deployment',
    description: 'Build deploys to its own container with its own URL. CDN-fronted. Live and accessible. Zero-downtime rollout with instant rollback capability.',
    agents: [
      { name: 'BuildSmith', emoji: '\uD83D\uDD28' },
    ],
    output: 'Live URL, deployment receipt, container ID, CDN configuration.',
    estimatedTime: '2-5 min',
    color: T.green, glow: T.greenGlow,
  },
  {
    num: 10, name: 'BAMARAM', fullName: 'Build Acceptance, Monitoring, And Results Are Measured',
    description: 'The user receives confirmation. Metrics tracked. Memory stored. The plug appears in their Plug Bin. Continuous monitoring begins — your build is alive.',
    agents: [
      { name: 'ACHEEVY', emoji: '\u2699\uFE0F' },
      { name: 'Hermes', emoji: '\uD83D\uDCCA' },
    ],
    output: 'Acceptance confirmation, monitoring dashboard, Plug Bin entry, stored memory.',
    estimatedTime: 'Ongoing',
    color: T.accent, glow: T.accentGlow,
  },
];

// ─── STATUS MOCK (for live build demo) ───

type StageStatus = 'pending' | 'active' | 'complete';

function getDefaultStatuses(): StageStatus[] {
  return STAGES.map(() => 'pending');
}

// ─── COMPONENTS ───

function TimelineConnector({ active, complete }: { active: boolean; complete: boolean }) {
  return (
    <div style={{
      width: 2,
      height: 48,
      margin: '0 auto',
      background: complete
        ? `linear-gradient(180deg, ${T.green}, ${T.green})`
        : active
          ? `linear-gradient(180deg, ${T.accent}, ${T.dim})`
          : T.faint,
      transition: 'background 0.6s ease',
      opacity: complete ? 1 : active ? 0.8 : 0.3,
    }} />
  );
}

function StatusBadge({ status }: { status: StageStatus }) {
  const config = {
    pending: { label: 'Pending', bg: 'rgba(255,255,255,0.05)', color: T.dim, border: T.faint },
    active: { label: 'Active', bg: T.accentDim, color: T.accent, border: T.accent },
    complete: { label: 'Complete', bg: T.greenGlow, color: T.green, border: T.green },
  }[status];

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 20,
      fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
      fontFamily: "'IBM Plex Mono', monospace",
      color: config.color, background: config.bg,
      border: `1px solid ${config.border}`,
      textTransform: 'uppercase',
    }}>
      {status === 'complete' && <span style={{ fontSize: 12 }}>{'\u2713'}</span>}
      {status === 'active' && (
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: T.accent,
          boxShadow: `0 0 8px ${T.accent}`,
          animation: 'pulse-dot 1.5s ease-in-out infinite',
        }} />
      )}
      {config.label}
    </span>
  );
}

function StageCard({
  stage,
  status,
  expanded,
  onToggle,
  index,
}: {
  stage: Stage;
  status: StageStatus;
  expanded: boolean;
  onToggle: () => void;
  index: number;
}) {
  const isLeft = index % 2 === 0;
  const cardRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      onClick={onToggle}
      style={{
        position: 'relative',
        maxWidth: 560,
        width: '100%',
        cursor: 'pointer',
        opacity: visible ? 1 : 0,
        transform: visible
          ? 'translateX(0) translateY(0)'
          : `translateX(${isLeft ? '-40px' : '40px'}) translateY(20px)`,
        transition: 'opacity 0.6s ease, transform 0.6s ease',
      }}
    >
      {/* Glass card */}
      <div style={{
        background: expanded ? stage.glow : T.glass,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `1px solid ${expanded ? stage.color : T.glassBorder}`,
        borderRadius: 16,
        padding: '24px 28px',
        transition: 'all 0.3s ease',
        boxShadow: status === 'active'
          ? `0 0 30px ${stage.glow}, 0 0 60px ${stage.glow}`
          : expanded
            ? `0 8px 32px rgba(0,0,0,0.4)`
            : '0 4px 16px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Stage number */}
            <span style={{
              fontSize: 36, fontWeight: 900, lineHeight: 1,
              color: stage.color,
              fontFamily: "'Outfit', sans-serif",
              opacity: 0.9,
              textShadow: status === 'active' ? `0 0 20px ${stage.glow}` : 'none',
            }}>
              {String(stage.num).padStart(2, '0')}
            </span>
            <div>
              <div style={{
                fontSize: 18, fontWeight: 800, color: T.text,
                fontFamily: "'Outfit', sans-serif",
                letterSpacing: 0.5,
              }}>
                {stage.name}
              </div>
              <div style={{
                fontSize: 11, color: T.soft,
                fontFamily: "'IBM Plex Mono', monospace",
                letterSpacing: 1,
                marginTop: 2,
              }}>
                {stage.fullName.toUpperCase()}
              </div>
            </div>
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Description */}
        <p style={{
          fontSize: 13, color: T.soft, lineHeight: 1.7,
          margin: '0 0 16px 0',
        }}>
          {stage.description}
        </p>

        {/* Agents */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: expanded ? 16 : 0 }}>
          {stage.agents.map((agent) => (
            <span key={agent.name} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 20,
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${T.glassBorder}`,
              fontSize: 11, color: T.text,
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              <span style={{ fontSize: 14 }}>{agent.emoji}</span>
              {agent.name}
            </span>
          ))}
        </div>

        {/* Expanded details */}
        <div style={{
          maxHeight: expanded ? 300 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.4s ease',
        }}>
          <div style={{
            borderTop: `1px solid ${T.glassBorder}`,
            paddingTop: 16,
            marginTop: 4,
          }}>
            {/* Output */}
            <div style={{ marginBottom: 14 }}>
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: 2,
                color: stage.color, marginBottom: 6,
                fontFamily: "'IBM Plex Mono', monospace",
              }}>
                OUTPUT
              </div>
              <p style={{ fontSize: 12, color: T.soft, lineHeight: 1.6, margin: 0 }}>
                {stage.output}
              </p>
            </div>
            {/* Estimated time */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: 2,
                color: stage.color,
                fontFamily: "'IBM Plex Mono', monospace",
              }}>
                EST. TIME
              </span>
              <span style={{
                fontSize: 12, color: T.text,
                fontFamily: "'IBM Plex Mono', monospace",
              }}>
                {stage.estimatedTime}
              </span>
            </div>
          </div>
        </div>

        {/* Expand indicator */}
        <div style={{
          textAlign: 'center', marginTop: 8,
          fontSize: 10, color: T.dim,
          transition: 'color 0.2s',
        }}>
          {expanded ? '\u25B2 collapse' : '\u25BC tap to expand'}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───

export default function ProcessPage() {
  const [expandedStage, setExpandedStage] = useState<number | null>(null);
  const [statuses, setStatuses] = useState<StageStatus[]>(getDefaultStatuses);
  const [timelineProgress, setTimelineProgress] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Scroll-driven timeline progress
  useEffect(() => {
    const handleScroll = () => {
      const el = timelineRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const start = rect.top;
      const end = rect.bottom;
      const totalHeight = end - start;
      if (totalHeight <= 0) return;
      const scrolled = vh - start;
      const pct = Math.min(Math.max(scrolled / totalHeight, 0), 1);
      setTimelineProgress(pct);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleStage = useCallback((index: number) => {
    setExpandedStage((prev) => (prev === index ? null : index));
  }, []);

  // Demo: simulate a live build progressing (optional interaction)
  const [demoActive, setDemoActive] = useState(false);

  useEffect(() => {
    if (!demoActive) return;
    let step = 0;
    const interval = setInterval(() => {
      setStatuses((prev) => {
        const next = [...prev];
        if (step > 0) next[step - 1] = 'complete';
        if (step < STAGES.length) next[step] = 'active';
        return next;
      });
      step++;
      if (step > STAGES.length) {
        clearInterval(interval);
        setDemoActive(false);
      }
    }, 1800);
    return () => clearInterval(interval);
  }, [demoActive]);

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      color: T.text,
      fontFamily: "'Outfit', 'Inter', sans-serif",
    }}>
      {/* Global keyframes */}
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.6); }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(232,160,32,0.1); }
          50% { box-shadow: 0 0 40px rgba(232,160,32,0.25); }
        }
        @keyframes hero-fade-in {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes draw-line {
          from { height: 0; }
          to { height: 100%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>

      {/* ─── HERO ─── */}
      <section style={{
        position: 'relative',
        padding: '100px 24px 80px',
        textAlign: 'center',
        overflow: 'hidden',
      }}>
        {/* Background gradient orbs */}
        <div style={{
          position: 'absolute', top: -120, left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 600, borderRadius: '50%',
          background: `radial-gradient(circle, ${T.accentGlow} 0%, transparent 70%)`,
          filter: 'blur(80px)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: 40, right: '15%',
          width: 300, height: 300, borderRadius: '50%',
          background: `radial-gradient(circle, ${T.cyanGlow} 0%, transparent 70%)`,
          filter: 'blur(60px)', pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', animation: 'hero-fade-in 0.8s ease forwards' }}>
          {/* Overline */}
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 4,
            color: T.accent, marginBottom: 20,
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            THE DEPLOY PLATFORM
          </div>

          <h1 style={{
            fontSize: 'clamp(32px, 6vw, 56px)',
            fontWeight: 900,
            color: T.text,
            margin: '0 0 16px 0',
            lineHeight: 1.1,
            fontFamily: "'Outfit', sans-serif",
          }}>
            From Request<br />
            <span style={{ color: T.accent }}>to Reality</span>
          </h1>

          <p style={{
            fontSize: 16, color: T.soft, maxWidth: 520,
            margin: '0 auto 32px', lineHeight: 1.7,
          }}>
            Every build on The Deploy Platform follows 10 stages — from your initial
            request to a live, monitored deployment. Here is exactly how it works.
          </p>

          {/* Stage count pills */}
          <div style={{
            display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 8,
          }}>
            {STAGES.map((s) => (
              <span key={s.num} style={{
                padding: '6px 14px', borderRadius: 20,
                background: T.glass, border: `1px solid ${T.glassBorder}`,
                backdropFilter: 'blur(8px)',
                fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                color: s.color,
                fontFamily: "'IBM Plex Mono', monospace",
              }}>
                {s.name}
              </span>
            ))}
          </div>

          {/* Demo button */}
          <button
            onClick={() => {
              setStatuses(getDefaultStatuses());
              setDemoActive(true);
            }}
            disabled={demoActive}
            style={{
              marginTop: 32,
              padding: '12px 28px', borderRadius: 12,
              background: demoActive ? T.glass : `linear-gradient(135deg, ${T.accent}, #D4891A)`,
              border: demoActive ? `1px solid ${T.glassBorder}` : 'none',
              color: demoActive ? T.soft : '#0A0A0F',
              fontSize: 13, fontWeight: 700, letterSpacing: 1,
              fontFamily: "'IBM Plex Mono', monospace",
              cursor: demoActive ? 'default' : 'pointer',
              transition: 'all 0.3s',
              textTransform: 'uppercase',
            }}
          >
            {demoActive ? 'Build in progress...' : '\u25B6  Watch a Demo Build'}
          </button>
        </div>
      </section>

      {/* ─── TIMELINE ─── */}
      <section ref={timelineRef} style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '0 24px 80px',
        position: 'relative',
      }}>
        {/* Central timeline line (desktop) */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          bottom: 0,
          width: 2,
          transform: 'translateX(-50%)',
          background: T.faint,
        }}>
          {/* Progress fill */}
          <div style={{
            width: '100%',
            height: `${timelineProgress * 100}%`,
            background: `linear-gradient(180deg, ${T.accent}, ${T.cyan})`,
            transition: 'height 0.1s linear',
            borderRadius: 1,
          }} />
        </div>

        {/* Mobile: left-aligned timeline */}
        <style>{`
          @media (max-width: 768px) {
            .process-timeline-center { display: none !important; }
            .process-stage-row {
              flex-direction: column !important;
              align-items: flex-start !important;
            }
            .process-stage-row > * {
              max-width: 100% !important;
              margin-left: 0 !important;
              margin-right: 0 !important;
            }
            .process-spacer { display: none !important; }
            .process-node-col {
              position: absolute !important;
              left: 0 !important;
              width: auto !important;
            }
            .process-card-col {
              padding-left: 48px !important;
            }
          }
        `}</style>

        {STAGES.map((stage, i) => {
          const isLeft = i % 2 === 0;
          const status = statuses[i];

          return (
            <div key={stage.num}>
              {/* Stage row */}
              <div
                className="process-stage-row"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  position: 'relative',
                  flexDirection: isLeft ? 'row' : 'row-reverse',
                }}
              >
                {/* Card side */}
                <div className="process-card-col" style={{ flex: 1, display: 'flex', justifyContent: isLeft ? 'flex-end' : 'flex-start' }}>
                  <StageCard
                    stage={stage}
                    status={status}
                    expanded={expandedStage === i}
                    onToggle={() => toggleStage(i)}
                    index={i}
                  />
                </div>

                {/* Center node */}
                <div className="process-node-col" style={{
                  width: 48, flexShrink: 0,
                  display: 'flex', justifyContent: 'center', paddingTop: 28,
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: status === 'complete' ? T.green
                      : status === 'active' ? stage.color
                      : T.faint,
                    border: `2px solid ${status === 'complete' ? T.green
                      : status === 'active' ? stage.color
                      : T.dim}`,
                    boxShadow: status === 'active'
                      ? `0 0 16px ${stage.glow}, 0 0 32px ${stage.glow}`
                      : status === 'complete'
                        ? `0 0 12px ${T.greenGlow}`
                        : 'none',
                    transition: 'all 0.4s ease',
                    animation: status === 'active' ? 'glow-pulse 2s ease-in-out infinite' : 'none',
                    position: 'relative',
                    zIndex: 2,
                  }}>
                    {status === 'complete' && (
                      <span style={{
                        position: 'absolute', top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        fontSize: 11, color: '#0A0A0F', fontWeight: 900,
                      }}>
                        {'\u2713'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Spacer side */}
                <div className="process-spacer" style={{ flex: 1 }} />
              </div>

              {/* Connector */}
              {i < STAGES.length - 1 && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <TimelineConnector
                    active={statuses[i + 1] === 'active'}
                    complete={statuses[i] === 'complete'}
                  />
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* ─── SUMMARY BAR ─── */}
      <section style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: '0 24px 40px',
      }}>
        <div style={{
          background: T.glass,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: `1px solid ${T.glassBorder}`,
          borderRadius: 16,
          padding: '32px',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 3,
            color: T.accent, marginBottom: 12,
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            THE FULL CYCLE
          </div>
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            flexWrap: 'wrap', gap: 8, marginBottom: 20,
          }}>
            {STAGES.map((s, i) => (
              <span key={s.num} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 12, fontWeight: 700, color: s.color,
                  fontFamily: "'IBM Plex Mono', monospace",
                }}>
                  {s.name}
                </span>
                {i < STAGES.length - 1 && (
                  <span style={{ color: T.dim, fontSize: 10 }}>{'\u2192'}</span>
                )}
              </span>
            ))}
          </div>
          <p style={{
            fontSize: 13, color: T.soft, lineHeight: 1.7, margin: 0,
          }}>
            From your first message to a live, monitored deployment — every step is
            tracked, every agent is accountable, and every deliverable has lineage.
          </p>
        </div>
      </section>

      {/* ─── CTAs ─── */}
      <section style={{
        maxWidth: 600,
        margin: '0 auto',
        padding: '0 24px 100px',
        display: 'flex',
        gap: 16,
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}>
        <a
          href="/chat"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '14px 32px', borderRadius: 12,
            background: `linear-gradient(135deg, ${T.accent}, #D4891A)`,
            color: '#0A0A0F',
            fontSize: 14, fontWeight: 800, letterSpacing: 1,
            fontFamily: "'Outfit', sans-serif",
            textDecoration: 'none',
            transition: 'transform 0.2s, box-shadow 0.2s',
            boxShadow: `0 4px 20px ${T.accentGlow}`,
          }}
        >
          {'\uD83D\uDE80'} Start a Build
        </a>

        <a
          href="/projects"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '14px 32px', borderRadius: 12,
            background: T.glass,
            backdropFilter: 'blur(12px)',
            border: `1px solid ${T.glassBorder}`,
            color: T.text,
            fontSize: 14, fontWeight: 700, letterSpacing: 1,
            fontFamily: "'Outfit', sans-serif",
            textDecoration: 'none',
            transition: 'border-color 0.2s',
          }}
        >
          View Your Builds
        </a>
      </section>
    </div>
  );
}
