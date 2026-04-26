import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata = {
  title: "About Jarrett — Coastal Brewing Co.",
  description:
    "Jarrett Risher is the founder, CEO, and only human-in-the-loop at Coastal Brewing Co. — the world's first humanless coffee company.",
};

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main className="container py-16">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Who runs this place</p>
          <h1 className="mt-2 font-display text-4xl font-semibold md:text-5xl">
            One human. Two AI teams. Zero rent.
          </h1>

          <div className="mt-8 space-y-5 text-base leading-relaxed text-muted-foreground">
            <p>
              I&apos;m Jarrett Risher. I&apos;ve spent 15+ years building AI systems for organizations that
              mostly didn&apos;t know what they wanted from AI. Coastal is the version where I built the org
              chart first and the company second.
            </p>
            <p>
              I&apos;m not Coastal&apos;s barista. I&apos;m not Coastal&apos;s marketer. I&apos;m
              Coastal&apos;s <em>governor</em> — the human who signs the work the AI does. Every supplier order
              routes to my Telegram before it ships. Every public claim goes through my hands before it goes
              online. Every customer escalation hits me personally if my AI Sales team can&apos;t resolve it
              cleanly. The audit system catches anything I might miss.
            </p>
            <p>
              That&apos;s the deal. The AI handles the conversation. I handle the consequences. The coffee is
              sourced from a Fairtrade-certified specialty roaster I picked. And every receipt — for every
              action, by every agent, on every order — is on file the moment it happens.
            </p>
            <p className="text-foreground">
              If you have a problem with anything you read, hear, or buy from Coastal Brewing Co.,{" "}
              <strong>it&apos;s mine to fix.</strong> Not the bot&apos;s.
            </p>
            <p className="font-display text-lg italic">— Jarrett Risher</p>
          </div>

          <div className="mt-12 rounded-lg border border-border p-6">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">The credentials</p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>15+ years AI Forward Deployment Engineer &amp; Product Architect</li>
              <li>IBM-Certified Product Manager · Lean Six Sigma Black Belt</li>
              <li>Architect of the Hermes audit system &amp; NemoClaw policy gate</li>
              <li>Past responsibility: $2.9M government contracts under ISO 9001:2015</li>
              <li>Founder of the broader ACHIEVEMOR / FOAI ecosystem</li>
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
