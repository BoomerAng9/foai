import Link from "next/link";
import { PolicyPageLayout } from "@/components/policy-page-layout";

export const metadata = {
  title: "Return & Refund Policy — Coastal Brewing Co.",
  description: "How Coastal handles errors, refunds, and replacements. We don't accept returns; we replace, on us when we're wrong.",
};

export default function RefundPolicy() {
  return (
    <PolicyPageLayout
      eyebrow="Returns & refunds"
      title="The three-bucket rule."
      lastUpdated="May 5, 2026"
    >
      <h2 className="font-display text-2xl font-semibold text-foreground">The short version</h2>
      <p>Coffee and tea are roasted, blended, and packed to order. Once your bag leaves our facility, we don&apos;t accept it back — returned coffee gets discarded, and that helps nobody.</p>
      <p>So we don&apos;t do returns. We do <strong className="text-foreground">fixes</strong>. Three rules cover every situation we&apos;ve ever run into.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">Rule 1 — Our error, we pay.</h2>
      <p>If we sent the wrong grind, the wrong roast, the wrong size, or the wrong SKU, the fix is on us — coffee and shipping both. Just write us within <strong className="text-foreground">7 days of delivery</strong> with your order number and a quick note explaining what happened. We&apos;ll send the right bag right out, expedited where possible. No coffee back, no friction.</p>
      <p>Our internal tracked error rate runs about <strong className="text-foreground">0.04%</strong> — well under one in two thousand orders. It still happens occasionally. When it does, we own it.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">Rule 2 — Your error, you pay.</h2>
      <p>If the order was placed for the wrong SKU, the wrong address, or the wrong customer — or you changed your mind after the bag has roasted — we ask that you place a new order at the corrected detail. We&apos;ll do everything we can to expedite the new one if you let us know quickly.</p>
      <p>This includes:</p>
      <ul className="ml-5 list-disc space-y-2">
        <li>Wrong shipping address entered at checkout</li>
        <li>Order placed for the wrong product</li>
        <li>Customer changed their mind after roast</li>
        <li>Description on a third-party listing didn&apos;t match what they ordered</li>
      </ul>
      <p>We don&apos;t refund the original order in these cases. The roasted bag is real, and we&apos;ve already paid for the green coffee, the roast time, the bag, the label, and the postage.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">Rule 3 — Carrier issue or theft, we split.</h2>
      <p>If your tracking shows <strong className="text-foreground">Delivered</strong> and the package isn&apos;t there, or it tracks lost, or it arrives crushed, write us within <strong className="text-foreground">7 days of the delivery scan</strong> (or 14 days if tracking just stalls). For these cases:</p>
      <ul className="ml-5 list-disc space-y-2">
        <li><strong className="text-foreground">We pay for the coffee.</strong> Same SKU, same size, fresh roast, on us.</li>
        <li><strong className="text-foreground">You pay for the shipping</strong> on the replacement order.</li>
      </ul>
      <p>You can also choose to file a claim with USPS or your carrier directly first, in which case we&apos;ll wait on the outcome. (See our <Link href="/policies/delivery-responsibility" className="text-accent hover:underline">Package Theft &amp; Delivery Responsibility Policy</Link> for the carrier claims paths.)</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">How to request a fix</h2>
      <ol className="ml-5 list-decimal space-y-2">
        <li>Email <a className="text-accent hover:underline" href="mailto:orders@brewing.foai.cloud">orders@brewing.foai.cloud</a>.</li>
        <li>Include your order number and a one-line description of the issue (which rule it falls under is fine — Rule 1, 2, or 3).</li>
        <li>If it&apos;s Rule 1, you don&apos;t need to do anything else. We&apos;ll handle it.</li>
        <li>If it&apos;s Rule 2 or Rule 3, place a new order on the storefront for the replacement. Email us the <strong className="text-foreground">new</strong> order number and reference the original. We&apos;ll mark and expedite.</li>
      </ol>
      <p>We almost always reply same business day.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">What we do not accept</h2>
      <ul className="ml-5 list-disc space-y-2">
        <li><strong className="text-foreground">Returned coffee.</strong> Don&apos;t ship coffee back to us. We&apos;re required to discard returned product, and you&apos;d be paying postage for nothing. We will <strong className="text-foreground">never</strong> ask you to return a bag.</li>
        <li><strong className="text-foreground">Returns on bulk / wholesale / Ex-Warehouse orders.</strong> Once a wholesale or bulk order leaves our facility, the goods are yours and the risk transfers. Insurance is on you.</li>
        <li><strong className="text-foreground">Refunds on international orders.</strong> International transit is slow, expensive, and outside our control once it crosses the border. International orders are not refundable for any reason.</li>
        <li><strong className="text-foreground">Refunds on customs duties or import fees.</strong> Those are imposed by the destination country and we have no way to refund them.</li>
        <li><strong className="text-foreground">Refunds on subscriptions for a month already shipped.</strong> You can pause or cancel anytime in your account; the next-month run will skip. The current-month bag, once roasted and shipped, is final.</li>
        <li><strong className="text-foreground">Returns past 14 days from delivery.</strong> After two weeks the bag is open or stale or both, and we can&apos;t verify the issue.</li>
      </ul>

      <h2 className="font-display text-2xl font-semibold text-foreground">Subscriptions, specifically</h2>
      <p>Pause or cancel your subscription anytime through your account on the storefront. Changes apply to the <strong className="text-foreground">next</strong> monthly run. The bag in transit for the current month ships on the calendar already in motion.</p>
      <p>If you skip a month and want a different SKU for the next one, you can change the SKU in your account, or email us.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">What if I just don&apos;t like the coffee?</h2>
      <p>That&apos;s a real question and a fair one. Our answer: we&apos;ll trade you, once.</p>
      <p>If your first Coastal bag isn&apos;t the cup you wanted, write us within 14 days of delivery, tell us what you wanted it to taste like, and we&apos;ll suggest a better fit and ship it for the cost of shipping only. We don&apos;t take the first bag back — y&apos;all keep it, brew it, give it to a neighbor — but we&apos;ll get the second one right.</p>
      <p>This applies to <strong className="text-foreground">first-time customers</strong> on a single bag, once. After that, our SKUs and tasting notes on each product page should be the guide.</p>

      <hr className="border-border" />
      <p className="text-sm">
        Questions? <a className="text-accent hover:underline" href="mailto:bpo@achievemor.io">bpo@achievemor.io</a>. Or chat with the Coastal team at <Link className="text-accent hover:underline" href="/chat">brewing.foai.cloud</Link> and we&apos;ll route warm.
      </p>
      <p className="font-display text-sm italic">Real fine — we&apos;ll make it right.</p>
    </PolicyPageLayout>
  );
}
