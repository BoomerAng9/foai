import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ScrollReveal } from "@/components/scroll-reveal";
import { TierMark } from "@/components/tier-mark";

export const metadata = {
  title: "Subscriptions & Bundles — Coastal Brewing Co.",
  description:
    "Monthly coffee + tea subscriptions, sample-pack flights, and bundles for the way you brew. Save when you subscribe — every order is a conversation.",
};

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

function BundleCard({ bundle }: { bundle: Bundle }) {
  return (
    <Card
      className="flex flex-col h-full overflow-hidden transition-all hover:-translate-y-0.5 hover:border-accent/60"
      data-pricing-tier={`bundle-${bundle.sku}`}
    >
      <div className="relative aspect-square overflow-hidden bg-secondary">
        <Image
          src={bundle.image}
          alt={bundle.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-contain p-4"
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

        {/* ──────────── C|Brew Membership Ladder (annual via 3-6-9 cadence) ──────────── */}
        <section className="border-b border-border/50 bg-card/30">
          <div className="container py-16 md:py-20">
            <ScrollReveal>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
                C|Brew Yearly Membership · 3-6-9 cadence
              </p>
              <h2 className="mt-3 font-display text-[clamp(28px,4vw,40px)] font-semibold tracking-[-0.02em] leading-[1.05] max-w-2xl">
                Pay for 9 months,<br />
                <span className="text-foreground/60">we deliver 12.</span>
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
                Every membership tier offers four cadences: monthly (0% off),
                3-month (15% off), 6-month (20% off), and the headline
                9-month plan (25% off, pay 9 months, get 12 months of access).
                The 9-mo plan is the best deal in the catalog.
              </p>
            </ScrollReveal>

            <div className="mt-10 overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm" data-pricing-table="tier-comparison">
                <thead>
                  <tr className="bg-muted/30 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    <th className="px-4 py-3 w-20">Mark</th>
                    <th className="px-4 py-3">Tier</th>
                    <th className="px-4 py-3">9-month plan (best deal)</th>
                    <th className="px-4 py-3">Audience</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground/85">
                  <tr data-tier-row="pooler-pass-standard">
                    <td className="px-4 py-3 align-middle"><TierMark variant="plr-cream" /></td>
                    <td className="px-4 py-3 font-medium align-middle">Pooler Pass Standard</td>
                    <td className="px-4 py-3 font-mono align-middle">$49 / yr</td>
                    <td className="px-4 py-3 text-foreground/70 text-[13px] align-middle">Local 50–100 mi from Pooler 31322</td>
                    <td className="px-4 py-3 text-right align-middle">
                      <Link href="/pooler-pass" className="font-mono text-[11px] uppercase tracking-widest text-accent hover:underline">
                        Details →
                      </Link>
                    </td>
                  </tr>
                  <tr data-tier-row="pooler-pass-plus">
                    <td className="px-4 py-3 align-middle"><TierMark variant="plr-gold" /></td>
                    <td className="px-4 py-3 font-medium align-middle">Pooler Pass Plus</td>
                    <td className="px-4 py-3 font-mono align-middle">$99 / yr</td>
                    <td className="px-4 py-3 text-foreground/70 text-[13px] align-middle">Local power-buyers, more perks</td>
                    <td className="px-4 py-3 text-right align-middle">
                      <Link href="/pooler-pass" className="font-mono text-[11px] uppercase tracking-widest text-accent hover:underline">
                        Details →
                      </Link>
                    </td>
                  </tr>
                  <tr className="bg-accent/[0.06]" data-tier-row="coastal-custee-card">
                    <td className="px-4 py-3 align-middle"><TierMark variant="custee-card" /></td>
                    <td className="px-4 py-3 font-medium align-middle">Coastal Custee Card</td>
                    <td className="px-4 py-3 font-mono align-middle">$199 / yr</td>
                    <td className="px-4 py-3 text-foreground/70 text-[13px] align-middle">National DTC + Amazon — the default tier</td>
                    <td className="px-4 py-3 text-right align-middle">
                      <Link href="/membership" className="font-mono text-[11px] uppercase tracking-widest text-accent hover:underline">
                        Details →
                      </Link>
                    </td>
                  </tr>
                  <tr data-tier-row="wood-stork-standard">
                    <td className="px-4 py-3 align-middle"><TierMark variant="wood-stork-standard" /></td>
                    <td className="px-4 py-3 font-medium align-middle">Wood Stork Standard</td>
                    <td className="px-4 py-3 font-mono align-middle">$499 / yr</td>
                    <td className="px-4 py-3 text-foreground/70 text-[13px] align-middle">B2B, multi-location, referrers</td>
                    <td className="px-4 py-3 text-right align-middle">
                      <Link href="/wood-stork" className="font-mono text-[11px] uppercase tracking-widest text-accent hover:underline">
                        Details →
                      </Link>
                    </td>
                  </tr>
                  <tr data-tier-row="wood-stork-reserve">
                    <td className="px-4 py-3 align-middle"><TierMark variant="wood-stork-reserve" /></td>
                    <td className="px-4 py-3 font-medium align-middle">Wood Stork Reserve</td>
                    <td className="px-4 py-3 font-mono align-middle">$999 / yr</td>
                    <td className="px-4 py-3 text-foreground/70 text-[13px] align-middle">Largest accounts, owner-domain whitelabel partners</td>
                    <td className="px-4 py-3 text-right align-middle">
                      <Link href="/wood-stork" className="font-mono text-[11px] uppercase tracking-widest text-accent hover:underline">
                        Details →
                      </Link>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              All annual prices show the 9-mo plan landing · monthly + 3/6-mo cadences also available on each tier page
            </p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-widest">
              <Link href="/compare" className="text-accent hover:underline">
                See how Coastal compares vs every major DTC coffee brand →
              </Link>
            </p>
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
                Sourced with care.<br />
                <span className="text-foreground/55">Nothing chemically, ever.</span>
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
