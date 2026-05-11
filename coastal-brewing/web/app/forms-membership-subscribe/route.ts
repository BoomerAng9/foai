import { NextRequest, NextResponse } from "next/server";

/**
 * Server-only proxy to coastal-runner /api/membership/subscribe.
 *
 * Path lives OUTSIDE /api/* on purpose — host nginx routes every /api/*
 * request directly to coastal-runner, which bypasses this Next.js route
 * and means the runner sees no X-Coastal-Token (→ 401). Putting the
 * proxy at /forms-membership-subscribe keeps it inside the Next.js
 * default-/ rewrite group so this handler runs and can inject the
 * gateway token before hitting the runner.
 *
 * X-Coastal-Token never reaches the browser.
 */
const RUNNER_BASE = process.env.COASTAL_RUNNER_INTERNAL || "http://coastal-runner:8080";
const TOKEN = process.env.COASTAL_GATEWAY_TOKEN || "";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALID_SKUS = new Set([
  "coastal-tea-monthly",
  "coastal-coffee-monthly",
  "coastal-functional-coffee-monthly",
  "coastal-combo-monthly",
]);

const VALID_CADENCES = new Set(["monthly", "3mo", "6mo", "9mo"]);

interface SubscribeBody {
  email: string;
  sku: string;
  cadence?: string;
}

export async function POST(req: NextRequest) {
  if (!TOKEN) {
    return NextResponse.json(
      { error: "Subscription checkout is not configured. Owner: set COASTAL_GATEWAY_TOKEN on coastal-web." },
      { status: 503 },
    );
  }

  let body: Partial<SubscribeBody>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const sku = String(body.sku ?? "").trim().toLowerCase();
  const cadence = String(body.cadence ?? "monthly").trim().toLowerCase();

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }
  if (!VALID_SKUS.has(sku)) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }
  if (!VALID_CADENCES.has(cadence)) {
    return NextResponse.json({ error: "Invalid cadence" }, { status: 400 });
  }

  let runnerRes: Response;
  try {
    runnerRes = await fetch(`${RUNNER_BASE}/api/membership/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Coastal-Token": TOKEN },
      body: JSON.stringify({ email, sku, cadence }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "Coastal runner unreachable. Try again in a moment." },
      { status: 502 },
    );
  }

  const runnerJson = (await runnerRes.json().catch(() => ({}))) as {
    ok?: boolean;
    redirect_url?: string;
    intent_id?: string;
    total_cents?: number;
    detail?: unknown;
  };

  if (!runnerRes.ok || !runnerJson.redirect_url) {
    return NextResponse.json(
      {
        error: "Could not start checkout",
        runner_status: runnerRes.status,
        detail: runnerJson?.detail ?? null,
      },
      { status: runnerRes.status === 503 ? 503 : 502 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      redirect_url: runnerJson.redirect_url,
      intent_id: runnerJson.intent_id,
      total_cents: runnerJson.total_cents,
    },
    { status: 200 },
  );
}
