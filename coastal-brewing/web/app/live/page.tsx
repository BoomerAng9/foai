import Link from "next/link";
import type { Metadata } from "next";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Live look-in · Coastal Brewing Co.",
  description:
    "Watch the Pooler storefront and back-of-house in real time on a 2D floor plan. Members-only. Plans start at $7.49/mo on Pooler Pass; $29.99/mo on the Coastal Custee Card Plan.",
};

const ROOMS = [
  {
    zone: "Front-of-house · Pooler",
    rooms: [
      "Sal's bar",
      "Host stand",
      "Tasting bar",
      "Pour-over station",
      "Tea bar",
      "Counter",
      "Harbor view",
    ],
  },
  {
    zone: "Back-of-house",
    rooms: [
      "Melli's office",
      "Accounting",
      "The Sett tunnel",
      "The Warehouse",
      "Operations Floor",
    ],
  },
];

export default function LivePage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-16">
        <header className="mb-12">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Live look-in · members-only
          </p>
          <h1 className="mt-3 font-serif text-4xl leading-tight text-foreground sm:text-5xl">
            The Pooler floor, in motion.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-foreground/80">
            Sal at the bar. Wren walking across to the tea station. Marquis at the
            counter. The Sett deep in their tunnel. The Roos in the Warehouse. All
            moving in real time on a 2D floor plan of the Pooler storefront and
            back-of-house — not a screen recording, not a marketing reel. The shop is
            alive and you can watch it work.
          </p>
        </header>

        <section
          aria-labelledby="paywall"
          className="mb-12 rounded-lg border border-accent/40 bg-accent/5 p-8"
        >
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Locked · members only
          </p>
          <h2
            id="paywall"
            className="mt-3 font-serif text-2xl text-foreground sm:text-3xl"
          >
            Members get in. Plans start at $7.49/mo.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-foreground/80">
            The live look-in is included with any Coastal subscription. Every plan
            gives you the same three things: pick what comes every month, save more
            the longer you commit, and pause, swap, or cancel from your account any
            time.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/membership"
              className="rounded-md bg-accent px-6 py-3 text-center font-mono text-xs uppercase tracking-widest text-accent-foreground transition-colors hover:bg-accent/90"
            >
              See the Coastal Custee Card Plan
            </Link>
            <Link
              href="/pooler-pass"
              className="rounded-md border border-border px-6 py-3 text-center font-mono text-xs uppercase tracking-widest text-foreground transition-colors hover:border-foreground/40"
            >
              Locals · see Pooler Pass
            </Link>
          </div>
        </section>

        <section
          aria-labelledby="floor-plan-preview"
          className="mb-12 rounded-lg border border-border p-6"
        >
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            What you&rsquo;ll see when you&rsquo;re in
          </p>
          <h2
            id="floor-plan-preview"
            className="mt-3 font-serif text-xl text-foreground"
          >
            The floor plan
          </h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {ROOMS.map((zone) => (
              <div key={zone.zone}>
                <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {zone.zone}
                </p>
                <ul className="space-y-1.5">
                  {zone.rooms.map((room) => (
                    <li
                      key={room}
                      className="flex items-baseline gap-3 text-sm text-foreground/85"
                    >
                      <span aria-hidden="true" className="text-muted-foreground">
                        ·
                      </span>
                      <span>{room}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-6 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Each room shows the Cast members assigned to it, what they&rsquo;re doing
            right now, and where they&rsquo;re moving next.
          </p>
        </section>

        <section
          aria-labelledby="how-it-works"
          className="mb-12 rounded-lg border border-border p-6"
        >
          <h2
            id="how-it-works"
            className="font-serif text-xl text-foreground"
          >
            How it works
          </h2>
          <ol className="mt-4 space-y-4 text-sm text-foreground/85">
            <li>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                01 · Status, every 10 seconds
              </span>
              <p className="mt-1.5">
                The state of every Cast member — where they are, what they&rsquo;re
                working on — refreshes every ten seconds.
              </p>
            </li>
            <li>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                02 · Animations
              </span>
              <p className="mt-1.5">
                Walking when they move rooms, typing when they&rsquo;re executing,
                consulting when they&rsquo;re paired up, dispatched (with a quick gold
                ring) when ACHEEVY hands them a Mission Brief.
              </p>
            </li>
            <li>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                03 · Mobile-first
              </span>
              <p className="mt-1.5">
                The floor plan stacks vertically on phones — same data, calmer pace.
              </p>
            </li>
          </ol>
        </section>

        <footer className="border-t border-border pt-6 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <Link href="/membership" className="hover:text-foreground">
            Become a member · plans from $7.49/mo
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
