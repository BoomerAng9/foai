import Link from "next/link";
import { PolicyPageLayout } from "@/components/policy-page-layout";

export const metadata = {
  title: "Policies — Coastal Brewing Co.",
  description: "Shipping, returns, privacy, terms, and the rest of how Coastal operates.",
};

const POLICIES = [
  { href: "/policies/shipping", title: "Shipping Policy", blurb: "Roast-to-order timing, carriers, international, and delivery expectations." },
  { href: "/policies/refund", title: "Return & Refund Policy", blurb: "The three-bucket rule. We don't accept returns — we replace, on us when we're wrong." },
  { href: "/policies/delivery-responsibility", title: "Package Theft & Delivery Responsibility", blurb: "Who's responsible at each stage and what to do if a package is missing." },
  { href: "/policies/privacy", title: "Privacy Policy", blurb: "What we collect, how we use it, your rights under CCPA, GDPR, and state privacy laws." },
  { href: "/policies/terms", title: "Terms of Service & Sale", blurb: "The contractual basis for using the storefront and buying our coffee." },
  { href: "/policies/label-claims", title: "Label Claims & Sourcing Disclosure", blurb: "What we claim, what we don't, and why. Per-product motto, per-tier sourcing, paper trail on every public claim." },
  { href: "/policies/health-disclaimer", title: "FDA & Health Claims Disclaimer", blurb: "Coffee is food, not medicine. We don't make health, supplement, or therapeutic claims." },
  { href: "/policies/prop-65", title: "California Proposition 65 Notice", blurb: "Required California warning for roasted coffee acrylamide, in plain English." },
  { href: "/policies/accessibility", title: "Accessibility Statement", blurb: "WCAG 2.1 AA target. How to report a barrier and what we'll do about it." },
];

export default function PoliciesIndex() {
  return (
    <PolicyPageLayout
      eyebrow="The fine print"
      title="Coastal policies."
      lastUpdated="April 30, 2026"
    >
      <p>
        We keep these short and direct. If something on this page doesn&apos;t answer your question,
        write us at{" "}
        <a className="text-accent hover:underline" href="mailto:bpo@achievemor.io">
          bpo@achievemor.io
        </a>{" "}
        and we&apos;ll get you a real answer.
      </p>

      <ul className="!mt-8 space-y-4 not-prose">
        {POLICIES.map((p) => (
          <li key={p.href} className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-accent/60">
            <Link href={p.href} className="block">
              <p className="font-display text-lg font-semibold text-foreground">{p.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{p.blurb}</p>
            </Link>
          </li>
        ))}
      </ul>

      <p className="!mt-10">
        For customer service, see <Link href="/contact" className="text-accent hover:underline">Contact &amp; Support</Link>.
        For wholesale or partnership inquiries, write us at{" "}
        <a className="text-accent hover:underline" href="mailto:bpo@achievemor.io">bpo@achievemor.io</a>.
      </p>
    </PolicyPageLayout>
  );
}
