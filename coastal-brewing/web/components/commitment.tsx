type Commitment = { label: string; line: string };

const COMMITMENTS: Commitment[] = [
  { label: "Sourcing", line: "Specialty-grade beans, SCA 80+, traced to roaster." },
  { label: "Claims", line: "Every public claim cites a verified Lot ID." },
  { label: "Health", line: "No fillers, no flavorings, no marketing health hype." },
  { label: "Pricing", line: "Standard rates published. Negotiated offers floor-bound." },
  { label: "Returns", line: "If the cup isn't what the label says, we make it right." },
  { label: "Data", line: "We don't sell your data. Receipts on every action." },
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
