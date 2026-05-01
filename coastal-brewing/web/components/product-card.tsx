import Image from "next/image";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { Product } from "@/lib/api";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Card
      itemScope
      itemType="https://schema.org/Product"
      className="group flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:border-accent/60"
    >
      <Link href={`/products/${product.sku}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-secondary">
          <Image
            src={product.image || "/static/mock-dark.png"}
            alt={product.name}
            itemProp="image"
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </div>
      </Link>
      <CardContent className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground" itemProp="category">
            {product.category}
          </p>
          {product.motto_eligible && (
            <span
              className="rounded-full bg-accent/10 px-2 py-[2px] font-mono text-[9px] uppercase tracking-widest text-accent"
              title="Nothing Chemically, Ever."
            >
              ◈ Nothing Chemically
            </span>
          )}
          {product.compliance_lane === "mushroom_strict" && (
            <span
              className="rounded-full bg-secondary/40 px-2 py-[2px] font-mono text-[9px] uppercase tracking-widest text-foreground"
              title="Sold as a food, not a supplement"
            >
              Food, not supplement
            </span>
          )}
        </div>
        <Link href={`/products/${product.sku}`} className="hover:text-accent">
          <h3 className="font-display text-lg font-semibold leading-tight" itemProp="name">{product.name}</h3>
        </Link>
        {product.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground" itemProp="description">{product.description}</p>
        )}
        <p
          className="mt-auto pt-2 font-mono text-base font-semibold"
          itemProp="offers"
          itemScope
          itemType="https://schema.org/Offer"
        >
          <span itemProp="priceCurrency" content="USD">$</span>
          <span itemProp="price">{product.msrp.toFixed(2)}</span>
          <span className="ml-1 text-xs font-normal text-muted-foreground">/ {product.unit}</span>
        </p>
      </CardContent>
      <CardFooter className="gap-2 p-5 pt-0">
        <Button asChild variant="accent" size="sm" className="flex-1">
          <Link href={`/products/${product.sku}`}>View</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/chat?sku=${product.sku}`}><MessageSquare className="h-3.5 w-3.5" /> Ask</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
