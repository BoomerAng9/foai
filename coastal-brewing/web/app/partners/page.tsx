import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";

export const metadata = {
  title: "Partner Program — Coastal Brewing Co.",
  description:
    "Launch your own specialty beverage brand under the Coastal partner umbrella. Products, platform, and compliance — handled.",
};

const TIERS = [
  {
    id: "wholesale",
    name: "Wholesale Direct",
    tagline: "Your label. Our supply chain.",
    description:
      "For established businesses adding a specialty beverage line. Wholesale pricing on our full catalog — coffee, tea, matcha, and functional blends. Ship to your location or drop-ship directly to your customers.",
    includes: [
      "Wholesale pricing on 200+ SKUs",
      "Fair Trade-partnered sourcing, lot-traceable",
      "Drop-ship to your location or your customers",
      "Your label, your brand identity",
      "No inventory, no warehouse required",
    ],
    cta: "Inquire about wholesale",
    highlight: false,
  },
  {
    id: "platform",
    name: "Platform Partner",
    tagline: "Your brand. Our machine.",
    description:
      "For entrepreneurs building a specialty beverage company. Everything in Wholesale Direct, plus a complete AI-managed storefront built on our platform — your name, your domain, your customers.",
    includes: [
      "Everything in Wholesale Direct",
      "Custom branded storefront on our platform",
      "AI-managed sales and service team",
      "Real-time negotiation and deal-building for your customers",
      "Audit-logged, owner-accountable operations",
      "Same infrastructure that runs Coastal Brewing Co.",
    ],
    cta: "Inquire about platform access",
    highlight: true,
  },
  {
    id: "full-launch",
    name: "Full Launch",
    tagline: "From zero to first sale.",
    description:
      "For entrepreneurs starting from scratch. We handle the supply chain, the technology, and the compliance layer — so you can focus on your market and your customers.",
    includes: [
      "Everything in Platform Partner",
      "FDA-compliant label setup and sourcing documentation",
      "Legal entity and business registration guidance",
      "Business address service setup",
      "First 90 days of operational support",
      "Dedicated onboarding from our team",
    ],
    cta: "Inquire about full launch",
    highlight: false,
  },
];

const STANDARDS = [
  "Fair Trade-partnered sourcing — named farm origins on file",
  "Specialty-grade, fresh-roasted product",
  "Real mushroom powder where applicable — not extracts",
  "Nothing synthetic on motto-eligible SKUs",
  "Full lot traceability, sourced and curated by Coastal",
];

export default function PartnersPage() {
  return (
    <>
      <Nav />
      <main className="container py-16">

        {/* Lede */}
        <div className="mb-16 max-w-3xl">
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
            Partner Program
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight md:text-5xl">
            Your brand.<br />Our supply chain.<br />Their experience.
          </h1>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground">
            The Coastal Partner Program gives coffee shops, hospitality businesses, and beverage
            entrepreneurs a complete path to launch or scale a specialty beverage brand — without
            building the supply chain, the compliance stack, or the technology from scratch.
          </p>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            You serve your customers. We handle everything behind the counter.
          </p>
        </div>

        {/* Tiers */}
        <div className="mb-20 grid gap-6 lg:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`flex flex-col rounded-2xl border p-8 ${
                tier.highlight
                  ? "border-accent/40 bg-accent/5 shadow-lg"
                  : "border-border/60 bg-card/40"
              }`}
            >
              {tier.highlight && (
                <Badge variant="muted" className="mb-4 w-fit border-accent/40 text-accent uppercase tracking-widest">
                  Most popular
                </Badge>
              )}
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {tier.name}
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold">{tier.tagline}</h2>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">
                {tier.description}
              </p>
              <ul className="mt-6 space-y-2.5">
                {tier.includes.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span className="text-foreground/80">{item}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                variant={tier.highlight ? "accent" : "ghost"}
                size="sm"
                className="mt-8"
              >
                <a
                  href={`mailto:bpo@achievemor.io?subject=${encodeURIComponent("Partnership Inquiry — " + tier.name)}`}
                >
                  {tier.cta}
                </a>
              </Button>
            </div>
          ))}
        </div>

        {/* Standards */}
        <div className="mb-20 rounded-2xl border border-border/60 bg-card/30 px-8 py-10">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            What your brand inherits
          </p>
          <h2 className="mt-3 font-display text-2xl font-semibold md:text-3xl">
            The same standards we hold ourselves to.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Every product sold through the Coastal Partner Program is sourced, curated, and
            quality-assured through the same supply chain as our own catalog. Your customers get
            the same product integrity as Coastal&apos;s own customers.
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {STANDARDS.map((s) => (
              <li key={s} className="flex items-start gap-2.5 text-sm">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span className="text-foreground/80">{s}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Service promise */}
        <div className="mb-20 max-w-3xl">
          <p className="font-display text-lg italic text-muted-foreground">
            &ldquo;In the age of agentic solutions and service delivery, we are building solutions
            the way service should be.&rdquo;
          </p>
          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
            That applies to our partners as much as our customers. Your account has a dedicated
            lane in our AI-managed platform — real-time response, transparent pricing, no runaround.
            When you need something, we move.
          </p>
        </div>

        {/* Who it&apos;s for */}
        <div className="mb-20">
          <h2 className="mb-6 font-display text-2xl font-semibold md:text-3xl">Who this is for.</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "Independent coffee shops", desc: "Carry a private-label house blend under your name." },
              { label: "Restaurants & hospitality", desc: "Build a branded café program without a new supplier relationship." },
              { label: "Beverage entrepreneurs", desc: "Launch a specialty brand without the 12-month runway." },
              { label: "Subscription box operators", desc: "High-quality, labeled coffee and tea for your audience." },
              { label: "Corporate gifting", desc: "Branded product for clients, events, and employee programs." },
              { label: "Existing beverage brands", desc: "Expand your product line through our supply chain." },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-border/60 bg-card/30 p-5"
              >
                <p className="font-semibold text-foreground">{item.label}</p>
                <p className="mt-1.5 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl border border-accent/20 bg-accent/5 px-8 py-12 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Start the conversation</p>
          <h2 className="mt-3 font-display text-2xl font-semibold md:text-3xl">
            Ready to build under your own name?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Write us at{" "}
            <a className="text-accent hover:underline" href="mailto:bpo@achievemor.io">
              bpo@achievemor.io
            </a>{" "}
            with subject line <strong className="text-foreground">&ldquo;Partnership Inquiry&rdquo;</strong>.
            Tell us what kind of business you&apos;re running or building, what products interest you,
            and your timeline. We&apos;ll route to the right tier and start the conversation.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild variant="accent" size="lg">
              <a href="mailto:bpo@achievemor.io?subject=Partnership%20Inquiry">
                Inquire now
              </a>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link href="/chat?agent=sales">Talk to the team</Link>
            </Button>
          </div>
        </div>

      </main>
      <Footer />
    </>
  );
}
