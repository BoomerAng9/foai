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

          {/* Headline */}
          <h1 className="font-display font-semibold tracking-[-0.02em] leading-[1.05] text-[clamp(40px,7vw,88px)]">
            Nothing chemically,
            <br />
            ever.
          </h1>

          {/* Subhead */}
          <p className="mt-8 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Small-batch coffee, whole-leaf tea, ceremonial matcha. Sourced through verified partners.
            Every public claim has a paper trail. Every cup is what the label says it is.
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

        {/* Right column — atmospheric product photography */}
        <div className="relative md:col-span-5">
          <div className="relative aspect-[4/5] overflow-hidden bg-card">
            <img
              src="/static/mock-dark.png"
              alt="Coastal Brewing — coffee, tea, and matcha on a dark wooden surface with scattered beans and a bamboo whisk, warm directional light."
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
