import Link from "next/link";
import type { Metadata } from "next";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { MembershipCheckoutForm } from "@/components/membership-checkout-form";

export const metadata: Metadata = {
  title: "Coastal Custee Card Plan · Coastal Brewing Co.",
  description:
    "Coastal Custee Card Plan — pick the coffee, tea, and matcha you want every month. $29.99/mo monthly or $22.49/mo on the 9-month plan. Pause, swap, or cancel any time.",
};

const BENEFITS = [
  {
    title: "Pick what comes every month",
    body: "Open your account, drop the coffee, tea, matcha, or merch you want into your monthly picker, and we ship it. Mix-and-match across the catalog. Change it whenever you like — your next shipment ships whatever's in the picker the day it builds.",
  },
  {
    title: "Pay less when you commit longer",
    body: "Monthly works fine. Pick the 3-month plan and save a little. Pick the 6-month plan and save more. The 9-month plan is our best rate — pay 9 months, get 12 months of access. Same products, smaller monthly bill the longer you stay.",
  },
  {
    title: "Pause, swap, or cancel any time",
    body: "Going on a trip? Pause. Got too much coffee? Swap a bag for tea or matcha. Don't want it anymore? Cancel from your account in two clicks. No hold music, no \"are you sure,\" no retention call.",
  },
];

const TERMS = [
  {
    n: 1,
    label: "Billing",
    body: "$29.99 per month on the monthly plan, $22.49 per month on the 9-month plan (pay 9 months, get 12 months of access). 3-month and 6-month plans land between those two rates. Charged via our secure payment processor at signup and on each subsequent billing cycle.",
  },
  {
    n: 2,
    label: "What ships",
    body: "Whatever's in your monthly picker the day the shipment builds. Update the picker any time from your account. A default starter bundle is set on signup so your first shipment goes out on time even if you haven't customized yet.",
  },
  {
    n: 3,
    label: "Pause + skip",
    body: "Pause your plan for up to 3 months from your account. Skip a single shipment from the same screen. No fee, no penalty, no expiration on paused plans within the 3-month window.",
  },
  {
    n: 4,
    label: "Swap",
    body: "Swap any product in your picker for any other product in the catalog any time before the build day. Coffee for tea, one roast for another, bag for merch — same monthly total, different stuff in the box.",
  },
  {
    n: 5,
    label: "Cancellation + refunds",
    body: "Cancel any time from your account. We don't refund the month already charged, but we don't bill again. Order ships, you keep what ships, and that's the end of it. No retention call, no \"please reconsider\" email.",
  },
  {
    n: 6,
    label: "Service-initiation fee",
    body: "A separate one-time $6.54 service-initiation fee is charged at signup to cover the cost of setting up your account, your default picker, and the address-verification step. It appears as its own line on your card statement, not bundled with the first subscription charge.",
  },
];

export default function MembershipPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-16">
        <header className="mb-14">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Coastal Brewing Co. · C|Brew Monthly Subscription
          </p>
          <h1 className="mt-3 font-serif text-4xl leading-tight text-foreground sm:text-5xl">
            Coastal Custee Card Plan
          </h1>
          <p className="mt-3 font-mono text-sm text-muted-foreground">
            $29.99/mo monthly · $22.49/mo on the 9-month plan
            <span className="block mt-1 text-foreground/70">
              Monthly, 3-month, 6-month, or 9-month plans. Pause, swap, or cancel any time.
            </span>
          </p>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-foreground/80">
            Pick the coffee, tea, matcha, or merch you want each month and we ship it.
            Change it whenever. Pause when you're going on a trip. Swap a bag for a tea.
            Cancel from your account in two clicks. Pick the plan that fits — month-to-month
            to try it out, or the 9-month plan for the best rate (pay 9 months, get 12
            months of access).
          </p>
        </header>

        <section className="mb-14">
          <p className="mb-6 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            What you get
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
          <h2 className="font-serif text-2xl text-foreground">Start your plan</h2>
          <p className="mt-3 text-foreground/75">
            Drop your email below and you&rsquo;ll go straight to secure checkout.
            Questions? Reach{" "}
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
                  <th className="px-4 py-3">Monthly</th>
                  <th className="px-4 py-3">9-month plan</th>
                  <th className="px-4 py-3">Built for</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground/85">
                <tr>
                  <td className="px-4 py-3 font-medium">Pooler Pass Standard</td>
                  <td className="px-4 py-3">$7.49 / mo</td>
                  <td className="px-4 py-3">$5.62 / mo</td>
                  <td className="px-4 py-3 text-muted-foreground">Locals · within 50–100 mi of Pooler</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Pooler Pass Plus</td>
                  <td className="px-4 py-3">$14.99 / mo</td>
                  <td className="px-4 py-3">$11.24 / mo</td>
                  <td className="px-4 py-3 text-muted-foreground">Locals who want first dibs</td>
                </tr>
                <tr className="bg-accent/5">
                  <td className="px-4 py-3 font-medium">Coastal Custee Card</td>
                  <td className="px-4 py-3">$29.99 / mo</td>
                  <td className="px-4 py-3">$22.49 / mo</td>
                  <td className="px-4 py-3 text-muted-foreground">Everyone · ships nationwide</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Wood Stork Standard</td>
                  <td className="px-4 py-3">$74.99 / mo</td>
                  <td className="px-4 py-3">$56.24 / mo</td>
                  <td className="px-4 py-3 text-muted-foreground">Business buyers · multi-location</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Wood Stork Reserve</td>
                  <td className="px-4 py-3">$149.99 / mo</td>
                  <td className="px-4 py-3">$112.49 / mo</td>
                  <td className="px-4 py-3 text-muted-foreground">Business + referral leaders</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Pooler Pass is for locals · Custee Card mixes products on the 3-6-9 cadence · Wood Stork is for business customers
          </p>
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
          <Link href="/pooler-pass" className="hover:text-foreground">
            Pooler Pass (locals)
          </Link>
          <span className="mx-3">·</span>
          <Link href="/wood-stork" className="hover:text-foreground">
            Wood Stork (business)
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
