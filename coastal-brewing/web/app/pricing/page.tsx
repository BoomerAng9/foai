import Link from "next/link";
import { Check, ArrowRight, Sparkle } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ScrollReveal } from "@/components/scroll-reveal";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Pricing — Coastal Brewing Co.",
  description:
    "Three ways to bring Coastal home — self-serve, subscription, or full concierge. Open prices. Sal will work with you.",
};

type Tier = {
  id: "self_serve" | "counter" | "concierge";
  eyebrow: string;
  label: string;
  title: string;
  subtitle: string;
  price: string;
  priceNote: string;
  features: string[];
  cta: { label: string; href: string };
  recommended?: boolean;
  accent: "muted" | "accent" | "foreground";
};

const TIERS: Tier[] = [
  {
    id: "self_serve",
    eyebrow: "01",
    label: "Self-Serve",
    title: "When you want it.",
    subtitle:
      "No commitment. Open price — Sal will work with you on every order.",
    price: "From $24.99",
    priceNote: "per 12oz bag",
    features: [
      "One-off ordering across all 70+ SKUs",
      "Open-price haggle with Sal — every order, every time",
      "Standard packaging + email confirmation",
      "Catalog access — coffee, tea, matcha, instant, functional",
      "No subscription, no commitment, no auto-charge",
    ],
    cta: { label: "Start Shopping", href: "/products" },
    accent: "muted",
  },
  {
    id: "counter",
    eyebrow: "02",
    label: "Coastal Counter",
    title: "Same cup, on time.",
    subtitle:
      "Sal-curated rotation. Brand-touched delivery. The middle-of-the-counter experience.",
    price: "From $21.24",
    priceNote: "per delivery (15% off retail)",
    features: [
      "6-month subscription — pause or cancel anytime",
      "Sal + LUC curate based on your palate profile",
      "Hand-written welcome card on signup",
      "Per-delivery tasting note from Sal (printed insert)",
      "Voice message from Sal in your account dashboard",
      "Visible team-deliberation when you negotiate",
      "Custom Coastal-branded packaging",
      "First haggle priority over Self-Serve queue",
    ],
    cta: { label: "Start Subscription", href: "/chat?intent=subscribe&tier=counter" },
    recommended: true,
    accent: "accent",
  },
  {
    id: "concierge",
    eyebrow: "03",
    label: "Coastal Concierge",
    title: "We hold the counter for you.",
    subtitle:
      "ACHEEVY-tier curation. Full team experience. Custom delivery on your cadence.",
    price: "Custom",
    priceNote: "9-month or Lifetime",
    features: [
      "9-month sub (pay 9, receive 12) OR Lifetime Concierge",
      "ACHEEVY + Melli quarterly palate review",
      "Custom selection per delivery — no defaults",
      "Live chat with Sal anytime, voice replies in your account",
      "Custom Higgsfield video for your bag — per delivery",
      "Direct Telegram channel to Coastal HQ (Melli answers)",
      "Birthday + anniversary cards from the team",
      "First-access to limited drops (Whiskey Barrel, Coffee of the Month)",
    ],
    cta: { label: "Talk to Sal", href: "/chat?intent=concierge" },
    accent: "foreground",
  },
];

function TierCard({ tier }: { tier: Tier }) {
  return (
    <Card
      className={cn(
        "relative flex flex-col h-full overflow-hidden transition-all hover:-translate-y-0.5",
        tier.recommended &&
          "border-accent ring-1 ring-accent/30 shadow-[0_0_0_1px_hsl(var(--accent)/0.2),0_8px_24px_-12px_hsl(var(--accent)/0.4)]",
      )}
      data-pricing-tier={tier.id}
    >
      {tier.recommended && (
        <div className="absolute -top-px left-1/2 -translate-x-1/2 rounded-b-md bg-accent px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-accent-foreground">
          <Sparkle className="inline h-3 w-3 -mt-0.5 mr-1" />
          Recommended
        </div>
      )}
      <CardContent className={cn("flex flex-1 flex-col gap-5 p-6 pt-9", tier.recommended && "pt-12")}>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            {tier.eyebrow} / {tier.label}
          </p>
          <h3 className="mt-3 font-display text-3xl font-semibold tracking-[-0.02em] leading-[1.05]">
            {tier.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {tier.subtitle}
          </p>
        </div>

        <div className="border-y border-border/60 py-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {tier.id === "self_serve" ? "Per order" : tier.id === "counter" ? "Per delivery" : "Per Custee"}
          </p>
          <p className="mt-1.5 font-display text-3xl font-semibold tracking-[-0.02em]">
            {tier.price}
          </p>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            {tier.priceNote}
          </p>
        </div>

        <ul className="flex-1 space-y-2.5 text-sm leading-snug">
          {tier.features.map((f) => (
            <li key={f} className="flex gap-2.5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.5} />
              <span className="text-foreground/85">{f}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="p-6 pt-0">
        <Button
          asChild
          variant={tier.recommended ? "accent" : "ghost"}
          size="lg"
          className="w-full font-mono text-[11px] uppercase tracking-widest"
        >
          <Link
            href={tier.cta.href}
            data-pricing-cta={tier.id}
            data-pricing-cta-label={tier.cta.label}
          >
            {tier.cta.label}
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function PricingPage() {
  return (
    <>
      <Nav />
      <main className="bg-background">
        {/* ──────────────── Header ──────────────── */}
        <section className="border-b border-border/50">
          <div className="container py-16 md:py-24">
            <ScrollReveal>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Pricing
              </p>
              <h1 className="mt-3 font-display text-[clamp(36px,5vw,56px)] font-semibold tracking-[-0.02em] leading-[1.05] max-w-3xl">
                Three ways to bring Coastal home.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                Self-serve, subscribe, or let us run point. Every tier opens at
                the catalog price — Sal will work with you from there. The
                negotiation IS the experience.
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* ──────────────── 3-tier comparison ──────────────── */}
        <section className="border-b border-border/50">
          <div className="container py-16 md:py-20">
            <div className="grid gap-6 md:grid-cols-3 md:gap-5 lg:gap-6">
              {TIERS.map((tier, i) => (
                <ScrollReveal key={tier.id} delay={0.08 * i}>
                  <TierCard tier={tier} />
                </ScrollReveal>
              ))}
            </div>

            {/* Build-your-bag mention (post-launch surface) */}
            <ScrollReveal delay={0.4}>
              <div className="mt-14 border-t border-border/60 pt-8">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/70">
                    Want to mix your own?
                  </span>
                  <br />
                  Build Your Bag is coming — fine-tune cadence, account
                  structure, category mix, and pillar level for the bill that
                  fits. For now, ask Sal in chat and the team will tune it
                  with you live.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ──────────────── Brand-as-product framing ──────────────── */}
        <section className="border-b border-border/50 bg-card/20">
          <div className="container py-20 md:py-28">
            <ScrollReveal>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                What's actually in the price
              </p>
              <h2 className="mt-3 font-display text-[clamp(28px,4vw,44px)] font-semibold tracking-[-0.02em] leading-[1.05] max-w-3xl">
                You're not paying for the bag.
                <span className="block text-foreground/55">
                  You're paying for the counter that knows your name.
                </span>
              </h2>
            </ScrollReveal>

            <div className="mt-14 grid gap-10 md:grid-cols-2 md:gap-12">
              <ScrollReveal delay={0.1}>
                <div className="border-l border-border/60 pl-5">
                  <h3 className="font-display text-2xl font-semibold tracking-[-0.01em]">
                    The team is the product.
                  </h3>
                  <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                    Sal pours, LUC runs the math, ACHEEVY signs the floor,
                    Melli closes the bulk lane. Every Custee gets the same
                    team-managed counter that 7-Brew, Starbucks, and Dutch
                    Bros will pay $2.5K to $50K per month to license. You get
                    it first — and you get it built around your palate.
                  </p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.18}>
                <div className="border-l border-border/60 pl-5">
                  <h3 className="font-display text-2xl font-semibold tracking-[-0.01em]">
                    The negotiation is the experience.
                  </h3>
                  <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                    Every catalog price is the opening anchor — Sal works with
                    you from there. Watch the team deliberate in real time
                    when the deal needs LUC's math or ACHEEVY's approval. The
                    deal you walk away with is the one you negotiated. That's
                    the experience.
                  </p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.26}>
                <div className="border-l border-border/60 pl-5">
                  <h3 className="font-display text-2xl font-semibold tracking-[-0.01em]">
                    Made in Pooler, Georgia.
                  </h3>
                  <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                    Coastal owns the brand from origin to delivery. Specialty-
                    grade Arabica, Fairtrade-certified single origins, ceremonial
                    matcha, traditional teas — sourced with provenance, served
                    with the team that remembers your last cup.
                  </p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.34}>
                <div className="border-l border-border/60 pl-5">
                  <h3 className="font-display text-2xl font-semibold tracking-[-0.01em]">
                    Nothing chemically, ever.
                  </h3>
                  <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                    Pure-ingredient SKUs carry the motto. Flavored coffees use
                    natural flavoring only — no syrups, no extracts, no
                    mycotoxin shortcuts. Functional products follow TCR's
                    strict-lane labeling. Provenance you can verify, ingredients
                    you can read.
                  </p>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ──────────────── Final CTA ──────────────── */}
        <section>
          <div className="container py-20 md:py-24">
            <ScrollReveal>
              <div className="text-center">
                <h2 className="font-display text-[clamp(28px,4vw,40px)] font-semibold tracking-[-0.02em] leading-[1.05] max-w-2xl mx-auto">
                  Ready to pull up to the counter?
                </h2>
                <p className="mt-5 max-w-xl mx-auto text-base leading-relaxed text-muted-foreground">
                  Not sure which tier fits? Ask Sal — he'll walk you through it
                  and lock in a deal that works for both of us.
                </p>
                <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button asChild variant="accent" size="lg" className="font-mono text-[11px] uppercase tracking-widest">
                    <Link href="/chat?intent=pricing-help" data-pricing-cta="final-talk-to-sal">
                      Ask Sal which tier fits <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" size="lg" className="font-mono text-[11px] uppercase tracking-widest">
                    <Link href="/products" data-pricing-cta="final-browse">
                      Browse the catalog
                    </Link>
                  </Button>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
