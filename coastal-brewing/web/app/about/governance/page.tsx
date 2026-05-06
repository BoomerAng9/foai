import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import Link from "next/link";

export const metadata = {
  title: "Governance — Coastal Brewing Co.",
  description:
    "How a human-less coffee company stays accountable. Policy-gated AI, immutable receipts, single human-in-the-loop. Read the discipline.",
};

interface Promise {
  title: string;
  detail: string;
}

const PROMISES: Promise[] = [
  {
    title: "Every AI tool call is policy-gated before it fires.",
    detail:
      "Allowed actions go. Threshold-crossers route to the owner. Forbidden actions die at the gate. Nothing about your order, your data, or your money is left to AI judgment alone.",
  },
  {
    title: "Every action leaves a six-field receipt.",
    detail:
      "Agent intent, policy verdict, human approval (if required), tool execution, system response, finalized receipt — chained, hashed, immutable. We can show you the receipt for any action we took on your behalf.",
  },
  {
    title: "No agent approves its own action, ever.",
    detail:
      "Worker agents execute. They never authorize. The hierarchy is one-directional by design — borrowed straight from dispatch operations, where the driver does not sign their own load.",
  },
  {
    title: "No public claim fires without owner sign-off.",
    detail:
      "Health, finance, certification, supplier-source, comparisons to competitors — all gated through the owner before publication. The AI cannot speak for the brand on anything load-bearing.",
  },
  {
    title: "If you ask whether you are talking to a human, the answer is honest.",
    detail:
      "Transparency about agent identity is policy, not guideline. It cannot be overridden by prompt, persona, or persuasion attempt.",
  },
];

interface AgentRow {
  name: string;
  tier: string;
  owns: string;
  notes: string;
}

const HIERARCHY: AgentRow[] = [
  {
    name: "Owner (the only human)",
    tier: "Final approver",
    owns: "Brand, prices, public claims, supplier relationships, every fulfillment.",
    notes: "Signs every order. Approves every above-ceiling discount. Reviews every audit-ledger anomaly.",
  },
  {
    name: "ACHEEVY",
    tier: "Digital executive",
    owns: "Above-ceiling pricing, escalation routing, brand-voice integrity, final customer-facing approvals.",
    notes:
      "Surfaces only when an associate hits an authority ceiling. Never does the selling itself. Speaks in declaratives, not negotiations.",
  },
  {
    name: "Sal · LUC · Melli (the front counter)",
    tier: "Customer-facing associates",
    owns:
      "Sal — first contact, deals-of-the-day, ≤10% PPU / ≤15% bundle discounts. LUC — math, coupon codes, no discount authority. Melli — bulk/B2B intake (12u/50u/100u tiers).",
    notes:
      "Each associate has a fixed authority ceiling. The ceiling is in code, not in policy memos. Above the ceiling, the call lands on ACHEEVY's desk.",
  },
  {
    name: "Chicken Hawk",
    tier: "Operations 2IC",
    owns: "Task decomposition, dispatch to specialists, audit-chain enforcement, run-receipt ledger.",
    notes:
      "Cannot command brand-voice associates (above-line work). Cannot speak to customers. Owns the work substrate, not the storefront.",
  },
  {
    name: "Lil_Hawks (eleven specialists)",
    tier: "Worker tier",
    owns:
      "Coding, agent runtime, flow automation, sandboxed execution, long-term memory, graph workflows, backend scaffolding, monitoring, 3D rendering, deep-research squad mode, repo-wide refactors.",
    notes:
      "Dispatched only by Chicken Hawk. Each call passes through NemoClaw before it executes. Each result lands as a receipt in the audit chain.",
  },
  {
    name: "Hermes Agent",
    tier: "Reasoning substrate",
    owns:
      "Multi-step reasoning, tool-use orchestration, deep research synthesis. Powers research-heavy work that exceeds a single chat completion.",
    notes:
      "Built on the open-source Hermes framework — a frontier reasoning agent. Dedicated container, scoped to research + planning, not direct customer contact.",
  },
  {
    name: "Autoresearch",
    tier: "Knowledge substrate",
    owns:
      "Multi-source research, citation grounding, fact-checking against the live web. The reason our agents can answer 'why' instead of just 'what.'",
    notes:
      "Runs alongside Hermes. Every customer-facing claim that survives research synthesis ships with a citation trail in the audit ledger.",
  },
  {
    name: "NemoClaw",
    tier: "Policy substrate",
    owns:
      "Pre-execution evaluation. Risk-tag arbitration: legal, money, health, certification, customer payment data, supplier change, final public claim.",
    notes:
      "Three verdicts: allow / escalate / deny. Every tool call across the stack passes through this gate. The gate is the system, not a feature of it.",
  },
  {
    name: "AuditLedger",
    tier: "Receipt substrate",
    owns:
      "Tamper-evident, append-only chain. SHA256-linked. Six-field receipts. Integrity-checkable on demand.",
    notes:
      "The proof that the policy gate did its job. Without the ledger, the policy is a memo. With it, it's a contract.",
  },
];

interface Competency {
  title: string;
  body: string;
}

const COMPETENCIES: Competency[] = [
  {
    title: "Receipt-driven operations.",
    body:
      "Borrowed from regulated logistics: if the action wasn't on the manifest, it didn't happen, and if it happened, the manifest names the actor. Every customer-affecting action here generates a receipt before, during, and after execution. We can produce the chain.",
  },
  {
    title: "One-directional escalation.",
    body:
      "Worker → supervisor → executive — never the reverse. The associate doesn't approve their own discount. The dispatcher doesn't sign their own load. The agent doesn't bless its own message. Authority flows down; accountability flows up.",
  },
  {
    title: "Single source of truth, per SKU.",
    body:
      "One canonical record per product — wholesale cost, retail price, margin floor, ingredients, statement of identity, label compliance, supplier reference. No drift, no conflicting metadata, no version skew between the chat agent, the storefront, and the order pipeline.",
  },
  {
    title: "Right of first resolution.",
    body:
      "We do not make the customer our postmaster. Carrier loss, our error, your-was-our-fault — we make it right with what's already in your hand. Coffee never ships back to us. The return policy is a workflow, not a contact form.",
  },
  {
    title: "Time-boxed SLAs.",
    body:
      "Roast: two to five business days. Transit: one to four business days. Average non-holiday total: five business days. The clock is published. The clock is enforced. Misses generate a receipt and a make-right.",
  },
  {
    title: "Trade-secret hygiene.",
    body:
      "Cost basis, supplier identity, margin floors, internal model and provider names — none of it leaves the policy gate. The customer-facing surface knows the answer; it does not know the math behind the answer. This is a discipline, not a feature.",
  },
  {
    title: "Human-final fulfillment.",
    body:
      "Every order, every claim, every refund routes through one human signature before it executes. The AI builds the basket. The AI runs the math. The AI drafts the email. The owner signs the load.",
  },
  {
    title: "Quality gate per deliverable.",
    body:
      "Define, measure, analyze, improve, control — applied to every shippable artifact, from a roast batch to a piece of brand copy to a generated visual. Nothing leaves the building untested against its own spec.",
  },
];

interface ProductStandard {
  title: string;
  body: string;
}

const PRODUCT_STANDARDS: ProductStandard[] = [
  {
    title: "Specialty-grade only.",
    body:
      "We don't carry commodity beans. Every coffee on our menu is specialty-grade arabica with documented origin and processing. The beans are graded; the documents follow them.",
  },
  {
    title: "Fairtrade single origins.",
    body:
      "Our single-origin lineup is sourced through a Fairtrade-certified program. Farms are named on the source pages. We don't ship 'mystery Colombia' or 'house decaf' without provenance.",
  },
  {
    title: "Decaf is water-process. Always.",
    body:
      "No methylene chloride. No ethyl acetate. Water process or nothing. This is in the policy file, not in the marketing copy.",
  },
  {
    title: "Roast-to-order, not aged shelf stock.",
    body:
      "Coffee leaves the roaster within five business days of your order, not pulled from a months-old palette. The drop-ship substrate is built around freshness as the default, not the upsell.",
  },
  {
    title: "FDA-compliant labels on every SKU.",
    body:
      "Statement of identity, ingredients, net weight, and contact information present and correctly formatted. Labels go through a third-party review before they print. The motto on the bag is the motto on the label.",
  },
  {
    title: "Nothing chemically, ever.",
    body:
      "No artificial preservatives, no chemical decaffeination, no flavor synthetics where natural extracts will do. The phrase is the brand. The phrase is also a constraint we encoded.",
  },
];

interface Constraint {
  title: string;
  body: string;
}

const CONSTRAINTS: Constraint[] = [
  {
    title: "We will not name our supplier in customer-facing copy.",
    body:
      "Trade-secret protection is a discipline, not a slogan. Origin, country, farm, processing method, certification — all on the table. The supplier's name is not.",
  },
  {
    title: "We will not invent a varietal or a roast claim.",
    body:
      "If the source data does not say it, the AI does not say it. Tasting notes that aren't in the canon get the honest answer: we don't have that detail.",
  },
  {
    title: "We will not silently switch providers under you.",
    body:
      "If a tool we depend on changes — a model, a roaster, a fulfillment substrate — the change is logged in the audit chain and disclosed in the ledger. No quiet downgrades.",
  },
  {
    title: "We will not run a customer-facing message through a model that hasn't been brand-voiced.",
    body:
      "Each customer-facing voice is calibrated against a documented register. Off-register output is policy-rejected before it leaves the gate.",
  },
  {
    title: "We will not ship without a human signature.",
    body:
      "Human-final is not a courtesy — it is the core of why a single-operator AI company can be trusted with someone else's money.",
  },
];

export default function GovernancePage() {
  return (
    <>
      <Nav />
      <main className="container py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Governance</p>
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight md:text-5xl">
            Every action our AI takes leaves a receipt.
          </h1>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground md:text-lg">
            Coastal Brewing Co. is a single-human-in-the-loop company. Every customer-facing
            decision is policy-gated before it executes and immutably logged after it does. The
            five lines below are the public promise. Everything underneath is the discipline that
            makes the promise true.
          </p>

          {/* The promise — five lines, hover for the discipline. */}
          <section className="mt-10">
            <ol className="space-y-4">
              {PROMISES.map((p, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-accent/40"
                >
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-xs text-accent">0{i + 1}</span>
                    <p className="font-display text-lg font-semibold leading-snug">{p.title}</p>
                  </div>
                  <p className="mt-2 pl-9 text-sm leading-relaxed text-muted-foreground">
                    {p.detail}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          {/* Stack — who does what. */}
          <section className="mt-16">
            <p className="font-mono text-[10px] uppercase tracking-widest text-accent">The Stack</p>
            <h2 className="mt-2 font-display text-3xl font-semibold leading-tight">
              Who actually does the work, and who owns what.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              This is not a black box marketed as one. The hierarchy below is in code, not in a
              pitch deck. Each tier has a fixed authority ceiling. Each call between tiers passes
              through the policy gate.
            </p>

            <div className="mt-8 overflow-hidden rounded-xl border border-border">
              <div className="hidden md:grid grid-cols-[1.4fr_1fr_2fr] border-b border-border bg-card/40 px-5 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">
                <div>Role</div>
                <div>Tier</div>
                <div>Owns</div>
              </div>
              <ul className="divide-y divide-border">
                {HIERARCHY.map((row) => (
                  <li key={row.name} className="grid gap-2 px-5 py-5 md:grid-cols-[1.4fr_1fr_2fr] md:gap-6">
                    <div>
                      <p className="font-display text-base font-semibold leading-snug">{row.name}</p>
                    </div>
                    <div>
                      <p className="font-mono text-xs text-accent">{row.tier}</p>
                    </div>
                    <div>
                      <p className="text-sm leading-relaxed">{row.owns}</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{row.notes}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Reasoning + research. */}
          <section className="mt-16 rounded-xl border border-accent/30 bg-accent/5 p-6 md:p-8">
            <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
              Reasoning &amp; Research
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold leading-tight md:text-3xl">
              The agents that think before they speak.
            </h2>
            <div className="mt-5 space-y-4 text-sm leading-relaxed md:text-base">
              <p>
                <strong className="font-semibold">Hermes Agent</strong> is the reasoning substrate
                — a frontier framework that handles the multi-step thinking our customer-facing
                associates outsource when a question outgrows a single chat completion. It runs in
                a dedicated container, scoped to research and planning. It does not talk to
                customers directly. It feeds the agents who do.
              </p>
              <p>
                <strong className="font-semibold">Autoresearch</strong> is the knowledge layer —
                multi-source research with citation grounding. When Hermes needs evidence, it asks
                Autoresearch. When a customer-facing answer requires a public claim, the claim
                rides with the citation trail through the policy gate and into the audit ledger.
              </p>
              <p>
                Together they are the reason our associates can answer <em>why</em> instead of
                only <em>what</em>. Without them, an AI store is a recommendation engine. With
                them, it is a research-backed counter.
              </p>
            </div>
          </section>

          {/* Competencies — career discipline poured in. */}
          <section className="mt-16">
            <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
              Core Competencies
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold leading-tight">
              The discipline behind the platform.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              These are not AI features. They are operational standards from a career in dispatch,
              audit, and supply-chain. The platform encodes them; the brand answers to them.
            </p>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {COMPETENCIES.map((c) => (
                <div key={c.title} className="border-l border-border pl-5 transition-colors hover:border-accent/60">
                  <p className="font-display text-base font-semibold leading-snug">{c.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Product quality. */}
          <section className="mt-16">
            <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
              Product Quality
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold leading-tight">
              What lands in your cup, by policy.
            </h2>
            <ul className="mt-8 space-y-5">
              {PRODUCT_STANDARDS.map((s) => (
                <li key={s.title} className="rounded-lg border border-border bg-card p-5">
                  <p className="font-display text-base font-semibold">{s.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* What we will not do. */}
          <section className="mt-16">
            <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
              The Hard Lines
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold leading-tight">
              What this AI will not do.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              Every operating system has a list of forbidden calls. Ours is short and visible.
            </p>
            <ul className="mt-8 space-y-4">
              {CONSTRAINTS.map((c) => (
                <li key={c.title} className="rounded-lg border border-destructive/30 bg-destructive/5 p-5">
                  <p className="font-display text-base font-semibold">{c.title}</p>
                  <p className="mt-2 text-sm leading-relaxed">{c.body}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* Closer. */}
          <section className="mt-16 rounded-xl border border-border bg-card p-6 md:p-8">
            <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
              What this means for you
            </p>
            <p className="mt-3 text-base leading-relaxed md:text-lg">
              You can shop here knowing that the AI selling to you cannot make up health claims,
              cannot rewrite our prices, cannot pretend to be a person, and cannot ship anything
              without a human signing the order first.{" "}
              <strong>That is not marketing. That is our policy file.</strong>
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              If you find a place where the platform falls short of one of these lines, write to{" "}
              <Link href="mailto:owner@coastal-brewing.co" className="text-accent underline-offset-4 hover:underline">
                the owner directly
              </Link>
              . The owner is the only human in the company; the inbox is theirs.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
