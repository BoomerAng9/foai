import Link from "next/link";
import { PolicyPageLayout } from "@/components/policy-page-layout";

export const metadata = {
  title: "Contact & Support — Coastal Brewing Co.",
  description: "How to reach Coastal Brewing — orders, wholesale, accessibility, press, and the AI cast.",
};

export default function ContactPage() {
  return (
    <PolicyPageLayout
      eyebrow="Contact"
      title="Contact & Support."
      lastUpdated="April 30, 2026"
    >
      <h2 className="font-display text-2xl font-semibold text-foreground">How to reach us</h2>
      <p>We keep this simple. Three email addresses cover everything.</p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="py-3 pr-4 text-left font-semibold text-foreground">What you need</th>
              <th className="py-3 pr-4 text-left font-semibold text-foreground">Where to write</th>
              <th className="py-3 text-left font-semibold text-foreground">What to include</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/60">
              <td className="py-3 pr-4"><strong className="text-foreground">Order questions, changes, refunds, shipping</strong></td>
              <td className="py-3 pr-4"><a className="text-accent hover:underline" href="mailto:orders@brewing.foai.cloud">orders@brewing.foai.cloud</a></td>
              <td className="py-3">Order number, brief description</td>
            </tr>
            <tr className="border-b border-border/60">
              <td className="py-3 pr-4"><strong className="text-foreground">Wholesale, partnerships, sourcing transparency</strong></td>
              <td className="py-3 pr-4"><a className="text-accent hover:underline" href="mailto:bpo@achievemor.io">bpo@achievemor.io</a></td>
              <td className="py-3">Subject line: &ldquo;Wholesale&rdquo; or &ldquo;Partnership&rdquo;</td>
            </tr>
            <tr>
              <td className="py-3 pr-4"><strong className="text-foreground">Accessibility, privacy, legal, press, anything else</strong></td>
              <td className="py-3 pr-4"><a className="text-accent hover:underline" href="mailto:bpo@achievemor.io">bpo@achievemor.io</a></td>
              <td className="py-3">Subject line that names the topic</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="font-display text-2xl font-semibold text-foreground">Hours</h2>
      <p><strong className="text-foreground">Monday through Friday, 9am to 5pm Eastern Time.</strong></p>
      <p>We are closed on the standard U.S. federal holidays. Severe weather in the Lowcountry occasionally pauses operations; we&apos;ll post a notice on the Storefront if so.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">Response time</h2>
      <p>We aim to respond to every email <strong className="text-foreground">the same business day</strong>, and at the latest by the next business day. If you don&apos;t hear back within 48 business-day hours, please send a follow-up — sometimes a message gets caught in spam filters and we&apos;d rather you ping us twice than wait.</p>
      <p>For order issues that require us to pause or modify a roast batch in queue, we move within hours, not days. Time-sensitive order changes should be sent to <a className="text-accent hover:underline" href="mailto:orders@brewing.foai.cloud">orders@brewing.foai.cloud</a> with the subject line starting <strong className="text-foreground">URGENT</strong> so they route to the front of the queue.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">Live chat on the Storefront</h2>
      <p>You can also reach the team through the chat panel on <Link href="/chat" className="text-accent hover:underline">brewing.foai.cloud</Link>. The chat is staffed by our <strong className="text-foreground">Coastal customer service team</strong> — Sal, Hos, Bun, Melli, and the rest of the cast. They handle product questions, recommendations, deal questions, bundle questions, and customer service recovery in real time during business hours.</p>
      <p><strong className="text-foreground">A note on AI:</strong> Some of the team is AI, trained in Coastal&apos;s brand voice and operating inside our policy floor. We disclose AI status when asked. You can always escalate to email if you&apos;d like a human review of any conversation, and we&apos;ll route warm.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">Phone</h2>
      <p>We do not currently take customer service calls. Email and chat get faster, more accurate responses because they let us look at your order and history while we answer.</p>
      <p>If you have a complex situation that genuinely needs a phone call, write <a className="text-accent hover:underline" href="mailto:bpo@achievemor.io">bpo@achievemor.io</a> with the topic and a few times that work for you. We&apos;ll set up a call.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">Mailing address</h2>
      <p>For physical mail (rare, but for the record):</p>
      <p>
        Coastal Brewing Co.<br />
        c/o A.I.M.S. — AI Managed Solutions<br />
        Bluffton, SC 29910
      </p>
      <p><strong className="text-foreground">Please do not return coffee by mail.</strong> See our <Link href="/policies/refund" className="text-accent hover:underline">Return &amp; Refund Policy</Link> — we replace, we don&apos;t accept returns.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">Storefront and pop-up locations</h2>
      <p>We are a primarily online brand with planned brick-and-mortar storefronts in <strong className="text-foreground">Bluffton, Savannah, Charleston, and Hilton Head</strong>. Storefront hours, locations, and openings will be posted on the Storefront and in our newsletter as each location lights up.</p>
      <p>For pop-up events (oyster roasts, farmers&apos; markets, festivals), we post the schedule on the Storefront events page.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">Wholesale, retail buyers, and resellers</h2>
      <p>Coastal supplies coffee, tea, and matcha to coffee shops, restaurants, hotels, gift shops, and corporate clients in the Southeast and (selectively) nationwide.</p>
      <p>For wholesale conversations:</p>
      <ul className="ml-5 list-disc space-y-1">
        <li>Email <a className="text-accent hover:underline" href="mailto:bpo@achievemor.io">bpo@achievemor.io</a> with the subject <strong className="text-foreground">&ldquo;Wholesale Inquiry&rdquo;</strong></li>
        <li>Tell us the kind of business, the volume you&apos;re considering, and your timeline</li>
        <li>We&apos;ll route the conversation to Sal directly</li>
      </ul>
      <p>Wholesale orders ship under our <strong className="text-foreground">Direct Ship</strong> terms — see <Link href="/policies/shipping" className="text-accent hover:underline">Shipping Policy</Link>. Minimum order quantities apply per SKU.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">Press and media</h2>
      <p>Brand story, founder background, sourcing, the Lowcountry connection, the AI hospitality team, partnership stories — write <a className="text-accent hover:underline" href="mailto:bpo@achievemor.io">bpo@achievemor.io</a> with the subject line <strong className="text-foreground">&ldquo;Press&rdquo;</strong> and your outlet, deadline, and angle. Melli, our marketing lead, will route warm.</p>
      <p>We do not generally appear on advertising-driven podcasts, but we&apos;ll consider editorial features that align with the brand.</p>

      <hr className="border-border" />
      <p className="font-display text-sm italic">Mornin&apos;, friend. Real fine to hear from y&apos;all.</p>
    </PolicyPageLayout>
  );
}
