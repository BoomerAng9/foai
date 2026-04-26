import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { TeamCard, type TeamMember } from "@/components/team-card";

import Link from "next/link";

const TEAM: TeamMember[] = [
  {
    id: "sales",
    name: "Sales · Coastal",
    role: "Finds your blend. Builds bundles. Walks you through checkout. Negotiates within the floor.",
    team: "sales",
    portrait: "/static/team/sales-placeholder.png",
    tools: ["recommend_bundle", "add_to_cart", "apply_discount", "propose_deal", "start_checkout", "escalate_to_owner"],
    blurb:
      "Equipped with Spinner. Every offer is logged. Every escalation routes to Jarrett. If you ask whether I'm a human, I'll tell you the truth.",
  },
  {
    id: "marketing",
    name: "Marketing · Coastal",
    role: "Brand voice. Funnel design. Story. Public-facing copy goes through a human first.",
    team: "marketing",
    portrait: "/static/team/marketing-placeholder.png",
    tools: ["draft_caption", "funnel_design", "forecast_funnel", "publish_signoff", "escalate_to_owner"],
    blurb:
      "Drafts the brand-side copy and designs the seven-stage funnel. Nothing publishes until Jarrett signs.",
  },
];

export default function TeamPage() {
  return (
    <>
      <Nav />
      <main className="container py-16">
        <div className="mb-12 max-w-3xl">
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">The team</p>
          <h1 className="mt-2 font-display text-4xl font-semibold md:text-5xl">
            A human-less roastery. A human-led promise.
          </h1>
          <div className="mt-6 space-y-4 text-base text-muted-foreground">
            <p>
              We built Coastal Brewing Co. to find out what happens when you take everything off the cost stack
              except the coffee and the conversation. There's no retail lease. There's no warehouse. There's no
              payroll. There's no HR. What's left is the bean, the brew, and a small AI team running the brand
              around the clock — under one human's signature.
            </p>
            <p>
              Sales handles your shopping, your bundle, your subscription, your offer. They're equipped with a
              tool kit we call Spinner — five or six small actions they can take on your behalf, every single
              one of them logged. If you'd rather just shop, ignore them; the catalog works fine on its own. If
              you'd rather chat them up, every offer is unique to your conversation, within a margin floor we've
              published to ourselves. No two customers walk away with the same deal — which is exactly the point.
            </p>
            <p>
              Marketing handles the brand voice and the funnel. They draft, but they don't publish — every public
              claim, every email, every post is reviewed by Jarrett before it goes live. The same is true of
              every supplier order, every refund above threshold, every certification we'd ever put on a label.
              The AI does the work. The human does the saying-yes.
            </p>
          </div>
        </div>
        <div className="grid gap-8 md:grid-cols-2">
          {TEAM.map((m) => (
            <TeamCard key={m.id} member={m} />
          ))}
        </div>
        <div className="mt-12 rounded-lg border border-accent/30 bg-accent/5 p-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Who's actually responsible?</p>
          <p className="mt-3 text-base">
            <strong>Jarrett Risher.</strong> Founder, CEO, and the only human in the loop. He signs every
            supplier order, every refund, every public claim — usually within minutes via a Telegram bot the AI
            uses to ping him. If anything ever goes wrong, the receipt has his name on it.{" "}
            <Link href="/about" className="underline hover:text-accent">Read his profile →</Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
