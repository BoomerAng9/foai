import Link from "next/link";
import type { Metadata } from "next";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Standard Membership · Coastal Brewing Co.",
  description:
    "Coastal Brewing Co. Standard Membership — $199/yr for unlimited free delivery, 15% off everything, our welcome box, and live 2D look-in to the Pooler storefront.",
};

const BENEFITS = [
  {
    title: "Unlimited free delivery",
    body: "Under the $15 freight ceiling. Local Pooler / Savannah / Lowcountry orders are always free; most coffee, tea, merch, and home-product shipments qualify.",
  },
  {
    title: "Automatic 15% discount",
    body: "On every product — coffee, tea, gear, merch, the works. Stacks with the free-delivery benefit. Applied silently at checkout.",
  },
  {
    title: "Welcome box",
    body: "Ceramic pour-over dripper for cutting through whatever you're brewing at home, our Coastal Brewing Co. storefront-window-etching sticker set, and a complimentary tin of Habbak — our Saudi Hassawi mint, sourced from our specialty tea partners.",
  },
  {
    title: "Live 2D look-in",
    body: "Open coastalbrewing.co/live and watch the Pooler storefront and back-of-house in real time on a 2D floor plan. Sal at the bar, the Sett in their tunnel, the Roos in the Warehouse — all moving as it happens. Members-only.",
  },
  {
    title: "Refer 2, get your fee back",
    body: "Refer up to two new paid members within twelve months and your $199 membership fee is refunded. Referrals must be brand new to Coastal Brewing Co. — not existing customers.",
  },
];

const TERMS = [
  {
    n: 1,
    label: "Membership fee",
    body: "$199 per year, charged on signup and each subsequent annual renewal. Paid via our secure payment processor at checkout.",
  },
  {
    n: 2,
    label: "Renewal",
    body: "Auto-renews on the anniversary date unless cancelled at least 7 calendar days before renewal. Self-service via your account or by emailing members@coastalbrewing.co.",
  },
  {
    n: 3,
    label: "Free delivery",
    body: "Free standard delivery on any order whose carrier freight cost is under $15. Heavy, oversized, or freight-class shipments may carry residual freight calculated at checkout. Coffee subscription deliveries are always free regardless of freight class.",
  },
  {
    n: 4,
    label: "15% member discount",
    body: "Auto-applied 15% off all retail-priced products at checkout. Stacks with free-delivery benefit. Does not stack with bulk-pricing tiers or with Lifetime Concierge's 25% discount tier.",
  },
  {
    n: 5,
    label: "Welcome box",
    body: "Shipped within 10 business days of signup. Contains a ceramic pour-over dripper, a Coastal Brewing Co. storefront-window-etching sticker set, and a complimentary 50g tin of Habbak. Welcome box value is part of the membership fee and is non-refundable once shipped.",
  },
  {
    n: 6,
    label: "Referral refund",
    body: "Refer two new paid members within 12 months of your signup, and your initial $199 fee is refunded within 30 days of the second referral completing payment. New paid members must never have been Coastal Brewing Co. retail customers, subscribers, or members before. Refund is one-time per account.",
  },
  {
    n: 7,
    label: "Cancellation + refunds",
    body: "Cancel within 7 days of signup for a full refund, provided the welcome box has not been shipped. After 7 days OR after welcome-box shipment, memberships are non-refundable except via the referral mechanism above.",
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
            Standard Membership
          </h1>
          <p className="mt-3 font-mono text-sm text-muted-foreground">
            Regular price · $199 / year
          </p>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-foreground/80">
            Free delivery only applies to shipments under $15 in shipping cost — local
            Pooler / Savannah / Lowcountry orders, most coffee and tea, most merch, most
            home products. Bulk gear may carry residual freight.
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
            Standard Membership opens at $199/year. Checkout opens shortly — drop your
            email below and we&rsquo;ll write you the moment your invite is ready, or
            reach out directly to{" "}
            <a
              className="text-accent underline-offset-4 hover:underline"
              href="mailto:members@coastalbrewing.co"
            >
              members@coastalbrewing.co
            </a>
            .
          </p>
          <form
            className="mt-6 flex flex-col gap-3 sm:flex-row"
            action="mailto:members@coastalbrewing.co"
            method="post"
            encType="text/plain"
          >
            <input
              type="email"
              name="email"
              required
              placeholder="you@your-coast.com"
              className="flex-1 rounded-md border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-md bg-accent px-6 py-3 font-mono text-xs uppercase tracking-widest text-accent-foreground transition-colors hover:bg-accent/90"
            >
              Reserve my spot
            </button>
          </form>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            No charge today · checkout link arrives via email
          </p>
        </section>

        <section className="mb-14">
          <h2 className="mb-6 font-serif text-2xl text-foreground">Where it slots</h2>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Discount</th>
                  <th className="px-4 py-3">Concierge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground/85">
                <tr className="bg-accent/5">
                  <td className="px-4 py-3 font-medium">Standard Membership</td>
                  <td className="px-4 py-3">$199 / yr</td>
                  <td className="px-4 py-3">15%</td>
                  <td className="px-4 py-3 text-muted-foreground">—</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Lifetime Member</td>
                  <td className="px-4 py-3">$999 once</td>
                  <td className="px-4 py-3">15%</td>
                  <td className="px-4 py-3 text-muted-foreground">—</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Lifetime Concierge</td>
                  <td className="px-4 py-3">$4,999 once</td>
                  <td className="px-4 py-3">25%</td>
                  <td className="px-4 py-3">Yes</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Standard is the on-ramp · Lifetime tiers stay open for one-time commits
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
