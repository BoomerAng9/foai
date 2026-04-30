"use client";
import Link from "next/link";
import Image from "next/image";
import * as React from "react";
import type { Product } from "@/lib/api";

const CATEGORY_LABEL: Record<Product["category"], string> = {
  coffee: "Coffee",
  flavored_coffee: "Flavored",
  specialty_coffee: "Specialty",
  tea: "Tea",
  matcha: "Matcha",
  kcup: "K-Cup",
  instant: "Instant",
  functional: "Functional",
  sample_pack: "Sampler",
  bundle: "Bundle",
  subscription: "Subscription",
};

const PLACEHOLDER_BY_CAT: Record<Product["category"], string> = {
  coffee: "/products/coastal-blend-12oz.png",
  flavored_coffee: "/products/coastal-blend-12oz.png",
  specialty_coffee: "/products/coastal-blend-12oz.png",
  tea: "/products/lowcountry-tea-jasmine-green-2oz.png",
  matcha: "/products/coastal-matcha-ceremonial-30g.png",
  kcup: "/products/coastal-blend-12oz.png",
  instant: "/products/coastal-blend-12oz.png",
  functional: "/products/coastal-blend-12oz.png",
  sample_pack: "/products/coastal-discovery-bundle.png",
  bundle: "/products/coastal-discovery-bundle.png",
  subscription: "/products/coastal-coffee-monthly.png",
};

export function ShelfCard({ product }: { product: Product }) {
  const [imgErr, setImgErr] = React.useState(false);
  const src = imgErr || !product.image
    ? PLACEHOLDER_BY_CAT[product.category]
    : product.image;

  return (
    <Link
      href={`/products/${product.sku}`}
      className="group relative flex w-44 shrink-0 flex-col overflow-visible"
    >
      {/* Card body — lifts on hover */}
      <div className="relative aspect-[4/5] w-44 overflow-hidden rounded-md border border-border/60 bg-card shadow-sm transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-xl">
        <Image
          src={src}
          alt={product.name}
          fill
          sizes="180px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          onError={() => setImgErr(true)}
        />
        {/* Category chip */}
        <span className="absolute left-2 top-2 rounded-sm bg-background/85 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-widest text-muted-foreground backdrop-blur">
          {CATEGORY_LABEL[product.category]}
        </span>
        {/* Hover overlay — flavor + cert + price */}
        <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-foreground/95 via-foreground/85 to-foreground/0 px-3 py-3 text-background opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          {product.flavor_notes && (
            <p className="line-clamp-3 text-[11px] leading-snug">
              {product.flavor_notes}
            </p>
          )}
          {product.certifications && product.certifications.length > 0 && (
            <p className="mt-1.5 font-mono text-[8px] uppercase tracking-widest text-background/70">
              {product.certifications.join(" · ")}
            </p>
          )}
        </div>
      </div>
      {/* Below-card label — name + price */}
      <div className="mt-2 px-1">
        <p className="line-clamp-2 font-display text-sm font-semibold leading-tight text-foreground group-hover:text-accent">
          {product.name}
        </p>
        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
          ${product.msrp.toFixed(2)}
          <span className="ml-1 text-[10px]">/ {product.unit}</span>
        </p>
      </div>
    </Link>
  );
}
