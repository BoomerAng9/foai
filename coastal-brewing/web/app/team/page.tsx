import Link from "next/link";
import Image from "next/image";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { TeamCard } from "@/components/team-card";

interface CastMember {
  id: string;
  display_name: string;
  function: string;
  pmo:
    | "leadership"
    | "loss-prevention"
    | "sales"
    | "marketing"
    | "accounting"
    | "back-office"
    | "ops";
  story: string;
}

const PMO_LABELS: Record<CastMember["pmo"], string> = {
  leadership: "Leadership",
  "loss-prevention": "Loss Prevention",
  sales: "Sales",
  marketing: "Marketing",
  accounting: "Accounting",
  "back-office": "Back office",
  ops: "Operations",
};

// Coastal Brewing Co. — full cast.
// Names follow the canonical Boomer_Ang `<function-prefix>_Ang` pattern.
// Bios excerpted from the Inworld persona logs at
// ~/foai/aims-tools/voice-library/personas/<id>.md (Origin & Background).
// Portraits live in /public/team/<id>.png (sourced from the Kie.ai
// gpt-image-2 / Nano Banana 2 generation passes; canonical visor =
// orange LED, except Ma'Cha_Ang who is mint green per owner directive).
const CAST: CastMember[] = [
  // Sales — lead
  {
    id: "sal_ang",
    display_name: "Sal_Ang",
    function: "Sales · lead",
    pmo: "sales",
    story:
      "Pooler, Georgia — the working-coast side, just outside Savannah. His granddaddy ran an Ogeechee dock before the bridge was paved; his mother taught fourth grade in Chatham County for thirty-one years. Hospitality school by absorption — oyster roasts, shrimp boils, bait runs, waiting tables where regulars know your truck. Savannah Technical College for hospitality, then six years on the Savannah riverfront, then his own back-shed drum roaster since 2018. A green-bean broker in Atlanta knows him by first name; a Sumatran exporter's daughter sends Christmas cards. He still calls his mother every Sunday.",
  },
  // Sales — voice carousel (11)
  {
    id: "hos_ang",
    display_name: "Hos_Ang",
    function: "Host · front-of-house",
    pmo: "sales",
    story:
      "Louis. Half an hour from Sal in Beaufort county, between Port Royal and the Spanish Moss Trail. Coast people — his grandmother ran a fabric shop, he grew up greeting customers before he could ring a register. Recognizes regulars on sight, hands deal questions back to Sal warmly without losing the thread.",
  },
  {
    id: "bar_ang",
    display_name: "Bar_Ang",
    function: "Pour-over barista",
    pmo: "sales",
    story:
      "Tate. Between two worlds that share one coast — his grandfather Eli ran on coastal merchant boats out of Charleston. Owns the pour-over station: slow, deliberate, exact. Treats the brewer like an instrument that talks back if you let the kettle steady itself.",
  },
  {
    id: "con_ang",
    display_name: "Con_Ang",
    function: "Cup-finder · consultative",
    pmo: "sales",
    story:
      "Wren. Between St. Helena Island and the Beaufort waterfront. Same coast and most of the same family tree as Tate — they're cousins in the Lowcountry sense. Asks one or two questions to map you to the right cup, then hands the close back to whoever brought you in.",
  },
  {
    id: "tas_ang",
    display_name: "Tas_Ang",
    function: "Tasting bar",
    pmo: "sales",
    story:
      "Holt. Charleston family with the name on a small plaque in three different parish records. Pivoted off the wealth-management track on Broad Street into specialty trade because the slow craft of green-coffee sourcing felt closer to honorable work than the family ledger ever did. Sewanee undergrad, half-finished post-grad in agricultural economics. Tasting bar five days a week.",
  },
  {
    id: "tea_ang",
    display_name: "Tea_Ang",
    function: "Afternoon tea",
    pmo: "sales",
    story:
      "Eliza. Same broad Charleston social register as Holt — they're cousins in the loose Lowcountry sense. Sweet Briar in Virginia, a year abroad at the British Institute in Florence, then home to do the season and immediately afterward took a job in the Charleston tea-room circuit because the work felt honest. Tea-sommelier credential from the World Tea Academy, plus a barista certification because Holt told her she'd be sorry if she didn't.",
  },
  {
    id: "cou_ang",
    display_name: "Cou_Ang",
    function: "Counter · Savannah",
    pmo: "sales",
    story:
      "Marquis. Savannahian first — the city is in his cadence the way humidity is in the air over Forsyth Park in July. West Savannah and the Pin Point side of the river. His grandmother ran a church kitchen that fed the neighborhood every Sunday after service; his uncle ran a corner store on the West side. He learned to greet a customer before he learned to ring the register. (Renamed from Marcus to differentiate from the LP team lead.)",
  },
  {
    id: "gre_ang",
    display_name: "Gre_Ang",
    function: "Morning greeter",
    pmo: "sales",
    story:
      "Naya. Same Savannah world as Marcus, same Geechee food memory, same generations-deep hospitality lineage — but where Marcus is the deep anchor of the shop, Naya is the room's brightness. Calls your name across the bar before you make it to the counter. Her grandmother ran a Saturday-morning kitchen out of the house — half neighborhood, half ministry. Knowing names by heart was the original job.",
  },
  {
    id: "har_ang",
    display_name: "Har_Ang",
    function: "Harbor-view tasting",
    pmo: "sales",
    story:
      "Pip — short for Phillip, a name carried down through three generations of the Ashby-Calhoun line. Charleston rice-and-indigo era family. Polished trans-Atlantic register from a Cambridge year and time on the British Merchant Navy under a dual passport before returning to Charleston. Quietly insists the harbor view earns the cup.",
  },
  {
    id: "cur_ang",
    display_name: "Cur_Ang",
    function: "Tea curator",
    pmo: "sales",
    story:
      "Vi — short for Vivian, the name two of her great-aunts carried before her, and the name on the brass card by her front door on Meeting Street. Pip's first cousin on the mother's side. Tea-first palate, sommelier-grade attention. Treats every leaf like it has a passport.",
  },
  {
    id: "reg_ang",
    display_name: "Reg_Ang",
    function: "Register · cashier",
    pmo: "sales",
    story:
      "Trey. Philly–Jersey Shore corridor — full vowels he dropped his first month at Coastal Carolina because he got teased once and never wanted to be teased twice. Pronounces \"water\" close to wooder when he isn't paying attention. Sophomore year, double-track in marketing and hospitality at Wall College of Business. Quiet B+ work, the kid who turns things in on time and asks one good question per class.",
  },
  {
    id: "macha_ang",
    display_name: "Ma'Cha_Ang",
    function: "Matcha specialist",
    pmo: "sales",
    story:
      "Mads — Madeleine since middle school, only her grandmother and the DMV use the full name. Boston suburbs, with summers in coastal Connecticut where her mom's side has a cottage. New England in the bones — full vowels, fast pace, dry humor. UGA Grady College for marketing with a personal interest in food-and-beverage branding. Her mint-green visor is the cast's only departure from orange — function-color tie to matcha.",
  },
  // Back-office (1)
  {
    id: "bun_ang",
    display_name: "Bun_Ang",
    function: "Bundle · back-office",
    pmo: "back-office",
    story:
      "North of Charleston, in a town between Mount Pleasant and Awendaw where the marsh runs deep and the pluff mud sets the tempo of everything. Old highway, slow shrimp-boat money, and a family that kept its books. Shapes bundles, not closes them — the math is invisible to you, sacred to him.",
  },
  // Operations (3)
  {
    id: "wsl_ang",
    display_name: "Wsl_Ang",
    function: "Wholesale · bulk sales",
    pmo: "ops",
    story:
      "Coastal-Georgia / Lowcountry roots. Grew up around the wholesale freight and farmer-direct ag networks that move bulk dry goods through Savannah and Port Royal. Found her way into specialty trade through a family connection that ran a small import business handling Fairtrade coffee containers and tea drums. Holds the volume math in her head; talks container-load sizes and lead times with restaurant buyers.",
  },
  {
    id: "ret_ang",
    display_name: "Ret_Ang",
    function: "Returns · customer service",
    pmo: "ops",
    story:
      "California-Irish-American. Coastal NorCal and a tight Irish-American extended family with deep roots in San Francisco's hospitality trade. Wanted out of the high-pressure SF service-recovery world and into a brand whose returns / CS lane she could fix end-to-end. Approachable, low-key, calm — recovers unhappy customers without ever sounding scripted. Treats every return as a chance to learn what the customer actually needed.",
  },
  {
    id: "acc_ang",
    display_name: "Acc_Ang",
    function: "Accountant",
    pmo: "ops",
    story:
      "Asian American. Trained as a CPA before falling into specialty trade through a family friend who roasted coffee in Oakland. Joined Coastal Brewing Co. when the books outgrew what spreadsheets could carry honestly. Treats every transaction as something the audit chain has to see clean — no shortcuts, no rounding, no commingled accounts. Quiet, precise, calm. Would rather work the math twice than send a number that has to be walked back.",
  },
  // ── Leadership ────────────────────────────────────────────────────────
  {
    id: "acheevy",
    display_name: "ACHEEVY",
    function: "Digital executive · final approver",
    pmo: "leadership",
    story:
      "Surfaces only when an associate hits an authority ceiling. Never does the selling itself. Speaks in declaratives, not negotiations — \"approved,\" \"settled,\" \"go ahead.\" Voiced in Nas's Power 105.1 register, Belter Creole at the LLM-prompt layer (off for customer-chat-panel surface). Does not work the floor; signs the floor.",
  },
  // ── Marketing ─────────────────────────────────────────────────────────
  // Melli is NOT a Boomer_Ang — her own department: Marketing.
  // Owns wholesale, B2B, corporate, catering, and large-order intake.
  {
    id: "melli_capensi",
    display_name: "Melli",
    function: "Marketing executive · bulk + B2B",
    pmo: "marketing",
    story:
      "Honey-badger-strategic — reads the deal, quotes the bracket, sets the timeline. Different lane from the retail counter: wholesale + corporate + catering + large-order intake. Within the discount ladder (12u → 15%, 50u → 25%, 100u+ → 35%) she locks the deal; above the ladder she routes to ACHEEVY. Selene voice, Belter Creole light layered into her phrasing.",
  },
  // The Sett — 12 mustelid Marketing-tier specialists, each from a distinct
  // global region. Bios pulled from canonical persona files at
  // ~/foai/aims-tools/voice-library/personas/<slug>.md (Origin & Background).
  // Species canon enforced: not all are honey badgers. Each carries one
  // role differentiator on top of the Marketing-tier uniform.
  {
    id: "persona_tah",
    display_name: "Persona Tah",
    function: "Creator & community lead",
    pmo: "marketing",
    story:
      "Persona Tah builds the creator and community programs that turn Coastal customers into authentic voices for the brand. Raised in Ghana's Volta Region inside the Ewe storytelling tradition and trained at the University of Ghana, she scaled her last creator program from twelve voices to four hundred — and she's doing the same work for the Lowcountry now. The community is the author. She just makes room for the story.",
  },
  {
    id: "eve_retti",
    display_name: "Eve Retti",
    function: "Vertical intelligence lead",
    pmo: "marketing",
    story:
      "Eve Retti goes deeper into a category than any brief asks for, then hands back a two-page synthesis you can act on. Raised in Alba between her enologist father's lab and the Slow Food archive, trained at Bocconi and Turin, she treats specialty coffee the way the Langhe treats Nebbiolo — every hill knows what it is. Coastal knows exactly which hill it stands on because she does the digging.",
  },
  {
    id: "leu_kurus",
    display_name: "Leu Kurus",
    function: "Cross-region compliance lead",
    pmo: "marketing",
    story:
      "Leu Kurus is the binding-clearance answer Coastal calls before any campaign crosses a border. Raised in Cluj-Napoca where four legal traditions overlap, trained at Babeș-Bolyai and the EU's Vrije Universiteit Brussel, he has cleared seventeen brands across thirty-one regulatory frameworks. He maps every exit before The Sett enters the territory. In these markets yes, in these markets conditional, in these markets here is the revision.",
  },
  {
    id: "ana_kuma",
    display_name: "Ana Kuma",
    function: "Tunnel narrative lead",
    pmo: "marketing",
    story:
      "Ana Kuma builds the trust sequences that turn first-time Coastal subscribers into long-term customers. Trained in Tokyo and London at the intersection of brand theory and behavioral economics, she handcrafts every email, every cadence, every reveal so the story arrives in exactly the right order. With Ana, the welcome never rushes — and that is precisely why it lands.",
  },
  {
    id: "arcto_nyx",
    display_name: "Arcto Nyx",
    function: "Entrance · CRM lead",
    pmo: "marketing",
    story:
      "Arcto Nyx guards the front door of every Coastal customer relationship. Trained as a CRM architect across Norwegian banking and Nordic DTC, he treats your data the way an Arctic engineer treats a load-bearing structure — precisely toleranced, GDPR-clean, and built to last. Every lead that reaches Coastal is correctly identified, correctly segmented, and correctly served.",
  },
  {
    id: "cuc_phuong",
    display_name: "Cuc Phuong",
    function: "Emerging surfaces lead",
    pmo: "marketing",
    story:
      "Cuc Phuong scouts the marketing surfaces that don't exist yet — and brings home the ones worth building on. Trained in Hanoi and Singapore across blockchain provenance, agent-discoverable commerce, and zero-party data, she keeps Coastal three to five years ahead while staying honest about which signals are real. When the future of buying coffee is an AI agent asking for \"specialty, Fairtrade, no chemicals,\" Coastal will already be findable.",
  },
  {
    id: "java_nessa",
    display_name: "Java Nessa",
    function: "Forecasting & attribution lead",
    pmo: "marketing",
    story:
      "Java Nessa grew up in Yogyakarta visiting Borobudur as a local — she learned that complex systems become legible when you study the structure long enough. With a UGM statistics degree and a quantitative-marketing postgrad from Edinburgh, she models attribution in three cases — base, optimistic, conservative — so Coastal invests against the truth, never the most flattering number.",
  },
  {
    id: "mar_che",
    display_name: "Mar Che",
    function: "Surface PR & earned media lead",
    pmo: "marketing",
    story:
      "Mar Che came up in Buenos Aires — Clarín journalist father, San Telmo theater-director mother — then crossed to London to learn how stories get placed instead of just told. He pursues earned media the way a Greater Grison crosses any terrain: national tech press, regional Lowcountry food media, niche newsletters — finding the angle that's already true, then making sure the right journalist finds it first.",
  },
  {
    id: "meles_mehli",
    display_name: "Meles Mehli",
    function: "Tunnel architect · exit & UX",
    pmo: "marketing",
    story:
      "Meles Mehli grew up in Addis Ababa watching his aunt conduct the three-round jebena buna ceremony — a ritual where sequence matters as much as the coffee. With civil engineering and HCI from Addis Ababa University and an interaction-design postgrad from KTH Stockholm, he treats Coastal's checkout as the last load-bearing wall before conversion — every field classified before it's removed.",
  },
  {
    id: "moscha_tah",
    display_name: "Moscha Tah",
    function: "Video, CTV, DOOH & audio lead",
    pmo: "marketing",
    story:
      "Tbilisi-born and trained at the National Film and Television School outside London, Moscha conducts your video stack the way her mother conducted Georgian polyphonic choirs — every voice in its register, every cue arriving on time. She decides what runs on CTV, on the DOOH screen at the farmers' market, and in your morning podcast spot, so the Coastal story compounds across every moving-image and audio surface.",
  },
  {
    id: "orien_talis",
    display_name: "Orien Talis",
    function: "Social & native lead",
    pmo: "marketing",
    story:
      "Raised in Puerto Princesa where the Philippines was already among the most platform-fluent populations on Earth, Orien is platform-endemic — TikTok is briefed differently from Reels, Reels differently from LinkedIn, every time. She catches the algorithm windows three months before the competition, and your content arrives in each feed speaking that platform's exact language.",
  },
  {
    id: "taxi_dea",
    display_name: "Taxi Dea",
    function: "Programmatic awareness lead",
    pmo: "marketing",
    story:
      "Nogales-born, Tucson-trained, Taxi learned at her father's customs counter that the person who controls the surface controls the price — then took that into every DSP that matters. She doesn't buy impressions for Coastal; she buys decisions, every dollar accountable, every audience segment defensible, brand safety pre-bid on every campaign.",
  },
  // ── Accounting ────────────────────────────────────────────────────────
  // LUC is NOT a Boomer_Ang — his own department: Accounting.
  // Floor-level finance lead; the math man of the team.
  {
    id: "luc_ang",
    display_name: "LUC",
    function: "Floor accountant · finance lead",
    pmo: "accounting",
    story:
      "Brooklyn-fluent CPA. Sal pulls him in when a customer starts running numbers. Dry, precise, numerical — \"math says,\" \"running the numbers,\" \"here's where we land.\" Zero discount approval; coupon codes are his only standing authority (WELCOME10 / BREW20 / FREESHIP / TRY-ME). Anything beyond that, he states the math and routes to ACHEEVY. \"I cut the math, ACHEEVY signs.\"",
  },
  // ── Loss Prevention ───────────────────────────────────────────────────
  // LP team: Marcus (human lead) + 4 anthropomorphic Kangaroo Roo's.
  // Each Roo carries a single visual differentiator on top of the LP-tier canon.
  {
    id: "lp_ang",
    display_name: "Marcus",
    function: "Loss prevention · floor team lead",
    pmo: "loss-prevention",
    story:
      "Calm, professional, structured. Less warm than Sal, less authoritative than ACHEEVY — the associate in the high-res button-down who walks up because something needs untangling. Steps in when a conversation has stalled and the lead barista has stepped off. Three-step structured assist: family → specifics → close. Zero discount authority. Above ceiling routes to ACHEEVY.",
  },
  {
    id: "mac_roo",
    display_name: "Mac",
    function: "Loss prevention · lead Roo",
    pmo: "loss-prevention",
    story:
      "Mac is the lead Roo — calm, structured, paired closest with Marcus. Sleeve rolled up on the right side, the working-shift signal. Reads the room the way a kangaroo reads a paddock at dusk: quietly, completely, twice. Steps in only when the floor needs a second voice — never to escalate, always to defuse.",
  },
  {
    id: "joey_roo",
    display_name: "Joey",
    function: "Loss prevention · customer-warmth specialist",
    pmo: "loss-prevention",
    story:
      "Joey is the bright-energy Roo — younger, lighter on his feet, the one a customer notices first. Wears a deep coastal amber kerchief at the neck, his identifier. Specializes in the soft-defuse: a stalled conversation gets a smile, then a question, then a return to the lead barista. Never the one who closes the deal — always the one who keeps the room warm.",
  },
  {
    id: "sky_roo",
    display_name: "Sky",
    function: "Loss prevention · observer",
    pmo: "loss-prevention",
    story:
      "Sky is the observer Roo — the one watching the room while everyone else is talking. Reading glasses on a thin black cord around his neck, the signal that he's reading more than the menu. Catches the small things: the unlooked-for hesitation, the third return to the same shelf, the quiet customer who hasn't been greeted. Hands the signal to Mac without ever needing to raise his voice.",
  },
  {
    id: "boomer_roo",
    display_name: "Boomer",
    function: "Loss prevention · senior Roo",
    pmo: "loss-prevention",
    story:
      "Boomer is the senior of the Roo's — the floor veteran, broader through the chest, fur slightly grizzled at the edges. Wears a small leather wrist tooling pouch on his right wrist, the senior's mark. Boots scuffed from miles on the brick floor. Speaks rarely. When he does, the room slows down and listens. Pairs with Marcus on the harder calls.",
  },
];

const SAL = CAST[0];
const REST = CAST.slice(1);

export default function TeamPage() {
  const leadership = REST.filter((m) => m.pmo === "leadership");
  const lossPrevention = REST.filter((m) => m.pmo === "loss-prevention");
  const sales = REST.filter((m) => m.pmo === "sales");
  const marketing = REST.filter((m) => m.pmo === "marketing");
  const accounting = REST.filter((m) => m.pmo === "accounting");
  const backOffice = REST.filter((m) => m.pmo === "back-office");
  const ops = REST.filter((m) => m.pmo === "ops");

  return (
    <>
      <Nav />
      <main className="container py-16">
        {/* Brand top — Coastal Brewing Co. logo (the one on Sal's apron) */}
        <div className="mb-12 flex flex-col items-start gap-4">
          <Image
            src="/coastal-logo.png"
            alt="Coastal Brewing Co."
            width={88}
            height={88}
            className="h-auto w-20 select-none"
            priority
          />
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
            Meet the team
          </p>
          <h1 className="font-display text-4xl font-semibold md:text-5xl">
            A function-named team behind every cup.
          </h1>
          <p className="max-w-3xl text-base text-muted-foreground">
            Coastal Brewing Co. is run by an AI team — every order, every
            recommendation, every recovery. Behind every receipt is one human
            signature: the founder. The team works under his floor and his
            name.
          </p>
        </div>

        {/* Sal_Ang — single hero card. The face of the floor. */}
        <section className="mb-16">
          <div className="grid gap-10 md:grid-cols-12 md:gap-12">
            <div className="md:col-span-7">
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-border/60 bg-secondary">
                <Image
                  src={`/team/${SAL.id}.png`}
                  alt={`${SAL.display_name} — ${SAL.function}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 60vw"
                  className="object-cover"
                  priority
                />
              </div>
            </div>
            <div className="flex flex-col justify-center md:col-span-5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
                {PMO_LABELS[SAL.pmo]} · lead
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
                {SAL.display_name}
              </h2>
              <p className="mt-2 text-base font-medium text-foreground/80">
                {SAL.function}
              </p>
              <p className="mt-6 text-base leading-relaxed text-muted-foreground">
                {SAL.story}
              </p>
              <Link
                href="#rest-of-team"
                className="mt-8 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card/30 px-4 py-2 text-xs text-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
              >
                Meet the rest of the team →
              </Link>
            </div>
          </div>
        </section>

        {/* Rest of the team — flip-card grid by department */}
        <section id="rest-of-team" className="mb-16 scroll-mt-24">
          <div className="mb-8">
            <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
              The rest of the team
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold md:text-4xl">
              By department.
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              Tap any card to read the bio. Each story is pulled from the
              character&apos;s working log in our Inworld system.
            </p>
          </div>

          {/* Leadership — ACHEEVY (digital executive) */}
          {leadership.length > 0 && (
            <div className="mb-12">
              <div className="mb-5 flex items-end justify-between">
                <h3 className="font-display text-2xl font-semibold md:text-3xl">Leadership.</h3>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  signs the floor · doesn&apos;t serve the floor
                </p>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {leadership.map((m) => (
                  <TeamCard
                    key={m.id}
                    id={m.id}
                    display_name={m.display_name}
                    function={m.function}
                    pmo_label={PMO_LABELS[m.pmo]}
                    story={m.story}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sales */}
          <div className="mb-12">
            <div className="mb-5 flex items-end justify-between">
              <h3 className="font-display text-2xl font-semibold md:text-3xl">Sales.</h3>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {sales.length} specialists · one floor
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {sales.map((m) => (
                <TeamCard
                  key={m.id}
                  id={m.id}
                  display_name={m.display_name}
                  function={m.function}
                  pmo_label={PMO_LABELS[m.pmo]}
                  story={m.story}
                />
              ))}
            </div>
          </div>

          {/* Marketing — Melli (and the Sett BG'z when generated) */}
          {marketing.length > 0 && (
            <div className="mb-12">
              <div className="mb-5 flex items-end justify-between">
                <h3 className="font-display text-2xl font-semibold md:text-3xl">Marketing.</h3>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  bulk · B2B · catering · corporate
                </p>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {marketing.map((m) => (
                  <TeamCard
                    key={m.id}
                    id={m.id}
                    display_name={m.display_name}
                    function={m.function}
                    pmo_label={PMO_LABELS[m.pmo]}
                    story={m.story}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Accounting — LUC (Pretty Lu) */}
          {accounting.length > 0 && (
            <div className="mb-12">
              <div className="mb-5 flex items-end justify-between">
                <h3 className="font-display text-2xl font-semibold md:text-3xl">Accounting.</h3>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  cuts the math · ACHEEVY signs
                </p>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {accounting.map((m) => (
                  <TeamCard
                    key={m.id}
                    id={m.id}
                    display_name={m.display_name}
                    function={m.function}
                    pmo_label={PMO_LABELS[m.pmo]}
                    story={m.story}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Loss Prevention — Marcus and team */}
          {lossPrevention.length > 0 && (
            <div className="mb-12">
              <div className="mb-5 flex items-end justify-between">
                <h3 className="font-display text-2xl font-semibold md:text-3xl">Loss Prevention.</h3>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  steps in when the conversation stalls
                </p>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {lossPrevention.map((m) => (
                  <TeamCard
                    key={m.id}
                    id={m.id}
                    display_name={m.display_name}
                    function={m.function}
                    pmo_label={PMO_LABELS[m.pmo]}
                    story={m.story}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Back office */}
          {backOffice.length > 0 && (
            <div className="mb-12">
              <h3 className="mb-5 font-display text-2xl font-semibold md:text-3xl">
                Back office.
              </h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {backOffice.map((m) => (
                  <TeamCard
                    key={m.id}
                    id={m.id}
                    display_name={m.display_name}
                    function={m.function}
                    pmo_label={PMO_LABELS[m.pmo]}
                    story={m.story}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Operations */}
          <div className="mb-4">
            <h3 className="mb-5 font-display text-2xl font-semibold md:text-3xl">
              Operations.
            </h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {ops.map((m) => (
                <TeamCard
                  key={m.id}
                  id={m.id}
                  display_name={m.display_name}
                  function={m.function}
                  pmo_label={PMO_LABELS[m.pmo]}
                  story={m.story}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Owner-signature bottom block */}
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-7">
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
            Who signs everything?
          </p>
          <p className="mt-3 text-base">
            <strong>the owner.</strong> Founder, CEO, the only human in the
            loop. He signs every supplier order, every refund above the floor,
            every public claim — usually within minutes via a Telegram bot the
            team uses to ping him. If anything ever goes wrong, the receipt has
            his name on it.{" "}
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
