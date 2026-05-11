import Link from "next/link";
import type { Metadata } from "next";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { WoodStorkCheckoutForm } from "@/components/wood-stork-checkout-form";

export const metadata: Metadata = {
  title: "Wood Stork Membership · Coastal Brewing Co.",
  description:
    "Wood Stork — Coastal Brewing Co.'s high-volume tier for multi-location buyers, corporate accounts, and prolific referrers. Tiered referral discount up to 50% off.",
};

const STANDARD_BENEFITS = [
  {
    title: "Tiered referral discount — up to 50%",
    body: "Your discount on product orders climbs with cumulative successful referrals: 18% base · 25% at 1–5 · 35% at 5–10 · 45% at 10–20 · 50% at 20+ (caps here). Auto-applied at checkout.",
  },
  {
    title: "Free shipping, all freight classes",
    body: "Bulk gear, case orders, drum-roaster accessories — included. No $15 freight ceiling.",
  },
  {
    title: "Priority Sal_Ang business voice line",
    body: "Direct line for re-orders, swap requests, and rush situations. No phone tree.",
  },
  {
    title: "Account Assistant — 4 hours / month",
    body: "Your point of contact for the Coastal team. Reorders, recipe troubleshooting, gift sends, event coordination.",
  },
];

const RESERVE_EXTRAS = [
  {
    title: "Dedicated ACHEEVY pod",
    body: "Standing 30-min monthly with the orchestrator. Quarterly business review.",
  },
  {
    title: "LP team site visit — quarterly",
    body: "Our Loss Prevention team comes to you for an on-site assessment + custom briefing.",
  },
  {
    title: "First-look licensee pricing",
    body: "Reserve members see Platform Partner ($15K/mo) and Full Launch ($50K-$500K/mo) tier preview before public release.",
  },
  {
    title: "Named Wood Stork blend",
    body: "We blend a coffee in your business's honor and ship it to you and your customers.",
  },
  {
    title: "ACHEEVY Founders' Table",
    body: "Private quarterly call with the human in the loop and ACHEEVY. Ask anything.",
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
            Standard $499/yr · Reserve $999/yr · pay 9, get 12
            <span className="block mt-1 text-foreground/70">
              3-month, 6-month, or 9-month plans — pay 9 months, get 12.
            </span>
          </p>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-foreground/80">
            For multi-location buyers, corporate accounts, restaurants, and the people
            who keep introducing us to their friends. Wood Stork tier rewards volume
            and referrals with a discount that grows with every Custee you bring in —
            up to 50% off your own orders. Choose the cadence that fits — month-to-month,
            3-month, 6-month, or our 9-month plan that delivers a full year of access for
            the price of nine months.
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
            Standard tier benefits — $499/yr (9-mo plan)
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
            Reserve tier extras — $999/yr (9-mo plan)
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
            Standard Membership
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
