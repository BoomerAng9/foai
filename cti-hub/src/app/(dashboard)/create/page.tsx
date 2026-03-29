'use client';

import { useState, useRef, useEffect, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════
   DEPLOY BY: ACHIEVEMOR — USE CASE ASSESSMENT LEDGER SYSTEM
   4-Phase Consultation → Comprehensive Deliverable
   ═══════════════════════════════════════════════════════════ */

const PHASES = [
  { id: "idea", label: "Share Your Idea", num: "01" },
  { id: "clarity", label: "Clarity & Risk", num: "02" },
  { id: "audience", label: "Audience Resonance", num: "03" },
  { id: "expert", label: "Expert Lens", num: "04" },
  { id: "ledger", label: "Assessment Ledger", num: "05" },
];

const EXPERT_ARCHETYPES = [
  { id: "strategist", label: "0.01% Business Strategist", desc: "McKinsey / BCG-caliber strategic advisor" },
  { id: "engineer", label: "0.01% Systems Architect", desc: "Principal-level platform engineering mind" },
  { id: "product", label: "0.01% Product Leader", desc: "Shipped $1B+ products at FAANG scale" },
  { id: "operator", label: "0.01% Operations Chief", desc: "Lean Six Sigma Master Black Belt operator" },
  { id: "growth", label: "0.01% Growth Hacker", desc: "0→1 and 1→100 scaling specialist" },
  { id: "custom", label: "Custom Expert", desc: "Define your own archetype" },
];

// ─── DATA TYPE ───
type ConsultData = Record<string, unknown>;
const s = (v: unknown): string => (typeof v === 'string' ? v : '');

const C = {
  bg: "#0A0D10", surface: "#12161B", surfaceHover: "#1A1F27",
  border: "#1F2733", borderFocus: "#C9A227",
  accent: "#C9A227", accentGlow: "rgba(201,162,39,0.12)",
  accentDim: "#7A6318", blue: "#3B82F6", blueGlow: "rgba(59,130,246,0.12)",
  text: "#E4E8ED", textSoft: "#94A3B8", textDim: "#4B5C72",
  success: "#10B981", successGlow: "rgba(16,185,129,0.08)",
  danger: "#EF4444", warn: "#F59E0B",
};

// ─── UTILITY: CLAUDE API ───
async function callClaude(systemPrompt: string, userMessage: string, _maxTokens: number = 1000) {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        skill_context: systemPrompt,
      }),
    });

    // Handle SSE stream - read full response
    if (!res.ok || !res.body) {
      return { ok: false, text: 'Connection error.' };
    }

    const contentType = res.headers.get('Content-Type') || '';
    if (contentType.includes('text/event-stream')) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) fullText += data.content;
          } catch {}
        }
      }
      return { ok: true, text: fullText || 'No response received.' };
    }

    // Fallback: JSON response
    const data = await res.json();
    return { ok: true, text: data.reply || 'No response received.' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Connection error';
    return { ok: false, text: 'Connection error: ' + msg };
  }
}

// ─── SHARED COMPONENTS ───
function Spinner({ size = 16 }: { size?: number }) {
  return (
    <>
      <div style={{
        width: size, height: size, border: "2px solid " + C.border,
        borderTopColor: C.accent, borderRadius: "50%",
        animation: "uca-spin 0.7s linear infinite", display: "inline-block",
      }} />
      <style>{`@keyframes uca-spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

function PhaseTrack({ current, completed }: { current: string; completed: string[] }) {
  return (
    <div style={{
      display: "flex", gap: 1, marginBottom: 32,
      borderBottom: "1px solid " + C.border, paddingBottom: 0,
    }}>
      {PHASES.map((p) => {
        const active = p.id === current;
        const done = completed.includes(p.id);
        const barColor = active ? C.accent : done ? C.success : "transparent";
        return (
          <div key={p.id} style={{
            flex: 1, padding: "12px 6px 14px", textAlign: "center",
            background: active ? C.accentGlow : done ? C.successGlow : "transparent",
            borderBottom: "2.5px solid " + barColor, transition: "all 0.35s ease",
          }}>
            <div style={{
              fontSize: 9, fontWeight: 800, letterSpacing: 2.5,
              color: active ? C.accent : done ? C.success : C.textDim,
              fontFamily: "'IBM Plex Mono', monospace",
            }}>{p.num}</div>
            <div style={{
              fontSize: 10, fontWeight: 600, marginTop: 3,
              color: active ? C.text : done ? C.textSoft : C.textDim,
              fontFamily: "'Outfit', sans-serif",
            }}>{p.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, rows, type = "textarea" }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  type?: string;
}) {
  const shared: React.CSSProperties = {
    width: "100%", padding: "14px 16px", background: C.bg,
    border: "1px solid " + C.border, borderRadius: 6,
    color: C.text, fontSize: 14, fontFamily: "'Outfit', sans-serif",
    outline: "none", lineHeight: 1.65, transition: "border-color 0.2s",
    boxSizing: "border-box",
  };
  const handlers = {
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { e.target.style.borderColor = C.borderFocus; },
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { e.target.style.borderColor = C.border; },
  };
  if (type === "text") {
    return (
      <input value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} style={shared} {...handlers} />
    );
  }
  return (
    <textarea value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} rows={rows || 5}
      style={{ ...shared, resize: "vertical" }} {...handlers} />
  );
}

function Btn({ children, onClick, variant = "primary", disabled = false, style: xs = {} }: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "gold";
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  const base: React.CSSProperties = {
    padding: "11px 26px", borderRadius: 6, fontSize: 13,
    fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "'Outfit', sans-serif", letterSpacing: 0.3,
    opacity: disabled ? 0.35 : 1, transition: "all 0.2s", border: "none",
    display: "inline-flex", alignItems: "center", gap: 8,
  };
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: C.accent, color: "#0A0D10", boxShadow: "0 0 18px " + C.accentGlow },
    secondary: { background: "transparent", color: C.textSoft, border: "1px solid " + C.border },
    gold: { background: "linear-gradient(135deg, " + C.accent + ", #A68520)", color: "#0A0D10", fontWeight: 700, boxShadow: "0 2px 20px " + C.accentGlow },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...base, ...variants[variant], ...xs }}>
      {children}
    </button>
  );
}

function AgentBlock({ content, label, loading, loadingText }: {
  content: string | null;
  label?: string;
  loading?: boolean;
  loadingText?: string;
}) {
  if (loading) {
    return (
      <div style={{
        padding: 40, textAlign: "center", background: C.accentGlow,
        border: "1px solid " + C.border, borderRadius: 8, margin: "16px 0",
      }}>
        <Spinner size={20} />
        <div style={{ color: C.textSoft, fontSize: 13, marginTop: 14, fontFamily: "'Outfit', sans-serif" }}>
          {loadingText || "ACHEEVY is thinking..."}
        </div>
      </div>
    );
  }
  if (!content) return null;
  return (
    <div style={{
      background: C.accentGlow, border: "1px solid rgba(201,162,39,0.2)",
      borderRadius: 8, padding: 20, margin: "16px 0",
    }}>
      {label && (
        <div style={{
          fontSize: 9, fontWeight: 800, letterSpacing: 2.5,
          color: C.accent, marginBottom: 12,
          fontFamily: "'IBM Plex Mono', monospace",
        }}>{label}</div>
      )}
      <div style={{
        fontSize: 13.5, lineHeight: 1.75, color: C.text,
        fontFamily: "'Outfit', sans-serif", whiteSpace: "pre-wrap",
      }}>{content}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      fontSize: 11, color: C.textSoft, display: "block", marginBottom: 6,
      fontFamily: "'Outfit', sans-serif", fontWeight: 500,
    }}>{children}</label>
  );
}

function PhaseTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{
        fontSize: 22, fontWeight: 700, color: C.text, margin: 0,
        fontFamily: "'Playfair Display', serif",
      }}>{children}</h2>
      {sub && <p style={{ fontSize: 12.5, color: C.textSoft, marginTop: 6, lineHeight: 1.5 }}>{sub}</p>}
    </div>
  );
}

function NavRow({ onBack, onNext, nextLabel, nextDisabled, nextVariant = "primary" }: {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextVariant?: "primary" | "secondary" | "gold";
}) {
  return (
    <div style={{ display: "flex", justifyContent: onBack ? "space-between" : "flex-end", marginTop: 28 }}>
      {onBack && <Btn variant="secondary" onClick={onBack}>{"\u2190 Back"}</Btn>}
      {onNext && <Btn variant={nextVariant} onClick={onNext} disabled={nextDisabled}>{nextLabel}</Btn>}
    </div>
  );
}

// ─── PHASE 1: SHARE YOUR IDEA ───
function PhaseIdea({ data, update, onNext }: { data: ConsultData; update: (patch: ConsultData) => void; onNext: () => void }) {
  return (
    <div>
      <PhaseTitle sub="Describe the business problem you want solved. What does your plug do? Who is it for? What outcome do you need?">
        Share Your Idea
      </PhaseTitle>
      <TextInput
        value={s(data.idea)} onChange={(v) => update({ idea: v })}
        placeholder="Example: I need a voice-powered customer onboarding system for my insurance agency that qualifies leads, explains policy options, and schedules appointments automatically..."
        rows={7}
      />
      <div style={{ marginTop: 14 }}>
        <SectionLabel>Industry / Sector (optional)</SectionLabel>
        <TextInput type="text" value={s(data.industry)}
          onChange={(v) => update({ industry: v })}
          placeholder="e.g. Healthcare, Finance, E-commerce, Education..." />
      </div>
      <div style={{ marginTop: 14 }}>
        <SectionLabel>Target Audience (optional)</SectionLabel>
        <TextInput type="text" value={s(data.targetAudience)}
          onChange={(v) => update({ targetAudience: v })}
          placeholder="e.g. Small business owners, Enterprise HR teams, Students..." />
      </div>
      <NavRow onNext={onNext} nextLabel={"Proceed to Clarity & Risk \u2192"} nextDisabled={!s(data.idea).trim()} />
    </div>
  );
}

// ─── PHASE 2: CLARITY & RISK ───
function PhaseClarity({ data, update, onNext, onBack }: { data: ConsultData; update: (patch: ConsultData) => void; onNext: () => void; onBack: () => void }) {
  const [aiResult, setAiResult] = useState<string | null>(s(data._clarityAI) || null);
  const [loading, setLoading] = useState(false);
  const ran = useRef(!!data._clarityAI);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    setLoading(true);

    const sys = "You are ACHEEVY, the Digital CEO of ACHIEVEMOR \u2014 a platform that builds autonomous business automation \"plugs\" with defense-grade security. You are conducting a needs assessment. Phase 2: identify what is UNCLEAR, RISKY, or MISSING from the user's idea. Think like a Lean Six Sigma Black Belt and a top-tier management consultant. Be direct, specific, constructive.\n\nFormat:\nWHAT'S UNCLEAR:\n(3-5 specific ambiguities)\n\nWHAT'S RISKY:\n(3-5 risks \u2014 technical, market, operational, compliance)\n\nWHAT'S MISSING:\n(3-5 gaps that need filling before building)\n\nINITIAL USE CASE SIGNAL:\n(2-3 high-level use cases you see emerging)\n\nConcise, actionable. No fluff.";

    const msg = "User's idea: " + s(data.idea) + "\nIndustry: " + (s(data.industry) || "Not specified") + "\nTarget audience: " + (s(data.targetAudience) || "Not specified");

    callClaude(sys, msg, 1000).then((res) => {
      setAiResult(res.text);
      update({ _clarityAI: res.text });
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <PhaseTitle sub="ACHEEVY analyzed your idea for gaps, risks, and blind spots. Review, then confirm or add context.">
        Clarity & Risk Assessment
      </PhaseTitle>
      <AgentBlock content={aiResult} label="ACHEEVY CLARITY ASSESSMENT"
        loading={loading} loadingText="ACHEEVY is reasoning through your idea..." />
      <div style={{ marginTop: 16 }}>
        <SectionLabel>Your response — clarify, confirm, or add missing context:</SectionLabel>
        <TextInput value={s(data.clarityResponse)}
          onChange={(v) => update({ clarityResponse: v })}
          placeholder="Address the points above, or type 'Confirmed \u2014 proceed as analyzed' if accurate..." rows={5} />
      </div>
      <NavRow onBack={onBack} onNext={onNext}
        nextLabel={"Proceed to Audience Resonance \u2192"}
        nextDisabled={!s(data.clarityResponse).trim() || loading} />
    </div>
  );
}

// ─── PHASE 3: AUDIENCE RESONANCE ───
function PhaseAudience({ data, update, onNext, onBack }: { data: ConsultData; update: (patch: ConsultData) => void; onNext: () => void; onBack: () => void }) {
  const [aiResult, setAiResult] = useState<string | null>(s(data._audienceAI) || null);
  const [loading, setLoading] = useState(false);
  const [agentMode, setAgentMode] = useState<boolean>(!!data._audienceAgentMode);

  const runPositioning = async () => {
    setLoading(true);

    const sys = "You are ACHEEVY, the Digital CEO of ACHIEVEMOR. Phase 3: Audience Resonance. Position the user's idea so it RESONATES deeply with their target audience. Think like a world-class brand strategist + product-market fit expert.\n\nOutput:\nAUDIENCE PROFILE:\n(synthesized profile of who this serves)\n\nRESONANCE POSITIONING:\n(frame so audience immediately sees value \u2014 language, pain points, aspirational outcomes)\n\nMESSAGING HOOKS:\n(3-4 one-liner value propositions that would convert)\n\nUSE CASE EXPANSION:\n(2-3 additional use cases this audience would love that the user hasn't considered)\n\nALTERNATE ROUTES:\n(2-3 completely different approaches to solving the same problem)\n\nSpecific to their context. No generic marketing speak.";

    const msg = "Idea: " + s(data.idea) +
      "\nIndustry: " + (s(data.industry) || "Not specified") +
      "\nTarget audience: " + (s(data.targetAudience) || "Not specified") +
      "\nClarity assessment: " + (s(data._clarityAI) || "N/A") +
      "\nUser clarity response: " + s(data.clarityResponse) +
      "\nAudience details: " + (s(data.audienceDetails) || "None \u2014 agent infers from context") +
      "\nAgent positioning mode: " + (agentMode ? "YES \u2014 user trusts agent" : "NO \u2014 user provided audience data");

    const res = await callClaude(sys, msg, 1000);
    setAiResult(res.text);
    update({ _audienceAI: res.text, _audienceAgentMode: agentMode });
    setLoading(false);
  };

  return (
    <div>
      <PhaseTitle sub="Make this resonate with your audience. Provide details or let ACHEEVY position it.">
        Audience Resonance
      </PhaseTitle>

      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        {[
          { val: false, label: "I'll describe my audience", sub: "Provide specific data", clr: C.blue, glow: C.blueGlow },
          { val: true, label: "Let ACHEEVY decide", sub: "Agent infers & positions", clr: C.accent, glow: C.accentGlow },
        ].map((opt) => (
          <div key={String(opt.val)} onClick={() => { setAgentMode(opt.val); if (aiResult) { setAiResult(null); } }}
            style={{
              flex: 1, padding: 14, borderRadius: 8, cursor: "pointer",
              background: agentMode === opt.val ? opt.glow : C.surface,
              border: "1px solid " + (agentMode === opt.val ? opt.clr : C.border),
              transition: "all 0.2s",
            }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: agentMode === opt.val ? opt.clr : C.textSoft }}>{opt.label}</div>
            <div style={{ fontSize: 10, color: C.textDim, marginTop: 3 }}>{opt.sub}</div>
          </div>
        ))}
      </div>

      {!agentMode && (
        <TextInput value={s(data.audienceDetails)}
          onChange={(v) => update({ audienceDetails: v })}
          placeholder="Describe your audience: demographics, pain points, what they've tried, what they value, how they talk about the problem..."
          rows={5} />
      )}

      {!aiResult && !loading && (
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <Btn variant="gold" onClick={runPositioning}
            disabled={!agentMode && !s(data.audienceDetails).trim()}>
            Generate Audience Resonance Analysis
          </Btn>
        </div>
      )}

      <AgentBlock content={aiResult} label="ACHEEVY AUDIENCE RESONANCE"
        loading={loading} loadingText="ACHEEVY is crafting resonance positioning..." />

      <NavRow onBack={onBack} onNext={onNext}
        nextLabel={"Proceed to Expert Lens \u2192"} nextDisabled={!aiResult} />
    </div>
  );
}

// ─── PHASE 4: EXPERT LENS ───
function PhaseExpert({ data, update, onNext, onBack }: { data: ConsultData; update: (patch: ConsultData) => void; onNext: () => void; onBack: () => void }) {
  const [selected, setSelected] = useState<string | null>(s(data.expertArchetype) || null);
  const [customExpert, setCustomExpert] = useState<string>(s(data.customExpert));
  const [notebookSrc, setNotebookSrc] = useState<string>(s(data.notebookSource));
  const [aiResult, setAiResult] = useState<string | null>(s(data._expertAI) || null);
  const [loading, setLoading] = useState(false);

  const runExpert = async () => {
    setLoading(true);
    const arch = selected === "custom" ? null : EXPERT_ARCHETYPES.find((a) => a.id === selected);
    const expertLabel = selected === "custom" ? customExpert : (arch ? arch.label + " \u2014 " + arch.desc : "General Expert");

    const sys = "You are channeling the perspective of a " + expertLabel + ". You are the top 0.01% in this domain. Assess a business automation plug idea.\n\nYour mandate:\n1. What would YOU do differently?\n2. What use cases does the user NOT see that you see immediately?\n3. Optimal architecture / approach from your expert lens?\n4. 3 most critical success factors?\n5. ONE thing that would make this category-defining?\n\nAlso generate:\nEXPERT USE CASES (5-7):\n- Each: Title, Target User, Problem\u2192Outcome, Confidence (High/Medium/Low)\n\nALTERNATE ROUTES (3-4):\n- Each: Route Name, Core Difference, Tradeoff, Expert Recommendation\n\nASSET RECOMMENDATIONS:\n- Data sources to save as reusable account assets\n- Suggested titles and compartmentalization\n\nBe provocative, specific, brilliant. 0.01% lens.";

    const msg = "FULL CONSULTATION CONTEXT:\nIdea: " + s(data.idea) +
      "\nIndustry: " + (s(data.industry) || "Not specified") +
      "\nTarget Audience: " + (s(data.targetAudience) || "Not specified") +
      "\nClarity Assessment: " + (s(data._clarityAI) || "N/A") +
      "\nUser Clarity Response: " + (s(data.clarityResponse) || "") +
      "\nAudience Resonance: " + (s(data._audienceAI) || "N/A") +
      (notebookSrc ? "\nNotebookLM Data Source: " + notebookSrc : "") +
      "\nExpert Archetype: " + expertLabel;

    const res = await callClaude(sys, msg, 1000);
    setAiResult(res.text);
    update({ _expertAI: res.text, expertArchetype: selected, customExpert: customExpert, notebookSource: notebookSrc });
    setLoading(false);
  };

  return (
    <div>
      <PhaseTitle sub="What would the top 0.01% expert do here? Select an archetype or define your own.">
        Expert Lens
      </PhaseTitle>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
        {EXPERT_ARCHETYPES.map((a) => (
          <div key={a.id} onClick={() => { setSelected(a.id); if (aiResult) setAiResult(null); }}
            style={{
              padding: 13, borderRadius: 8, cursor: "pointer",
              background: selected === a.id ? C.accentGlow : C.surface,
              border: "1px solid " + (selected === a.id ? C.accent : C.border),
              transition: "all 0.2s",
            }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: selected === a.id ? C.accent : C.text, fontFamily: "'Outfit', sans-serif" }}>
              {a.label}
            </div>
            <div style={{ fontSize: 10, color: C.textDim, marginTop: 3 }}>{a.desc}</div>
          </div>
        ))}
      </div>

      {selected === "custom" && (
        <div style={{ marginBottom: 14 }}>
          <TextInput type="text" value={customExpert}
            onChange={(v) => setCustomExpert(v)}
            placeholder="Define your expert: e.g. 'Warren Buffett-caliber value investor'" />
        </div>
      )}

      <div style={{ marginBottom: 18 }}>
        <SectionLabel>NotebookLM Data Source Reference (optional — saved as account asset)</SectionLabel>
        <TextInput type="text" value={notebookSrc}
          onChange={(v) => setNotebookSrc(v)}
          placeholder="e.g. 'Insurance-Agency-Playbook-v2' or a URL to your knowledge base..." />
      </div>

      {!aiResult && !loading && (
        <div style={{ textAlign: "center" }}>
          <Btn variant="gold" onClick={runExpert}
            disabled={!selected || (selected === "custom" && !customExpert.trim())}>
            Run Expert Analysis
          </Btn>
        </div>
      )}

      <AgentBlock content={aiResult} label="0.01% EXPERT ASSESSMENT"
        loading={loading} loadingText="Channeling the 0.01% expert perspective..." />

      <NavRow onBack={onBack} onNext={onNext}
        nextLabel={"Generate Assessment Ledger \u2192"} nextVariant="gold" nextDisabled={!aiResult} />
    </div>
  );
}

// ─── PHASE 5: ASSESSMENT LEDGER ───
function PhaseLedger({ data, update, onBack, onRestart }: { data: ConsultData; update: (patch: ConsultData) => void; onBack: () => void; onRestart: () => void }) {
  const [ledger, setLedger] = useState<string | null>(s(data._ledgerResult) || null);
  const [loading, setLoading] = useState(false);
  const ran = useRef(!!data._ledgerResult);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    setLoading(true);

    const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    const sys = "You are ACHEEVY, the Digital CEO of ACHIEVEMOR. You completed a full 4-phase consultation. Produce the FINAL ASSESSMENT LEDGER \u2014 the comprehensive deliverable.\n\nOutput this EXACT structure in clean readable text (NO markdown # headers, use ALL-CAPS labels and divider lines):\n\nASSESSMENT LEDGER \u2014 DEPLOY BY: ACHIEVEMOR\nGenerated: " + dateStr + "\nPlug Concept: [derived from idea]\nLedger ID: UCL-[random 6 alphanumeric]\n\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\nSECTION 1: EXECUTIVE SUMMARY\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n(3-4 sentence overview)\n\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\nSECTION 2: VALIDATED USE CASES\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\nFor each (5-7):\nUC-[num]: [TITLE]\n  Target: [who]\n  Problem \u2192 Outcome: [transformation]\n  Confidence: [High/Medium/Low]\n  Implementation: [1-2 sentences]\n  Voice Integration: [how voice enhances this]\n  Tier Recommendation: [Buy Me a Coffee / Lite / Medium / Heavy / Superior]\n\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\nSECTION 3: ALTERNATE ROUTES\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\nFor each (3-4):\nROUTE [letter]: [NAME]\n  Core Difference: [how it diverges]\n  Tradeoff: [gain vs lose]\n  Expert Recommendation: [go/no-go]\n  Estimated Tier: [tier name]\n\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\nSECTION 4: RISK & COMPLIANCE MATRIX\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n(4-6 risks: severity, likelihood, mitigation)\n\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\nSECTION 5: RECOMMENDED TIER & QUOTE\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\nUse EXACT tier prices:\n  Buy Me a Coffee: $7/mo, 25K tokens\n  Lite: $19.99/mo, 200K tokens\n  Medium: $79.99/mo, 600K tokens\n  Heavy: $149.99/mo, 1.5M tokens\n  Superior: $299.99/mo ($149.99 + $150 upkeep), 1.5M tokens\nBuild fee base: $350. Security multipliers: Light 1.0x, Medium 1.1x, Heavy 1.15x, Superior 1.3x, Defense-Grade 1.45x.\nVoice: STT $0.02/min, TTS $0.05/min, Clone $25 one-time.\n\nRecommended Tier: [name]\nMonthly Subscription: $[amount]\nBuild Fee: $[amount]\nVoice Features: [Enabled/Disabled] \u2014 est. $[amount]/mo\nNFT Services: [Recommended/Not Needed]\nTotal Upfront: $[amount]\nTotal Monthly: $[amount]\n\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\nSECTION 6: FIVE USE CASES PACK (CHARTER-READY)\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n(5 use cases per Deploy Charter Template v3.1:\n Title, Target Audience, Problem\u2192Outcome, How-To, Usage Bands, Voice Integration, OKRs/KPIs, Risks)\n\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\nSECTION 7: ASSET RECOMMENDATIONS\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n(Data sources / assets to save:\n Asset Title, Type, Compartment, Description)\n\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\nSECTION 8: NEXT ACTIONS\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n(3-5 concrete next steps with owners)\n\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\nSECTION 9: CONSULTATION LOG\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\nPhase 1 (Idea Intake): [summary]\nPhase 2 (Clarity & Risk): [summary]\nPhase 3 (Audience Resonance): [summary]\nPhase 4 (Expert Lens): [summary]\n\nACHEEVY CONFIDENCE SCORE: [X/10]\nBAMARAM READINESS: [Ready / Needs Refinement / Requires Additional Consultation]\n\nThorough but not bloated. Every line actionable. Feeds into Deploy Charter Template v3.1.";

    const msg = "COMPLETE CONSULTATION DATA:\n\nPHASE 1 \u2014 IDEA:\n" + s(data.idea) +
      "\nIndustry: " + (s(data.industry) || "Not specified") +
      "\nTarget Audience: " + (s(data.targetAudience) || "Not specified") +
      "\n\nPHASE 2 \u2014 CLARITY & RISK:\nAgent: " + (s(data._clarityAI) || "N/A") +
      "\nUser Response: " + (s(data.clarityResponse) || "N/A") +
      "\n\nPHASE 3 \u2014 AUDIENCE RESONANCE:\n" + (s(data._audienceAI) || "N/A") +
      "\n\nPHASE 4 \u2014 EXPERT LENS:\nArchetype: " + (s(data.expertArchetype) || "N/A") +
      (data.customExpert ? "\nCustom: " + s(data.customExpert) : "") +
      (data.notebookSource ? "\nNotebookLM Source: " + s(data.notebookSource) : "") +
      "\nAnalysis: " + (s(data._expertAI) || "N/A") +
      "\n\nGenerate the complete Assessment Ledger now.";

    callClaude(sys, msg, 4000).then((res) => {
      setLedger(res.text);
      update({ _ledgerResult: res.text });
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <PhaseTitle sub="Your comprehensive use case assessment \u2014 ready for Charter integration.">
        <span style={{ color: C.accent }}>Assessment Ledger</span>
      </PhaseTitle>

      {loading && (
        <div style={{
          padding: 60, textAlign: "center", background: C.accentGlow,
          border: "1px solid rgba(201,162,39,0.15)", borderRadius: 8,
        }}>
          <Spinner size={22} />
          <div style={{ color: C.accent, fontSize: 14, fontWeight: 700, marginTop: 16, fontFamily: "'Outfit', sans-serif" }}>
            Compiling Assessment Ledger...
          </div>
          <div style={{ color: C.textDim, fontSize: 11, marginTop: 6 }}>
            Synthesizing all 4 consultation phases into your deliverable
          </div>
        </div>
      )}

      {ledger && (
        <>
          <div style={{
            background: C.bg, border: "1px solid " + C.accent,
            borderRadius: 8, padding: 24, marginBottom: 20,
            boxShadow: "0 0 40px " + C.accentGlow + ", inset 0 0 40px rgba(201,162,39,0.03)",
            maxHeight: 560, overflowY: "auto",
          }}>
            <div style={{
              fontSize: 12.5, lineHeight: 1.8, color: C.text,
              fontFamily: "'IBM Plex Mono', monospace", whiteSpace: "pre-wrap",
              letterSpacing: 0.15,
            }}>{ledger}</div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Btn variant="gold" onClick={() => {
              const blob = new Blob([ledger], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url;
              a.download = "ACHIEVEMOR-Assessment-Ledger-" + Date.now() + ".txt";
              a.click(); URL.revokeObjectURL(url);
            }}>Download Ledger</Btn>
            <Btn variant="secondary" onClick={() => { navigator.clipboard.writeText(ledger); }}>
              Copy to Clipboard
            </Btn>
            <Btn variant="secondary" onClick={onRestart}>New Assessment</Btn>
          </div>
        </>
      )}

      <NavRow onBack={onBack} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  MAIN APPLICATION
// ═══════════════════════════════════════════════════════════
export default function UseCaseAssessmentLedger() {
  const [phase, setPhase] = useState("idea");
  const [data, setData] = useState<ConsultData>({});
  const [completed, setCompleted] = useState<string[]>([]);

  const update = useCallback((patch: ConsultData) => {
    setData((prev) => ({ ...prev, ...patch }));
  }, []);

  const goTo = useCallback((target: string, markDone?: string) => {
    if (markDone) setCompleted((c) => [...new Set([...c, markDone])]);
    setPhase(target);
  }, []);

  const restart = useCallback(() => {
    setPhase("idea"); setData({}); setCompleted([]);
  }, []);

  return (
    <div style={{
      minHeight: "100vh", background: C.bg,
      fontFamily: "'Outfit', sans-serif", color: C.text,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;700&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet" />

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <div style={{
            fontSize: 9, fontWeight: 800, letterSpacing: 5,
            color: C.accent, fontFamily: "'IBM Plex Mono', monospace",
          }}>DEPLOY BY: ACHIEVEMOR</div>
          <h1 style={{
            fontSize: 26, fontWeight: 800, margin: "10px 0 4px",
            fontFamily: "'Playfair Display', serif",
            background: "linear-gradient(135deg, " + C.text + " 40%, " + C.accent + ")",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Use Case Assessment
          </h1>
          <div style={{ fontSize: 11, color: C.textDim, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.5 }}>
            4-Phase Consultation → Comprehensive Ledger Deliverable
          </div>
        </div>

        <PhaseTrack current={phase} completed={completed} />

        {phase === "idea" && (
          <PhaseIdea data={data} update={update}
            onNext={() => goTo("clarity", "idea")} />
        )}
        {phase === "clarity" && (
          <PhaseClarity data={data} update={update}
            onNext={() => goTo("audience", "clarity")}
            onBack={() => setPhase("idea")} />
        )}
        {phase === "audience" && (
          <PhaseAudience data={data} update={update}
            onNext={() => goTo("expert", "audience")}
            onBack={() => setPhase("clarity")} />
        )}
        {phase === "expert" && (
          <PhaseExpert data={data} update={update}
            onNext={() => goTo("ledger", "expert")}
            onBack={() => setPhase("audience")} />
        )}
        {phase === "ledger" && (
          <PhaseLedger data={data} update={update}
            onBack={() => setPhase("expert")}
            onRestart={restart} />
        )}

        <div style={{
          textAlign: "center", marginTop: 44, paddingTop: 20,
          borderTop: "1px solid " + C.border,
        }}>
          <div style={{ fontSize: 9, color: C.textDim, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 1.5 }}>
            ACHEEVY × DEPLOY — ASSESSMENT LEDGER SYSTEM v1.0
          </div>
          <div style={{ fontSize: 9, color: C.textDim, marginTop: 4, letterSpacing: 0.5 }}>
            Feeds into Deploy Charter Template v3.1 • RFP → BAMARAM Pipeline
          </div>
        </div>
      </div>
    </div>
  );
}
