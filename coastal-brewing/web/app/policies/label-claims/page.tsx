import Link from "next/link";
import { PolicyPageLayout } from "@/components/policy-page-layout";

export const metadata = {
  title: "Label Claims & Sourcing Disclosure — Coastal Brewing Co.",
  description: "What Coastal claims, what we don't, and why. Per-product motto, per-tier sourcing, paper trail on every public claim.",
};

export default function LabelClaimsPage() {
  return (
    <PolicyPageLayout
      eyebrow="Sourcing & claims"
      title="What we claim, what we don't, and why."
      lastUpdated="May 5, 2026"
    >
      <p>This page explains the claims you&apos;ll see on Coastal bags and on the Storefront, what they actually mean in practice, and what we deliberately will <em>not</em> claim. Our motto, <strong className="text-foreground">&ldquo;Nothing Chemically, Ever.&rdquo;</strong>, applies <em>per-product</em> — only on motto-eligible SKUs (most of our coffee, tea, and matcha lines). Flavored, functional, and K-cup lines do not carry the motto, by design.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">What we claim, and how we back it</h2>

      <h3 className="font-display text-lg font-semibold text-foreground">Specialty Grade</h3>
      <p>When we say a coffee is <strong className="text-foreground">Specialty Grade</strong>, we mean the green coffee was sourced from a lot that scored 80+ on the Specialty Coffee Association (SCA) cupping protocol. The lot ID and certificate of analysis are on file for every Specialty Grade coffee we sell. They are not on the bag because most customers don&apos;t ask, but we&apos;ll provide a copy on written request.</p>

      <h3 className="font-display text-lg font-semibold text-foreground">Single Origin</h3>
      <p>When a coffee is <strong className="text-foreground">Single Origin</strong>, the green came from a single country, region, and (where possible) cooperative or estate. The country and region appear on the bag.</p>

      <h3 className="font-display text-lg font-semibold text-foreground">Fairtrade®</h3>
      <p>We label a coffee <strong className="text-foreground">Fairtrade Certified</strong> only when the green came through a Fairtrade-certified cooperative and the lot has a current Fairtrade certificate on file. The Fairtrade® mark on our packaging is provided exactly as the certifying body issues it — never modified, never paired with embellished claims.</p>
      <p>The Fairtrade premium structure means a portion of the price you pay supports the producer cooperative directly. That premium is built into the wholesale cost we pay.</p>

      <h3 className="font-display text-lg font-semibold text-foreground">Decaf — Swiss Water Process</h3>
      <p>Our decaf coffees are decaffeinated using the <strong className="text-foreground">Swiss Water Process</strong>: chemical-free, water-only, GMO-free. We mark the bag with the SWP logo when the SWP program governs the lot.</p>

      <h3 className="font-display text-lg font-semibold text-foreground">Roast level</h3>
      <p>Light, medium, dark, espresso. These are descriptive, not regulated. We use them consistently with the SCA roast color reference scale.</p>

      <h3 className="font-display text-lg font-semibold text-foreground">Brewing notes</h3>
      <p>Tasting and brewing notes on every product page describe the cup we taste at the roastery. Coffee is a living thing — your water, your equipment, your grind, and the bag&apos;s age affect the cup. We give the notes as guidance, not promises.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">What we <em>do not</em> claim</h2>
      <p>By choice, by FDA rule, and by FTC rule. None of these will appear on a Coastal bag, the Storefront, our marketing, or our customer service:</p>
      <ul className="ml-5 list-disc space-y-2">
        <li><strong className="text-foreground">&ldquo;Organic&rdquo;</strong> unless the coffee carries an active USDA NOP certification on the lot. Coastal as a brand is not currently USDA Organic certified at the brand level. Individual lots may be organic; if so, the bag and Storefront product page will say so.</li>
        <li><strong className="text-foreground">&ldquo;All natural.&rdquo;</strong> The FDA hasn&apos;t defined this term and we don&apos;t use it. Flavored coffees are labeled with the legally required <code className="font-mono text-xs">Ingredients: Coffee, Natural Flavorings</code>.</li>
        <li><strong className="text-foreground">&ldquo;Low acid&rdquo;</strong> as a marketing claim. Some of our coffees taste lower in acidity (Sumatra, the decafs); we&apos;ll note this in cupping notes, never as a health claim.</li>
        <li><strong className="text-foreground">Health claims of any kind.</strong> Coffee is not a supplement. Tea is not a supplement. We do not claim our products treat, cure, prevent, or mitigate any disease, support immunity, reduce stress, improve focus, support gut health, deliver clean energy, or anything similar.</li>
        <li><strong className="text-foreground">Antioxidant claims.</strong> Coffee and tea naturally contain antioxidant compounds; quantifying or marketing this requires substantiation we don&apos;t have, so we don&apos;t claim it.</li>
        <li><strong className="text-foreground">Sustainability claims we can&apos;t substantiate.</strong> &ldquo;Eco-friendly,&rdquo; &ldquo;carbon neutral,&rdquo; &ldquo;compostable&rdquo; without qualification — none of these appear unless we can show the work. Our coffee bags are Biotre 1.0 (industrial compostable). Our labels are not compostable.</li>
      </ul>

      <h2 className="font-display text-2xl font-semibold text-foreground">Functional / Mushroom coffees and teas</h2>
      <p>Coastal carries a small line of functional blends — coffee and tea blended with traditional medicinal mushrooms. They&apos;re classified and labeled as <strong className="text-foreground">food, not supplements</strong>, and our copy follows the strict-lane discipline that posture requires:</p>
      <ul className="ml-5 list-disc space-y-1">
        <li>Statement of Identity, locked, per SKU:
          <ul className="ml-5 mt-1 list-disc space-y-1">
            <li><strong className="text-foreground">Ground Coffee With Mushrooms</strong> — Dark and Medium roasts.</li>
            <li><strong className="text-foreground">Instant Coffee With Mushrooms</strong>.</li>
            <li><strong className="text-foreground">Roasted Green Tea With Mushrooms</strong> — our hojicha blend.</li>
            <li><strong className="text-foreground">Matcha Green Tea With Mushrooms</strong>.</li>
          </ul>
        </li>
        <li>We use <strong className="text-foreground">traditional-use language only</strong>: <em>&ldquo;long valued for,&rdquo; &ldquo;appreciated for,&rdquo; &ldquo;traditionally used.&rdquo;</em></li>
        <li>We do <strong className="text-foreground">not</strong> claim <em>&ldquo;boosts immunity,&rdquo; &ldquo;reduces stress,&rdquo; &ldquo;improves memory,&rdquo;</em> or <em>&ldquo;clean energy.&rdquo;</em></li>
        <li>A California Prop 65 notice appears on every functional package.</li>
        <li>The functional line does <strong className="text-foreground">not</strong> carry the &ldquo;Nothing Chemically, Ever.&rdquo; motto — by design, the mushroom inputs sit outside the per-product motto-eligibility rule.</li>
      </ul>

      <h2 className="font-display text-2xl font-semibold text-foreground">Freshness statements</h2>
      <p>Every Coastal bag is <strong className="text-foreground">roasted to order</strong> — that&apos;s the actual model, not marketing language. Each retail order triggers a custom production run: labels print on demand, coffee batches are roasted every business day, and your bag ships in the 2 to 5 business days after your payment clears.</p>
      <p>Phrasing we use on the bag and on the Storefront, all of which we can substantiate:</p>
      <ul className="ml-5 list-disc space-y-1">
        <li><em>&ldquo;Roasted to order. Small-batch.&rdquo;</em></li>
        <li><em>&ldquo;Small batch roasted throughout the week for peak flavor and consistency.&rdquo;</em></li>
        <li><em>&ldquo;We roast every shipping day to move your coffee quickly from roaster to doorstep.&rdquo;</em></li>
        <li><em>&ldquo;In many cases, your coffee is roasted, packed, and shipped all in the same day.&rdquo;</em></li>
      </ul>
      <p>What we <strong className="text-foreground">don&apos;t</strong> claim: <em>&ldquo;roasted today&rdquo;</em> on a specific calendar day (we run a 2–5 day production window) or <em>&ldquo;shipped same day&rdquo;</em> as a guarantee (most orders ship in 1–3 days, but holidays and peak seasons can stretch).</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">Spelling, consistency, and accuracy</h2>
      <p>We hold ourselves to specific writing standards on labels and in product copy:</p>
      <ul className="ml-5 list-disc space-y-1">
        <li><strong className="text-foreground">Colombia</strong>, the country. Not &ldquo;Columbia.&rdquo;</li>
        <li><strong className="text-foreground">Specialty Grade</strong>, an SCA cupping designation. Not &ldquo;Speciality.&rdquo;</li>
        <li><strong className="text-foreground">Coarse Ground</strong>, a grind size. Not &ldquo;Course.&rdquo;</li>
        <li><strong className="text-foreground">Fairtrade®</strong>, exactly as the mark holder writes it.</li>
        <li><strong className="text-foreground">Swiss Water Process®</strong>, exactly.</li>
      </ul>
      <p>Errors get caught in our pre-print review. If you spot something on a Coastal bag or page that looks wrong, write us — we owe you the fix.</p>

      <hr className="border-border" />
      <p className="text-sm">
        Questions? <a className="text-accent hover:underline" href="mailto:bpo@achievemor.io">bpo@achievemor.io</a>. For wholesale + sourcing transparency requests, mention &ldquo;Sourcing&rdquo; in the subject and we&apos;ll route warm.
      </p>
      <p className="font-display text-sm italic">Nothing chemically, ever. Served by ACHEEVY. Owner-signed.</p>
    </PolicyPageLayout>
  );
}
