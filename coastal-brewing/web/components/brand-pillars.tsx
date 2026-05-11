"use client";

// Brand-pillar strip below the cinematic hero. Three values, scroll-
// staggered into view. Sets the editorial tone before the product grid.

import { ScrollReveal } from "@/components/scroll-reveal";

const PILLARS = [
  {
    eyebrow: "01",
    title: "We source it.",
    body: "Direct-rebrand from a Fairtrade-certified roaster. Specialty-grade beans, transparent farms, no mystery blends.",
  },
  {
    eyebrow: "02",
    title: "We serve it.",
    body: "Sal pours, LUC runs the math, Melli holds the bulk lane, ACHEEVY signs the floor. Real associates, on call all day.",
  },
  {
    eyebrow: "03",
    title: "We stand by it.",
    body: "Your fault, our fault, nobody's fault — we don't ship coffee back. We make it right with what's already in your hand.",
  },
];

export function BrandPillars() {
  return (
    <section className="border-b border-border/50 bg-card/20">
      <div className="container py-20 md:py-28">
        <ScrollReveal>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Three things you can hold us to
          </p>
          <h2 className="mt-3 font-display text-[clamp(28px,4vw,44px)] font-semibold tracking-[-0.02em] leading-[1.05]">
            Sourced with care.
            <span className="block text-foreground/55">
              Nothing chemically, ever.
            </span>
          </h2>
        </ScrollReveal>

        <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {PILLARS.map((p, i) => (
            <ScrollReveal key={p.eyebrow} delay={0.08 * (i + 1)}>
              <div className="border-l border-border/60 pl-5 transition-colors hover:border-accent/60">
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  {p.eyebrow}
                </p>
                <h3 className="mt-2 font-display text-2xl font-semibold tracking-[-0.01em]">
                  {p.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {p.body}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
