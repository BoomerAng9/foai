import Link from "next/link";
import { PolicyPageLayout } from "@/components/policy-page-layout";

export const metadata = {
  title: "Shipping Policy — Coastal Brewing Co.",
  description: "How Coastal Brewing ships your roast-to-order coffee, tea, matcha, and chai.",
};

export default function ShippingPolicy() {
  return (
    <PolicyPageLayout
      eyebrow="Shipping"
      title="How we ship."
      lastUpdated="April 30, 2026"
    >
      <h2 className="font-display text-2xl font-semibold text-foreground">The short version</h2>
      <p>
        Every order is a fresh small-batch roast. We don&apos;t pull bags off a warehouse shelf — we
        roast, pack, and ship your order on the same demand-driven schedule we run for the storefront.
      </p>
      <p>That means <strong className="text-foreground">reliable</strong>, not fast. Fresh coffee takes a beat. We think it&apos;s worth the wait.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">Production timeline</h2>
      <ul className="ml-5 list-disc space-y-2">
        <li><strong className="text-foreground">Roast &amp; pack:</strong> 3 to 5 business days from the moment your payment clears.</li>
        <li>During holiday weeks (Thanksgiving, Christmas, Memorial Day) and peak runs, production may take a day or two longer. We&apos;ll always honor the order in the queue.</li>
        <li>Once your order&apos;s roasted, you&apos;ll see a tracking number attached. If it shows <em>pre-shipment</em>, that means the package is in our outbound queue and the carrier hasn&apos;t picked it up yet — it&apos;ll move within one business day.</li>
      </ul>

      <h2 className="font-display text-2xl font-semibold text-foreground">Shipping timeline</h2>
      <ul className="ml-5 list-disc space-y-2">
        <li><strong className="text-foreground">Carrier:</strong> USPS, UPS, or FedEx, picked per package for the best fit.</li>
        <li><strong className="text-foreground">Delivery:</strong> generally 1 to 5 business days after the carrier has the package, depending on how far it&apos;s traveling. South Carolina and Georgia neighbors usually see it inside 2 days; the Pacific Northwest and Maine sit at the longer end.</li>
        <li>We use USPS First-Class for 1 bag, USPS Priority for 2–8, UPS Ground for 9+.</li>
      </ul>
      <p><strong className="text-foreground">Total order-to-doorstep time: typically 4 to 10 business days.</strong></p>
      <p>We do not offer expedited shipping. Same-day or next-day options would be a promise we couldn&apos;t keep — every cup is roasted to order, and the roast schedule is the floor we won&apos;t cut.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">International shipping</h2>
      <p>We ship internationally via USPS First-Class International where available. Be advised:</p>
      <ul className="ml-5 list-disc space-y-2">
        <li>International transit is slower than domestic and frequently runs 2–4 weeks.</li>
        <li>Customs duties and import fees are <strong className="text-foreground">your responsibility</strong> as the recipient and are not included in our shipping charge.</li>
        <li>International orders are not refundable for any shipping or transit issue. Once the package leaves our facility, we cannot guarantee delivery, recover lost packages, or pay duties.</li>
        <li>If your country requires special documentation, we cannot provide more than the standard customs declaration.</li>
      </ul>
      <p>If reliable delivery matters more than international sourcing, we recommend ordering through a U.S. address.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">Wholesale &amp; bulk orders</h2>
      <p>Bulk orders — 12 units or more per SKU on 12oz or 16oz, 6 units or more on 2lb, any quantity on 5lb — ship <strong className="text-foreground">Ex-Warehouse</strong>. That means once the carrier picks up the pallet from us, the order is yours and the responsibility for transit transfers to you. Insurance is your call.</p>
      <p>For wholesale conversation, write us at <a className="text-accent hover:underline" href="mailto:bpo@achievemor.io">bpo@achievemor.io</a> and we&apos;ll route to Sal directly.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">Order changes</h2>
      <p>We can update your order <strong className="text-foreground">before it enters fulfillment</strong>, which is roughly the window between payment clearing and the next morning&apos;s roast schedule being printed.</p>
      <p>To request a change: email <a className="text-accent hover:underline" href="mailto:orders@brewing.foai.cloud">orders@brewing.foai.cloud</a> with your order number, the SKU you want to change, and the SKU you want shipped instead. Once a label has printed and the order has rolled into the morning&apos;s roast batch, we cannot pull it back.</p>
      <p>Changing your address on the storefront does <strong className="text-foreground">not</strong> change the address on an order already in our system. Email us; we&apos;ll handle it.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">Tracking</h2>
      <p>A tracking number lands in your email the day your roast goes into the queue. If you don&apos;t see one within 5 business days of payment, write us — your order may be on hold for an unrelated reason (most often a label or address verification).</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">Holidays &amp; weather</h2>
      <p>We&apos;re closed on the standard federal holidays. Severe weather in the Lowcountry occasionally pauses outbound dock pickups; we&apos;ll post a notice on the storefront if so. Orders never get lost — they just queue.</p>

      <hr className="border-border" />
      <p className="text-sm">
        Questions? <a className="text-accent hover:underline" href="mailto:bpo@achievemor.io">bpo@achievemor.io</a> — Coastal Brewing Co. customer support, weekdays 9am–5pm ET, almost always same-day response. <Link href="/contact" className="text-accent hover:underline">Contact &amp; Support</Link>.
      </p>
    </PolicyPageLayout>
  );
}
