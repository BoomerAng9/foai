import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Check, X, Sparkles } from "lucide-react";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/scroll-reveal";

export const metadata: Metadata = {
  title: "How Coastal Compares · Coastal Brewing Co.",
  description:
    "Coastal Brewing Co. vs. the field — pricing, quality, and the X-factor every other coffee brand is missing: an agentic team that actually talks to you.",
};

// ────────────────────────── Pricing comparison ──────────────────────────

type Competitor = {
  brand: string;
  bagPrice: string;
  bagSize: string;
  membership: string;
  membershipNote: string;
  freeShipThreshold: string;
  voiceAgent: boolean;
  liveLookIn: boolean;
  haggle: boolean;
  conciergeCalls: boolean;
  category: "coastal" | "specialty-dtc" | "wellness" | "marketplace";
};

const COMPETITORS: Competitor[] = [
  {
    brand: "Coastal Brewing Co.",
    bagPrice: "$24.99",
    bagSize: "12oz",
    membership: "$199/yr (9-mo plan)",
    membershipNote: "C|Brew 3-6-9 · pay 9, get 12 · monthly + 3/6/9 cadences",
    freeShipThreshold: "Free under $15 freight",
    voiceAgent: true,
    liveLookIn: true,
    haggle: true,
    conciergeCalls: true,
    category: "coastal",
  },
  {
    brand: "Stumptown",
    bagPrice: "$15–19",
    bagSize: "12oz",
    membership: "—",
    membershipNote: "No annual tier",
    freeShipThreshold: "Per shipment",
    voiceAgent: false,
    liveLookIn: false,
    haggle: false,
    conciergeCalls: false,
    category: "specialty-dtc",
  },
  {
    brand: "Counter Culture",
    bagPrice: "$16–18",
    bagSize: "12oz",
    membership: "—",
    membershipNote: "5% subscriber discount only",
    freeShipThreshold: "Per shipment",
    voiceAgent: false,
    liveLookIn: false,
    haggle: false,
    conciergeCalls: false,
    category: "specialty-dtc",
  },
  {
    brand: "Onyx Coffee Lab",
    bagPrice: "$19–24",
    bagSize: "10–12oz",
    membership: "—",
    membershipNote: "Per-shipment subscription",
    freeShipThreshold: "Per shipment",
    voiceAgent: false,
    liveLookIn: false,
    haggle: false,
    conciergeCalls: false,
    category: "specialty-dtc",
  },
  {
    brand: "Trade Coffee",
    bagPrice: "$17–22",
    bagSize: "10.93oz",
    membership: "—",
    membershipNote: "15–20% subscriber savings",
    freeShipThreshold: "Per shipment",
    voiceAgent: false,
    liveLookIn: false,
    haggle: false,
    conciergeCalls: false,
    category: "specialty-dtc",
  },
  {
    brand: "Blue Bottle",
    bagPrice: "$16–20",
    bagSize: "12oz",
    membership: "Free loyalty",
    membershipNote: "Points: 1pt / $1, 150pts = free drink",
    freeShipThreshold: "Free for subscribers",
    voiceAgent: false,
    liveLookIn: false,
    haggle: false,
    conciergeCalls: false,
    category: "specialty-dtc",
  },
  {
    brand: "Atlas Coffee Club",
    bagPrice: "$9–28",
    bagSize: "6 / 12 / 24oz",
    membership: "—",
    membershipNote: "No annual tier",
    freeShipThreshold: "Per shipment",
    voiceAgent: false,
    liveLookIn: false,
    haggle: false,
    conciergeCalls: false,
    category: "specialty-dtc",
  },
  {
    brand: "Death Wish (Amazon)",
    bagPrice: "$15–19",
    bagSize: "16oz",
    membership: "—",
    membershipNote: "Subscribe & Save only",
    freeShipThreshold: "Prime",
    voiceAgent: false,
    liveLookIn: false,
    haggle: false,
    conciergeCalls: false,
    category: "marketplace",
  },
  {
    brand: "Black Rifle (Amazon)",
    bagPrice: "$15–18",
    bagSize: "12oz",
    membership: "—",
    membershipNote: "Subscribe & Save only",
    freeShipThreshold: "Prime",
    voiceAgent: false,
    liveLookIn: false,
    haggle: false,
    conciergeCalls: false,
    category: "marketplace",
  },
  {
    brand: "AG1 (wellness)",
    bagPrice: "$79 / mo",
    bagSize: "30 servings",
    membership: "~$948 / yr",
    membershipNote: "Subscriber-only price + welcome kit",
    freeShipThreshold: "Free for subscribers",
    voiceAgent: false,
    liveLookIn: false,
    haggle: false,
    conciergeCalls: false,
    category: "wellness",
  },
  {
    brand: "Magic Mind (wellness)",
    bagPrice: "$59.25 / mo",
    bagSize: "15-pack",
    membership: "~$711 / yr",
    membershipNote: "Subscription save vs one-time",
    freeShipThreshold: "Per shipment",
    voiceAgent: false,
    liveLookIn: false,
    haggle: false,
    conciergeCalls: false,
    category: "wellness",
  },
];

// ────────────────────────── Quality comparison ──────────────────────────

type QualityRow = {
  attribute: string;
  coastal: string;
  industry: string;
};

const QUALITY: QualityRow[] = [
  {
    attribute: "Roast freshness",
    coastal: "Roasted to order, ships within 48 hrs",
    industry: "Often 2–6 weeks old by the time it lands at retail",
  },
  {
    attribute: "Sourcing transparency",
    coastal: "Documented farms, lots, and cupping notes per origin",
    industry: "Origin country only on most mass-market bags",
  },
  {
    attribute: "Ingredient policy",
    coastal: "Nothing chemically, ever — natural flavoring only, no syrups, no extracts",
    industry: "Most flavored coffees use artificial syrups + propylene glycol carriers",
  },
  {
    attribute: "Specialty grade",
    coastal: "Specialty-grade Arabica + Fairtrade-certified single origins",
    industry: "Mixed grades; many \"premium\" bags use commodity-grade beans",
  },
  {
    attribute: "Tea + matcha alongside",
    coastal: "Lowcountry teas + ceremonial-grade matcha + Habbak (Saudi Hassawi mint)",
    industry: "Coffee-only for most DTC roasters",
  },
  {
    attribute: "Returns posture",
    coastal: "Your fault, our fault, nobody's fault — we make it right",
    industry: "Per-case review, often customer-pays-return",
  },
];

// ────────────────────────── X-factor (the wedge) ──────────────────────────

type Xfactor = {
  title: string;
  body: string;
};

const XFACTORS: Xfactor[] = [
  {
    title: "An agentic team that actually talks to you.",
    body: "Sal at the bar. LUC at the curation desk. Melli on the wholesale line. Every one of them has a voice, a personality, and the authority to make a deal. No chatbot scripts. No \"please hold while I transfer you.\" Just a team.",
  },
  {
    title: "Every catalog price is a starting point.",
    body: "Other brands publish a price and that's the price. We publish an opening anchor and let our team haggle with you. Sal can move 5–15% on his own. LUC can drop 25% if you commit. Bring volume to Melli and she goes deeper. Bundle with ACHEEVY and you can land 30% off. The negotiation is the experience.",
  },
  {
    title: "A live look-in to the storefront.",
    body: "Members open the look-in and watch Pooler in real time on a 2D floor plan. Sal at the bar. The Sett crew in their tunnel. The Roos in the warehouse. The LP team on patrol. Nothing else in the category is doing this.",
  },
  {
    title: "Hand-pack from a real human.",
    body: "Standard Membership ships your welcome box hand-packed by Sal at the Pooler storefront. Ceramic pour-over dripper, storefront-window-etching sticker set, complimentary tin of Habbak. Real hands, real packing tape, real signature.",
  },
  {
    title: "Account Assistant on call.",
    body: "Members get an Account Assistant — your point of contact for reorders, recipe troubleshooting, gift sends, and anything else. Wood Stork tier gets 4 hours a month. Lifetime Concierge is white-glove. Nobody else in the category offers this.",
  },
];

// ────────────────────────── Components ──────────────────────────

function Yes() {
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-accent">
      <Check className="h-3.5 w-3.5" strokeWidth={3} />
    </span>
  );
}

function No() {
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted/40 text-muted-foreground/60">
      <X className="h-3.5 w-3.5" strokeWidth={2} />
    </span>
  );
}

// ────────────────────────── Page ──────────────────────────

export default function ComparePage() {
  return (
    <>
      <Nav />
      <main className="bg-background">
        {/* Header */}
        <section className="border-b border-border/50">
          <div className="container py-16 md:py-20">
            <ScrollReveal>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                How Coastal Compares
              </p>
              <h1 className="mt-3 font-display text-[clamp(36px,5vw,56px)] font-semibold tracking-[-0.02em] leading-[1.05] max-w-4xl">
                Same coffee category.
                <br />
                <span className="text-foreground/55">Different category, actually.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                We brew specialty coffee at a price the field already prints. Where we
                separate is the <strong className="text-foreground">agentic experience</strong> wrapped around it — a team
                you can actually talk to, prices you can actually negotiate, and a live
                look-in to the room where the work happens.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Button asChild variant="accent" size="lg" className="font-mono text-[11px] uppercase tracking-widest">
                  <Link href="/membership" data-compare-cta="join-membership">
                    Join Standard Membership · $199/yr
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="lg" className="font-mono text-[11px] uppercase tracking-widest">
                  <Link href="/chat" data-compare-cta="chat-with-sal">
                    Chat with Sal first
                  </Link>
                </Button>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Pricing comparison table */}
        <section className="border-b border-border/50">
          <div className="container py-16 md:py-20">
            <ScrollReveal>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
                01 / Pricing
              </p>
              <h2 className="mt-3 font-display text-[clamp(28px,4vw,40px)] font-semibold tracking-[-0.02em] leading-[1.05] max-w-2xl">
                Side by side.
                <br />
                <span className="text-foreground/55">Pricing across specialty + marketplace + wellness.</span>
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
                Coastal sits inside the specialty-coffee band on bag price and is the only
                brand in the category with a flat annual membership tier. Wellness brands
                like AG1 and Magic Mind are included as a reference for what the market
                will pay for an annual subscription tier when the experience justifies it.
              </p>
            </ScrollReveal>

            <div className="mt-12 overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="bg-muted/30 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    <th className="px-5 py-4">Brand</th>
                    <th className="px-5 py-4">Bag price</th>
                    <th className="px-5 py-4">Membership</th>
                    <th className="px-5 py-4">Free shipping</th>
                    <th className="px-5 py-4 text-center">Voice team</th>
                    <th className="px-5 py-4 text-center">Live look-in</th>
                    <th className="px-5 py-4 text-center">Negotiate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground/85">
                  {COMPETITORS.map((c) => (
                    <tr
                      key={c.brand}
                      className={
                        c.category === "coastal"
                          ? "bg-accent/10"
                          : c.category === "wellness"
                            ? "bg-muted/10"
                            : ""
                      }
                    >
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className={c.category === "coastal" ? "font-semibold text-foreground" : "font-medium"}>
                            {c.brand}
                          </span>
                          <span className="mt-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                            {c.category === "coastal"
                              ? "Coastal"
                              : c.category === "specialty-dtc"
                                ? "Specialty DTC"
                                : c.category === "marketplace"
                                  ? "Marketplace"
                                  : "Wellness ref."}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span>{c.bagPrice}</span>
                          <span className="mt-1 font-mono text-[10px] text-muted-foreground">{c.bagSize}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className={c.membership === "—" ? "text-muted-foreground" : ""}>{c.membership}</span>
                          <span className="mt-1 text-[11px] leading-snug text-muted-foreground">{c.membershipNote}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-foreground/75">{c.freeShipThreshold}</td>
                      <td className="px-5 py-4 text-center">{c.voiceAgent ? <Yes /> : <No />}</td>
                      <td className="px-5 py-4 text-center">{c.liveLookIn ? <Yes /> : <No />}</td>
                      <td className="px-5 py-4 text-center">{c.haggle ? <Yes /> : <No />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Pricing reflects publicly listed direct-to-consumer rates as of May 2026 ·
              Marketplace pricing varies with promotions
            </p>
          </div>
        </section>

        {/* Quality comparison */}
        <section className="border-b border-border/50 bg-card/20">
          <div className="container py-16 md:py-20">
            <ScrollReveal>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
                02 / Quality
              </p>
              <h2 className="mt-3 font-display text-[clamp(28px,4vw,40px)] font-semibold tracking-[-0.02em] leading-[1.05] max-w-2xl">
                What you actually get in the cup.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
                Bag price is a number. Quality is what shows up at your door — roast date,
                source documentation, ingredient policy, and what happens when something
                isn&rsquo;t right.
              </p>
            </ScrollReveal>

            <div className="mt-12 overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    <th className="px-5 py-4">Attribute</th>
                    <th className="px-5 py-4 bg-accent/10 text-accent">Coastal Brewing Co.</th>
                    <th className="px-5 py-4">Industry default</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground/85">
                  {QUALITY.map((q) => (
                    <tr key={q.attribute}>
                      <td className="px-5 py-4 font-medium">{q.attribute}</td>
                      <td className="px-5 py-4 bg-accent/[0.04]">{q.coastal}</td>
                      <td className="px-5 py-4 text-foreground/65">{q.industry}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* X-factor section */}
        <section className="border-b border-border/50">
          <div className="container py-16 md:py-20">
            <ScrollReveal>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
                03 / The X-factor
              </p>
              <h2 className="mt-3 font-display text-[clamp(28px,4vw,40px)] font-semibold tracking-[-0.02em] leading-[1.05] max-w-3xl">
                <Sparkles className="inline-block h-7 w-7 text-accent mr-2 -mt-1" strokeWidth={1.5} />
                The agentic experience.
                <br />
                <span className="text-foreground/55">Nobody else in the category has this.</span>
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
                Specialty coffee is a crowded shelf. Pricing converges, sourcing claims
                converge, packaging converges. What separates Coastal is a coordinated
                team you can actually talk to, negotiate with, and watch work in real
                time.
              </p>
            </ScrollReveal>

            <div className="mt-12 grid gap-8 md:grid-cols-2 md:gap-10">
              {XFACTORS.map((x, i) => (
                <ScrollReveal key={x.title} delay={0.08 * i}>
                  <div className="border-l-2 border-accent/60 pl-5">
                    <h3 className="font-display text-xl font-semibold tracking-[-0.01em] text-foreground">
                      {x.title}
                    </h3>
                    <p className="mt-3 text-base leading-relaxed text-foreground/75">{x.body}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section>
          <div className="container py-20 md:py-24">
            <ScrollReveal>
              <div className="max-w-2xl mx-auto text-center">
                <h2 className="font-display text-[clamp(28px,4vw,40px)] font-semibold tracking-[-0.02em] leading-[1.05]">
                  Same shelf, different category.
                </h2>
                <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                  Coastal Brewing Co. ships specialty-grade coffee at the same price the
                  field already publishes. The agentic team comes with the bag — at no
                  extra charge to non-members, and unlocked at every level for our $199
                  Standard Membership.
                </p>
                <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button asChild variant="accent" size="lg" className="font-mono text-[11px] uppercase tracking-widest">
                    <Link href="/membership" data-compare-cta="final-membership">
                      Join Standard Membership
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" size="lg" className="font-mono text-[11px] uppercase tracking-widest">
                    <Link href="/products" data-compare-cta="final-browse">
                      Browse the catalog
                    </Link>
                  </Button>
                </div>
                <p className="mt-12 max-w-xl mx-auto text-xs text-muted-foreground/70">
                  Building a brand and want to use the platform that runs Coastal? See the{" "}
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
