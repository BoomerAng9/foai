// Server-aware base URL.
// - Browser: empty base — same-origin fetches; nginx routes /api/* to runner.
// - Server (SSR / Route Handlers): direct internal Docker DNS to bypass nginx,
//   otherwise the fetch lands on coastal-web's own Next.js server and 404s.
function resolveBase(): string {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_API_BASE || "";
  }
  return process.env.COASTAL_RUNNER_INTERNAL || "http://coastal-runner:8080";
}

export type ProductCategory =
  | "coffee"
  | "flavored_coffee"
  | "specialty_coffee"
  | "tea"
  | "matcha"
  | "kcup"
  | "instant"
  | "functional"
  | "sample_pack"
  | "bundle"
  | "subscription";

export type Product = {
  sku: string;
  name: string;
  category: ProductCategory;
  msrp: number;
  unit: string;
  description?: string;
  image?: string;
  certifications?: string[];
  flavor_notes?: string;
  roast_level?: string;
  tags?: string[];
  /**
   * Per-product brand-promise flag. True ⇒ "Nothing Chemically, Ever."
   * applies to this SKU. False ⇒ motto must NOT appear on this product
   * surface. Derived server-side in `catalog._derive_motto_eligibility`
   * from category + ingredients. Owner directive 2026-04-30.
   */
  motto_eligible?: boolean;
  /**
   * Strict-compliance lane (TCR labelling). Currently the only value
   * is "mushroom_strict" — applies to the 5 functional/mushroom SKUs.
   * Triggers per-page rendering of the locked statement-of-identity +
   * soft-qualifier benefit copy. Per `temecula-supplier-docs/mushroom_coffee.txt`.
   */
  compliance_lane?: "mushroom_strict" | string;
};

export type ChatMessage = {
  role: "user" | "agent";
  agent?: "sales" | "marketing";
  content: string;
  toolTrace?: { tool: string; status: "running" | "ok" | "blocked"; detail?: string }[];
  ts: number;
};

// Runner catalog response uses id/size/blurb. Map to Product (sku/unit/description).
interface RunnerCatalogItem {
  id?: string;
  name: string;
  category: ProductCategory;
  size?: string;
  msrp: number;
  blurb?: string;
  description?: string;
  image?: string;
  unit?: string;
  sku?: string;
  certifications?: string[];
  flavor_notes?: string;
  roast_level?: string;
  tags?: string[];
  motto_eligible?: boolean;
  compliance_lane?: string;
}

function normalize(item: RunnerCatalogItem, fallbackId?: string): Product {
  return {
    sku: item.sku || item.id || fallbackId || "",
    name: item.name,
    category: item.category,
    msrp: item.msrp,
    unit: item.unit || item.size || "each",
    description: item.description || item.blurb,
    image: item.image,
    certifications: item.certifications,
    flavor_notes: item.flavor_notes,
    roast_level: item.roast_level,
    tags: item.tags,
    motto_eligible: item.motto_eligible,
    compliance_lane: item.compliance_lane,
  };
}

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${resolveBase()}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json() as Promise<T>;
}

export const api = {
  catalog: async () => {
    const raw = await getJson<{ products: RunnerCatalogItem[] }>("/api/catalog");
    return { products: (raw.products || []).map((p) => normalize(p)) };
  },
  product: async (slug: string) => {
    const raw = await getJson<RunnerCatalogItem>(`/api/catalog/${slug}`);
    return normalize(raw, slug);
  },
  recommend: async (intent: { category?: string; budget?: number; flavor?: string }) => {
    const raw = await getJson<{ bundle: RunnerCatalogItem[]; rationale: string }>("/api/recommend", {
      method: "POST",
      body: JSON.stringify(intent),
    });
    return { bundle: (raw.bundle || []).map((p) => normalize(p)), rationale: raw.rationale };
  },
  chatSend: (msg: { content: string; agent?: "sales" | "marketing"; session_id?: string }) =>
    getJson<{ reply: ChatMessage; session_id: string }>("/api/chat/send", {
      method: "POST",
      body: JSON.stringify(msg),
    }),
  health: () => getJson<{ status: string }>("/healthz"),
};
