import Link from "next/link";
import { PolicyPageLayout } from "@/components/policy-page-layout";

export const metadata = {
  title: "Terms of Service & Sale — Coastal Brewing Co.",
  description: "The contractual basis for using brewing.foai.cloud and buying our coffee, tea, matcha, and chai.",
};

export default function TermsPage() {
  return (
    <PolicyPageLayout
      eyebrow="Terms"
      title="Terms of Service & Sale."
      lastUpdated="April 30, 2026"
    >
      <p>These Terms govern your use of <Link href="/" className="text-accent hover:underline">brewing.foai.cloud</Link> (the &ldquo;Storefront&rdquo;) and any purchase you make from Coastal Brewing Co. (&ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;Coastal&rdquo;), a brand operated by <strong className="text-foreground">A.I.M.S. — AI Managed Solutions</strong>.</p>
      <p>By using the Storefront or placing an order, you agree to these Terms. If you don&apos;t agree, please don&apos;t use the Storefront.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">1. About these Terms</h2>
      <p>We post these Terms to keep the relationship clean and the expectations clear. They cover three things:</p>
      <ol className="ml-5 list-decimal space-y-1"><li>Use of the Storefront — what you can and can&apos;t do on the site</li><li>Sale of products — how orders, prices, and shipping work</li><li>The legal scaffolding — disclaimers, limits, governing law</li></ol>
      <p>We can update these Terms; the &ldquo;Last updated&rdquo; date reflects the current version. Material changes will be announced on the Storefront. Continuing to use the Storefront after a change means you accept the updated Terms.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">2. Eligibility</h2>
      <p>You must be at least <strong className="text-foreground">18 years old</strong> (or the age of majority where you live) to place an order. By ordering, you represent that you meet the age requirement and that the payment method you use is yours.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">3. Your Coastal account</h2>
      <p>You don&apos;t need an account to browse, but checkout and subscriptions require one.</p>
      <ul className="ml-5 list-disc space-y-1">
        <li>Keep your password safe. You&apos;re responsible for activity under your account.</li>
        <li>Tell us promptly if you suspect unauthorized access — <a className="text-accent hover:underline" href="mailto:bpo@achievemor.io">bpo@achievemor.io</a>.</li>
        <li>We may suspend or close accounts that violate these Terms, attempt fraud, or abuse the Storefront.</li>
      </ul>

      <h2 className="font-display text-2xl font-semibold text-foreground">4. Products and pricing</h2>
      <ul className="ml-5 list-disc space-y-2">
        <li><strong className="text-foreground">Roasted on demand.</strong> Every coffee, tea, matcha, and chai SKU is roasted, blended, or packed after your order is placed. We don&apos;t pull bags off a warehouse shelf.</li>
        <li><strong className="text-foreground">Prices are in USD.</strong> Prices on the Storefront are the prices we&apos;ll charge unless there&apos;s a clear typo or pricing error, in which case we reserve the right to cancel and refund the order before shipment.</li>
        <li><strong className="text-foreground">Taxes</strong> are calculated at checkout based on the shipping destination.</li>
        <li><strong className="text-foreground">Shipping</strong> is calculated at checkout based on the package weight, destination, and carrier.</li>
      </ul>
      <p>We try to keep product photos accurate. Color, finish, label print, and bag size shown in photos are representative — small variations between batches are normal in artisanal coffee and tea.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">5. Order process</h2>
      <p>When you place an order:</p>
      <ol className="ml-5 list-decimal space-y-1">
        <li>We send a <strong className="text-foreground">confirmation email</strong> with your order details.</li>
        <li>We charge your payment method.</li>
        <li>The order enters our roast-and-pack queue.</li>
        <li>We send a <strong className="text-foreground">shipping notification</strong> with tracking when the order is processed.</li>
        <li>The carrier picks up and delivers per our <Link href="/policies/shipping" className="text-accent hover:underline">Shipping Policy</Link>.</li>
      </ol>
      <p>An <strong className="text-foreground">order confirmation email is not a contract.</strong> A binding sale only forms when we ship the order. Until shipment, we may cancel for stock issues, address verification problems, payment failures, or pricing errors. If we cancel, we refund the original payment method in full.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">6. Order changes and cancellations</h2>
      <ul className="ml-5 list-disc space-y-1">
        <li><strong className="text-foreground">Before fulfillment</strong> — we can update SKU, grind, or shipping address. Email <a className="text-accent hover:underline" href="mailto:orders@brewing.foai.cloud">orders@brewing.foai.cloud</a> with your order number and the change.</li>
        <li><strong className="text-foreground">After roasting starts</strong> — we can&apos;t pull an order back. The bag is custom-made; we don&apos;t have a warehouse shelf to return it to.</li>
      </ul>
      <p>For everything that happens after delivery, see our <Link href="/policies/refund" className="text-accent hover:underline">Return &amp; Refund Policy</Link>.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">7. Subscriptions</h2>
      <p>Coastal subscriptions (coffee monthly, tea monthly, combo monthly) charge automatically on a recurring schedule until you cancel.</p>
      <ul className="ml-5 list-disc space-y-1">
        <li><strong className="text-foreground">Pause or cancel anytime</strong> in your account; the change applies to the <strong className="text-foreground">next</strong> scheduled run.</li>
        <li>The current run, if already roasted and shipped, is final.</li>
        <li>We notify you by email before each upcoming charge so you can pause or change SKU.</li>
        <li>We can update subscription pricing with at least <strong className="text-foreground">30 days&apos; email notice</strong>. You can cancel before the new price takes effect.</li>
      </ul>

      <h2 className="font-display text-2xl font-semibold text-foreground">8. Shipping and risk transfer</h2>
      <ul className="ml-5 list-disc space-y-1">
        <li>Title and risk of loss for your order pass to <strong className="text-foreground">you on delivery scan</strong> by the carrier.</li>
        <li>For wholesale or bulk orders shipped Ex-Warehouse, title and risk pass to you when the carrier picks up the order from our facility.</li>
        <li>See <Link href="/policies/shipping" className="text-accent hover:underline">Shipping Policy</Link> for production timelines, carriers, and international detail.</li>
      </ul>

      <h2 className="font-display text-2xl font-semibold text-foreground">9. Returns, refunds, and damaged orders</h2>
      <p>We don&apos;t accept physical returns of coffee or tea — see <Link href="/policies/refund" className="text-accent hover:underline">Return &amp; Refund Policy</Link>. Briefly:</p>
      <ul className="ml-5 list-disc space-y-1">
        <li>Our error → we replace at our cost.</li>
        <li>Customer error → new order at your cost.</li>
        <li>Carrier issue or theft → we replace coffee, you cover shipping (one-time).</li>
      </ul>
      <p>For confirmed damaged-in-transit, photograph the package and email us within 7 days. See <Link href="/policies/delivery-responsibility" className="text-accent hover:underline">Package Theft &amp; Delivery Responsibility</Link> for theft details.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">10. Use of the Storefront</h2>
      <p>You may browse, order, and use the Coastal Storefront for personal or legitimate business use. You may not:</p>
      <ul className="ml-5 list-disc space-y-1">
        <li>Resell our products under your own brand without an explicit wholesale agreement</li>
        <li>Reproduce, scrape, or redistribute the Storefront content (text, images, design) without permission</li>
        <li>Probe, attack, overload, or otherwise interfere with the Storefront</li>
        <li>Use the Storefront to send spam or phishing</li>
        <li>Misrepresent your identity to us</li>
        <li>Use any automated tool (scraper, bot) to interact with the Storefront beyond standard search-engine indexing</li>
      </ul>

      <h2 className="font-display text-2xl font-semibold text-foreground">11. Intellectual property</h2>
      <p>Coastal Brewing Co., the Coastal logo, the Lowcountry stork mark, the storefront design, the photography, the brand voice, and the cast portraits are owned by A.I.M.S. — AI Managed Solutions. You may not use them without written permission.</p>
      <p>You retain ownership of anything you submit to us (reviews, feedback, photos shared in chat). By submitting content, you grant Coastal a non-exclusive, worldwide, royalty-free license to use the content to operate, promote, and improve the brand.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">12. AI-assisted customer service</h2>
      <p>Some of our customer service is delivered by AI agents trained in Coastal&apos;s brand voice. When you chat with a Coastal team member online, you may be talking to an AI. <strong className="text-foreground">We disclose AI when asked.</strong> You can always escalate to a human review by writing <a className="text-accent hover:underline" href="mailto:bpo@achievemor.io">bpo@achievemor.io</a>.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">13. No health claims</h2>
      <p>Coastal sells coffee and tea as <strong className="text-foreground">food and beverage products</strong>. We do not market them as supplements or medicines. We do not make claims that our products treat, cure, prevent, or mitigate any disease or health condition.</p>
      <p>If you have a health condition, are pregnant or nursing, take medication, or are sensitive to caffeine, please consult your physician before consuming our products. See <Link href="/policies/health-disclaimer" className="text-accent hover:underline">FDA &amp; Health Claims Disclaimer</Link>.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">14. California Proposition 65 notice</h2>
      <p>Roasted coffee naturally contains trace levels of acrylamide, a substance listed under California&apos;s Proposition 65. See <Link href="/policies/prop-65" className="text-accent hover:underline">Proposition 65 Notice</Link> for the required disclosure and context.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">15. Disclaimers</h2>
      <p className="uppercase text-xs leading-relaxed">THE STOREFRONT AND ALL PRODUCTS ARE PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE.&rdquo; TO THE FULLEST EXTENT ALLOWED BY LAW, COASTAL BREWING CO. AND A.I.M.S. — AI Managed Solutions DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, AND ACCURACY OF INFORMATION.</p>
      <p>We do not warrant that the Storefront will be uninterrupted, error-free, or free of viruses or other harmful code.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">16. Limitation of liability</h2>
      <p className="uppercase text-xs leading-relaxed">TO THE FULLEST EXTENT ALLOWED BY LAW, IN NO EVENT WILL COASTAL BREWING CO., A.I.M.S. — AI Managed Solutions, OR ANY OF OUR AFFILIATES, OFFICERS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, PUNITIVE, OR EXEMPLARY DAMAGES ARISING FROM OR RELATED TO YOUR USE OF THE STOREFRONT OR ANY PRODUCT, EVEN IF ADVISED OF THE POSSIBILITY.</p>
      <p className="uppercase text-xs leading-relaxed">OUR TOTAL LIABILITY FOR ANY CLAIM ARISING FROM OR RELATED TO THESE TERMS OR ANY PRODUCT WILL NOT EXCEED THE AMOUNT YOU PAID FOR THE ORDER GIVING RISE TO THE CLAIM.</p>
      <p>Some jurisdictions don&apos;t allow these limitations; in that case, the limitations apply only to the extent permitted.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">17. Indemnification</h2>
      <p>You agree to defend, indemnify, and hold harmless Coastal Brewing Co., A.I.M.S. — AI Managed Solutions, and our affiliates from any claim, loss, or expense (including reasonable attorneys&apos; fees) arising from your breach of these Terms, your violation of any law, or your misuse of the Storefront or products.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">18. Force majeure</h2>
      <p>We aren&apos;t responsible for delays or failures caused by events beyond our reasonable control — natural disasters, severe weather (hurricanes are a real Lowcountry concern), pandemics, carrier failures, supply-chain disruptions, government actions, or labor disputes. We&apos;ll do our best to notify you and resolve, and we&apos;ll honor orders in queue once we&apos;re operational again.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">19. Governing law and dispute resolution</h2>
      <p>These Terms are governed by the laws of the <strong className="text-foreground">State of South Carolina</strong>, without regard to conflict-of-law rules. The state and federal courts located in <strong className="text-foreground">Beaufort County, South Carolina</strong> have exclusive jurisdiction over any dispute arising from or related to these Terms or any product, except as limited by applicable consumer-protection law.</p>
      <p>If you live in a jurisdiction where mandatory consumer-protection law gives you broader rights or different forum rules, those laws control.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">20. Severability and entire agreement</h2>
      <p>If any provision of these Terms is held invalid, the remaining provisions remain in full force. These Terms, together with our <Link href="/policies/privacy" className="text-accent hover:underline">Privacy Policy</Link>, <Link href="/policies/shipping" className="text-accent hover:underline">Shipping Policy</Link>, <Link href="/policies/refund" className="text-accent hover:underline">Return &amp; Refund Policy</Link>, and other linked policies, are the entire agreement between you and Coastal regarding the Storefront and products.</p>

      <h2 className="font-display text-2xl font-semibold text-foreground">21. Contact</h2>
      <p>
        <a className="text-accent hover:underline" href="mailto:bpo@achievemor.io">bpo@achievemor.io</a><br />
        Coastal Brewing Co. (c/o A.I.M.S. — AI Managed Solutions)<br />
        Bluffton, SC 29910
      </p>
    </PolicyPageLayout>
  );
}
