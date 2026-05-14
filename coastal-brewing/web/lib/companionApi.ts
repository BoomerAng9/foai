// Typed wrappers around /api/v1/companion/* endpoints.

export type WorkspaceMe = {
  ok: boolean;
  coastal_uid: string;
  taskade_workspace_id: string | null;
  is_paid_tier: boolean;
};

export type SessionStartResp = {
  ok: boolean;
  session_id: string;
  tier: "free" | "paid";
  ws_url: string;
};

export type SessionListRow = {
  session_id: string;
  started_at: number;
  ended_at: number | null;
  source_lang: string;
  target_lang: string;
  minutes_used: number;
  tier_at_start: "free" | "paid";
};

export async function getWorkspaceMe(): Promise<WorkspaceMe> {
  const r = await fetch("/api/v1/companion/workspace/me", { credentials: "include" });
  if (!r.ok) throw new Error(`workspace/me failed: ${r.status}`);
  return r.json();
}

export async function postByokKey(vendor: "inworld" | "openai", apiKey: string): Promise<void> {
  const r = await fetch("/api/v1/companion/byok/key", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ vendor, api_key: apiKey }),
  });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body.detail ?? `byok store failed: ${r.status}`);
  }
}

export async function deleteByokKey(vendor: "inworld" | "openai"): Promise<void> {
  const r = await fetch(`/api/v1/companion/byok/key?vendor=${vendor}`, {
    method: "DELETE", credentials: "include",
  });
  if (!r.ok) throw new Error(`byok delete failed: ${r.status}`);
}

export async function startSession(sourceLang: string, targetLang: string): Promise<SessionStartResp> {
  const r = await fetch("/api/v1/companion/session/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ source_lang: sourceLang, target_lang: targetLang }),
  });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body.detail ?? `session start failed: ${r.status}`);
  }
  return r.json();
}

export async function endSession(sessionId: string, minutesUsed: number): Promise<void> {
  const r = await fetch(`/api/v1/companion/session/${sessionId}/end`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ minutes_used: minutesUsed }),
  });
  if (!r.ok) throw new Error(`session end failed: ${r.status}`);
}

export async function listSessions(limit = 50): Promise<{ sessions: SessionListRow[]; limit: number }> {
  const r = await fetch(`/api/v1/companion/sessions?limit=${limit}`, { credentials: "include" });
  if (!r.ok) throw new Error(`sessions list failed: ${r.status}`);
  return r.json();
}

export async function postNotes(sessionId: string, transcriptText: string, title: string): Promise<{
  ok: boolean; session_id: string; taskade_doc_id: string; taskade_mindmap_id: string | null;
}> {
  const r = await fetch(`/api/v1/companion/notes/${sessionId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ transcript_text: transcriptText, title }),
  });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body.detail ?? `notes failed: ${r.status}`);
  }
  return r.json();
}

export async function startBillingCheckout(email: string): Promise<{ ok: boolean; session_id: string; redirect_url: string }> {
  const r = await fetch("/api/v1/companion/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email }),
  });
  if (!r.ok) throw new Error(`checkout failed: ${r.status}`);
  return r.json();
}

export async function openBillingPortal(): Promise<{ ok: boolean; url: string }> {
  const r = await fetch("/api/v1/companion/billing/portal", {
    method: "POST", credentials: "include",
  });
  if (!r.ok) throw new Error(`portal failed: ${r.status}`);
  return r.json();
}
