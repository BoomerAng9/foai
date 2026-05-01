import Link from "next/link";
import { PolicyPageLayout } from "@/components/policy-page-layout";

export const metadata = {
  title: "Privacy Policy — Coastal Brewing Co.",
  description: "What Coastal collects, why, who we share with, and your rights under CCPA, GDPR, and state privacy laws.",
};

export default function PrivacyPolicy() {
  return (
    <PolicyPageLayout
      eyebrow="Privacy"
      title="Privacy Policy."
      lastUpdated="April 30, 2026"
    >
      <p className="font-mono text-xs text-muted-foreground">Effective date: April 30, 2026</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">Who we are</h2>
      <p>Coastal Brewing Co. is a Lowcountry coffee, tea, and matcha brand operated by <strong className="text-foreground">A.I.M.S. — AI Managed Solutions</strong> at brewing.foai.cloud and at our retail and pop-up locations.</p>
      <p>This Privacy Policy describes what personal information we collect, why we collect it, how we use it, who we share it with, and what choices you have.</p>
      <p>If you have a question about this policy, write us at <a className="text-accent hover:underline" href="mailto:bpo@achievemor.io">bpo@achievemor.io</a>.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">What we collect</h2>
      <h3 className="font-display text-lg font-semibold text-foreground">When you place an order</h3>
      <ul className="ml-5 list-disc space-y-1">
        <li><strong className="text-foreground">Name and shipping address</strong> so we can ship to you</li>
        <li><strong className="text-foreground">Email address</strong> so we can confirm orders, send tracking, and reach you about issues</li>
        <li><strong className="text-foreground">Phone number</strong> (optional, used only for delivery exceptions)</li>
        <li><strong className="text-foreground">Payment information</strong> — handled by our payment processor (Stripe). We never see your full card number; the processor returns a tokenized reference and the last four digits.</li>
      </ul>
      <h3 className="font-display text-lg font-semibold text-foreground">When you create an account or subscribe</h3>
      <ul className="ml-5 list-disc space-y-1">
        <li>The above plus a password (stored hashed, never in plain text)</li>
        <li>Subscription preferences (frequency, SKU, payment method on file)</li>
        <li>Order history</li>
      </ul>
      <h3 className="font-display text-lg font-semibold text-foreground">When you chat with our team</h3>
      <ul className="ml-5 list-disc space-y-1">
        <li>The conversation transcript so we can review and improve service</li>
        <li>Your email if you provide it for follow-up</li>
      </ul>
      <h3 className="font-display text-lg font-semibold text-foreground">When you visit the storefront</h3>
      <ul className="ml-5 list-disc space-y-1">
        <li>Standard server logs: IP address, browser, device type, referrer, pages viewed, time on page</li>
        <li>Cookies (see Cookies below)</li>
      </ul>
      <h3 className="font-display text-lg font-semibold text-foreground">When you sign up for the newsletter</h3>
      <ul className="ml-5 list-disc space-y-1"><li>Email address only</li></ul>
      <p>We do <strong className="text-foreground">not</strong> collect biometric data, government identifiers (Social Security Number, driver&apos;s license number), or precise geolocation. We do not collect data from anyone we know to be under 13.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">Why we collect it (the legal basis)</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead><tr className="border-b border-border"><th className="py-3 pr-4 text-left font-semibold text-foreground">Purpose</th><th className="py-3 text-left font-semibold text-foreground">Legal basis</th></tr></thead>
          <tbody>
            <tr className="border-b border-border/60"><td className="py-3 pr-4">Fulfill your order</td><td className="py-3">Performance of contract</td></tr>
            <tr className="border-b border-border/60"><td className="py-3 pr-4">Process payment</td><td className="py-3">Performance of contract</td></tr>
            <tr className="border-b border-border/60"><td className="py-3 pr-4">Send order updates</td><td className="py-3">Performance of contract</td></tr>
            <tr className="border-b border-border/60"><td className="py-3 pr-4">Send marketing emails</td><td className="py-3">Consent (you can unsubscribe anytime)</td></tr>
            <tr className="border-b border-border/60"><td className="py-3 pr-4">Improve the storefront</td><td className="py-3">Legitimate interest</td></tr>
            <tr className="border-b border-border/60"><td className="py-3 pr-4">Comply with tax + accounting law</td><td className="py-3">Legal obligation</td></tr>
            <tr><td className="py-3 pr-4">Detect fraud and abuse</td><td className="py-3">Legitimate interest</td></tr>
          </tbody>
        </table>
      </div>

      <h2 className="font-display text-2xl font-semibold text-foreground">Who we share with</h2>
      <p>We share your data only with parties that need it to fulfill your order or operate the business:</p>
      <ul className="ml-5 list-disc space-y-1">
        <li><strong className="text-foreground">Payment processor</strong> (Stripe) — to charge your card and handle refunds</li>
        <li><strong className="text-foreground">Fulfillment partner</strong> — to print labels, roast, pack, and ship your order</li>
        <li><strong className="text-foreground">Carriers</strong> (USPS, UPS, FedEx) — for delivery</li>
        <li><strong className="text-foreground">Email service</strong> — for transactional and marketing emails</li>
        <li><strong className="text-foreground">Tax authorities</strong> — when required by law</li>
      </ul>
      <p>We do <strong className="text-foreground">not</strong> sell your personal information. We do <strong className="text-foreground">not</strong> rent your email list to third parties. We do <strong className="text-foreground">not</strong> share your data for cross-context behavioral advertising.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">Cookies</h2>
      <p>We use cookies and similar storage to:</p>
      <ul className="ml-5 list-disc space-y-1">
        <li>Keep you logged in</li>
        <li>Remember items in your cart</li>
        <li>Measure storefront usage (anonymized analytics)</li>
      </ul>
      <p>You can disable cookies in your browser settings. Some features (cart, login, checkout) won&apos;t work without them.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">How long we keep it</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead><tr className="border-b border-border"><th className="py-3 pr-4 text-left font-semibold text-foreground">Data</th><th className="py-3 text-left font-semibold text-foreground">Retention</th></tr></thead>
          <tbody>
            <tr className="border-b border-border/60"><td className="py-3 pr-4">Order records (legally required)</td><td className="py-3">7 years</td></tr>
            <tr className="border-b border-border/60"><td className="py-3 pr-4">Active customer account</td><td className="py-3">Until you ask us to close it</td></tr>
            <tr className="border-b border-border/60"><td className="py-3 pr-4">Marketing email list</td><td className="py-3">Until you unsubscribe</td></tr>
            <tr className="border-b border-border/60"><td className="py-3 pr-4">Server access logs</td><td className="py-3">90 days</td></tr>
            <tr><td className="py-3 pr-4">Chat transcripts</td><td className="py-3">1 year</td></tr>
          </tbody>
        </table>
      </div>

      <h2 className="font-display text-2xl font-semibold text-foreground">Your rights</h2>
      <p>Depending on where you live, you may have rights under the <strong className="text-foreground">California Consumer Privacy Act (CCPA)</strong>, <strong className="text-foreground">EU/UK General Data Protection Regulation (GDPR)</strong>, <strong className="text-foreground">Virginia, Colorado, and other state privacy laws</strong>, or similar.</p>
      <p>You generally have the right to:</p>
      <ul className="ml-5 list-disc space-y-1">
        <li><strong className="text-foreground">Access</strong> the personal information we hold about you</li>
        <li><strong className="text-foreground">Correct</strong> information that&apos;s wrong</li>
        <li><strong className="text-foreground">Delete</strong> your information (subject to legal retention obligations like tax records)</li>
        <li><strong className="text-foreground">Opt out</strong> of marketing emails (every email has an unsubscribe link)</li>
        <li><strong className="text-foreground">Port</strong> your data to another service (we&apos;ll provide a machine-readable copy)</li>
        <li><strong className="text-foreground">Not be discriminated against</strong> for exercising any of these rights</li>
      </ul>
      <p>To exercise these rights, write <a className="text-accent hover:underline" href="mailto:bpo@achievemor.io">bpo@achievemor.io</a>. We respond within 30 days. We may need to verify your identity before disclosing or deleting data.</p>
      <h3 className="font-display text-lg font-semibold text-foreground">California residents specifically</h3>
      <p>The CCPA gives California residents the right to know what categories of personal information we collect and sell, the right to delete personal information, and the right to opt out of any sale. <strong className="text-foreground">We do not sell your personal information.</strong> That said, you may direct any access, deletion, or opt-out request to <a className="text-accent hover:underline" href="mailto:bpo@achievemor.io">bpo@achievemor.io</a>.</p>
      <p>You may also designate an authorized agent to make a request on your behalf. We&apos;ll require reasonable verification.</p>
      <h3 className="font-display text-lg font-semibold text-foreground">EU and UK residents</h3>
      <p>Where we process your personal data under GDPR or UK GDPR, you have the rights listed above plus the right to lodge a complaint with your supervisory authority. The legal basis for our processing is generally either contract (to fulfill your order) or consent (for marketing email). You can withdraw consent anytime.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">Security</h2>
      <p>We use commercially reasonable physical, administrative, and technical safeguards to protect personal data:</p>
      <ul className="ml-5 list-disc space-y-1">
        <li>Encryption in transit (TLS) on every page that handles personal data</li>
        <li>Encryption at rest for stored credentials and payment tokens</li>
        <li>Access controls limiting who on our team can see customer data</li>
        <li>Vendor agreements requiring our processors to maintain comparable safeguards</li>
      </ul>
      <p>No system is perfectly secure. If we detect a breach affecting your personal data, we&apos;ll notify you and the appropriate authorities as required by law.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">Children&apos;s privacy</h2>
      <p>Our products and storefront are not directed at children under 13, and we do not knowingly collect personal information from anyone under 13. If you believe we&apos;ve collected a child&apos;s data, write us and we&apos;ll delete it promptly.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">Changes to this policy</h2>
      <p>We update this policy when we change practices. The &ldquo;Last updated&rdquo; date at the top reflects the current version. Material changes (new categories of data collected, new third parties, new uses) will be announced on the storefront and emailed to active subscribers.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">Contact</h2>
      <p>For any privacy question or request:</p>
      <p>
        <strong className="text-foreground">Email:</strong> <a className="text-accent hover:underline" href="mailto:bpo@achievemor.io">bpo@achievemor.io</a><br />
        <strong className="text-foreground">Mail:</strong> Coastal Brewing Co. (c/o A.I.M.S. — AI Managed Solutions), Privacy Officer{/* TCR_ADDR_PATCH: confirm Oceanside ZIP on TCR Compliant Address Service enrollment */}, Oceanside, CA 92054
      </p>
      <p>We&apos;ll respond within 30 days.</p>

      <hr className="border-border" />
      <p className="text-sm">See also <Link href="/policies/terms" className="text-accent hover:underline">Terms of Service &amp; Sale</Link>, <Link href="/policies/accessibility" className="text-accent hover:underline">Accessibility</Link>, and <Link href="/contact" className="text-accent hover:underline">Contact &amp; Support</Link>.</p>
    </PolicyPageLayout>
  );
}
