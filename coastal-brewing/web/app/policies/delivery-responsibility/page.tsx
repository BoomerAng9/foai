import Link from "next/link";
import { PolicyPageLayout } from "@/components/policy-page-layout";

export const metadata = {
  title: "Package Theft & Delivery Responsibility — Coastal Brewing Co.",
  description: "Who's responsible at each stage of delivery and what to do if a package goes missing.",
};

export default function DeliveryResponsibility() {
  return (
    <PolicyPageLayout
      eyebrow="Delivery & theft"
      title="Package theft & delivery responsibility."
      lastUpdated="April 30, 2026"
    >
      <h2 className="font-display text-2xl font-semibold text-foreground">The short version</h2>
      <p>Once a carrier scans your package as <strong className="text-foreground">Delivered</strong>, responsibility for the package transfers from the carrier to the recipient. We can&apos;t replace stolen packages automatically. We can — and will — help you work the carrier claims process, and most of the time you can recover.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">Who&apos;s responsible at each stage</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="py-3 pr-4 text-left font-semibold text-foreground">Stage</th>
              <th className="py-3 text-left font-semibold text-foreground">Responsibility</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/60"><td className="py-3 pr-4">Order placed → roasted → packed</td><td className="py-3"><strong className="text-foreground">Coastal Brewing Co.</strong></td></tr>
            <tr className="border-b border-border/60"><td className="py-3 pr-4">Picked up by carrier → in transit → out for delivery</td><td className="py-3"><strong className="text-foreground">The carrier</strong> (USPS, UPS, or FedEx)</td></tr>
            <tr><td className="py-3 pr-4">After &ldquo;Delivered&rdquo; scan</td><td className="py-3"><strong className="text-foreground">Recipient</strong></td></tr>
          </tbody>
        </table>
      </div>
      <p>We always ship to the address you provide and supply tracking. After the delivery scan, we have no way to verify whether the package was taken from a porch, a community mailbox, or a parcel locker.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">If your package shows Delivered but didn&apos;t arrive</h2>
      <p>Work the steps in this order. Most missing packages turn up.</p>
      <ol className="ml-5 list-decimal space-y-2">
        <li><strong className="text-foreground">Look around.</strong> Check your front porch, side door, back door, garage, mailbox cluster, parcel locker, and the porches of neighbors who may have signed for it.</li>
        <li><strong className="text-foreground">Wait 24 hours.</strong> Carriers occasionally scan packages as Delivered before the package physically lands — drivers running ahead of schedule, route closeouts, weather. The package usually shows up the next day.</li>
        <li><strong className="text-foreground">Contact the carrier.</strong> USPS, UPS, or FedEx — whichever delivered. The driver may be able to tell you exactly where it was placed. Tracking number is on your shipping confirmation email.</li>
        <li>
          <strong className="text-foreground">File a claim.</strong>
          <ul className="ml-5 mt-2 list-disc space-y-1">
            <li><strong className="text-foreground">USPS Missing Mail:</strong> <a className="text-accent hover:underline" href="https://www.usps.com/help/missing-mail.htm">usps.com/help/missing-mail.htm</a></li>
            <li><strong className="text-foreground">USPS Mail Theft Report:</strong> <a className="text-accent hover:underline" href="https://www.uspis.gov/report">uspis.gov/report</a> (United States Postal Inspection Service)</li>
            <li><strong className="text-foreground">UPS or FedEx:</strong> file directly through their tracking page</li>
          </ul>
        </li>
        <li><strong className="text-foreground">Local police report.</strong> For confirmed theft (not a stalled scan), local law enforcement can take a report. Insurance companies often require this.</li>
      </ol>

      <h2 className="font-display text-2xl font-semibold text-foreground">Will Coastal replace the order?</h2>
      <p>For confirmed theft after the Delivered scan, we apply our <Link href="/policies/refund" className="text-accent hover:underline">Return Policy Rule 3</Link>: we replace the coffee at our cost, you cover shipping on the replacement. We do this once per affected order. We can&apos;t do it indefinitely or for the same address repeatedly without an investigation.</p>
      <p>Insurance often covers porch-theft. Check:</p>
      <ul className="ml-5 list-disc space-y-2">
        <li><strong className="text-foreground">Homeowners or renters insurance</strong> — many policies include theft coverage that covers package theft, often with a small deductible.</li>
        <li><strong className="text-foreground">Credit card protections</strong> — some cards (especially premium ones) include purchase protection that covers theft within a window after delivery.</li>
        <li><strong className="text-foreground">Carrier coverage</strong> — USPS Priority and Priority Express include up to $100 of loss/damage coverage. UPS and FedEx ground similarly include limited coverage.</li>
      </ul>

      <h2 className="font-display text-2xl font-semibold text-foreground">How to lower the risk</h2>
      <p>A few habits cut porch-theft risk to nearly zero. We recommend them honestly:</p>
      <ul className="ml-5 list-disc space-y-2">
        <li><strong className="text-foreground">Ship to a work address</strong> when you&apos;ll be there during business hours.</li>
        <li><strong className="text-foreground">Use a P.O. Box or UPS Access Point.</strong> UPS Access Points are usually free for the recipient — your package is held at a partner store until you pick it up.</li>
        <li><strong className="text-foreground">Ask a trusted neighbor.</strong> If we have someone reliable at home during the day, that&apos;s often the most effective fix.</li>
        <li><strong className="text-foreground">Use a parcel locker or community mailbox</strong> if your residence has one.</li>
        <li><strong className="text-foreground">HOA or building management.</strong> If a community mailbox area is unsecured, raise it with management.</li>
      </ul>

      <h2 className="font-display text-2xl font-semibold text-foreground">Damaged in transit</h2>
      <p>Different rule. Photograph the box and the bag(s) before opening anything else. Email <a className="text-accent hover:underline" href="mailto:orders@brewing.foai.cloud">orders@brewing.foai.cloud</a> with order number and photos within 7 days. We treat shipping damage under <Link href="/policies/refund" className="text-accent hover:underline">Rule 3</Link> — we replace the coffee, you replace the shipping (or we file a carrier claim and reimburse if it pays out).</p>

      <hr className="border-border" />
      <p className="text-sm">
        Questions? <a className="text-accent hover:underline" href="mailto:bpo@achievemor.io">bpo@achievemor.io</a> — Coastal Brewing Co. customer support, weekdays 9am–5pm ET.
      </p>
      <p className="font-display text-sm italic">We&apos;ll do our best to help y&apos;all navigate it.</p>
    </PolicyPageLayout>
  );
}
