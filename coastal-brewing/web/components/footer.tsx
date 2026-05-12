import Link from "next/link";
import Image from "next/image";
import { Wordmark } from "@/components/wordmark";

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-border/60 bg-background">
      {/* Owner directive 2026-05-12: footer menu must mirror the hamburger
          drawer surface (Shop / Account / Company / Policies). Added a
          dedicated Account column — previously missing from the footer
          even though the drawer carries it. Labels aligned with drawer
          for consistency. Compliance kept as a separate column since the
          full list is too long for the drawer's Policies group. */}
      <div className="container grid gap-12 py-16 md:grid-cols-6">
        <div className="md:col-span-1">
          <Wordmark size="md" asLink={false} />
          <p className="mt-6 max-w-xs text-xs leading-relaxed text-muted-foreground">
            Small-batch coffee, whole-leaf tea, ceremonial matcha. Sourced honestly, packed in Pooler.
          </p>
        </div>
        <div>
          <p className="eyebrow">Shop</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/products?cat=coffee" className="text-foreground/80 hover:text-foreground">Coffee</Link></li>
            <li><Link href="/products?cat=tea" className="text-foreground/80 hover:text-foreground">Tea</Link></li>
            <li><Link href="/products?cat=matcha" className="text-foreground/80 hover:text-foreground">Matcha</Link></li>
            <li><Link href="/products?cat=subscription" className="text-foreground/80 hover:text-foreground">Subscriptions</Link></li>
            <li><Link href="/pricing" className="text-foreground/80 hover:text-foreground">Pricing &amp; Tiers</Link></li>
            <li><Link href="/membership" className="text-foreground/80 hover:text-foreground">Standard Membership</Link></li>
            <li><Link href="/wood-stork" className="text-foreground/80 hover:text-foreground">Wood Stork (B2B)</Link></li>
            <li><Link href="/pooler-pass" className="text-foreground/80 hover:text-foreground">Pooler Pass (Local)</Link></li>
            <li><Link href="/recipes" className="text-foreground/80 hover:text-foreground">Recipes</Link></li>
            <li><Link href="/merch" className="text-foreground/80 hover:text-foreground">Merch</Link></li>
            <li><Link href="/products" className="text-foreground/80 hover:text-foreground">Shop All</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow">Account</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/account" className="text-foreground/80 hover:text-foreground">My Account</Link></li>
            <li><Link href="/auth/login" className="text-foreground/80 hover:text-foreground">Sign In</Link></li>
            <li><Link href="/auth/signup" className="text-foreground/80 hover:text-foreground">Open an Account</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow">Company</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/team" className="text-foreground/80 hover:text-foreground">Meet the Team</Link></li>
            <li><Link href="/about" className="text-foreground/80 hover:text-foreground">About</Link></li>
            <li><Link href="/about/governance" className="text-foreground/80 hover:text-foreground">Governance</Link></li>
            <li><Link href="/partners" className="text-foreground/80 hover:text-foreground">AIMS Partner Program</Link></li>
            <li><Link href="/chat" className="text-foreground/80 hover:text-foreground">Chat with us</Link></li>
            <li><Link href="/contact" className="text-foreground/80 hover:text-foreground">Contact</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow">Policies</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/policies" className="text-foreground/80 hover:text-foreground">All Policies</Link></li>
            <li><Link href="/policies/shipping" className="text-foreground/80 hover:text-foreground">Shipping</Link></li>
            <li><Link href="/policies/refund" className="text-foreground/80 hover:text-foreground">Returns &amp; Refunds</Link></li>
            <li><Link href="/policies/privacy" className="text-foreground/80 hover:text-foreground">Privacy</Link></li>
            <li><Link href="/policies/terms" className="text-foreground/80 hover:text-foreground">Terms</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow">Compliance</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/policies/label-claims" className="text-foreground/80 hover:text-foreground">Label Claims &amp; Sourcing</Link></li>
            <li><Link href="/policies/health-disclaimer" className="text-foreground/80 hover:text-foreground">FDA &amp; Health Disclaimer</Link></li>
            <li><Link href="/policies/prop-65" className="text-foreground/80 hover:text-foreground">California Prop 65</Link></li>
            <li><Link href="/policies/delivery-responsibility" className="text-foreground/80 hover:text-foreground">Delivery Responsibility</Link></li>
            <li><Link href="/policies/accessibility" className="text-foreground/80 hover:text-foreground">Accessibility</Link></li>
          </ul>
          <p className="mt-4 text-[10px] leading-relaxed text-muted-foreground">
            Every claim on a label is backed by paperwork from our supplier. Every order is signed off by the owner before it ships.
          </p>
        </div>
      </div>

      {/* Three-line signature row */}
      <div className="border-t border-border/60">
        <div className="container relative grid grid-cols-1 items-center gap-2 py-8 text-center font-mono text-[10px] uppercase tracking-wordmark text-muted-foreground md:grid-cols-3">
          <span className="md:text-left">© {new Date().getFullYear()} Coastal Brewing Co.</span>
          <span className="text-foreground">Nothing Chemically, Ever.</span>
          <span className="md:text-right flex items-center justify-end gap-3">
            <span>Powered by: A.I.M.S. (AI MANAGED SOLUTIONS) est.2025</span>
            <Image src="/plr-logo.png" alt="Made in PLR" width={36} height={36} className="inline-block opacity-80 hover:opacity-100 transition-opacity" />
          </span>
        </div>
      </div>

    </footer>
  );
}
