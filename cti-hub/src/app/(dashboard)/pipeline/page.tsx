'use client';

import { useState, useEffect } from "react";

/* ═══════════════════════════════════════════════════════════════
   ACHIEVEMOR AUTONOMOUS COURSE ACCELERATION PIPELINE
   Operational Blueprint & Agent Architecture
   ═══════════════════════════════════════════════════════════════ */

const C = {
  bg: "#08090C", panel: "#0E1117", panelLit: "#141921",
  border: "#1C2330", borderLit: "#2A3548",
  hawk: "#E8B931", hawkGlow: "rgba(232,185,49,0.12)", hawkDim: "rgba(232,185,49,0.06)",
  acheevy: "#22D3EE", acheevyGlow: "rgba(34,211,238,0.1)",
  boomer: "#F97316", boomerGlow: "rgba(249,115,22,0.1)",
  lil: "#A78BFA", lilGlow: "rgba(167,139,250,0.1)",
  success: "#10B981", successGlow: "rgba(16,185,129,0.08)",
  danger: "#EF4444", warn: "#F59E0B",
  text: "#E2E8F0", soft: "#8B9DB8", dim: "#4A5B73", faint: "#2D3A4E",
};

const AGENTS = [
  { id: "chickenhawk", name: "Chicken Hawk", role: "Commander", emoji: "\uD83E\uDD85", color: C.hawk, glow: C.hawkGlow,
    desc: "Governed via Telegram. Controls NemoClaw + Hermes. Approves partnerships, sets budgets, overrides schedules.", controls: ["NemoClaw Framework", "Hermes Agent"] },
  { id: "acheevy", name: "ACHEEVY", role: "Orchestrator", emoji: "\u2699\uFE0F", color: C.acheevy, glow: C.acheevyGlow,
    desc: "Digital CEO. Qualifies courses, scores viability, sets pricing, manages the pipeline state machine.", controls: ["Boomer_Angs", "Lil_Hawks"] },
  { id: "boomerangs", name: "Boomer_Angs", role: "Scouts / Scrapers", emoji: "\uD83E\uDE83", color: C.boomer, glow: C.boomerGlow,
    desc: "Minion fleet. Scrape course platforms, monitor seat availability, detect pricing changes, feed data to ACHEEVY.", controls: [] },
  { id: "lilhawks", name: "Lil_Hawks", role: "Outreach / Ops", emoji: "\uD83D\uDC26", color: C.lil, glow: C.lilGlow,
    desc: "Minion fleet. Send partnership emails, populate course pages, track attribution, manage listing schedules.", controls: [] },
];

const PIPELINE = [
  { id: "scout", num: "01", name: "SCOUT", agent: "boomerangs", color: C.boomer,
    what: "Boomer_Angs scrape course platforms on a cron schedule — Udemy, Coursera, Skillshare, college extension programs, bootcamps. They look for courses with low enrollment, expiring cohorts, or unsold seat blocks.",
    output: "Raw course manifest: title, provider, price, seats available, enrollment deadline, URL, category",
    auto: "Runs every 6 hours. Configurable per platform. Rate-limited to avoid detection." },
  { id: "qualify", num: "02", name: "QUALIFY", agent: "acheevy", color: C.acheevy,
    what: "ACHEEVY scores each scraped course on a viability matrix: demand signal (search volume, trending topics), margin potential (can we get 20%+ discount?), audience fit (does it match our learner segments?), and competition (is it already being discounted elsewhere?).",
    output: "Qualified course list with viability score (0-100), recommended discount ask, target audience tag",
    auto: "Auto-qualifies courses scoring 65+. Flags 40-64 for Chicken Hawk review via Telegram." },
  { id: "outreach", num: "03", name: "OUTREACH", agent: "lilhawks", color: C.lil,
    what: "Lil_Hawks generate and send personalized partnership emails to course providers. Template includes: who we are, our learner base size, proposed promotion window, discount structure (we ask for 25-40% off retail, pass 15-30% to learners, keep the spread).",
    output: "Outreach log: provider name, contact, email sent, follow-up schedule, response status",
    auto: "Auto-sends on qualification. 3-touch sequence: intro, value prop follow-up (Day 3), final ask (Day 7). Chicken Hawk approves template changes." },
  { id: "secure", num: "04", name: "SECURE", agent: "acheevy", color: C.acheevy,
    what: "Once a provider responds positively, ACHEEVY negotiates terms: discount percentage, promotion window, seat allocation, attribution method (referral code vs. dedicated landing page), and payment terms.",
    output: "Partnership record: provider, discount %, promo window start/end, seat count, referral code, payment terms",
    auto: "Auto-accepts deals within pre-set bounds (20%+ discount, 7+ day window). Escalates edge cases to Chicken Hawk via Telegram." },
  { id: "populate", num: "05", name: "POPULATE", agent: "lilhawks", color: C.lil,
    what: "Lil_Hawks auto-generate the course listing page on cti.foi.cloud with: course title, provider, original price, discounted price, countdown timer, enrollment link with referral code. Each listing gets a unique tracking slug.",
    output: "Live listing on cti.foi.cloud/discounted-courses with Shopify buy-button integration to learn2achievemor.us",
    auto: "Auto-publishes on promo window start. Auto-removes on window end. No manual intervention." },
  { id: "sell", num: "06", name: "SELL", agent: "lilhawks", color: C.lil,
    what: "Courses are sold through learn2achievemor.us (Shopify). Each sale is tracked via unique referral code embedded in the buy link. Shopify webhook fires on purchase, logging the sale back to our system with: course ID, revenue, referral code, timestamp.",
    output: "Sales record: order ID, course, learner email, revenue, our margin, partner payout, referral code",
    auto: "Fully automated. Shopify handles checkout. Webhook logs attribution. No cookies needed." },
  { id: "reconcile", num: "07", name: "RECONCILE", agent: "acheevy", color: C.acheevy,
    what: "ACHEEVY reconciles sales against partnership terms: calculates partner payouts, our margin, learner satisfaction signals. Generates a report for Chicken Hawk. Feeds performance data back into the QUALIFY stage to improve future scoring.",
    output: "Reconciliation ledger: total sales, partner payouts, net margin, top performers, underperformers",
    auto: "Runs daily. Weekly summary pushed to Chicken Hawk via Telegram. Monthly partner payout trigger." },
];

const TRACKING_MODEL = {
  title: "Attribution Tracking (No Cookies Needed)",
  method: "Referral Code + UTM Parameters",
  explanation: "Each course listing gets a unique referral slug: learn2achievemor.us/courses/[COURSE-SLUG]?ref=ACMR-[PARTNER-CODE]-[COURSE-ID]. Shopify captures the ref parameter at checkout. This is cleaner than cookies — no GDPR issues, no expiry problems, no cross-domain headaches. The referral code persists through the entire checkout flow because it's embedded in the product URL itself.",
  flow: [
    "Learner clicks course on cti.foi.cloud",
    "Redirected to learn2achievemor.us/courses/[slug]?ref=ACMR-UDEMY-4821",
    "Shopify captures ref parameter as order tag",
    "Webhook fires → logs sale with partner attribution",
    "ACHEEVY reconciles: this sale = Udemy partnership = our 12% margin",
  ],
};

const SCHEDULE = {
  title: "Autonomous Schedule",
  cycles: [
    { freq: "Every 6h", task: "Boomer_Angs scrape course platforms", agent: "boomerangs" },
    { freq: "Every 6h", task: "ACHEEVY scores and qualifies new courses", agent: "acheevy" },
    { freq: "On qualify", task: "Lil_Hawks send outreach emails", agent: "lilhawks" },
    { freq: "Day 3 / Day 7", task: "Lil_Hawks send follow-up sequence", agent: "lilhawks" },
    { freq: "On partner accept", task: "ACHEEVY finalizes terms, generates referral code", agent: "acheevy" },
    { freq: "On promo start", task: "Lil_Hawks publish listing to cti.foi.cloud", agent: "lilhawks" },
    { freq: "On promo end", task: "Lil_Hawks auto-remove expired listings", agent: "lilhawks" },
    { freq: "On sale", task: "Shopify webhook → log attribution", agent: "lilhawks" },
    { freq: "Daily", task: "ACHEEVY reconciles sales, updates scores", agent: "acheevy" },
    { freq: "Weekly", task: "Summary report → Chicken Hawk via Telegram", agent: "chickenhawk" },
  ],
};

const COMMAND_CHAIN = {
  title: "Command & Control Architecture",
  layers: [
    { name: "Chicken Hawk", sub: "COMMANDER — Telegram Interface", color: C.hawk, items: [
      "Approves/rejects partnerships flagged for review",
      "Sets budget ceilings and discount bounds",
      "Overrides schedules and pauses pipeline stages",
      "Receives weekly summary + escalation alerts",
      "Controls NemoClaw (agent framework) + Hermes (messaging)",
    ]},
    { name: "ACHEEVY", sub: "ORCHESTRATOR — Pipeline Brain", color: C.acheevy, items: [
      "Runs the qualify → secure → reconcile loop",
      "Auto-decides within pre-approved bounds",
      "Escalates edge cases to Chicken Hawk",
      "Dispatches tasks to Boomer_Angs and Lil_Hawks",
      "Manages state machine + course lifecycle",
    ]},
    { name: "Boomer_Angs + Lil_Hawks", sub: "MINION FLEETS — Execution Layer", color: C.boomer, items: [
      "Boomer_Angs: scrape, monitor, detect inventory changes",
      "Lil_Hawks: outreach emails, page population, attribution tracking",
      "Both report status back to ACHEEVY",
      "No autonomous decision-making — pure execution",
      "Horizontally scalable (add more minions as volume grows)",
    ]},
  ],
};

// ─── TYPES ───

interface Agent {
  id: string;
  name: string;
  role: string;
  emoji: string;
  color: string;
  glow: string;
  desc: string;
  controls: string[];
}

interface PipelineStageData {
  id: string;
  num: string;
  name: string;
  agent: string;
  color: string;
  what: string;
  output: string;
  auto: string;
}

// ─── COMPONENTS ───

function SectionHead({ num, title, sub }: { num: string; title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={{
          fontSize: 10, fontWeight: 800, letterSpacing: 3,
          color: C.hawk, fontFamily: "'IBM Plex Mono', monospace",
        }}>{num}</span>
        <h2 style={{
          fontSize: 20, fontWeight: 700, color: C.text, margin: 0,
          fontFamily: "'Playfair Display', serif",
        }}>{title}</h2>
      </div>
      {sub && <p style={{ fontSize: 12, color: C.soft, marginTop: 5, lineHeight: 1.5 }}>{sub}</p>}
    </div>
  );
}

function AgentCard({ agent, expanded, onToggle }: { agent: Agent; expanded: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle} style={{
      background: expanded ? agent.glow : C.panel, border: "1px solid " + (expanded ? agent.color : C.border),
      borderRadius: 8, padding: 16, cursor: "pointer", transition: "all 0.25s",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>{agent.emoji}</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: agent.color, fontFamily: "'Outfit', sans-serif" }}>
              {agent.name}
            </div>
            <div style={{ fontSize: 10, color: C.soft, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 1 }}>
              {agent.role.toUpperCase()}
            </div>
          </div>
        </div>
        <span style={{ color: C.dim, fontSize: 16, transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "none" }}>
          {"\u25BE"}
        </span>
      </div>
      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid " + C.faint }}>
          <p style={{ fontSize: 12.5, color: C.text, lineHeight: 1.65, margin: "0 0 10px" }}>{agent.desc}</p>
          {agent.controls.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
              <span style={{ fontSize: 10, color: C.dim }}>Controls:</span>
              {agent.controls.map((c: string) => (
                <span key={c} style={{
                  fontSize: 10, padding: "3px 8px", borderRadius: 4,
                  background: "rgba(255,255,255,0.04)", color: agent.color,
                  border: "1px solid " + agent.color + "33",
                  fontFamily: "'IBM Plex Mono', monospace",
                }}>{c}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PipelineStage({ stage, expanded, onToggle, index }: { stage: PipelineStageData; expanded: boolean; onToggle: () => void; index: number }) {
  const agentObj = AGENTS.find((a) => a.id === stage.agent);
  return (
    <div style={{ position: "relative" }}>
      {index > 0 && (
        <div style={{
          position: "absolute", top: -14, left: 24, width: 1, height: 14,
          background: "linear-gradient(to bottom, " + C.faint + ", " + stage.color + "40)",
        }} />
      )}
      <div onClick={onToggle} style={{
        background: expanded ? stage.color + "10" : C.panel,
        border: "1px solid " + (expanded ? stage.color + "50" : C.border),
        borderRadius: 8, padding: 16, cursor: "pointer", transition: "all 0.25s",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{
              width: 38, height: 38, borderRadius: 8, display: "flex",
              alignItems: "center", justifyContent: "center", flexShrink: 0,
              background: stage.color + "18", border: "1px solid " + stage.color + "30",
              fontSize: 11, fontWeight: 800, color: stage.color,
              fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 1,
            }}>{stage.num}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: "'Outfit', sans-serif" }}>
                {stage.name}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                <span style={{ fontSize: 13 }}>{agentObj?.emoji}</span>
                <span style={{ fontSize: 10, color: agentObj?.color, fontFamily: "'IBM Plex Mono', monospace" }}>
                  {agentObj?.name}
                </span>
              </div>
            </div>
          </div>
          <span style={{ color: C.dim, fontSize: 16, transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "none", marginTop: 4 }}>
            {"\u25BE"}
          </span>
        </div>
        {expanded && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid " + C.faint }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: C.dim, marginBottom: 5,
                fontFamily: "'IBM Plex Mono', monospace" }}>WHAT HAPPENS</div>
              <p style={{ fontSize: 12.5, color: C.text, lineHeight: 1.7, margin: 0 }}>{stage.what}</p>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: C.dim, marginBottom: 5,
                fontFamily: "'IBM Plex Mono', monospace" }}>OUTPUT</div>
              <p style={{ fontSize: 12, color: C.soft, lineHeight: 1.6, margin: 0,
                padding: "8px 12px", background: C.bg, borderRadius: 6, border: "1px solid " + C.faint }}>{stage.output}</p>
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: C.dim, marginBottom: 5,
                fontFamily: "'IBM Plex Mono', monospace" }}>AUTOMATION</div>
              <p style={{ fontSize: 12, color: C.success, lineHeight: 1.5, margin: 0 }}>{stage.auto}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN APP ───
export default function CoursePipelineBlueprint() {
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("overview");
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setPulse((p) => (p + 1) % 7), 2000);
    return () => clearInterval(t);
  }, []);

  const sections = [
    { id: "overview", label: "Overview" },
    { id: "agents", label: "Agents" },
    { id: "pipeline", label: "Pipeline" },
    { id: "tracking", label: "Tracking" },
    { id: "schedule", label: "Schedule" },
    { id: "command", label: "Command" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Outfit', sans-serif", color: C.text }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;700&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes pipeGlow { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }
        @keyframes loopArrow { 0% { transform: translateX(0); } 50% { transform: translateX(4px); } 100% { transform: translateX(0); } }
      `}</style>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 20px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{
            fontSize: 9, fontWeight: 800, letterSpacing: 5,
            color: C.hawk, fontFamily: "'IBM Plex Mono', monospace",
          }}>ACHIEVEMOR AUTONOMOUS SYSTEMS</div>
          <h1 style={{
            fontSize: 24, fontWeight: 800, margin: "10px 0 4px",
            fontFamily: "'Playfair Display', serif",
            background: "linear-gradient(135deg, " + C.text + " 30%, " + C.hawk + ")",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>Course Acceleration Pipeline</h1>
          <div style={{ fontSize: 11, color: C.dim, fontFamily: "'IBM Plex Mono', monospace" }}>
            cti.foi.cloud → learn2achievemor.us — Fully Autonomous Loop
          </div>
        </div>

        {/* Section Nav */}
        <div style={{
          display: "flex", gap: 2, marginTop: 20, marginBottom: 28,
          borderBottom: "1px solid " + C.border, overflowX: "auto",
        }}>
          {sections.map((s) => (
            <button key={s.id} onClick={() => setActiveSection(s.id)} style={{
              padding: "10px 14px", background: "transparent", border: "none",
              borderBottom: "2px solid " + (activeSection === s.id ? C.hawk : "transparent"),
              color: activeSection === s.id ? C.hawk : C.dim, cursor: "pointer",
              fontSize: 11, fontWeight: 600, fontFamily: "'Outfit', sans-serif",
              letterSpacing: 0.5, transition: "all 0.2s", whiteSpace: "nowrap",
            }}>{s.label}</button>
          ))}
        </div>

        {/* ─── OVERVIEW ─── */}
        {activeSection === "overview" && (
          <div>
            <SectionHead num="00" title="What This Pipeline Does" sub="The complete autonomous loop — from discovering unsold course seats to selling them through your Shopify store." />

            <div style={{
              background: C.panel, border: "1px solid " + C.border, borderRadius: 8,
              padding: 20, marginBottom: 20,
            }}>
              <div style={{ fontSize: 13, lineHeight: 1.8, color: C.text }}>
                <span style={{ color: C.hawk, fontWeight: 700 }}>The Problem:</span> Colleges and course platforms have unsold seats sitting idle — self-paced courses, expiring cohorts, undersold bootcamps. That&apos;s dead inventory for them and missed opportunity for learners.
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.8, color: C.text, marginTop: 12 }}>
                <span style={{ color: C.hawk, fontWeight: 700 }}>The Pipeline:</span> Your agents autonomously discover these seats, outreach to partner with providers, negotiate discounts, list them on cti.foi.cloud with countdown timers, sell them through learn2achievemor.us (Shopify), track attribution via referral codes, and reconcile payouts — then loop back and do it again.
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.8, color: C.text, marginTop: 12 }}>
                <span style={{ color: C.hawk, fontWeight: 700 }}>Your Role:</span> Chicken Hawk monitors via Telegram. Approves edge cases. Everything else runs on its own.
              </div>
            </div>

            {/* Visual Loop */}
            <div style={{
              background: C.panel, border: "1px solid " + C.border, borderRadius: 8,
              padding: 20, display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", alignItems: "center",
            }}>
              {PIPELINE.map((s, i) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{
                    padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                    background: pulse === i ? s.color + "20" : C.bg,
                    border: "1px solid " + (pulse === i ? s.color : C.faint),
                    color: pulse === i ? s.color : C.soft,
                    fontFamily: "'IBM Plex Mono', monospace",
                    transition: "all 0.5s",
                  }}>{s.name}</div>
                  {i < PIPELINE.length - 1 && (
                    <span style={{ color: C.dim, fontSize: 12, animation: pulse === i ? "loopArrow 1s infinite" : "none" }}>{"\u2192"}</span>
                  )}
                </div>
              ))}
              <span style={{ color: C.hawk, fontSize: 14, marginLeft: 6, animation: "loopArrow 1.5s infinite" }}>{"\u21BA"}</span>
            </div>

            <div style={{
              marginTop: 16, padding: "12px 16px", background: C.hawkDim,
              border: "1px solid " + C.hawk + "20", borderRadius: 6,
              fontSize: 11, color: C.hawk, textAlign: "center",
              fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.5,
            }}>
              CONTINUOUS LOOP — No manual intervention after Chicken Hawk approves bounds
            </div>
          </div>
        )}

        {/* ─── AGENTS ─── */}
        {activeSection === "agents" && (
          <div>
            <SectionHead num="01" title="Agent Hierarchy"
              sub="Four agent tiers governing the pipeline. Chicken Hawk commands via Telegram. ACHEEVY orchestrates. Minions execute." />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {AGENTS.map((a) => (
                <AgentCard key={a.id} agent={a}
                  expanded={expandedAgent === a.id}
                  onToggle={() => setExpandedAgent(expandedAgent === a.id ? null : a.id)} />
              ))}
            </div>

            <div style={{
              marginTop: 20, padding: 16, background: C.panel, border: "1px solid " + C.border,
              borderRadius: 8,
            }}>
              <div style={{
                fontSize: 9, fontWeight: 800, letterSpacing: 2, color: C.hawk,
                fontFamily: "'IBM Plex Mono', monospace", marginBottom: 10,
              }}>FRAMEWORK LAYER</div>
              <div style={{ display: "flex", gap: 10 }}>
                {[
                  { name: "NemoClaw", role: "Agent framework — manages Boomer_Ang + Lil_Hawk task queues, retries, error handling", color: C.acheevy },
                  { name: "Hermes", role: "Messaging agent — Telegram bot, email delivery, webhook routing", color: C.lil },
                ].map((f) => (
                  <div key={f.name} style={{
                    flex: 1, padding: 12, background: C.bg, borderRadius: 6,
                    border: "1px solid " + C.faint,
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: f.color }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: C.soft, marginTop: 4, lineHeight: 1.5 }}>{f.role}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── PIPELINE ─── */}
        {activeSection === "pipeline" && (
          <div>
            <SectionHead num="02" title="7-Stage Pipeline"
              sub="Each stage fires autonomously. Tap a stage to see exactly what happens, what it outputs, and how it's automated." />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {PIPELINE.map((s, i) => (
                <PipelineStage key={s.id} stage={s} index={i}
                  expanded={expandedStage === s.id}
                  onToggle={() => setExpandedStage(expandedStage === s.id ? null : s.id)} />
              ))}
            </div>
            <div style={{
              marginTop: 16, padding: "10px 14px", background: C.hawkDim,
              border: "1px solid " + C.hawk + "20", borderRadius: 6,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <span style={{ animation: "loopArrow 1.5s infinite", fontSize: 14, color: C.hawk }}>{"\u21BA"}</span>
              <span style={{ fontSize: 11, color: C.hawk, fontFamily: "'IBM Plex Mono', monospace" }}>
                RECONCILE feeds back into SCOUT — continuous improvement loop
              </span>
            </div>
          </div>
        )}

        {/* ─── TRACKING ─── */}
        {activeSection === "tracking" && (
          <div>
            <SectionHead num="03" title="Attribution Tracking"
              sub="No cookies required. Referral codes embedded in URLs give you clean, GDPR-safe attribution." />

            <div style={{
              background: C.panel, border: "1px solid " + C.border, borderRadius: 8,
              padding: 20, marginBottom: 16,
            }}>
              <div style={{
                fontSize: 9, fontWeight: 800, letterSpacing: 2, color: C.success,
                fontFamily: "'IBM Plex Mono', monospace", marginBottom: 10,
              }}>METHOD: {TRACKING_MODEL.method.toUpperCase()}</div>
              <p style={{ fontSize: 13, color: C.text, lineHeight: 1.75, margin: 0 }}>
                {TRACKING_MODEL.explanation}
              </p>
            </div>

            <div style={{
              background: C.panel, border: "1px solid " + C.border, borderRadius: 8,
              padding: 20,
            }}>
              <div style={{
                fontSize: 9, fontWeight: 800, letterSpacing: 2, color: C.hawk,
                fontFamily: "'IBM Plex Mono', monospace", marginBottom: 14,
              }}>ATTRIBUTION FLOW</div>
              {TRACKING_MODEL.flow.map((step, i) => (
                <div key={i} style={{
                  display: "flex", gap: 12, alignItems: "flex-start", marginBottom: i < TRACKING_MODEL.flow.length - 1 ? 14 : 0,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: C.success + "15", border: "1px solid " + C.success + "30",
                    fontSize: 11, fontWeight: 800, color: C.success,
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}>{i + 1}</div>
                  <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.6, paddingTop: 4 }}>{step}</div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: 16, padding: 16, background: C.bg,
              border: "1px solid " + C.faint, borderRadius: 8,
            }}>
              <div style={{
                fontSize: 9, fontWeight: 800, letterSpacing: 2, color: C.dim,
                fontFamily: "'IBM Plex Mono', monospace", marginBottom: 8,
              }}>EXAMPLE URL</div>
              <code style={{
                display: "block", padding: 12, background: C.panel, borderRadius: 6,
                fontSize: 12, color: C.acheevy, fontFamily: "'IBM Plex Mono', monospace",
                wordBreak: "break-all", lineHeight: 1.6,
                border: "1px solid " + C.acheevy + "20",
              }}>
                learn2achievemor.us/courses/python-bootcamp?ref=<span style={{ color: C.hawk }}>ACMR</span>-<span style={{ color: C.boomer }}>UDEMY</span>-<span style={{ color: C.lil }}>4821</span>
              </code>
              <div style={{ display: "flex", gap: 14, marginTop: 10 }}>
                <span style={{ fontSize: 10, color: C.hawk, fontFamily: "'IBM Plex Mono', monospace" }}>ACMR = Us</span>
                <span style={{ fontSize: 10, color: C.boomer, fontFamily: "'IBM Plex Mono', monospace" }}>UDEMY = Partner</span>
                <span style={{ fontSize: 10, color: C.lil, fontFamily: "'IBM Plex Mono', monospace" }}>4821 = Course ID</span>
              </div>
            </div>
          </div>
        )}

        {/* ─── SCHEDULE ─── */}
        {activeSection === "schedule" && (
          <div>
            <SectionHead num="04" title="Autonomous Schedule"
              sub="Every task runs on a trigger or cron. The pipeline never sleeps." />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {SCHEDULE.cycles.map((c, i) => {
                const agentObj = AGENTS.find((a) => a.id === c.agent);
                return (
                  <div key={i} style={{
                    display: "flex", gap: 12, alignItems: "center",
                    padding: "12px 14px", background: C.panel,
                    border: "1px solid " + C.border, borderRadius: 6,
                  }}>
                    <div style={{
                      width: 90, flexShrink: 0, fontSize: 10, fontWeight: 700,
                      color: C.success, fontFamily: "'IBM Plex Mono', monospace",
                      letterSpacing: 0.5,
                    }}>{c.freq}</div>
                    <div style={{ flex: 1, fontSize: 12, color: C.text }}>{c.task}</div>
                    <span style={{ fontSize: 12 }}>{agentObj?.emoji}</span>
                  </div>
                );
              })}
            </div>

            <div style={{
              marginTop: 20, padding: 16, background: C.panel, border: "1px solid " + C.border, borderRadius: 8,
            }}>
              <div style={{
                fontSize: 9, fontWeight: 800, letterSpacing: 2, color: C.hawk,
                fontFamily: "'IBM Plex Mono', monospace", marginBottom: 10,
              }}>LISTING LIFECYCLE</div>
              <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.75 }}>
                Courses appear on <span style={{ color: C.acheevy }}>cti.foi.cloud/discounted-courses</span> at the promo window start time. Each listing shows a countdown timer. When the timer hits zero or seats sell out, the listing auto-removes. No stale inventory. No manual cleanup.
              </div>
              <div style={{
                marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap",
              }}>
                {["Promo starts \u2192 Auto-publish", "Timer expires \u2192 Auto-remove", "Seats sold out \u2192 Auto-remove", "Partner cancels \u2192 Auto-remove"].map((r) => (
                  <span key={r} style={{
                    fontSize: 10, padding: "4px 10px", borderRadius: 4,
                    background: C.success + "10", border: "1px solid " + C.success + "25",
                    color: C.success, fontFamily: "'IBM Plex Mono', monospace",
                  }}>{r}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── COMMAND CHAIN ─── */}
        {activeSection === "command" && (
          <div>
            <SectionHead num="05" title="Command & Control"
              sub="Three governance tiers. Chicken Hawk has final authority via Telegram. ACHEEVY has pre-approved autonomy within bounds." />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {COMMAND_CHAIN.layers.map((layer, i) => (
                <div key={i} style={{
                  background: C.panel, border: "1px solid " + layer.color + "30",
                  borderRadius: 8, padding: 18, borderLeft: "3px solid " + layer.color,
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: layer.color, fontFamily: "'Outfit', sans-serif" }}>
                    {layer.name}
                  </div>
                  <div style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: 2, color: C.soft,
                    fontFamily: "'IBM Plex Mono', monospace", marginTop: 2,
                  }}>{layer.sub}</div>
                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                    {layer.items.map((item, j) => (
                      <div key={j} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <span style={{ color: layer.color, fontSize: 8, marginTop: 5 }}>{"\u25CF"}</span>
                        <span style={{ fontSize: 12, color: C.text, lineHeight: 1.5 }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: 20, padding: 16, background: C.hawkDim,
              border: "1px solid " + C.hawk + "25", borderRadius: 8,
            }}>
              <div style={{
                fontSize: 9, fontWeight: 800, letterSpacing: 2, color: C.hawk,
                fontFamily: "'IBM Plex Mono', monospace", marginBottom: 10,
              }}>TELEGRAM COMMANDS (CHICKEN HAWK)</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {[
                  { cmd: "/status", desc: "Pipeline status + active listings" },
                  { cmd: "/approve [id]", desc: "Approve flagged partnership" },
                  { cmd: "/reject [id]", desc: "Reject flagged partnership" },
                  { cmd: "/pause", desc: "Pause all outreach" },
                  { cmd: "/resume", desc: "Resume pipeline" },
                  { cmd: "/bounds", desc: "View/set discount bounds" },
                  { cmd: "/report", desc: "On-demand sales report" },
                  { cmd: "/kill [listing]", desc: "Force-remove a listing" },
                ].map((c) => (
                  <div key={c.cmd} style={{
                    padding: "8px 10px", background: C.bg, borderRadius: 4,
                    border: "1px solid " + C.faint,
                  }}>
                    <code style={{ fontSize: 11, color: C.hawk, fontFamily: "'IBM Plex Mono', monospace" }}>{c.cmd}</code>
                    <div style={{ fontSize: 10, color: C.soft, marginTop: 2 }}>{c.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          textAlign: "center", marginTop: 44, paddingTop: 20,
          borderTop: "1px solid " + C.border,
        }}>
          <div style={{ fontSize: 9, color: C.dim, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 1.5 }}>
            ACHIEVEMOR AUTONOMOUS SYSTEMS — COURSE PIPELINE BLUEPRINT v1.0
          </div>
          <div style={{ fontSize: 9, color: C.dim, marginTop: 4 }}>
            cti.foi.cloud + learn2achievemor.us + Telegram C2
          </div>
        </div>
      </div>
    </div>
  );
}
