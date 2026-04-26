import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import { PalmTree } from "@/components/icons/palm-tree";

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-border/60 bg-background">
      {/* Reference grid (kept from prior structure, restyled to match design.md) */}
      <div className="container grid gap-12 py-16 md:grid-cols-4">
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
          </ul>
        </div>
        <div>
          <p className="eyebrow">Company</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/team" className="text-foreground/80 hover:text-foreground">Our team</Link></li>
            <li><Link href="/about" className="text-foreground/80 hover:text-foreground">About Jarrett</Link></li>
            <li><Link href="/about/governance" className="text-foreground/80 hover:text-foreground">Governance</Link></li>
            <li><Link href="/chat" className="text-foreground/80 hover:text-foreground">Chat</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow">Compliance</p>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Public claims are sourced from verifiable supplier documentation. We do not repeat organic,
            fair-trade, or health claims unless certificate IDs are on file. Our customer-facing AI agents
            will not represent themselves as human if asked. Every supplier order and public claim is signed
            by founder Jarrett Risher before execution.
          </p>
        </div>
      </div>

      {/* Three-line signature row */}
      <div className="border-t border-border/60">
        <div className="container relative grid grid-cols-1 items-center gap-2 py-8 text-center font-mono text-[10px] uppercase tracking-wordmark text-muted-foreground md:grid-cols-3">
          <span className="md:text-left">© {new Date().getFullYear()} Coastal Brewing.</span>
          <span className="text-foreground">Nothing chemically, ever.</span>
          <span className="md:text-right">powered by ACHIEVEMOR</span>
        </div>
      </div>

      {/* Palm tree silhouette anchor — bottom-right corner ornament */}
      <PalmTree className="pointer-events-none absolute bottom-4 right-4 h-20 w-16 text-foreground/10" />
    </footer>
  );
}
