import Link from "next/link";
import type { Metadata } from "next";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { WoodStorkCheckoutForm } from "@/components/wood-stork-checkout-form";

export const metadata: Metadata = {
  title: "Wood Stork Membership · Coastal Brewing Co.",
  description:
    "Wood Stork — a named line to our team for your business. Direct line to Melli, monthly review with ACHEEVY, 4 hrs/mo account help, plus a referral-driven discount up to 50%. Standard $56.24/mo or Reserve $112.49/mo on the 9-month plan.",
};

const STANDARD_BENEFITS = [
  {
    title: "Direct business line to Melli",
    body: "Melli runs our business accounts. Call or chat any time for reorders, swaps, or rush jobs. No phone tree, no waiting. Your business gets named-contact access — she knows who you are by the second call.",
  },
  {
    title: "Account help — 4 hours / month",
    body: "A dedicated point of contact for your business. Reorders, recipe help, gift sends, event coordination. Carries forward up to 8 hours if you don't use it.",
  },
  {
    title: "Referral-driven discount — up to 50%",
    body: "Your member discount on product orders grows with every business you bring in: 18% base · 25% after 1-5 referrals · 35% after 5-10 · 45% after 10-20 · 50% after 20+ (the cap). Applied at checkout, within our margin floor.",
  },
  {
    title: "Free shipping, every order",
    body: "Bulk bags, case orders, gear — included. No $15 freight ceiling.",
  },
];

const RESERVE_EXTRAS = [
  {
    title: "Monthly business review with ACHEEVY",
    body: "ACHEEVY runs the brand. You get a standing 30-minute monthly call to walk through your account. Quarterly deep-dive every three months.",
  },
  {
    title: "Quarterly on-site visit",
    body: "Our team comes to your business for an on-site walkthrough, a custom briefing, and to put faces to names.",
  },
  {
    title: "First look at partner pricing",
    body: "If you're thinking about running the Coastal model for your own brand, Reserve members see partner-program pricing before it's public.",
  },
  {
    title: "Named Wood Stork blend",
    body: "We blend a coffee in your business's honor and ship it to you and your customers.",
  },
  {
    title: "Founders' table",
    body: "A private quarterly call with the owner and ACHEEVY. Ask anything.",
  },
];

const REFERRAL_TIERS = [
  { range: "0", discount: "18%", label: "Base Wood Stork" },
  { range: "1–5", discount: "25%", label: "First wave" },
  { range: "5–10", discount: "35%", label: "Pollinator" },
  { range: "10–20", discount: "45%", label: "Power referrer" },
  { range: "20+", discount: "50%", label: "Max — caps here" },
];

export default function WoodStorkPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-16">
        <header className="mb-14">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Coastal Brewing Co. · C|Brew Yearly Subscription
          </p>
          <h1 className="mt-3 font-serif text-4xl leading-tight text-foreground sm:text-5xl">
            Wood Stork
          </h1>
          <p className="mt-3 font-mono text-sm text-muted-foreground">
            Standard $56.24/mo · Reserve $112.49/mo · on the 9-month plan
            <span className="block mt-1 text-foreground/70">
              Monthly, 3-month, 6-month, or 9-month plans. Cancel anytime.
            </span>
          </p>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-foreground/80">
            For multi-location buyers, restaurants, offices, and the people who keep
            sending us new customers. Wood Stork is a named line into our team — Melli
            on wholesale, monthly review with ACHEEVY, 4 hours of dedicated account
            help every month. The referral-driven product discount stacks on top:
            your member rate on orders grows with every business you bring us, up to
            50%. Pick the plan that fits — month-to-month, 3-month, 6-month, or the
            9-month plan for the best rate (pay 9 months, get 12 months of access).
          </p>
        </header>

        <section className="mb-14">
          <p className="mb-6 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            How the referral discount tiers
          </p>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  <th className="px-4 py-3">Successful referrals</th>
                  <th className="px-4 py-3">Discount on your orders</th>
                  <th className="px-4 py-3">Tier name</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground/85">
                {REFERRAL_TIERS.map((t, i) => (
                  <tr key={t.range} className={i === REFERRAL_TIERS.length - 1 ? "bg-accent/10" : ""}>
                    <td className="px-4 py-3 font-medium">{t.range}</td>
                    <td className="px-4 py-3 font-mono">{t.discount}</td>
                    <td className="px-4 py-3 text-foreground/70">{t.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Discount applies to your product orders · not membership renewals · not wholesale-pricing tiers
          </p>
        </section>

        <section className="mb-14">
          <p className="mb-6 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Standard tier benefits — $56.24/mo (9-month plan)
          </p>
          <ul className="space-y-6">
            {STANDARD_BENEFITS.map((b) => (
              <li key={b.title} className="border-l-2 border-accent/50 pl-5">
                <h3 className="font-serif text-xl text-foreground">{b.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-foreground/75">{b.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-14">
          <p className="mb-6 font-mono text-[10px] uppercase tracking-widest text-accent">
            Reserve tier extras — $112.49/mo (9-month plan)
          </p>
          <p className="mb-6 text-sm text-foreground/70">
            Everything in Standard, plus:
          </p>
          <ul className="space-y-6">
            {RESERVE_EXTRAS.map((b) => (
              <li key={b.title} className="border-l-2 border-accent pl-5">
                <h3 className="font-serif text-xl text-foreground">{b.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-foreground/75">{b.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-14 rounded-lg border border-border bg-card/40 p-8">
          <h2 className="font-serif text-2xl text-foreground">Become a Wood Stork</h2>
          <p className="mt-3 text-foreground/75">
            Pick your tier, drop your business name and email, and you&rsquo;ll go straight
            to secure checkout. Questions? Reach{" "}
            <a
              className="text-accent underline-offset-4 hover:underline"
              href="mailto:wholesale@coastalbrewing.co"
            >
              wholesale@coastalbrewing.co
            </a>
            .
          </p>
          <WoodStorkCheckoutForm />
        </section>

        <footer className="border-t border-border pt-6 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <Link href="/compare" className="hover:text-foreground">
            See how we compare
          </Link>
          <span className="mx-3">·</span>
          <Link href="/membership" className="hover:text-foreground">
            Coastal Custee Card Plan
          </Link>
          <span className="mx-3">·</span>
          Made in PLR
          <span className="mx-3">·</span>
          Coastal Brewing Co.
        </footer>
      </main>
      <Footer />
    </>
  );
}
