import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function TeamRibbon() {
  return (
    <section className="border-y border-border/60">
      <div className="container flex flex-col items-start justify-between gap-6 py-16 md:flex-row md:items-end md:py-20">
        <div className="max-w-2xl">
          <p className="eyebrow">Meet the team</p>
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-[-0.02em] md:text-4xl">
            A roastery without a roaster. A staff without staff.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Coastal is run by two AI teams on call around the clock. Sales finds your blend, builds bundles,
            and walks you to checkout. Marketing tells our story and runs the funnel. Both work behind a
            policy gate that catches anything they shouldn&apos;t say or do — and route every supplier order,
            every refund, every claim straight to Jarrett, our founder and the only human in the loop. He
            signs everything before it leaves the building. <span className="italic">(There is no building.)</span>
          </p>
        </div>
        <Link
          href="/team"
          className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wordmark text-foreground hover:text-muted-foreground"
        >
          See the team <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </section>
  );
}
