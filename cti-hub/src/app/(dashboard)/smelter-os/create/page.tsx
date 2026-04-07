'use client';

/**
 * /smelter-os/create — Open Mind Creation Harness launcher
 * ============================================================
 * Surface for activating the Open Mind creation harness skill
 * (cti-hub/src/lib/skills/open-mind/SKILL.md v3.0).
 *
 * Open Mind is a prompt-layer skill — it shapes how the invoking
 * agent thinks about a creation task. This page is the ACTIVATION
 * surface for owners: fill in the creation brief, launch the
 * harness via the chat, and track the 8-stage FDH loop.
 *
 * Owner-only.
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  Flame,
  ArrowRight,
  Brain,
  Lightbulb,
  Shield,
  Scale,
  Eye,
  DollarSign,
  FileText,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { isOwner } from '@/lib/allowlist';

type NoveltyLevel = 'LOW' | 'MEDIUM' | 'HIGH';
type UncertaintyLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export default function CreatePage() {
  const { user } = useAuth();
  const [taskConfirmed, setTaskConfirmed] = useState(false);
  const [intent, setIntent] = useState('');
  const [novelty, setNovelty] = useState<NoveltyLevel>('MEDIUM');
  const [uncertainty, setUncertainty] = useState<UncertaintyLevel>('MEDIUM');
  const [domain, setDomain] = useState('');
  const [launching, setLaunching] = useState(false);

  if (!user || !isOwner(user.email)) {
    return <OwnerGate />;
  }

  function handleLaunch() {
    if (!intent.trim() || !taskConfirmed) return;
    setLaunching(true);

    // Build the Open Mind activation prompt per the SKILL.md spec
    const activationPrompt = [
      `[SKILL: open-mind v3.0 activated — FDH creation loop]`,
      ``,
      `NOVELTY_LEVEL: ${novelty}`,
      `UNCERTAINTY_LEVEL: ${uncertainty}`,
      `DOMAIN: ${domain || 'general'}`,
      ``,
      `CREATION TASK:`,
      intent,
      ``,
      `Execute Open Mind's 8-stage FDH loop:`,
      `  FOSTER  — pre-mortem inversion + evidence grounding (Brave API + ByteRover)`,
      `  DEVELOP — 3 radically different approaches + constrained generation`,
      `  HONE    — novelty scoring (VL-JEPA) + 7-gate verification + output packet`,
      ``,
      `Return the structured creation packet per Stage 7 schema.`,
    ].join('\n');

    // Push the activation prompt into chat and navigate
    const encoded = encodeURIComponent(activationPrompt);
    window.location.href = `/chat?q=${encoded}`;
  }

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background: 'radial-gradient(ellipse at top, #121212 0%, #050505 70%)',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div className="max-w-5xl mx-auto px-6 py-10">
        <Link
          href="/smelter-os"
          className="text-[10px] font-mono tracking-[0.25em] opacity-60 hover:opacity-100 inline-block mb-6"
          style={{ color: '#ff5722' }}
        >
          ← SMELTEROS BRIDGE
        </Link>

        <div className="mb-8">
          <div className="text-[10px] font-mono tracking-[0.3em] mb-2" style={{ color: '#ff5722' }}>
            / CREATION HARNESS · SPECIALIST SKILL
          </div>
          <h1 className="font-doto font-black text-5xl md:text-6xl tracking-tight uppercase leading-none">
            OPEN <span style={{ color: '#ff5722' }} className="smelter-glow-soft">MIND</span>
          </h1>
          <p className="text-sm mt-4 max-w-2xl text-white/60">
            <span className="text-white font-semibold">Creation-only.</span> This harness is for
            building what doesn&apos;t exist yet — new systems, architectures, products,
            strategies. It is <span className="text-white font-semibold">not</span> an everyday
            tool. For routine execution, bug fixes, config changes, or data retrieval, skip
            the harness and talk to ACHEEVY directly.
          </p>
        </div>

        {/* ═══ SCOPE GATE ═══ */}
        <div
          className="smelter-glass p-6 mb-6"
          style={{
            borderLeft: `4px solid ${taskConfirmed ? '#22D3EE' : '#ff5722'}`,
            borderRadius: '3px',
          }}
        >
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle
              className="w-5 h-5 shrink-0 mt-0.5"
              style={{ color: '#ff5722' }}
            />
            <div className="flex-1">
              <div
                className="text-[10px] font-mono tracking-[0.25em] mb-1"
                style={{ color: '#ff5722' }}
              >
                / SCOPE CHECK
              </div>
              <div className="font-doto font-black text-xl uppercase leading-tight">
                Is this actually a creation task?
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div
              className="p-4 border"
              style={{
                borderColor: 'rgba(34,211,238,0.3)',
                background: 'rgba(34,211,238,0.05)',
                borderRadius: '2px',
              }}
            >
              <div
                className="flex items-center gap-2 text-[10px] font-mono tracking-[0.2em] uppercase mb-3 font-bold"
                style={{ color: '#22D3EE' }}
              >
                <Check className="w-3.5 h-3.5" /> USE WHEN
              </div>
              <ul className="space-y-1.5 text-[11px]" style={{ color: '#CBD5E1' }}>
                <li className="flex gap-2">
                  <span style={{ color: '#22D3EE' }}>▸</span>
                  <span>Designing a new system, architecture, product, or strategy</span>
                </li>
                <li className="flex gap-2">
                  <span style={{ color: '#22D3EE' }}>▸</span>
                  <span>Multiple valid approaches exist and you want divergent options</span>
                </li>
                <li className="flex gap-2">
                  <span style={{ color: '#22D3EE' }}>▸</span>
                  <span>Previous output was flagged as derivative / training-data recall</span>
                </li>
                <li className="flex gap-2">
                  <span style={{ color: '#22D3EE' }}>▸</span>
                  <span>Building something that does not yet exist in the org</span>
                </li>
                <li className="flex gap-2">
                  <span style={{ color: '#22D3EE' }}>▸</span>
                  <span>Innovation or novelty is the explicit goal</span>
                </li>
              </ul>
            </div>

            <div
              className="p-4 border"
              style={{
                borderColor: 'rgba(239,68,68,0.3)',
                background: 'rgba(239,68,68,0.05)',
                borderRadius: '2px',
              }}
            >
              <div
                className="flex items-center gap-2 text-[10px] font-mono tracking-[0.2em] uppercase mb-3 font-bold"
                style={{ color: '#EF4444' }}
              >
                <X className="w-3.5 h-3.5" /> DO NOT USE FOR
              </div>
              <ul className="space-y-1.5 text-[11px]" style={{ color: '#CBD5E1' }}>
                <li className="flex gap-2">
                  <span style={{ color: '#EF4444' }}>▸</span>
                  <span>Bug fixes, config changes, typos — single correct answers</span>
                </li>
                <li className="flex gap-2">
                  <span style={{ color: '#EF4444' }}>▸</span>
                  <span>Running code, deploying, monitoring — that&apos;s execution</span>
                </li>
                <li className="flex gap-2">
                  <span style={{ color: '#EF4444' }}>▸</span>
                  <span>Data retrieval with no synthesis — just ask ACHEEVY</span>
                </li>
                <li className="flex gap-2">
                  <span style={{ color: '#EF4444' }}>▸</span>
                  <span>Compliance or regulatory tasks (single-path)</span>
                </li>
                <li className="flex gap-2">
                  <span style={{ color: '#EF4444' }}>▸</span>
                  <span>Routine ops, maintenance, optimization of existing systems</span>
                </li>
                <li className="flex gap-2">
                  <span style={{ color: '#EF4444' }}>▸</span>
                  <span>Time-critical work where fastest-possible beats novel</span>
                </li>
              </ul>
            </div>
          </div>

          {!taskConfirmed ? (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="text-[11px] opacity-70" style={{ color: '#CBD5E1' }}>
                Confirm this is a creation task before the harness activates.
              </div>
              <div className="flex gap-2">
                <Link
                  href="/chat"
                  className="px-5 py-2.5 text-[10px] font-mono tracking-[0.15em] font-bold flex items-center gap-2"
                  style={{
                    border: '1px solid rgba(255,255,255,0.25)',
                    color: '#94A3B8',
                    borderRadius: '2px',
                  }}
                >
                  NOT CREATION → ACHEEVY
                </Link>
                <button
                  onClick={() => setTaskConfirmed(true)}
                  className="px-5 py-2.5 text-[10px] font-mono tracking-[0.15em] font-bold flex items-center gap-2"
                  style={{
                    background: '#ff5722',
                    color: 'white',
                    borderRadius: '2px',
                    boxShadow: '0 0 16px rgba(255,87,34,0.3)',
                  }}
                >
                  YES — THIS IS A CREATION TASK <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div
              className="flex items-center gap-2 text-[11px] font-mono"
              style={{ color: '#22D3EE' }}
            >
              <Check className="w-4 h-4" />
              Scope confirmed — harness ready to activate
            </div>
          )}
        </div>

        {/* Brief form — only visible after scope is confirmed */}
        <div
          className="smelter-glass p-6 mb-8"
          style={{
            borderTop: '2px solid rgba(255,87,34,0.4)',
            borderRadius: '3px',
            opacity: taskConfirmed ? 1 : 0.35,
            pointerEvents: taskConfirmed ? 'auto' : 'none',
            transition: 'opacity 0.3s ease',
          }}
        >
          <div className="text-[10px] font-mono tracking-[0.25em] mb-5" style={{ color: '#ff5722' }}>
            / CREATION BRIEF
          </div>

          <label className="block mb-6">
            <div className="text-[10px] font-mono tracking-[0.2em] opacity-60 mb-2 uppercase">
              What do you want to create?
            </div>
            <textarea
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="e.g. a new kind of recruiting scoring system that predicts NFL success better than composite rankings"
              rows={4}
              className="w-full px-4 py-3 text-sm text-white outline-none resize-none"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,87,34,0.25)',
                borderRadius: '2px',
                fontFamily: "'Inter', sans-serif",
              }}
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            <SelectField
              label="NOVELTY"
              value={novelty}
              onChange={(v) => setNovelty(v as NoveltyLevel)}
              options={[
                { v: 'LOW', label: 'LOW — select among known' },
                { v: 'MEDIUM', label: 'MEDIUM — improve / recombine' },
                { v: 'HIGH', label: 'HIGH — nothing like this exists' },
              ]}
            />
            <SelectField
              label="UNCERTAINTY"
              value={uncertainty}
              onChange={(v) => setUncertainty(v as UncertaintyLevel)}
              options={[
                { v: 'LOW', label: 'LOW — clear requirements' },
                { v: 'MEDIUM', label: 'MEDIUM — ambiguous spec' },
                { v: 'HIGH', label: 'HIGH — no precedent' },
              ]}
            />
            <label>
              <div className="text-[10px] font-mono tracking-[0.2em] opacity-60 mb-2 uppercase">
                Domain (optional)
              </div>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="e.g. sports analytics"
                className="w-full px-3 py-2 text-sm text-white outline-none"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,87,34,0.25)',
                  borderRadius: '2px',
                }}
              />
            </label>
          </div>

          <button
            onClick={handleLaunch}
            disabled={!intent.trim() || launching || !taskConfirmed}
            className="px-7 py-3.5 font-bold text-sm tracking-wider flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: '#ff5722',
              color: 'white',
              boxShadow: taskConfirmed ? '0 0 24px rgba(255,87,34,0.35)' : 'none',
              borderRadius: '2px',
            }}
          >
            <Flame className="w-5 h-5" />
            {launching ? 'LAUNCHING…' : 'LAUNCH THE HARNESS'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* FDH progression reference */}
        <div className="mb-10">
          <div
            className="text-[10px] font-mono tracking-[0.3em] mb-4 uppercase"
            style={{ color: '#ff5722' }}
          >
            / FDH Loop (8 stages)
          </div>

          <div className="space-y-3">
            <PhaseBlock
              phase="FOSTER"
              weight="30% · Search → Discover → Compile"
              accent="#ff5722"
              stages={[
                { icon: Brain, label: 'Intent normalization', note: 'Extract ask, classify novelty + uncertainty' },
                { icon: Shield, label: 'Pre-mortem inversion', note: 'Assume failure. Generate avoidance list' },
                { icon: FileText, label: 'Evidence grounding', note: 'Brave API + AutoResearch + ByteRover' },
              ]}
            />
            <PhaseBlock
              phase="DEVELOP"
              weight="50% · Refine → Shape → Ideate"
              accent="#ff7a45"
              stages={[
                { icon: Lightbulb, label: 'Divergent planning', note: '3 radically different approaches (Conventional / Differentiated / Experimental)' },
                { icon: Flame, label: 'Constrained generation', note: 'SCAMPER / TRIZ / Cross-domain analogy + creative constraint' },
              ]}
            />
            <PhaseBlock
              phase="HONE"
              weight="20% · Evaluate → Verify → Deliver"
              accent="#ffa76b"
              stages={[
                { icon: Eye, label: 'Novelty-aware evaluation', note: 'VL-JEPA semantic novelty + virtue alignment scoring' },
                { icon: Scale, label: '7-gate verification', note: 'ORACLE gates + ZTDC MUG adversarial review' },
                { icon: DollarSign, label: 'Output packet + KYB audit', note: 'Structured creation packet + LUC cost estimates + Flight Recorder entry' },
              ]}
            />
          </div>
        </div>

        {/* Reference links */}
        <div
          className="smelter-glass p-5"
          style={{
            borderTop: '2px solid rgba(255,87,34,0.25)',
            borderRadius: '3px',
          }}
        >
          <div className="text-[10px] font-mono tracking-[0.25em] opacity-60 mb-3" style={{ color: '#ff5722' }}>
            / REFERENCE DOCS
          </div>
          <ul className="space-y-1.5 text-[11px] font-mono">
            {[
              'cti-hub/src/lib/skills/open-mind/SKILL.md',
              'cti-hub/src/lib/skills/open-mind/references/PROMPTS.md',
              'cti-hub/src/lib/skills/open-mind/references/EVIDENCE_LEDGER_SCHEMA.json',
              'cti-hub/src/lib/skills/open-mind/references/CREATIVITY_PROTOCOLS.md',
              'cti-hub/src/lib/skills/open-mind/references/EVALUATION_RUBRIC.md',
              'cti-hub/src/lib/skills/open-mind/references/VALIDATION_CHECKLIST.md',
            ].map((path) => (
              <li key={path} className="flex items-baseline gap-2" style={{ color: '#94A3B8' }}>
                <span style={{ color: '#ff5722' }}>›</span>
                <span>{path}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ v: string; label: string }>;
}) {
  return (
    <label>
      <div className="text-[10px] font-mono tracking-[0.2em] opacity-60 mb-2 uppercase">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm text-white outline-none cursor-pointer"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,87,34,0.25)',
          borderRadius: '2px',
        }}
      >
        {options.map((o) => (
          <option key={o.v} value={o.v} style={{ background: '#121212' }}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function PhaseBlock({
  phase,
  weight,
  accent,
  stages,
}: {
  phase: string;
  weight: string;
  accent: string;
  stages: Array<{
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    label: string;
    note: string;
  }>;
}) {
  return (
    <div
      className="smelter-glass p-4"
      style={{
        borderLeft: `3px solid ${accent}`,
        borderRadius: '2px',
      }}
    >
      <div className="flex items-baseline gap-3 mb-3">
        <div className="font-doto font-black text-lg tracking-wider" style={{ color: accent }}>
          {phase}
        </div>
        <div className="text-[10px] font-mono opacity-60">{weight}</div>
      </div>
      <div className="space-y-2">
        {stages.map((s, i) => (
          <div key={i} className="flex items-start gap-3 text-[11px]">
            <s.icon className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: accent }} />
            <div className="min-w-0 flex-1">
              <div className="font-semibold" style={{ color: '#F1F5F9' }}>
                {s.label}
              </div>
              <div className="opacity-60 mt-0.5" style={{ color: '#94A3B8' }}>
                {s.note}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OwnerGate() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 smelter-ember-bg"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div className="text-center max-w-md">
        <div className="text-[10px] font-mono tracking-[0.3em] mb-3" style={{ color: '#ff5722' }}>
          OWNER ACCESS REQUIRED
        </div>
        <h1 className="font-doto font-black text-4xl mb-4 uppercase">OPEN MIND</h1>
        <p className="text-sm text-white/60 mb-8">
          The creation harness is owner-only.
        </p>
        <Link
          href="/auth/login?next=/smelter-os/create"
          className="inline-flex items-center gap-2 font-bold text-sm tracking-wider px-6 py-3"
          style={{ background: '#ff5722', color: 'white' }}
        >
          SIGN IN <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
