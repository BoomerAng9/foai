type Commitment = { label: string; line: string };

const COMMITMENTS: Commitment[] = [
  { label: "Sourcing", line: "Only top-grade beans. We can tell you which farm yours came from." },
  { label: "Claims", line: "Anything we say on a label, we can prove. Just ask." },
  { label: "Health", line: "No fillers. No health hype. Flavored coffee uses natural flavors only — every ingredient is on the label." },
  { label: "Pricing", line: "Prices are posted up front. Want a deal? Talk to Sal — there's room to work with you." },
  { label: "Returns", line: "If the cup isn't what the label says, we'll make it right." },
  { label: "Data", line: "We don't sell your data. You get a receipt for every action." },
];

export function Commitment() {
  return (
    <section className="border-b border-border/60">
      <div className="container py-20 md:py-28">
        <div className="mb-12 max-w-2xl">
          <h2 className="font-display text-3xl font-semibold tracking-[-0.02em] md:text-5xl">
            The commitment.
          </h2>
          <p className="mt-4 text-sm text-muted-foreground">
            What sets us apart, top to bottom — and what doesn&apos;t.
          </p>
        </div>

        <div className="grid grid-cols-2 divide-y divide-border/60 md:grid-cols-3 md:divide-y-0 lg:grid-cols-6">
          {COMMITMENTS.map((c, i) => (
            <div
              key={c.label}
              className={`flex flex-col p-6 ${
                i % 2 === 1 ? "border-l border-border/60" : ""
              } md:border-l md:border-border/60 md:first:border-l-0 lg:first:border-l-0`}
            >
              <p className="font-mono text-[10px] uppercase tracking-wordmark text-muted-foreground">
                {c.label}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-foreground">{c.line}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
