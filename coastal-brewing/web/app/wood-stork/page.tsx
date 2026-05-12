import Link from "next/link";
import type { Metadata } from "next";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { WoodStorkCheckoutForm } from "@/components/wood-stork-checkout-form";

export const metadata: Metadata = {
  title: "Wood Stork Plan · Coastal Brewing Co.",
  description:
    "Wood Stork Plan — for multi-location buyers, restaurants, and offices. Pick the bulk bundle that fits each cycle. Standard $56.24/mo or Reserve $112.49/mo on the 9-month plan. Cancel anytime.",
};

// Owner-ratified 2026-05-12: plan benefits are ONLY (1) the products you
// pick each cycle and (2) the cadence discount. Prior copy oversold a
// referral discount tied to manual tracking, monthly account-rep hours,
// on-site visits, founders'-table calls, and a "named Wood Stork blend"
// — none of those are honor-able at scale today. Stripped.
const STANDARD_BENEFITS = [
  {
    title: "You pick what comes in your box",
    body: "Bulk coffee, bulk tea, or a multi-location split. Choose the mix that fits this cycle. Swap your picks anytime from your account.",
  },
  {
    title: "Cadence discount baked in",
    body: "Month-to-month is full retail. The 3-month plan saves 15%. The 6-month plan saves 20%. The 9-month plan saves 25% AND delivers 12 months of bundles (pay 9, get 12).",
  },
  {
    title: "Pause, swap, or cancel anytime",
    body: "No long-term lock-in. Pause delivery, swap your picks, or cancel from your account — your card isn't charged for skipped cycles.",
  },
];

const RESERVE_EXTRAS = [
  {
    title: "Whitelabel + larger envelope",
    body: "Standard fits one to three addresses; Reserve adds the whitelabel option and supports up to ten locations on one account.",
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
            Wood Stork Plan
          </h1>
          <p className="mt-3 font-mono text-sm text-muted-foreground">
            Standard $56.24/mo · Reserve $112.49/mo · on the 9-month plan
            <span className="block mt-1 text-foreground/70">
              Monthly, 3-month, 6-month, or 9-month plans. Cancel anytime.
            </span>
          </p>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-foreground/80">
            For multi-location buyers, restaurants, offices, and the people who keep
            sending us new customers. Wood Stork rewards volume and referrals — your
            discount grows with every business you bring in, up to 50% off your own
            orders. Pick the plan that fits — month-to-month, 3-month, 6-month, or
            the 9-month plan for the best rate (pay 9 months, get 12 months of access).
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
