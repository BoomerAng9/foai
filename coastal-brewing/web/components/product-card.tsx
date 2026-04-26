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
        <div className="aspect-square overflow-hidden bg-secondary">
          <img
            src={product.image || "/static/mock-dark.png"}
            alt={product.name}
            itemProp="image"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </div>
      </Link>
      <CardContent className="flex flex-1 flex-col gap-2 p-5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground" itemProp="category">
          {product.category}
        </p>
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
