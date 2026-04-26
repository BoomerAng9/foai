import type { MetadataRoute } from "next";
import { api } from "@/lib/api";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://brewing.foai.cloud";
  const fixed: MetadataRoute.Sitemap = [
    { url: `${base}/`, priority: 1.0 },
    { url: `${base}/products`, priority: 0.9 },
    { url: `${base}/team`, priority: 0.7 },
    { url: `${base}/chat`, priority: 0.6 },
  ];
  try {
    const { products } = await api.catalog();
    return [...fixed, ...products.map((p) => ({ url: `${base}/products/${p.sku}`, priority: 0.8 }))];
  } catch {
    return fixed;
  }
}
