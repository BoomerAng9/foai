const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

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

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json() as Promise<T>;
}

export const api = {
  catalog: () => getJson<{ products: Product[] }>("/api/catalog"),
  product: (slug: string) => getJson<Product>(`/api/catalog/${slug}`),
  recommend: (intent: { category?: string; budget?: number; flavor?: string }) =>
    getJson<{ bundle: Product[]; rationale: string }>("/api/recommend", {
      method: "POST",
      body: JSON.stringify(intent),
    }),
  chatSend: (msg: { content: string; agent?: "sales" | "marketing"; session_id?: string }) =>
    getJson<{ reply: ChatMessage; session_id: string }>("/api/chat/send", {
      method: "POST",
      body: JSON.stringify(msg),
    }),
  health: () => getJson<{ status: string }>("/healthz"),
};
