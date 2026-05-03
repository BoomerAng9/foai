import Image from "next/image";
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
      <div className="container grid gap-10 py-16 md:grid-cols-12 md:gap-10 md:py-24 lg:py-28">
        {/* Left column — storefront hero image. The Coastal Brewing Co.
            shopfront with the wood-stork logo + signage in the window,
            Spanish moss draped from live oaks, palm fronds, and the
            Lowcountry sunset behind. Owner-supplied 2026-05-02. */}
        <div className="md:col-span-7">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-border/60 bg-card shadow-lg">
            <Image
              src="/coastal-brewing-co-storefront.png"
              alt="Coastal Brewing Co. storefront at sunset — wood-stork logo and 'Nothing chemically, ever.' on the window, Spanish moss hanging from a live oak, palm tree and oil lamp at the curb, brick walkway."
              fill
              sizes="(max-width: 768px) 100vw, 60vw"
              className="object-cover"
              priority
            />
          </div>

          {/* Filter pills + headline + paragraph stacked below the image */}
          <div className="mt-10">
            <div className="mb-8 flex flex-wrap gap-2">
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

            <h1 className="font-display font-semibold tracking-[-0.02em] leading-[1.05] text-[clamp(28px,4.5vw,48px)]">
              Specialty coffee, whole-leaf tea, ceremonial matcha
              <span className="block text-foreground/70">— handled with care at every step.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              Coastal Brewing Co. is powered by an AI-managed team on call
              around the clock. Sales finds your cup, builds bundles, and walks
              you to checkout. Marketing curates our story and connects us to
              our community. Every order, every claim, every refund runs
              through a policy gate and lands on the owner&apos;s desk for
              final sign-off.
            </p>

            <div className="mt-6">
              <Link
                href="/products?cat=subscription"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card/30 px-4 py-2 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                <Search className="h-3.5 w-3.5" />
                <span>subscriptions open with verified supplier handshakes</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Right column — ACHEEVY chat panel. The agentic experience is
            present alongside the brand visual on the hero. */}
        <div className="relative md:col-span-5">
          <div className="md:sticky md:top-6 h-[560px] md:h-[680px]">
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
