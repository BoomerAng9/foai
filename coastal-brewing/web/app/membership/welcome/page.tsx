import Link from "next/link";
import type { Metadata } from "next";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Welcome to the Standard Membership · Coastal Brewing Co.",
  description:
    "You're a Coastal Brewing Co. Standard Member. Your welcome box ships within 10 business days.",
};

interface SearchParams {
  session_id?: string;
}

export default async function MembershipWelcomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { session_id } = await searchParams;

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-2xl px-6 pb-24 pt-16">
        <header className="mb-12">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            You&rsquo;re in.
          </p>
          <h1 className="mt-3 font-serif text-4xl leading-tight text-foreground sm:text-5xl">
            Welcome to Standard Membership.
          </h1>
          <p className="mt-6 text-base leading-relaxed text-foreground/80">
            Your $199 is in, your account is flagged, and your welcome box is
            queued for shipment. Sal will hand-pack the first batch personally —
            expect arrival within 10 business days. Coastal Brewing Co.
            appreciates you.
          </p>
        </header>

        <section className="mb-10 rounded-lg border border-accent/40 bg-accent/5 p-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            What ships in your box
          </p>
          <ul className="mt-3 space-y-2 text-base text-foreground/85">
            <li>· Ceramic pour-over dripper</li>
            <li>· Coastal Brewing Co. storefront-window-etching sticker set</li>
            <li>· 50g tin of Habbak — our Saudi Hassawi mint</li>
          </ul>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Tracking lands in your inbox the day it ships
          </p>
        </section>

        <section className="mb-10 rounded-lg border border-border p-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Your benefits, live as of right now
          </p>
          <ul className="mt-3 space-y-2 text-base text-foreground/85">
            <li>· 15% off everything in the catalog · auto-applied at checkout</li>
            <li>· Free delivery under the $15 freight ceiling · Pooler / Savannah / Lowcountry always free</li>
            <li>· Live 2D look-in to the Pooler floor · members-only</li>
            <li>· Refer 2 new members within 12 months and your $199 is refunded</li>
          </ul>
        </section>

        <section className="mb-10 rounded-lg border border-border p-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Your referral code
          </p>
          <p className="mt-2 text-sm text-foreground/75">
            Your unique referral code is being minted now and will arrive in your
            welcome email along with shipping confirmation. Share it with two
            friends who&rsquo;ve never bought from Coastal Brewing Co. before —
            when they sign up and complete their first annual fee, your $199 is
            refunded automatically within 30 days.
          </p>
        </section>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-6 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <Link href="/products" className="hover:text-foreground">
            Shop with your member discount
          </Link>
          <Link href="/live" className="hover:text-foreground">
            Open the live look-in
          </Link>
          <Link href="/account" className="hover:text-foreground">
            Visit your account
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
