'use client';

/**
 * /smelter-os/forms — Form builder launcher (Paperform via MCP)
 * =================================================================
 * Surface for owners to create intake forms, questionnaires,
 * surveys, and booking forms via the Paperform integration skill
 * (aims-skills/skills/integrations/paperform.skill.md).
 *
 * All access goes through Pipedream MCP bridge — no direct API.
 * Per CLAUDE.md rules, "Paperform" is never exposed to public users.
 * This is an owner-only surface so the name is allowed internally.
 *
 * Categories from the skill:
 *   client_onboarding, needs_analysis, feedback_nps, support_request,
 *   booking, payment, custom
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ClipboardList,
  MessageSquare,
  Star,
  Wrench,
  Calendar,
  CreditCard,
  Sparkles,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { isOwner } from '@/lib/allowlist';

interface Template {
  id: string;
  title: string;
  purpose: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  fields: string[];
  trigger: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'client_onboarding',
    title: 'Client Onboarding',
    purpose: 'Multi-step professional intake for new customers',
    icon: ClipboardList,
    fields: ['Name', 'Company', 'Industry', 'Goals', 'Budget', 'Timeline'],
    trigger: 'Auto-fires onboarding workflow on submit',
  },
  {
    id: 'needs_analysis',
    title: 'Needs Analysis',
    purpose: 'Conditional-logic questionnaire for requirements capture',
    icon: Wrench,
    fields: ['Current stack', 'Pain points', 'Requirements', 'Scale', 'Priorities'],
    trigger: 'Routes to plug recommendation engine',
  },
  {
    id: 'feedback_nps',
    title: 'Feedback / NPS',
    purpose: 'Short focused rating + what-worked / what-didn\'t',
    icon: Star,
    fields: ['Rating (1-10)', 'What worked', 'What didn\'t', 'Would recommend'],
    trigger: 'Feeds Hermes KPI tracking',
  },
  {
    id: 'support_request',
    title: 'Support Request',
    purpose: 'Structured triage form with category + urgency',
    icon: MessageSquare,
    fields: ['Category', 'Urgency', 'Description', 'Steps to reproduce', 'Screenshots'],
    trigger: 'Routes to support queue + Chicken Hawk dispatch',
  },
  {
    id: 'booking',
    title: 'Booking',
    purpose: 'Calendar-connected scheduling form',
    icon: Calendar,
    fields: ['Service type', 'Preferred date/time', 'Contact info', 'Notes'],
    trigger: 'Creates calendar event + confirmation email',
  },
  {
    id: 'payment',
    title: 'Payment',
    purpose: 'Stripe-connected checkout form',
    icon: CreditCard,
    fields: ['Service selection', 'Quantity', 'Payment details'],
    trigger: 'Stripe checkout + receipt',
  },
  {
    id: 'custom',
    title: 'Custom',
    purpose: 'User-defined fields, logic, and workflow',
    icon: Sparkles,
    fields: ['Any field config', 'Conditional logic', 'Calculated fields'],
    trigger: 'Custom wiring per owner request',
  },
];

export default function FormsPage() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);

  if (!user || !isOwner(user.email)) {
    return <OwnerGate />;
  }

  function handleCreate(template: Template) {
    const prompt = [
      `[SKILL: paperform activated — Pipedream MCP bridge]`,
      ``,
      `Create a new form:`,
      `  Type: ${template.title}`,
      `  Purpose: ${template.purpose}`,
      `  Fields: ${template.fields.join(', ')}`,
      `  Post-submit: ${template.trigger}`,
      ``,
      `Protocol:`,
      `  1. CLASSIFY — match the ${template.id} template pattern`,
      `  2. DESIGN — group fields into logical sections with conditional logic`,
      `  3. CREATE — via paperform_create_form through Pipedream MCP`,
      `  4. WIRE — n8n webhook → tenant-scoped Firestore → notifications`,
      `  5. DELIVER — return the live form URL`,
      ``,
      `Deliver the form URL when complete.`,
    ].join('\n');

    const encoded = encodeURIComponent(prompt);
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
      <div className="max-w-6xl mx-auto px-6 py-10">
        <Link
          href="/smelter-os"
          className="text-[10px] font-mono tracking-[0.25em] opacity-60 hover:opacity-100 inline-block mb-6"
          style={{ color: '#ff5722' }}
        >
          ← SMELTEROS BRIDGE
        </Link>

        <div className="mb-10">
          <div className="text-[10px] font-mono tracking-[0.3em] mb-2" style={{ color: '#ff5722' }}>
            / INTAKE + COLLECTION
          </div>
          <h1 className="font-doto font-black text-5xl md:text-6xl tracking-tight uppercase leading-none">
            <span style={{ color: '#ff5722' }} className="smelter-glow-soft">FORMS</span>
          </h1>
          <p className="text-sm mt-4 max-w-2xl text-white/60">
            Build intake forms, needs analyses, surveys, booking, and payment forms.
            Dispatched through the Pipedream MCP bridge to Paperform — form URL returned
            when complete. All submissions flow into tenant-scoped storage with full audit.
          </p>
        </div>

        {/* Template grid */}
        <div className="mb-10">
          <div
            className="text-[10px] font-mono tracking-[0.3em] mb-5 uppercase"
            style={{ color: '#ff5722' }}
          >
            / Form Templates
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATES.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelected(t.id)}
                className="smelter-glass smelter-glass-hover p-5 cursor-pointer transition-all"
                style={{
                  borderTop: selected === t.id ? '2px solid #ff5722' : '2px solid rgba(255,87,34,0.3)',
                  borderRadius: '3px',
                  boxShadow: selected === t.id ? '0 0 24px rgba(255,87,34,0.3)' : undefined,
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 flex items-center justify-center rounded-lg border"
                    style={{
                      background: 'rgba(255,87,34,0.12)',
                      borderColor: 'rgba(255,87,34,0.4)',
                    }}
                  >
                    <t.icon className="w-5 h-5" style={{ color: '#ff5722' }} />
                  </div>
                </div>
                <div className="font-doto font-black text-lg mb-1 uppercase tracking-tight">
                  {t.title}
                </div>
                <div className="text-[11px] opacity-60 leading-snug mb-3" style={{ color: '#94A3B8' }}>
                  {t.purpose}
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {t.fields.slice(0, 4).map((f) => (
                    <span
                      key={f}
                      className="text-[9px] font-mono px-1.5 py-0.5"
                      style={{
                        color: '#ff7a45',
                        background: 'rgba(255,87,34,0.08)',
                        border: '1px solid rgba(255,87,34,0.2)',
                        borderRadius: '2px',
                      }}
                    >
                      {f}
                    </span>
                  ))}
                  {t.fields.length > 4 && (
                    <span className="text-[9px] font-mono opacity-50">
                      +{t.fields.length - 4}
                    </span>
                  )}
                </div>
                <div
                  className="text-[9px] font-mono italic opacity-60 mb-3"
                  style={{ color: '#94A3B8' }}
                >
                  {t.trigger}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCreate(t);
                  }}
                  className="w-full text-center text-[10px] font-bold tracking-wider py-2 transition-all"
                  style={{
                    background: '#ff5722',
                    color: 'white',
                    borderRadius: '2px',
                  }}
                >
                  CREATE →
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Integration notes */}
        <div
          className="smelter-glass p-5 mb-6"
          style={{
            borderTop: '2px solid rgba(255,87,34,0.25)',
            borderRadius: '3px',
          }}
        >
          <div
            className="text-[10px] font-mono tracking-[0.25em] mb-3"
            style={{ color: '#ff5722' }}
          >
            / INTEGRATION RULES
          </div>
          <ul className="space-y-2 text-[11px]" style={{ color: '#CBD5E1' }}>
            <li className="flex gap-2">
              <span style={{ color: '#ff5722' }}>▸</span>
              <span>All calls route through the Pipedream MCP bridge — no direct Paperform API</span>
            </li>
            <li className="flex gap-2">
              <span style={{ color: '#ff5722' }}>▸</span>
              <span>Plug_Ang manages all form credentials; other agents delegate through it</span>
            </li>
            <li className="flex gap-2">
              <span style={{ color: '#ff5722' }}>▸</span>
              <span>Public-facing copy never reveals &ldquo;Paperform&rdquo; — always &ldquo;your intake form&rdquo;</span>
            </li>
            <li className="flex gap-2">
              <span style={{ color: '#ff5722' }}>▸</span>
              <span>Submissions land in tenant-scoped Firestore with audit trail</span>
            </li>
            <li className="flex gap-2">
              <span style={{ color: '#ff5722' }}>▸</span>
              <span>Form deletion is a &quot;Guide Me&quot; lane — always requires HITL approval</span>
            </li>
          </ul>
        </div>

        {/* Reference link */}
        <div className="text-[10px] font-mono opacity-50 flex items-center gap-2">
          <FileText className="w-3 h-3" />
          <span>Full skill spec:</span>
          <span style={{ color: '#ff7a45' }}>
            aims-tools/aims-core/aims-skills/skills/integrations/paperform.skill.md
          </span>
        </div>
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
        <h1 className="font-doto font-black text-4xl mb-4 uppercase">FORMS</h1>
        <p className="text-sm text-white/60 mb-8">Form builder is owner-only.</p>
        <Link
          href="/auth/login?next=/smelter-os/forms"
          className="inline-flex items-center gap-2 font-bold text-sm tracking-wider px-6 py-3"
          style={{ background: '#ff5722', color: 'white' }}
        >
          SIGN IN <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
