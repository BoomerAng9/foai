import Link from "next/link";
import type { Metadata } from "next";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { MembershipCheckoutForm } from "@/components/membership-checkout-form";

export const metadata: Metadata = {
  title: "Coastal Custee Card Plan · Coastal Brewing Co.",
  description:
    "Coastal Custee Card Plan — pick what's in your box each cycle (tea, coffee, functional, combo, sampler). Monthly, 3-mo, 6-mo, or 9-mo cadences. Pause, swap, or cancel anytime.",
};

// Owner-ratified 2026-05-12: plan benefits are ONLY (1) the products you
// pick each cycle and (2) the cadence discount. Prior copy oversold
// unlimited free delivery, a 15% extra discount on everything, a $15-25
// physical welcome box, a "live look-in" stream, and a refer-2-get-fee-back
// loop — none of those are honor-able at scale today. Stripped.
const BENEFITS = [
  {
    title: "You pick what comes in your box",
    body: "Tea, coffee, functional coffee, combo, or sampler — choose the bundle that fits this cycle. Swap your picks anytime from your account.",
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

const TERMS = [
  {
    n: 1,
    label: "Billing",
    body: "Charged monthly at the cadence rate you pick (month / 3-mo / 6-mo / 9-mo). Card on file via our secure payment processor.",
  },
  {
    n: 2,
    label: "Renewal",
    body: "Auto-renews at the same cadence on each cycle. Cancel any time from your account; your card isn't charged for the next cycle once cancelled.",
  },
  {
    n: 3,
    label: "What's in the box",
    body: "Picked by you in the form below — tea, coffee, functional, combo, or sampler. Swap your picks any cycle from your account.",
  },
  {
    n: 4,
    label: "Cancellation + refunds",
    body: "Cancel any time before the next cycle bills. Refunds only for pre-shipment cycles inside the first 7 days; after that, cycles already shipped are not refundable.",
  },
];

export default function MembershipPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-16">
        <header className="mb-14">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Coastal Brewing Co.
          </p>
          <h1 className="mt-3 font-serif text-4xl leading-tight text-foreground sm:text-5xl">
            Coastal Custee Card Plan
          </h1>
          <p className="mt-3 font-mono text-sm text-muted-foreground">
            $22.49 / mo on the 9-month plan · or pick monthly / 3-mo / 6-mo below
          </p>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-foreground/80">
            Pick what comes in your box each cycle — tea, coffee, functional coffee,
            combo, or sampler. Choose a cadence below; the longer plans save more.
            Pause, swap, or cancel any time.
          </p>
        </header>

        <section className="mb-14">
          <p className="mb-6 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Become a member and get
          </p>
          <ul className="space-y-6">
            {BENEFITS.map((b) => (
              <li key={b.title} className="border-l-2 border-accent/50 pl-5">
                <h3 className="font-serif text-xl text-foreground">{b.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-foreground/75">
                  {b.body}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-14 rounded-lg border border-border bg-card/40 p-8">
          <h2 className="font-serif text-2xl text-foreground">Join</h2>
          <p className="mt-3 text-foreground/75">
            Pick your cadence (monthly, 3-mo, 6-mo, or 9-mo), pick what
            comes in your box, drop your email below — you&rsquo;ll go straight
            to secure checkout. Questions? Reach out to{" "}
            <a
              className="text-accent underline-offset-4 hover:underline"
              href="mailto:members@coastalbrewing.co"
            >
              members@coastalbrewing.co
            </a>
            .
          </p>
          <MembershipCheckoutForm />
        </section>

        <section className="mb-14">
          <h2 className="mb-6 font-serif text-2xl text-foreground">Where it slots</h2>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">What fits in your box</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground/85">
                <tr className="bg-accent/5">
                  <td className="px-4 py-3 font-medium">Pooler Pass Plan (local)</td>
                  <td className="px-4 py-3">$5.62 – $11.24 / mo</td>
                  <td className="px-4 py-3">1–2 items per cycle</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">Coastal Custee Card Plan</td>
                  <td className="px-4 py-3">$22.49 / mo (9-mo plan)</td>
                  <td className="px-4 py-3">Mix-and-match each cycle</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Wood Stork Plan</td>
                  <td className="px-4 py-3">$56.24 – $112.49 / mo</td>
                  <td className="px-4 py-3">Bulk / multi-location</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Pooler Pass is local (50–100 mi from Pooler) · Custee Card ships nationwide · Wood Stork is for business customers
          </p>
        </section>

        <section className="mb-14 rounded-lg border border-accent/40 bg-accent/[0.04] p-8">
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
            See how we compare
          </p>
          <h2 className="mt-3 font-serif text-2xl text-foreground">
            Same shelf as Stumptown, Onyx, Counter Culture.
          </h2>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-foreground/75">
            Our bag prices sit right alongside the top specialty roasters. The
            difference: we&rsquo;re the only one with a real team you can chat
            with — Sal at the counter, LUC managing the floor, Melli on
            business orders, ACHEEVY watching the brand. Talk to them, ask
            for a deal, watch them work.
          </p>
          <Link
            href="/compare"
            className="mt-5 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-accent hover:text-foreground transition-colors"
          >
            See the side-by-side comparison →
          </Link>
        </section>

        <section className="mb-14">
          <h2 className="mb-6 font-serif text-2xl text-foreground">Terms</h2>
          <ol className="space-y-5">
            {TERMS.map((t) => (
              <li key={t.n}>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {t.n}. {t.label}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-foreground/80">
                  {t.body}
                </p>
              </li>
            ))}
          </ol>
          <p className="mt-8 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Questions ·{" "}
            <a
              className="text-foreground/80 hover:text-foreground"
              href="mailto:members@coastalbrewing.co"
            >
              members@coastalbrewing.co
            </a>
          </p>
        </section>

        <footer className="border-t border-border pt-6 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <Link href="/live" className="hover:text-foreground">
            See the live look-in
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
