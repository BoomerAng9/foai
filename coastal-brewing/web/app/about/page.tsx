import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata = {
  title: "About — Coastal Brewing Co.",
  description:
    "A Pooler, Georgia coffee shop. Real team. Real care. Specialty coffee, tea, and matcha — sourced honestly, signed off by a real person.",
};

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main className="container py-16">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Who runs this place</p>
          <h1 className="mt-2 font-display text-4xl font-semibold md:text-5xl">
            A coffee shop. Real people behind every cup.
          </h1>
          <p className="mt-4 font-display text-lg italic text-muted-foreground">
            Built in Pooler, Georgia. Run with care from sourcing to your door.
          </p>

          <div className="mt-8 space-y-5 text-base leading-relaxed text-muted-foreground">
            <p>
              I&apos;m the owner. I&apos;ve spent 15+ years building software for
              big companies that didn&apos;t always know what they wanted.
              Coastal is what happens when you build the team first and the
              shop second.
            </p>
            <p>
              I&apos;m not the barista. I&apos;m not the marketer. I&apos;m
              the owner — the person who signs off on every order before it
              ships. Sal handles the counter. LUC keeps the store running.
              Melli takes care of business customers. ACHEEVY runs the brand.
              If they can&apos;t solve a problem, it comes to me.
            </p>
            <p>
              The coffee is sourced from a Fairtrade-certified specialty
              roaster I picked myself. Every order, every claim, every refund
              is on the record. If something&apos;s wrong, we make it right.
            </p>
            <p className="text-foreground">
              If you have a problem with anything you read, hear, or buy from
              Coastal Brewing Co., <strong>it&apos;s mine to fix.</strong>
            </p>
            <p className="font-display text-lg italic">— the owner</p>
          </div>

          <div className="mt-12 rounded-lg border border-border p-6">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Background</p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>15+ years building software for large companies</li>
              <li>IBM-Certified Product Manager · Lean Six Sigma Black Belt</li>
              <li>Built the order-check system that signs off on every shipment</li>
              <li>Past work: $2.9M government contracts under ISO 9001:2015</li>
            </ul>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild variant="accent" size="lg">
              <Link href="/chat?agent=sales">Talk to our team</Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link href="/about/governance">How governance works</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
