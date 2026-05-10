const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

export type LiveLookInMode = "live" | "fallback_video" | "static" | "disabled";

export type LiveLookInSession = {
  session_id: string;
  agent: "sales" | "marketing";
  mode: LiveLookInMode;
  viewer_url: string | null;
  poster: string | null;
  provider: string | null;
  message: string;
  ts: number;
};

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json() as Promise<T>;
}

async function getJson<T>(path: string): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json() as Promise<T>;
}

async function deleteJson<T>(path: string): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, { method: "DELETE", cache: "no-store" });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json() as Promise<T>;
}

export const liveLookIn = {
  create: (agent: "sales" | "marketing") =>
    postJson<LiveLookInSession>("/api/livelookin/session", { agent }),
  status: (sessionId: string) =>
    getJson<LiveLookInSession>(`/api/livelookin/session/${sessionId}`),
  end: (sessionId: string) =>
    deleteJson<{ session_id: string; ended: boolean; ts: number }>(
      `/api/livelookin/session/${sessionId}`
    ),
};

export const isLiveLookInEnabled = () =>
  process.env.NEXT_PUBLIC_LIVELOOKIN_ENABLED === "true";
