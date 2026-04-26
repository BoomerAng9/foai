import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { ChatPanel } from "@/components/chat-panel";
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
          <div className="aspect-square overflow-hidden rounded-lg border border-border bg-secondary">
            <img src={product.image || "/static/mock-dark.png"} alt={product.name} className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-col">
            <Badge variant="muted" className="w-fit uppercase tracking-widest">{product.category}</Badge>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight md:text-5xl">{product.name}</h1>
            <p className="mt-4 text-base text-muted-foreground">{product.description || "Sourced with care."}</p>
            <p className="mt-6 font-mono text-2xl font-semibold">
              ${product.msrp.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">/ {product.unit}</span>
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" variant="accent">Add to cart</Button>
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
