import Image from "next/image";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { ChatPanel } from "@/components/chat-panel";
import { OrderButton } from "@/components/order-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, type Product } from "@/lib/api";
import { notFound } from "next/navigation";

export const revalidate = 300;

async function getProduct(slug: string): Promise<Product | null> {
  try {
    return await api.product(slug);
  } catch {
    return null;
  }
}

export default async function ProductDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  return (
    <>
      <Nav />
      <main className="container py-12">
        <Link href="/products" className="font-mono text-xs text-muted-foreground hover:text-accent">
          ← Back to catalog
        </Link>
        <div className="mt-6 grid gap-12 lg:grid-cols-2">
          <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-border bg-secondary">
            <Image
              src={product.image || "/products/coastal-blend-12oz.png"}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
              className="object-cover object-top"
            />
          </div>
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="muted" className="uppercase tracking-widest">{product.category}</Badge>
              {product.motto_eligible && (
                <Badge
                  variant="muted"
                  className="border-accent/40 bg-accent/10 uppercase tracking-widest text-accent"
                  title="Brand promise applies to this SKU"
                >
                  ◈ Nothing Chemically, Ever.
                </Badge>
              )}
              {product.compliance_lane === "mushroom_strict" && (
                <Badge
                  variant="muted"
                  className="border-foreground/30 uppercase tracking-widest"
                >
                  Sold as a food, not a supplement
                </Badge>
              )}
            </div>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight md:text-5xl">{product.name}</h1>

            {/* Conditional brand-promise copy per `motto_eligible` flag.
                Owner directives: (a) "Nothing Chemically, Ever." applies
                per-product on motto_eligible SKUs only — catalog also
                carries flavored / functional / K-cup lines that can't
                honestly carry the motto. (b) 2026-05-02 — retired the
                "Every cup..." line entirely. */}
            {product.motto_eligible ? (
              <p className="mt-3 font-mono text-xs uppercase tracking-widest text-accent/80">
                Nothing Chemically, Ever.
              </p>
            ) : product.compliance_lane === "mushroom_strict" ? (
              <p className="mt-3 text-sm text-muted-foreground">
                <strong className="text-foreground">Statement of identity:</strong>{" "}
                Ground Coffee with Mushrooms. Sold as a food, never a supplement.
              </p>
            ) : product.category === "flavored_coffee" ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Hand-blended with natural flavorings — every ingredient on the label.
              </p>
            ) : product.category === "kcup" ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Single-serve convenience. Full ingredient list on the box.
              </p>
            ) : null}

            <p className="mt-4 text-base text-muted-foreground">{product.description || "Sourced with care."}</p>

            {/* Mushroom strict-lane: required ingredient list + soft-qualifier
                framing (per TCR `mushroom_coffee.txt`). Therapeutic claims
                are FORBIDDEN — TCR will suspend fulfillment if violated. */}
            {product.compliance_lane === "mushroom_strict" && (
              <div className="mt-6 rounded-lg border border-border bg-card p-4 text-sm">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                  Ingredients
                </p>
                <p className="text-foreground">
                  Coffee, Lion&apos;s Mane Mushroom Powder, Cordyceps Mushroom Powder,
                  Reishi Mushroom Powder
                </p>
                <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                  Lion&apos;s Mane, Cordyceps, and Reishi have been used in food cultures
                  for centuries — long valued for adding depth and character. We sell this
                  as a food product, not a dietary supplement. We make no health,
                  therapeutic, or supplement claims.{" "}
                  <Link href="/policies/health-disclaimer" className="underline hover:text-foreground">
                    Health disclaimer.
                  </Link>
                </p>
              </div>
            )}

            <p className="mt-6 font-mono text-2xl font-semibold">
              ${product.msrp.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">/ {product.unit}</span>
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <OrderButton
                sku={product.sku}
                productName={product.name}
                unit={product.unit}
                msrp={product.msrp}
              />
              <Button asChild size="lg" variant="ghost">
                <Link href={`/chat?sku=${product.sku}`}>Ask the team</Link>
              </Button>
            </div>
            <div className="mt-12 h-[420px]">
              <ChatPanel initialAgent="sales" contextSku={product.sku} />
            </div>
          </div>
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              name: product.name,
              description: product.description,
              image: product.image,
              category: product.category,
              brand: { "@type": "Brand", name: "Coastal Brewing Co." },
              offers: {
                "@type": "Offer",
                price: product.msrp,
                priceCurrency: "USD",
                availability: "https://schema.org/InStock",
                url: `https://brewing.foai.cloud/products/${product.sku}`,
              },
            }),
          }}
        />
      </main>
      <Footer />
    </>
  );
}
