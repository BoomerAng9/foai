import Link from "next/link";
import { PolicyPageLayout } from "@/components/policy-page-layout";

export const metadata = {
  title: "FDA & Health Claims Disclaimer — Coastal Brewing Co.",
  description: "Coastal sells food and beverage products, not supplements or medicines. We do not make health claims.",
};

export default function HealthDisclaimerPage() {
  return (
    <PolicyPageLayout
      eyebrow="Health & FDA"
      title="FDA & Health Claims Disclaimer."
      lastUpdated="May 6, 2026"
    >
      <h2 className="font-display text-2xl font-semibold text-foreground">What we sell</h2>
      <p>Coastal Brewing Co. sells <strong className="text-foreground">coffee, tea, matcha, and chai</strong> as conventional food and beverage products under U.S. Food and Drug Administration (FDA) labeling regulations.</p>
      <p>Our products are <strong className="text-foreground">not dietary supplements</strong>, <strong className="text-foreground">not medicines</strong>, and <strong className="text-foreground">not therapeutic substances</strong>. We do not market them as such.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">What we don&apos;t claim</h2>
      <p>The FDA (under the Federal Food, Drug, and Cosmetic Act) and the Federal Trade Commission (under the FTC Act) regulate health and disease claims on food products. Coastal does not make and does not authorize anyone to make on our behalf:</p>
      <ul className="ml-5 list-disc space-y-2">
        <li>Claims that our products <strong className="text-foreground">treat, cure, prevent, mitigate, or diagnose</strong> any disease or health condition</li>
        <li>Claims that our products <strong className="text-foreground">alter the structure or function</strong> of the human body, except as the underlying caffeine content of coffee or tea naturally does (which we don&apos;t market)</li>
        <li>Claims about <strong className="text-foreground">immunity, inflammation, focus, gut health, mental clarity, energy, weight loss, blood pressure, blood sugar, cardiovascular health, or any other body system</strong></li>
        <li><strong className="text-foreground">Antioxidant content</strong> as a marketed benefit</li>
        <li><strong className="text-foreground">&ldquo;Clean energy,&rdquo;</strong> <strong className="text-foreground">&ldquo;no crash,&rdquo;</strong> <strong className="text-foreground">&ldquo;feel more focused,&rdquo;</strong> or any similar functional positioning</li>
      </ul>
      <p>If you read any such claim somewhere with the Coastal name on it, please tell us — it didn&apos;t come from us, and we&apos;ll get it corrected.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">What we do say</h2>
      <p>Our marketing language stays in <strong className="text-foreground">flavor, origin, craft, and ritual</strong>:</p>
      <ul className="ml-5 list-disc space-y-1">
        <li>Tasting notes (citrus, cocoa, jasmine)</li>
        <li>Roast profile (light, medium, dark)</li>
        <li>Sourcing detail (country, region, cooperative when permitted)</li>
        <li>Brewing guidance (water temperature, ratio, grind)</li>
        <li>Hospitality and craft (Lowcountry roots, small-batch, slow-morning ritual)</li>
      </ul>
      <p>That&apos;s the lane. We stay in it.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">Caffeine</h2>
      <p>Coffee, tea, matcha, and chai contain caffeine, a stimulant. Caffeine sensitivity varies. If you are pregnant, nursing, taking medication, sensitive to stimulants, or managing a health condition, please consult your physician about your caffeine intake.</p>
      <p>We do not publish a precise caffeine-per-serving number on the bag because brewing method, water temperature, ratio, and individual perception change the dose meaningfully. If you need to track caffeine intake closely, we recommend brewing to a measured ratio and using a published reference for the bean variety.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">Allergens and ingredients</h2>
      <p>Our coffee is processed on equipment that handles <strong className="text-foreground">only coffee, tea, matcha, chai, and (when offered) functional mushroom blends</strong>. Specifically:</p>
      <ul className="ml-5 list-disc space-y-1">
        <li>We do <strong className="text-foreground">not</strong> process tree nuts, peanuts, dairy, eggs, soy, wheat, gluten, fish, or shellfish on our equipment.</li>
        <li>Flavored coffees are infused with natural flavorings on the green beans before roast; the flavorings themselves are made by certified flavor manufacturers and we receive allergen disclosures with each lot.</li>
        <li>If you have a severe allergy and need ingredient documentation for a specific lot, write <a className="text-accent hover:underline" href="mailto:bpo@achievemor.io">bpo@achievemor.io</a> and we&apos;ll forward the certificate of analysis.</li>
      </ul>

      <h2 className="font-display text-2xl font-semibold text-foreground">Functional / mushroom products</h2>
      <p>Coastal carries a small line of functional blends — coffee and tea blended with traditional medicinal mushrooms. Those products are sold as <strong className="text-foreground">food, not as supplements</strong>, in compliance with FDA rules. Each label and product page states the Statement of Identity exactly as the FDA requires:</p>
      <ul className="ml-5 list-disc space-y-1">
        <li><strong className="text-foreground">Ground Coffee With Mushrooms</strong> — Dark and Medium roasts.</li>
        <li><strong className="text-foreground">Instant Coffee With Mushrooms</strong>.</li>
        <li><strong className="text-foreground">Roasted Green Tea With Mushrooms</strong> — our hojicha blend.</li>
        <li><strong className="text-foreground">Matcha Green Tea With Mushrooms</strong>.</li>
      </ul>
      <p>Ingredients are listed in descending order. A <Link href="/policies/prop-65" className="text-accent hover:underline">California Proposition 65</Link> notice appears on every functional package. Marketing copy uses <strong className="text-foreground">traditional-use language only</strong> — <em>&ldquo;long valued for,&rdquo; &ldquo;traditionally used,&rdquo; &ldquo;appreciated for&rdquo;</em> — never therapeutic, immunity, focus, energy, or cognitive claims. The <em>Nothing Chemically, Ever.</em> motto does not extend to the functional line by design; the per-product motto-eligibility rule excludes blends with non-coffee inputs.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">Pregnant, nursing, or under 18</h2>
      <p>We do not direct our marketing to anyone under 18, and we recommend pregnant or nursing customers consult their physicians regarding caffeine.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">This is not medical advice</h2>
      <p>Nothing on the Coastal storefront, in our customer service conversations, on our packaging, in our blog posts, or in our newsletters constitutes medical advice. Coffee and tea are foods. They are not a substitute for a relationship with your healthcare provider, prescribed medication, or a sound diet.</p>
      <p>If you have a health concern, please see a physician.</p>

      <hr className="border-border" />
      <p className="text-sm">Questions? <a className="text-accent hover:underline" href="mailto:bpo@achievemor.io">bpo@achievemor.io</a>. See also <Link href="/policies/prop-65" className="text-accent hover:underline">Proposition 65 Notice</Link> and <Link href="/policies/label-claims" className="text-accent hover:underline">Label Claims &amp; Sourcing</Link>.</p>
      <p className="font-display text-sm italic">Coffee is coffee. Tea is tea. Y&apos;all enjoy them as such.</p>
    </PolicyPageLayout>
  );
}
