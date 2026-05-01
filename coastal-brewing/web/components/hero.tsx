import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const FILTER_PILLS = [
  { label: "coffee", href: "/products?cat=coffee" },
  { label: "tea", href: "/products?cat=tea" },
  { label: "matcha", href: "/products?cat=matcha" },
  { label: "/run-the-rest", href: "/products" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div className="container grid gap-12 py-20 md:grid-cols-12 md:gap-12 md:py-28 lg:py-32">
        {/* Left column — statement-led */}
        <div className="flex flex-col justify-center md:col-span-7">
          {/* Filter pills */}
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

          {/* Headline — owner directive 2026-04-30: motto applies per-product,
              not catalog-wide (we carry flavored + mushroom too). The
              catalog-wide truthful line is the homepage promise; the motto
              appears conditionally on product detail pages where eligible. */}
          <h1 className="font-display font-semibold tracking-[-0.02em] leading-[1.05] text-[clamp(40px,7vw,88px)]">
            Every cup is what
            <br />
            the label says it is.
          </h1>

          {/* Subhead */}
          <p className="mt-8 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Small-batch coffee, whole-leaf tea, ceremonial matcha. Flavored blends and functional brews,
            too — every ingredient on the label, every public claim with a paper trail. Sourced through
            verified partners.
          </p>

          {/* Subscription handshake chip */}
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

        {/* Right column — Sal_Ang at the canonical pop-up coffee bar.
            This IS the brand. Hard tactical visor with SAL in glowing
            orange LED, cream linen jacket, long-spouted Ethiopian copper
            pot, marsh and palm-frond Lowcountry register. The image
            anchors the entire site visually — every other surface
            (counter dressing, packaging, scene composition) traces
            back here per design.md §11.0. */}
        <div className="relative md:col-span-5">
          <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-border/60 bg-card shadow-lg">
            <Image
              src="/team/sal_ang.png"
              alt="Sal_Ang at the Coastal Brewing pop-up — pouring Ethiopian coffee from a long-spouted copper pot at a marsh-edge counter, cream linen uniform, hard tactical visor with SAL in glowing orange."
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              className="object-cover"
              priority
            />
          </div>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Sal · Sales lead at the dock
          </p>
        </div>
      </div>
    </section>
  );
}
