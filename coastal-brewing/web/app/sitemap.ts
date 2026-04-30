import type { MetadataRoute } from "next";
import { api } from "@/lib/api";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://brewing.foai.cloud";
  const fixed: MetadataRoute.Sitemap = [
    { url: `${base}/`, priority: 1.0 },
    { url: `${base}/products`, priority: 0.9 },
    { url: `${base}/team`, priority: 0.7 },
    { url: `${base}/chat`, priority: 0.6 },
    { url: `${base}/about`, priority: 0.5 },
    { url: `${base}/contact`, priority: 0.6 },
    { url: `${base}/policies`, priority: 0.4 },
    { url: `${base}/policies/shipping`, priority: 0.4 },
    { url: `${base}/policies/refund`, priority: 0.4 },
    { url: `${base}/policies/delivery-responsibility`, priority: 0.3 },
    { url: `${base}/policies/privacy`, priority: 0.4 },
    { url: `${base}/policies/terms`, priority: 0.4 },
    { url: `${base}/policies/label-claims`, priority: 0.4 },
    { url: `${base}/policies/health-disclaimer`, priority: 0.3 },
    { url: `${base}/policies/prop-65`, priority: 0.3 },
    { url: `${base}/policies/accessibility`, priority: 0.3 },
  ];
  try {
    const { products } = await api.catalog();
    return [...fixed, ...products.map((p) => ({ url: `${base}/products/${p.sku}`, priority: 0.8 }))];
  } catch {
    return fixed;
  }
}
