import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function TeamRibbon() {
  return (
    <section className="border-y border-border/60">
      <div className="container flex flex-col items-start justify-between gap-6 py-16 md:flex-row md:items-end md:py-20">
        <div className="max-w-2xl">
          <p className="eyebrow">Meet the team</p>
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-[-0.02em] md:text-4xl">
            Specialty coffee, whole-leaf tea, ceremonial matcha — handled with care at every step.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Coastal is powered by an AI-managed team on call around the clock. Sales finds your cup, builds
            bundles, and walks you to checkout. Marketing curates our story and connects us to our community.
            Every order, every claim, every refund runs through a policy gate and lands on the owner&apos;s
            desk for final sign-off. One human signature behind every cup.
          </p>
        </div>
        <Link
          href="/team"
          className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wordmark text-foreground hover:text-muted-foreground"
        >
          Meet the team <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </section>
  );
}
