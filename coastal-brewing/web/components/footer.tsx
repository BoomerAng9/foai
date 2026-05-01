import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-border/60 bg-background">
      {/* Reference grid (kept from prior structure, restyled to match design.md) */}
      <div className="container grid gap-12 py-16 md:grid-cols-5">
        <div className="md:col-span-1">
          <Wordmark size="md" asLink={false} />
          <p className="mt-6 max-w-xs text-xs leading-relaxed text-muted-foreground">
            Small-batch coffee, whole-leaf tea, ceremonial matcha. Lowcountry-rooted, AI-managed.
          </p>
        </div>
        <div>
          <p className="eyebrow">Shop</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/products?cat=coffee" className="text-foreground/80 hover:text-foreground">Coffee</Link></li>
            <li><Link href="/products?cat=tea" className="text-foreground/80 hover:text-foreground">Tea</Link></li>
            <li><Link href="/products?cat=matcha" className="text-foreground/80 hover:text-foreground">Matcha</Link></li>
            <li><Link href="/products?cat=subscription" className="text-foreground/80 hover:text-foreground">Subscriptions</Link></li>
            <li><Link href="/merch" className="text-foreground/80 hover:text-foreground">Merch</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow">Company</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/team" className="text-foreground/80 hover:text-foreground">Our team</Link></li>
            <li><Link href="/about" className="text-foreground/80 hover:text-foreground">About the Founder</Link></li>
            <li><Link href="/about/governance" className="text-foreground/80 hover:text-foreground">Governance</Link></li>
            <li><Link href="/partners" className="text-foreground/80 hover:text-foreground">Partner Program</Link></li>
            <li><Link href="/chat" className="text-foreground/80 hover:text-foreground">Chat</Link></li>
            <li><Link href="/contact" className="text-foreground/80 hover:text-foreground">Contact &amp; Support</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow">Policies</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/policies" className="text-foreground/80 hover:text-foreground">All policies</Link></li>
            <li><Link href="/policies/shipping" className="text-foreground/80 hover:text-foreground">Shipping</Link></li>
            <li><Link href="/policies/refund" className="text-foreground/80 hover:text-foreground">Returns &amp; refunds</Link></li>
            <li><Link href="/policies/privacy" className="text-foreground/80 hover:text-foreground">Privacy</Link></li>
            <li><Link href="/policies/terms" className="text-foreground/80 hover:text-foreground">Terms</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow">Compliance</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/policies/label-claims" className="text-foreground/80 hover:text-foreground">Label claims &amp; sourcing</Link></li>
            <li><Link href="/policies/health-disclaimer" className="text-foreground/80 hover:text-foreground">FDA &amp; health disclaimer</Link></li>
            <li><Link href="/policies/prop-65" className="text-foreground/80 hover:text-foreground">California Prop 65</Link></li>
            <li><Link href="/policies/delivery-responsibility" className="text-foreground/80 hover:text-foreground">Delivery responsibility</Link></li>
            <li><Link href="/policies/accessibility" className="text-foreground/80 hover:text-foreground">Accessibility</Link></li>
          </ul>
          <p className="mt-4 text-[10px] leading-relaxed text-muted-foreground">
            Public claims are sourced from verifiable supplier documentation. AI agents disclose AI when asked. Every public claim and supplier order is signed by the owner.
          </p>
        </div>
      </div>

      {/* Three-line signature row */}
      <div className="border-t border-border/60">
        <div className="container relative grid grid-cols-1 items-center gap-2 py-8 text-center font-mono text-[10px] uppercase tracking-wordmark text-muted-foreground md:grid-cols-3">
          <span className="md:text-left">© {new Date().getFullYear()} Coastal Brewing.</span>
          <span className="text-foreground">Every cup is what the label says it is.</span>
          <span className="md:text-right">Powered by: A.I.M.S. (AI MANAGED SOLUTIONS) est.2025</span>
        </div>
      </div>

    </footer>
  );
}
