import Link from "next/link";
import type { Metadata } from "next";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Welcome to Coastal · Coastal Brewing Co.",
  description:
    "Your Coastal plan is live. Pick what comes every month, save more the longer you commit, and pause, swap, or cancel any time.",
};

interface SearchParams {
  session_id?: string;
  tier?: string;
}

const TIER_LABELS: Record<string, string> = {
  "custee-card": "Coastal Custee Card Plan",
  "pooler-pass-standard": "Pooler Pass Plan (Standard)",
  "pooler-pass-plus": "Pooler Pass Plan (Plus)",
  "wood-stork-standard": "Wood Stork Plan (Standard)",
  "wood-stork-reserve": "Wood Stork Plan (Reserve)",
};

export default async function MembershipWelcomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { session_id, tier } = await searchParams;
  const tierLabel = (tier && TIER_LABELS[tier]) || "Coastal plan";

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-2xl px-6 pb-24 pt-16">
        <header className="mb-12">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            You&rsquo;re in.
          </p>
          <h1 className="mt-3 font-serif text-4xl leading-tight text-foreground sm:text-5xl">
            Welcome to Coastal.
          </h1>
          <p className="mt-6 text-base leading-relaxed text-foreground/80">
            Your {tierLabel} is live. Your first shipment is queued to build on the
            next monthly cycle. Until then, you can hop into your account any time to
            pick what comes in the box.
          </p>
        </header>

        <section className="mb-10 rounded-lg border border-border p-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            What your plan does
          </p>
          <ul className="mt-3 space-y-3 text-base text-foreground/85">
            <li>
              <span className="font-medium text-foreground">Pick what comes every month.</span>{" "}
              Open your monthly picker and drop in the coffee, tea, matcha, or merch you
              want. Mix and match across the catalog.
            </li>
            <li>
              <span className="font-medium text-foreground">Pay less when you commit longer.</span>{" "}
              Stay on monthly, or pick the 3-month, 6-month, or 9-month cadence for a
              smaller monthly bill the longer you stay.
            </li>
            <li>
              <span className="font-medium text-foreground">Pause, swap, or cancel any time.</span>{" "}
              Going on a trip? Pause. Got too much coffee? Swap a bag for tea. Don&rsquo;t
              want it anymore? Cancel from your account in two clicks.
            </li>
          </ul>
        </section>

        <section className="mb-10 rounded-lg border border-border p-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            About the service-initiation fee
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground/80">
            You&rsquo;ll see a separate one-time $6.54 service-initiation charge on
            your card statement, in addition to the first subscription charge. It
            covers setting up your account, your default monthly picker, and the
            address-verification step. It&rsquo;s a single charge, not a recurring
            line.
          </p>
        </section>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-6 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <Link href="/account" className="hover:text-foreground">
            Open your account
          </Link>
          <Link href="/products" className="hover:text-foreground">
            Browse the catalog
          </Link>
          <Link href="/chat" className="hover:text-foreground">
            Ask Sal a question
          </Link>
          <a href="mailto:members@coastalbrewing.co" className="hover:text-foreground">
            members@coastalbrewing.co
          </a>
        </nav>

        {session_id && (
          <p className="mt-8 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
            Confirmation reference: {session_id}
          </p>
        )}

        <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Made in PLR · Coastal Brewing Co.
        </p>
      </main>
      <Footer />
    </>
  );
}
