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

export type Product = {
  sku: string;
  name: string;
  category: "coffee" | "tea" | "matcha" | "bundle" | "subscription";
  msrp: number;
  unit: string;
  description?: string;
  image?: string;
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
  category: Product["category"];
  size?: string;
  msrp: number;
  blurb?: string;
  description?: string;
  image?: string;
  unit?: string;
  sku?: string;
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
