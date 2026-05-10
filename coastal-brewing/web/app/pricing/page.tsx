import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ScrollReveal } from "@/components/scroll-reveal";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Subscriptions & Bundles — Coastal Brewing Co.",
  description:
    "Monthly coffee + tea subscriptions, sample-pack flights, and bundles for the way you brew. Save when you subscribe — every order is a conversation.",
};

// ─────────────────────────── Subscriptions ───────────────────────────

type Subscription = {
  sku: string;
  name: string;
  tagline: string;
  price: string;
  priceNote: string;
  image: string;
  whatYouGet: string[];
  cta: { label: string; href: string };
  recommended?: boolean;
};

const SUBSCRIPTIONS: Subscription[] = [
  {
    sku: "coastal-tea-monthly",
    name: "Tea Monthly",
    tagline: "A new Lowcountry Tea every month.",
    price: "$19.99",
    priceNote: "/ month, ships free over $50",
    image: "/products/coastal-tea-monthly.png",
    whatYouGet: [
      "One 3oz Lowcountry Tea tin per month",
      "Variety swap each cycle — we won't repeat",
      "Tasting note from Sal in every box",
      "Pause or cancel any time",
    ],
    cta: { label: "Start Tea Monthly", href: "/chat?sku=coastal-tea-monthly&intent=subscribe" },
  },
  {
    sku: "coastal-coffee-monthly",
    name: "Coffee Monthly",
    tagline: "One bag a month, picked for your palate.",
    price: "$25.49",
    priceNote: "/ month, ships free over $50",
    image: "/products/coastal-coffee-monthly.png",
    whatYouGet: [
      "One 12oz coffee bag per month",
      "Sal rotates origin + roast based on what you like",
      "Tasting note printed on the bag",
      "Skip a month, swap the bag, or cancel any time",
    ],
    cta: { label: "Start Coffee Monthly", href: "/chat?sku=coastal-coffee-monthly&intent=subscribe" },
    recommended: true,
  },
  {
    sku: "coastal-combo-monthly",
    name: "Combo Monthly",
    tagline: "One coffee + one tea — the household pack.",
    price: "$34.49",
    priceNote: "/ month, ships free over $50",
    image: "/products/coastal-combo-monthly.png",
    whatYouGet: [
      "One 12oz coffee + one 3oz tea per month",
      "Best per-bag value across the catalog",
      "Coordinated picks — coffee + tea that play well together",
      "Pause or cancel any time",
    ],
    cta: { label: "Start Combo Monthly", href: "/chat?sku=coastal-combo-monthly&intent=subscribe" },
  },
];

// ─────────────────────────── Bundles ───────────────────────────────────

type Bundle = {
  sku: string;
  name: string;
  tagline: string;
  price: string;
  savingsNote: string;
  image: string;
  whatsInside: string[];
  cta: { label: string; href: string };
};

const BUNDLES: Bundle[] = [
  {
    sku: "coastal-discovery-bundle",
    name: "Discovery Bundle",
    tagline: "The fastest way to see what Coastal is about.",
    price: "$59.99",
    savingsNote: "Save vs. buying separately",
    image: "/products/coastal-discovery-bundle.png",
    whatsInside: [
      "One coffee — pick your roast",
      "One tea — pick your tin",
      "One ceremonial-grade matcha",
    ],
    cta: { label: "Order Discovery", href: "/chat?sku=coastal-discovery-bundle&intent=order" },
  },
  {
    sku: "coastal-pantry-refill",
    name: "Pantry Refill",
    tagline: "Stock the cabinet for a household month.",
    price: "$87.99",
    savingsNote: "Best value for a full pantry",
    image: "/products/coastal-pantry-refill.png",
    whatsInside: [
      "Two 12oz coffee bags — your picks",
      "Two Lowcountry Tea tins",
      "One Coastal Chai tin",
    ],
    cta: { label: "Order Pantry Refill", href: "/chat?sku=coastal-pantry-refill&intent=order" },
  },
  {
    sku: "coastal-gift-bundle",
    name: "Gift Bundle",
    tagline: "Ribbon-tied with twine. Made to give.",
    price: "$53.99",
    savingsNote: "Bundled with a hand-thrown ceramic cup",
    image: "/products/coastal-gift-bundle.png",
    whatsInside: [
      "One coffee — pick your roast",
      "One Lowcountry Tea tin",
      "One ceramic Ethiopian-pattern cup",
    ],
    cta: { label: "Order Gift Bundle", href: "/chat?sku=coastal-gift-bundle&intent=order" },
  },
  {
    sku: "coastal-best-sellers-sampler",
    name: "Best Sellers Sampler",
    tagline: "Six of our most-ordered roasts in one box.",
    price: "$44.49",
    savingsNote: "Six 2oz drip-bags",
    image: "/products/coastal-best-sellers-sampler.png",
    whatsInside: [
      "Bali · Mexico · Peru",
      "Breakfast Blend · Cowboy Blend · 6Bean Espresso",
      "Six 2oz drip bags in a black stand-up pouch",
    ],
    cta: { label: "Order Sampler", href: "/chat?sku=coastal-best-sellers-sampler&intent=order" },
  },
  {
    sku: "coastal-single-origin-sampler",
    name: "Single Origin Sampler",
    tagline: "Six origins, one cup at a time.",
    price: "$44.49",
    savingsNote: "Six 2oz drip-bags",
    image: "/products/coastal-best-sellers-sampler.png",
    whatsInside: [
      "Brazil · Colombia · Costa Rica",
      "Honduras · Tanzania · Ethiopia",
      "Six 2oz drip bags in a black stand-up pouch",
    ],
    cta: { label: "Order Sampler", href: "/chat?sku=coastal-single-origin-sampler&intent=order" },
  },
  {
    sku: "coastal-flavored-sampler",
    name: "Flavored Sampler",
    tagline: "Naturally flavored — no syrups, no extracts.",
    price: "$44.49",
    savingsNote: "Six 2oz drip-bags",
    image: "/products/coastal-best-sellers-sampler.png",
    whatsInside: [
      "Caramel · Cinnamon Hazelnut · Cinnamon Roll",
      "French Vanilla · Hazelnut · Mocha",
      "Six 2oz drip bags in a black stand-up pouch",
    ],
    cta: { label: "Order Sampler", href: "/chat?sku=coastal-flavored-sampler&intent=order" },
  },
];

// ─────────────────────────── Components ────────────────────────────────

function SubscriptionCard({ sub }: { sub: Subscription }) {
  return (
    <Card
      className={cn(
        "relative flex flex-col h-full overflow-hidden transition-all hover:-translate-y-0.5",
        sub.recommended &&
          "border-accent ring-1 ring-accent/30 shadow-[0_0_0_1px_hsl(var(--accent)/0.2),0_8px_24px_-12px_hsl(var(--accent)/0.4)]",
      )}
      data-pricing-tier={`subscription-${sub.sku}`}
    >
      {sub.recommended && (
        <div className="absolute top-3 right-3 z-10 rounded-full bg-accent px-2.5 py-1 text-[9px] font-semibold uppercase tracking-widest text-accent-foreground">
          Most Popular
        </div>
      )}
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        <Image
          src={sub.image}
          alt={sub.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover object-top"
        />
      </div>
      <CardContent className="flex flex-1 flex-col gap-4 p-6">
        <div>
          <h3 className="font-display text-2xl font-semibold tracking-[-0.02em] leading-tight">
            {sub.name}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {sub.tagline}
          </p>
        </div>
        <div className="border-y border-border/60 py-3">
          <p className="font-display text-3xl font-semibold tracking-[-0.02em]">
            {sub.price}
            <span className="ml-1 font-mono text-xs font-normal text-muted-foreground tracking-normal">
              {sub.priceNote}
            </span>
          </p>
        </div>
        <ul className="flex-1 space-y-2 text-sm leading-snug">
          {sub.whatYouGet.map((it) => (
            <li key={it} className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.5} />
              <span className="text-foreground/85">{it}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="p-6 pt-0">
        <Button
          asChild
          variant={sub.recommended ? "accent" : "ghost"}
          size="lg"
          className="w-full font-mono text-[11px] uppercase tracking-widest"
        >
          <Link href={sub.cta.href} data-pricing-cta={`subscription-${sub.sku}`}>
            {sub.cta.label}
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function BundleCard({ bundle }: { bundle: Bundle }) {
  return (
    <Card
      className="flex flex-col h-full overflow-hidden transition-all hover:-translate-y-0.5 hover:border-accent/60"
      data-pricing-tier={`bundle-${bundle.sku}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        <Image
          src={bundle.image}
          alt={bundle.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover object-top"
        />
      </div>
      <CardContent className="flex flex-1 flex-col gap-4 p-6">
        <div>
          <h3 className="font-display text-xl font-semibold tracking-[-0.01em] leading-tight">
            {bundle.name}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {bundle.tagline}
          </p>
        </div>
        <div className="flex items-baseline gap-2 border-y border-border/60 py-3">
          <p className="font-display text-2xl font-semibold tracking-[-0.02em]">
            {bundle.price}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {bundle.savingsNote}
          </p>
        </div>
        <ul className="flex-1 space-y-1.5 text-sm leading-snug">
          {bundle.whatsInside.map((it) => (
            <li key={it} className="flex gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2.5} />
              <span className="text-foreground/85">{it}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="p-6 pt-0">
        <Button
          asChild
          variant="ghost"
          size="default"
          className="w-full font-mono text-[10px] uppercase tracking-widest"
        >
          <Link href={bundle.cta.href} data-pricing-cta={`bundle-${bundle.sku}`}>
            {bundle.cta.label}
            <ArrowRight className="ml-1.5 h-3 w-3" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

// ─────────────────────────── Page ──────────────────────────────────────

export default function PricingPage() {
  return (
    <>
      <Nav />
      <main className="bg-background">
        {/* ──────────── Header ──────────── */}
        <section className="border-b border-border/50">
          <div className="container py-16 md:py-20">
            <ScrollReveal>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Subscriptions &amp; Bundles
              </p>
              <h1 className="mt-3 font-display text-[clamp(36px,5vw,56px)] font-semibold tracking-[-0.02em] leading-[1.05] max-w-3xl">
                Save when you subscribe.<br />
                Stock up with a bundle.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                Three monthly subscriptions, three bundles for the way you
                brew, and three sampler packs to find your favorite. Pause,
                swap, or cancel any time. Free shipping over $50.
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* ──────────── Subscriptions ──────────── */}
        <section className="border-b border-border/50">
          <div className="container py-16 md:py-20">
            <ScrollReveal>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
                01 / Subscriptions
              </p>
              <h2 className="mt-3 font-display text-[clamp(28px,4vw,40px)] font-semibold tracking-[-0.02em] leading-[1.05] max-w-2xl">
                One delivery a month.<br />
                <span className="text-foreground/60">Picked for the way you drink.</span>
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
                Every subscription saves you 15% off catalog. Skip a month,
                swap a bag, or cancel — Sal will work with you.
              </p>
            </ScrollReveal>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {SUBSCRIPTIONS.map((sub, i) => (
                <ScrollReveal key={sub.sku} delay={0.08 * i}>
                  <SubscriptionCard sub={sub} />
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ──────────── Bundles ──────────── */}
        <section className="border-b border-border/50 bg-card/20">
          <div className="container py-16 md:py-20">
            <ScrollReveal>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
                02 / Bundles
              </p>
              <h2 className="mt-3 font-display text-[clamp(28px,4vw,40px)] font-semibold tracking-[-0.02em] leading-[1.05] max-w-2xl">
                Pre-packed combinations.<br />
                <span className="text-foreground/60">For discovery, refilling, or gifting.</span>
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
                Bundles cost less than the same items separately. Sample
                packs let you taste six in one box.
              </p>
            </ScrollReveal>

            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {BUNDLES.map((b, i) => (
                <ScrollReveal key={b.sku} delay={0.06 * i}>
                  <BundleCard bundle={b} />
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ──────────── Single bags / catalog ──────────── */}
        <section className="border-b border-border/50">
          <div className="container py-16 md:py-20">
            <ScrollReveal>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
                03 / Single bags
              </p>
              <h2 className="mt-3 font-display text-[clamp(28px,4vw,40px)] font-semibold tracking-[-0.02em] leading-[1.05] max-w-2xl">
                Just want a bag?<br />
                <span className="text-foreground/60">Browse the full catalog.</span>
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
                Coffee, tea, matcha, instant, functional blends, and K-cups.
                Every bag is open to talk — chat with Sal anytime if you
                want a different price than what's posted.
              </p>
              <div className="mt-7 flex flex-col sm:flex-row items-start gap-4">
                <Button asChild variant="accent" size="lg" className="font-mono text-[11px] uppercase tracking-widest">
                  <Link href="/products" data-pricing-cta="browse-catalog">
                    Browse Catalog <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="lg" className="font-mono text-[11px] uppercase tracking-widest">
                  <Link href="/chat" data-pricing-cta="chat-with-sal">
                    Chat with Sal
                  </Link>
                </Button>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ──────────── Brand pillars (retail copy) ──────────── */}
        <section className="border-b border-border/50 bg-card/20">
          <div className="container py-20 md:py-24">
            <ScrollReveal>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Why Coastal
              </p>
              <h2 className="mt-3 font-display text-[clamp(28px,4vw,40px)] font-semibold tracking-[-0.02em] leading-[1.05] max-w-3xl">
                Brewed honest.<br />
                <span className="text-foreground/55">Made in Pooler, Georgia.</span>
              </h2>
            </ScrollReveal>

            <div className="mt-12 grid gap-8 md:grid-cols-2 md:gap-10">
              <ScrollReveal delay={0.1}>
                <div className="border-l border-border/60 pl-5">
                  <h3 className="font-display text-xl font-semibold tracking-[-0.01em]">
                    Sourced with care.
                  </h3>
                  <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                    Specialty-grade Arabica, Fairtrade-certified single
                    origins, ceremonial-grade matcha, and Lowcountry teas
                    sourced through partner roasters with documented farms
                    and lots.
                  </p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.18}>
                <div className="border-l border-border/60 pl-5">
                  <h3 className="font-display text-xl font-semibold tracking-[-0.01em]">
                    Nothing chemically, ever.
                  </h3>
                  <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                    Pure-ingredient bags carry the motto. Flavored coffees
                    use natural flavoring only — no syrups, no extracts.
                    Functional blends follow strict-lane labeling. Read
                    every ingredient on every label.
                  </p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.26}>
                <div className="border-l border-border/60 pl-5">
                  <h3 className="font-display text-xl font-semibold tracking-[-0.01em]">
                    Every order's a conversation.
                  </h3>
                  <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                    Every catalog price is open to talk. Chat with Sal and
                    he'll work with you on the order — different size,
                    different roast, bulk discount, or a deal on a bundle.
                    Just ask.
                  </p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.34}>
                <div className="border-l border-border/60 pl-5">
                  <h3 className="font-display text-xl font-semibold tracking-[-0.01em]">
                    We stand by every cup.
                  </h3>
                  <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                    Your fault, our fault, nobody's fault — we don't ship
                    coffee back. We make it right with what's already in
                    your hand. Free shipping over $50, fast turnaround
                    from roast to door.
                  </p>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ──────────── Final CTA ──────────── */}
        <section>
          <div className="container py-20 md:py-24">
            <ScrollReveal>
              <div className="text-center">
                <h2 className="font-display text-[clamp(28px,4vw,40px)] font-semibold tracking-[-0.02em] leading-[1.05] max-w-2xl mx-auto">
                  Not sure where to start?
                </h2>
                <p className="mt-5 max-w-xl mx-auto text-base leading-relaxed text-muted-foreground">
                  Drop a note to Sal — he'll listen for a minute, then put
                  a bag in your hand that fits.
                </p>
                <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button asChild variant="accent" size="lg" className="font-mono text-[11px] uppercase tracking-widest">
                    <Link href="/chat?intent=help-me-pick" data-pricing-cta="final-help-me-pick">
                      Help me pick <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" size="lg" className="font-mono text-[11px] uppercase tracking-widest">
                    <Link href="/products" data-pricing-cta="final-browse">
                      Browse the catalog
                    </Link>
                  </Button>
                </div>
                <p className="mt-12 max-w-xl mx-auto text-xs text-muted-foreground/70">
                  Building a brand and want to use the platform that runs
                  Coastal? See the{" "}
                  <Link href="/partners" className="text-accent hover:underline underline-offset-2">
                    AIMS Partner Program
                  </Link>
                  .
                </p>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
