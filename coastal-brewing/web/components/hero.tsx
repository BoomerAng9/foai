import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatPanel } from "@/components/chat-panel";

const FILTER_PILLS = [
  { label: "coffee", href: "/products?cat=coffee" },
  { label: "tea", href: "/products?cat=tea" },
  { label: "matcha", href: "/products?cat=matcha" },
  { label: "Shop All", href: "/products" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div className="container grid gap-12 py-20 md:grid-cols-12 md:gap-12 md:py-28 lg:py-32">
        {/* Left column — pills + tagline + subhead. The tagline mixes
            the quality we're working to provide ("brewed honest") with
            the agentic experience ACHEEVY delivers — owner directive
            2026-05-02 that the hero reads as both promise + chat. */}
        <div className="flex flex-col justify-center md:col-span-7">
          <div className="mb-10 flex flex-wrap gap-2">
            {FILTER_PILLS.map((p) => (
              <Link
                key={p.label}
                href={p.href}
                className={cn(
                  "pill text-foreground/70 hover:text-foreground hover:border-foreground/40 transition-colors"
                )}
              >
                {p.label}
              </Link>
            ))}
          </div>

          <h1 className="font-display font-semibold tracking-[-0.02em] leading-[1.05] text-[clamp(36px,6vw,72px)]">
            Coffee, tea, matcha
            <span className="block text-foreground/70">— brewed honest,</span>
            <span className="block text-accent">served by ACHEEVY.</span>
          </h1>

          <p className="mt-8 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Small-batch coffee, whole-leaf tea, ceremonial matcha — sourced
            through verified partners, every public claim with a paper trail.
            ACHEEVY is the AI team behind the counter. Talk to her.
          </p>

          <div className="mt-8">
            <Link
              href="/products?cat=subscription"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card/30 px-4 py-2 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              <Search className="h-3.5 w-3.5" />
              <span>subscriptions open with verified supplier handshakes</span>
            </Link>
          </div>
        </div>

        {/* Right column — ACHEEVY chat panel. The agentic experience is the
            first surface visitors meet, not a static portrait. Sal_Ang's
            portrait still anchors the /team page. */}
        <div className="relative md:col-span-5">
          <div className="h-[560px] md:h-[640px]">
            <ChatPanel initialAgent="sales" />
          </div>
          <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Live · ACHEEVY is online
          </p>
        </div>
      </div>
    </section>
  );
}
