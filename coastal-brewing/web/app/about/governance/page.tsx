import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export const metadata = {
  title: "Governance — Coastal Brewing Co.",
  description:
    "Every AI action at Coastal Brewing Co. is policy-gated and immutably logged. Read the receipt-keeping promise.",
};

const PROMISES = [
  {
    title: "NemoClaw evaluates every AI tool call before it fires.",
    detail: "Allowed actions go. Threshold-crossers route to Jarrett. Forbidden actions die.",
  },
  {
    title: "AuditLedger records six fields for every action.",
    detail:
      "Agent intent, policy verdict, human approval (if required), tool execution, system response, finalized receipt. Immutable.",
  },
  {
    title: "No agent approves its own action, ever.",
    detail: "Worker agents execute. They never authorize. The hierarchy is one-directional, by design.",
  },
  {
    title: "No public claim about a third party fires without owner sign-off.",
    detail:
      "Health, finance, certification claims, comparisons to competitors — all gated through Jarrett before publication.",
  },
  {
    title: "If you ask one of our AI agents whether it's a human, it will tell you it isn't.",
    detail: "Transparency about agent identity is policy, not guideline. It cannot be overridden.",
  },
];

export default function GovernancePage() {
  return (
    <>
      <Nav />
      <main className="container py-16">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Governance</p>
          <h1 className="mt-2 font-display text-4xl font-semibold md:text-5xl">
            Every action our AI takes leaves a receipt.
          </h1>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground">
            Coastal Brewing Co. operates with a single human-in-the-loop. To make that work safely, every
            customer-facing decision is policy-gated before it executes and immutably logged after it does.
            Here&apos;s the promise, in five lines:
          </p>

          <ol className="mt-8 space-y-5">
            {PROMISES.map((p, i) => (
              <li
                key={i}
                className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-accent/40"
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-xs text-accent">0{i + 1}</span>
                  <p className="font-display text-lg font-semibold leading-snug">{p.title}</p>
                </div>
                <p className="mt-2 pl-9 text-sm text-muted-foreground">{p.detail}</p>
              </li>
            ))}
          </ol>

          <div className="mt-12 rounded-lg border border-accent/30 bg-accent/5 p-6">
            <p className="font-mono text-[10px] uppercase tracking-widest text-accent">What this means for you</p>
            <p className="mt-3 text-base">
              You can shop here knowing that the AI selling to you can&apos;t make up health claims, can&apos;t
              rewrite our prices, can&apos;t pretend to be a person, and can&apos;t ship anything without a
              human signing the order first.{" "}
              <strong>That&apos;s not marketing. That&apos;s our policy file.</strong>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
