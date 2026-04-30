import { PolicyPageLayout } from "@/components/policy-page-layout";

export const metadata = {
  title: "Accessibility Statement — Coastal Brewing Co.",
  description: "Coastal targets WCAG 2.1 AA. How to report accessibility barriers and what we'll do.",
};

export default function AccessibilityPage() {
  return (
    <PolicyPageLayout
      eyebrow="Accessibility"
      title="Accessibility Statement."
      lastUpdated="April 30, 2026"
    >
      <h2 className="font-display text-2xl font-semibold text-foreground">Our commitment</h2>
      <p>Coastal Brewing Co. wants every visitor to be able to use our Storefront, talk with our team, and order our coffee — including visitors with disabilities. We design and operate the Storefront with that in mind.</p>
      <p>Our standard target is <strong className="text-foreground">WCAG 2.1 Level AA</strong> (Web Content Accessibility Guidelines, published by the W3C). We aim to meet that bar and to fix issues we find or that you report.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">What we do</h2>
      <ul className="ml-5 list-disc space-y-2">
        <li><strong className="text-foreground">Semantic HTML structure</strong> so screen readers can navigate headings, lists, tables, and forms predictably.</li>
        <li><strong className="text-foreground">Image alt text</strong> describing every product photo, brand image, and team portrait.</li>
        <li><strong className="text-foreground">Color contrast</strong> at or above WCAG AA ratios on body text and most UI elements.</li>
        <li><strong className="text-foreground">Keyboard navigation</strong> for ordering, account login, and chat.</li>
        <li><strong className="text-foreground">Visible focus indicators</strong> so keyboard users can see where they are.</li>
        <li><strong className="text-foreground">Accessible forms</strong> with labels, error messages tied to fields, and clear required-field markers.</li>
        <li><strong className="text-foreground">No autoplay audio or video</strong> that you can&apos;t pause or mute.</li>
        <li><strong className="text-foreground">Text resizing</strong> that works up to 200% without breaking layout.</li>
        <li><strong className="text-foreground">Caption support</strong> on any video content we publish (when video is added).</li>
      </ul>

      <h2 className="font-display text-2xl font-semibold text-foreground">What we are still working on</h2>
      <p>Honest list. We&apos;re not perfect. We know we have work to do on:</p>
      <ul className="ml-5 list-disc space-y-2">
        <li><strong className="text-foreground">Chat widget keyboard navigation</strong> — usable but not yet at full parity with mouse navigation.</li>
        <li><strong className="text-foreground">Color contrast on the cream/parchment palette</strong> — most pairs are at AA, but some accent pairings on the brand light theme need a bump.</li>
        <li><strong className="text-foreground">PDF documents</strong> — some downloadable PDFs may not yet be fully accessible. We&apos;re rebuilding them as accessible PDFs over the next quarter.</li>
        <li><strong className="text-foreground">Voice ordering</strong> — we are exploring voice-first ordering through our customer service team. The voice path will land with full accessibility review before public launch.</li>
      </ul>
      <p>If something blocks you from completing an order or finding information you need, please tell us. We will help you complete the order, and we will fix the underlying issue.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">Tools and assistive technology</h2>
      <p>We test the Storefront against:</p>
      <ul className="ml-5 list-disc space-y-1">
        <li><strong className="text-foreground">VoiceOver</strong> on macOS and iOS</li>
        <li><strong className="text-foreground">NVDA</strong> on Windows</li>
        <li><strong className="text-foreground">TalkBack</strong> on Android</li>
        <li><strong className="text-foreground">Keyboard-only navigation</strong> without a mouse</li>
        <li><strong className="text-foreground">Browser zoom</strong> up to 200%</li>
      </ul>
      <p>We design for the major screen-reader and assistive-technology workflows. If you use a less-common tool and run into issues, let us know — we&apos;ll often be able to address it directly.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">How to report a barrier</h2>
      <p>If anything on the Storefront blocks you or makes ordering harder than it should be, email <a className="text-accent hover:underline" href="mailto:bpo@achievemor.io">bpo@achievemor.io</a> with the subject line <strong className="text-foreground">&ldquo;Accessibility — [page or feature]&rdquo;</strong> and a brief description.</p>
      <p>We acknowledge accessibility reports within <strong className="text-foreground">2 business days</strong> and aim to either fix or schedule the fix within <strong className="text-foreground">30 days</strong> for any issue that prevents a key task (browse, order, chat, account, checkout). For lower-priority issues, we batch fixes into our regular development cycle.</p>
      <p>If you need help completing an order right now, mention that and we&apos;ll personally walk you through it via email or phone.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">Legal scope</h2>
      <p>We follow the principles of the <strong className="text-foreground">Americans with Disabilities Act (ADA)</strong> and <strong className="text-foreground">Section 508</strong> as they apply to e-commerce, even where formal coverage is debated. We don&apos;t wait on a regulator to do right by the customer.</p>
      <p>If you believe we have not met our commitment, please write us first — we want to make it right. If we haven&apos;t, you may also file a complaint with the U.S. Department of Justice ADA enforcement office or with the appropriate state consumer-protection agency.</p>

      <hr className="border-border" />
      <p className="text-sm">Contact: <a className="text-accent hover:underline" href="mailto:bpo@achievemor.io">bpo@achievemor.io</a> — Coastal Brewing Co. accessibility, weekdays 9am–5pm ET.</p>
      <p className="font-display text-sm italic">Hospitality means every customer feels welcome. That includes how we build the Storefront.</p>
    </PolicyPageLayout>
  );
}
