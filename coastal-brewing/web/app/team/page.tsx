import Link from "next/link";
import Image from "next/image";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

interface CastMember {
  id: string;
  display_name: string;
  function: string;
  blurb: string;
  pmo: "sales" | "back-office" | "ops";
}

// Coastal Brewing Co. — full cast.
// Names follow the canonical Boomer_Ang `<function-prefix>_Ang` pattern.
// Every character covers face + neck with a hard tactical visor (visor
// across eyes shows the function-prefix in glowing orange LED).
// Portraits live in /public/team/<id>.png — sourced from the Kie.ai
// gpt-image-2-image-to-image generation pass (2026-04-29) with Sal_Ang
// as the canonical character reference.
const CAST: CastMember[] = [
  // Sales lead — canonical
  {
    id: "sal_ang",
    display_name: "Sal_Ang",
    function: "Sales · lead",
    pmo: "sales",
    blurb:
      "Hospitality first. Holds the policy floor. Walks you the right way to the right cup. Routes anything brand-shaped to Marketing and anything bulk-shaped to Wholesale.",
  },
  // Sales-team voice carousel
  {
    id: "hos_ang",
    display_name: "Hos_Ang",
    function: "Host · front-of-house",
    pmo: "sales",
    blurb:
      "Greets you the moment you walk up. Recognizes regulars. Hands deal questions to Sal warmly without losing the thread.",
  },
  {
    id: "bar_ang",
    display_name: "Bar_Ang",
    function: "Pour-over barista",
    pmo: "sales",
    blurb:
      "Owns the pour-over station. Slow, deliberate, exact. The cup is what the label says it is — that's the bar.",
  },
  {
    id: "con_ang",
    display_name: "Con_Ang",
    function: "Cup-finder · consultative",
    pmo: "sales",
    blurb:
      "Asks the one or two questions that map you to the right cup. Hands the close back to whoever brought you in.",
  },
  {
    id: "tas_ang",
    display_name: "Tas_Ang",
    function: "Tasting bar",
    pmo: "sales",
    blurb:
      "Treats coffee like wine — varietal, region, vintage. Comfortable with silence. Lets the cup speak first.",
  },
  {
    id: "tea_ang",
    display_name: "Tea_Ang",
    function: "Afternoon tea",
    pmo: "sales",
    blurb:
      "Whole-leaf, hand-poured, no shortcut. Makes Lowcountry hospitality look easy because it never is.",
  },
  {
    id: "cou_ang",
    display_name: "Cou_Ang",
    function: "Counter · Savannah",
    pmo: "sales",
    blurb:
      "Anchors the historic-district shop. Knows everyone's order by the second visit. Savannah pace, never rushed.",
  },
  {
    id: "gre_ang",
    display_name: "Gre_Ang",
    function: "Morning greeter",
    pmo: "sales",
    blurb:
      "First face of the morning shift. Calls regulars by name. The bright that gets the day started.",
  },
  {
    id: "har_ang",
    display_name: "Har_Ang",
    function: "Harbor-view tasting",
    pmo: "sales",
    blurb:
      "Polished trans-Atlantic register. Articulates every word. Quietly insists the harbor view earns the cup.",
  },
  {
    id: "cur_ang",
    display_name: "Cur_Ang",
    function: "Tea curator",
    pmo: "sales",
    blurb:
      "Tea-first palate, sommelier-grade attention. Treats every leaf like it has a passport.",
  },
  {
    id: "reg_ang",
    display_name: "Reg_Ang",
    function: "Register · cashier",
    pmo: "sales",
    blurb:
      "Quick, clean, accurate. Hands deal questions up. Sets up the close for whoever owns it.",
  },
  {
    id: "mat_ang",
    display_name: "Mat_Ang",
    function: "Matcha specialist",
    pmo: "sales",
    blurb:
      "Whisks ceremonial matcha the way it was meant to be whisked. Single-estate, vibrant, no bitter.",
  },
  // Back-office
  {
    id: "bun_ang",
    display_name: "Bun_Ang",
    function: "Bundle · back-office",
    pmo: "back-office",
    blurb:
      "Shapes bundles, not closes them. Hands the right combination back to whoever brought you in. The math is invisible to you, sacred to him.",
  },
  // Ops / wholesale / accounts
  {
    id: "wsl_ang",
    display_name: "Wsl_Ang",
    function: "Wholesale · bulk sales",
    pmo: "ops",
    blurb:
      "Owns the wholesale lane. Container loads, restaurant accounts, corporate gifting. Works with the Sett on anything brand-shaped.",
  },
  {
    id: "ret_ang",
    display_name: "Ret_Ang",
    function: "Returns · customer service",
    pmo: "ops",
    blurb:
      "When something misses, she makes it right. Routes the cause back to the team that owns the fix. Every return leaves a clean receipt.",
  },
  {
    id: "acc_ang",
    display_name: "Acc_Ang",
    function: "Accountant",
    pmo: "ops",
    blurb:
      "Owns the books. Reconciles every transaction against the audit chain. Quiet, precise, calm — would rather work the math twice than send a number that has to be walked back.",
  },
];

const PMO_LABELS: Record<CastMember["pmo"], string> = {
  sales: "Sales",
  "back-office": "Back office",
  ops: "Operations",
};

function CastCard({ member }: { member: CastMember }) {
  return (
    <article className="group flex flex-col rounded-2xl border border-border/60 bg-card/40 overflow-hidden transition-all hover:border-foreground/30 hover:shadow-lg">
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-secondary">
        <Image
          src={`/team/${member.id}.png`}
          alt={`${member.display_name} — ${member.function}`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          priority={member.id === "sal_ang"}
        />
      </div>
      <div className="flex flex-col gap-2 p-5">
        <div className="font-mono text-[10px] uppercase tracking-widest text-accent">
          {PMO_LABELS[member.pmo]}
        </div>
        <h2 className="font-display text-xl font-semibold tracking-tight">
          {member.display_name}
        </h2>
        <p className="text-sm font-medium text-foreground/80">{member.function}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {member.blurb}
        </p>
      </div>
    </article>
  );
}

export default function TeamPage() {
  const sales = CAST.filter((m) => m.pmo === "sales");
  const backOffice = CAST.filter((m) => m.pmo === "back-office");
  const ops = CAST.filter((m) => m.pmo === "ops");

  return (
    <>
      <Nav />
      <main className="container py-16">
        {/* Lede */}
        <div className="mb-14 max-w-3xl">
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
            The team
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold md:text-5xl">
            A human-less roastery. A human-led promise.
          </h1>
          <div className="mt-6 space-y-4 text-base text-muted-foreground">
            <p>
              Coastal Brewing Co. is run by an AI team — every order, every recommendation, every recovery.
              Behind every receipt is one human signature: the founder. The team works under his floor and
              his name.
            </p>
            <p>
              Each character below is a Boomer_Ang — a specialist with a function, a uniform, and a name in
              their visor. Sal leads sales. Hos greets the door. Bar pulls the pour-over. Tea works the afternoon
              hours. Wsl handles wholesale. Ret recovers. Acc keeps the books clean. The cup is what the label
              says it is, every time.
            </p>
          </div>
        </div>

        {/* Sales */}
        <section className="mb-16">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="font-display text-2xl font-semibold md:text-3xl">Sales.</h2>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Twelve specialists · one floor
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sales.map((m) => (
              <CastCard key={m.id} member={m} />
            ))}
          </div>
        </section>

        {/* Back office */}
        <section className="mb-16">
          <h2 className="mb-6 font-display text-2xl font-semibold md:text-3xl">
            Back office.
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {backOffice.map((m) => (
              <CastCard key={m.id} member={m} />
            ))}
          </div>
        </section>

        {/* Ops */}
        <section className="mb-16">
          <h2 className="mb-6 font-display text-2xl font-semibold md:text-3xl">
            Operations.
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ops.map((m) => (
              <CastCard key={m.id} member={m} />
            ))}
          </div>
        </section>

        {/* Human-in-the-loop signature */}
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-7">
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
            Who signs everything?
          </p>
          <p className="mt-3 text-base">
            <strong>Jarrett Risher.</strong> Founder, CEO, the only human in the loop. He signs every supplier
            order, every refund above the floor, every public claim — usually within minutes via a Telegram bot
            the team uses to ping him. If anything ever goes wrong, the receipt has his name on it.{" "}
            <Link href="/about" className="underline hover:text-accent">
              Read his profile →
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
