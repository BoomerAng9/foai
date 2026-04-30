import Link from "next/link";
import { PolicyPageLayout } from "@/components/policy-page-layout";

export const metadata = {
  title: "California Proposition 65 Notice — Coastal Brewing Co.",
  description: "California Prop 65 acrylamide warning for roasted coffee, with plain-English context.",
};

export default function Prop65Page() {
  return (
    <PolicyPageLayout
      eyebrow="California Prop 65"
      title="California Proposition 65 Notice."
      lastUpdated="April 30, 2026"
    >
      <div className="rounded-lg border-2 border-destructive bg-destructive/5 p-6">
        <p className="font-display text-lg font-semibold text-destructive">⚠ WARNING</p>
        <p className="mt-2 text-foreground">
          <strong>Consuming this product can expose you to chemicals including acrylamide, which is known to the State of California to cause cancer. For more information, go to{" "}
          <a className="text-accent hover:underline" href="https://www.p65warnings.ca.gov/food">www.P65Warnings.ca.gov/food</a>.</strong>
        </p>
      </div>

      <h2 className="font-display text-2xl font-semibold text-foreground">What this means in plain English</h2>
      <p>California&apos;s Proposition 65 requires businesses to provide warnings about products that may expose California consumers to chemicals on California&apos;s published list. The threshold California uses is <strong className="text-foreground">deliberately conservative</strong> and applies to many roasted, baked, and cooked foods sold throughout the state — including coffee, baked goods, French fries, potato chips, almonds, prune juice, and many items found in any grocery store and restaurant.</p>
      <p>The chemical involved here is <strong className="text-foreground">acrylamide</strong>. It forms naturally when foods are heated above about 248°F (120°C) — including any roast or bake process. It is not added to coffee. It is a byproduct of the roasting itself.</p>
      <p>For coffee specifically, California courts and regulators have acknowledged that the cancer-risk link from acrylamide in coffee is <strong className="text-foreground">not established</strong>, and California issued a specific exemption rule for coffee in 2019 — but the warning continues to be applied widely as a precaution, because the cost of being wrong on a Prop 65 case is high.</p>
      <p>We post this warning on packaging and on this page <strong className="text-foreground">out of an abundance of caution to meet California requirements</strong>, not because we have evidence our coffee or tea is unsafe.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">What&apos;s on our packaging</h2>
      <p>Every Coastal Brewing Co. coffee bag, tea tin, matcha pouch, chai tin, and any future functional product we sell into California carries the warning above on the label, in the legally required format and font size, with the link to <a className="text-accent hover:underline" href="https://www.p65warnings.ca.gov/food">www.P65Warnings.ca.gov/food</a>.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">Functional / mushroom products</h2>
      <p>Functional and mushroom-based products may also trigger Prop 65 warnings for <strong className="text-foreground">naturally occurring trace levels of cadmium, lead, or arsenic</strong> that come from the soil mushrooms grow in. California&apos;s labeling thresholds are stricter than federal food-safety thresholds, so warnings may apply even though our products meet all federal food-safety standards.</p>
      <p>If Coastal offers functional or mushroom coffees in the future, the warning will appear on the package along with a brief explanation matching this page.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">What this is not</h2>
      <p>This notice is <strong className="text-foreground">not</strong> an admission that Coastal&apos;s products are unsafe. Our products meet all applicable U.S. food safety standards. The California Prop 65 framework operates on conservative warning thresholds that exceed federal safety thresholds, so warnings are routinely applied to common foods.</p>
      <p>If you live outside California, you&apos;ll see the same warning on the package because we ship the same packaging nationwide. We don&apos;t run a separate California-only label run.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">More information</h2>
      <ul className="ml-5 list-disc space-y-1">
        <li>California&apos;s official Prop 65 site: <a className="text-accent hover:underline" href="https://www.p65warnings.ca.gov">www.P65Warnings.ca.gov</a></li>
        <li>Specifically about food: <a className="text-accent hover:underline" href="https://www.p65warnings.ca.gov/food">www.P65Warnings.ca.gov/food</a></li>
        <li>The 2019 Prop 65 coffee exemption (OEHHA): <a className="text-accent hover:underline" href="https://oehha.ca.gov/proposition-65/coffee">oehha.ca.gov/proposition-65/coffee</a></li>
      </ul>

      <p>If you have a question about this warning, write us at <a className="text-accent hover:underline" href="mailto:bpo@achievemor.io">bpo@achievemor.io</a>. We&apos;re happy to walk you through it.</p>

      <hr className="border-border" />
      <p className="text-sm">See also <Link href="/policies/health-disclaimer" className="text-accent hover:underline">FDA &amp; Health Claims Disclaimer</Link>.</p>
    </PolicyPageLayout>
  );
}
