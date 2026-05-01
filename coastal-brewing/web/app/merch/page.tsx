import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, Package } from "lucide-react";

export const metadata = {
  title: "Merch — Coastal Brewing Co.",
  description:
    "Coastal Brewing Co. branded merchandise. Mugs, totes, tees, hats, and more — built for the Lowcountry.",
};

const MERCH_ITEMS = [
  {
    id: "mug",
    name: "15oz Ceramic Mug",
    description: "Heavy ceramic, Coastal stork mark. The morning ritual, properly equipped.",
    badge: "Coffee & Tea",
    available: true,
  },
  {
    id: "tote",
    name: "Canvas Tote",
    description: '"Nothing Chemically, Ever." on heavyweight canvas. Farmers\' market ready.',
    badge: "Carry",
    available: true,
  },
  {
    id: "tee-heather",
    name: "Stork Mark Tee",
    description: "Unisex fit, heather grey. Coastal stork mark on the chest. Minimal, clean.",
    badge: "Apparel",
    available: true,
  },
  {
    id: "tee-cream",
    name: "Lowcountry Wordmark Tee",
    description: "Cream colorway, Lowcountry wordmark. For the porch. For the dock.",
    badge: "Apparel",
    available: true,
  },
  {
    id: "hat",
    name: "Low-Crown Cap",
    description: "Embroidered stork mark. Structured front, unstructured feel. Built for the coast.",
    badge: "Headwear",
    available: true,
  },
  {
    id: "window-cling",
    name: "Storefront Window Cling",
    description: "For the shops that carry us. Coastal logo, removable vinyl. Let them know.",
    badge: "Signage",
    available: true,
  },
];

const PRINTIFY_URL = "https://printify.me/coastal-brewing";

export default function MerchPage() {
  return (
    <>
      <Nav />
      <main className="container py-16">
        <div className="mb-14 max-w-2xl">
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Coastal Merch</p>
          <h1 className="mt-2 font-display text-4xl font-semibold md:text-5xl">
            Wear the coast.
          </h1>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground">
            Branded goods for the Lowcountry lifestyle. Every piece is built around the same
            standard as the coffee — nothing cheap, nothing generic, nothing that doesn&apos;t
            belong on a porch in Bluffton or a counter in Savannah.
          </p>
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-border/60 bg-card/40 px-4 py-3 text-sm text-muted-foreground">
            <Package className="h-4 w-4 shrink-0" />
            <span>Merch ships separately from coffee orders. Fulfilled via our print-on-demand partner.</span>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {MERCH_ITEMS.map((item) => (
            <article
              key={item.id}
              className="group flex flex-col rounded-2xl border border-border/60 bg-card/40 p-6 transition-all hover:border-foreground/20 hover:shadow-lg"
            >
              <div className="mb-4 flex aspect-square items-center justify-center rounded-lg border border-border/40 bg-secondary/60 text-6xl text-muted-foreground/20">
                <span className="font-display text-7xl font-semibold tracking-tight text-foreground/10">
                  {item.id.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <Badge variant="muted" className="mb-3 w-fit uppercase tracking-widest">
                {item.badge}
              </Badge>
              <h2 className="font-display text-xl font-semibold">{item.name}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
              <Button asChild variant="accent" size="sm" className="mt-6">
                <a href={PRINTIFY_URL} target="_blank" rel="noopener noreferrer">
                  Shop now <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                </a>
              </Button>
            </article>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-accent/20 bg-accent/5 px-8 py-10 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Custom Orders</p>
          <h2 className="mt-3 font-display text-2xl font-semibold md:text-3xl">
            Need branded merch for your shop or event?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Coffee shops, pop-up vendors, corporate gifting, and hospitality partners — we do
            custom runs. Write us with your volume, product type, and timeline.
          </p>
          <Button asChild variant="accent" size="lg" className="mt-6">
            <a href="mailto:bpo@achievemor.io?subject=Merch%20Inquiry">
              Get in touch
            </a>
          </Button>
        </div>
      </main>
      <Footer />
    </>
  );
}
