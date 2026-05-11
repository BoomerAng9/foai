import Link from "next/link";
import type { Metadata } from "next";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { PoolerPassCheckoutForm } from "@/components/pooler-pass-checkout-form";

export const metadata: Metadata = {
  title: "Pooler Pass · Coastal Brewing Co.",
  description:
    "Pooler Pass — local Coastal Brewing Co. membership for the 50–100 mile radius around Pooler, GA (31322). $49/yr Standard or $99/yr Plus.",
};

const STANDARD_BENEFITS = [
  {
    title: "12% off in-store",
    body: "Auto-applied at the Pooler storefront. Stacks with hand-pack and same-day pickup.",
  },
  {
    title: "Free local pickup",
    body: "No shipping cost when you pick up at the Pooler storefront. Pre-order via chat or just walk in.",
  },
  {
    title: "Member-only Pooler events",
    body: "Tasting nights, Sal_Ang storefront kiosk visits, monthly LP-team coffee chat. We invite, you show up.",
  },
  {
    title: "First in line for storefront drops",
    body: "Limited-batch drops, Tier F Reserve allocations, and one-off LP-team specials hit Pooler Pass members before national.",
  },
];

const PLUS_EXTRAS = [
  {
    title: "Monthly Habbak refill",
    body: "A 50g tin of our Saudi Hassawi mint shows up every month. Free.",
  },
  {
    title: "First dibs on storefront-only drops",
    body: "Before Standard members. Before national. Pooler Pass Plus is first in line, full stop.",
  },
  {
    title: "Pooler Local mention on the gratitude wall",
    body: "Annual gratitude wall at the Pooler storefront. Your name on the brick (or close to it).",
  },
];

const ELIGIBILITY = [
  { range: "Inside 50 mi", verdict: "Eligible · Local", places: "Pooler, Savannah, Richmond Hill, Bloomingdale, Garden City, Port Wentworth, Tybee Island, Hilton Head Island, Bluffton" },
  { range: "50–100 mi", verdict: "Eligible · Extended Local", places: "Beaufort, Statesboro, Brunswick, Hinesville, Jesup, Vidalia, Walterboro, Charleston (edge)" },
  { range: "Outside 100 mi", verdict: "Not eligible — see Coastal Custee Card", places: "Anywhere else; Coastal Custee Card (from $29.99/mo, ships nationwide) is the right fit" },
];

export default function PoolerPassPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-16">
        <header className="mb-14">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Coastal Brewing Co. · C|Brew Yearly Subscription
          </p>
          <h1 className="mt-3 font-serif text-4xl leading-tight text-foreground sm:text-5xl">
            Pooler Pass
          </h1>
          <p className="mt-3 font-mono text-sm text-muted-foreground">
            Standard from $7.49/mo · Plus from $14.99/mo
            <span className="block mt-1 text-foreground/70">
              3-month, 6-month, or 9-month plans — pay 9 months, get 12.
            </span>
          </p>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-foreground/80">
            For locals — within 50 to 100 miles of Pooler (ZIP 31322). Discount when
            you walk in, free local pickup, member-only events at the storefront, and
            first dibs on what just came out of the back. Pick the cadence that fits —
            month-to-month for try-out, 9-month plan for full support (you pay 9 months,
            we deliver 12).
          </p>
        </header>

        <section className="mb-14">
          <p className="mb-6 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Who&rsquo;s eligible
          </p>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  <th className="px-4 py-3">Distance</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Includes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground/85">
                {ELIGIBILITY.map((e, i) => (
                  <tr key={e.range} className={i < 2 ? "bg-accent/[0.04]" : ""}>
                    <td className="px-4 py-3 font-medium">{e.range}</td>
                    <td className="px-4 py-3">{e.verdict}</td>
                    <td className="px-4 py-3 text-foreground/70 text-[13px]">{e.places}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            ZIP verified at signup · re-checked at each annual renewal · 30-day notice if you move out-of-radius
          </p>
        </section>

        <section className="mb-14">
          <p className="mb-6 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Standard tier benefits — from $7.49/mo
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
            Plus tier extras — from $14.99/mo
          </p>
          <p className="mb-6 text-sm text-foreground/70">
            Everything in Standard, plus:
          </p>
          <ul className="space-y-6">
            {PLUS_EXTRAS.map((b) => (
              <li key={b.title} className="border-l-2 border-accent pl-5">
                <h3 className="font-serif text-xl text-foreground">{b.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-foreground/75">{b.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-14 rounded-lg border border-border bg-card/40 p-8">
          <h2 className="font-serif text-2xl text-foreground">Get your Pooler Pass</h2>
          <p className="mt-3 text-foreground/75">
            ZIP first, tier next, email last. Questions? Reach{" "}
            <a
              className="text-accent underline-offset-4 hover:underline"
              href="mailto:locals@coastalbrewing.co"
            >
              locals@coastalbrewing.co
            </a>
            .
          </p>
          <PoolerPassCheckoutForm />
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
