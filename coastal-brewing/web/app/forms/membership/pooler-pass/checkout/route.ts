import { NextRequest, NextResponse } from "next/server";

/**
 * Server-only proxy for Pooler Pass checkout mint.
 *
 * Path lives OUTSIDE /api/* on purpose — host nginx routes every /api/*
 * directly to coastal-runner, bypassing Next.js. This handler at
 * /forms/membership/pooler-pass/checkout falls through to the default
 * coastal-web rule so it actually runs and injects the gateway token.
 */
const RUNNER_BASE = process.env.COASTAL_RUNNER_INTERNAL || "http://coastal-runner:8080";
const TOKEN = process.env.COASTAL_GATEWAY_TOKEN || "";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ZIP_RE = /^\d{5}$/;
const VALID_TIERS = new Set(["standard", "plus"]);
const VALID_CADENCES = new Set(["monthly", "3mo", "6mo", "9mo"]);
const VALID_PRODUCTS = new Set(["tea", "coffee", "functional-coffee", "combo"]);

interface CheckoutBody {
  email: string;
  zip: string;
  tier: string;
  cadence?: string;
  products?: string[];
}

export async function POST(req: NextRequest) {
  if (!TOKEN) {
    return NextResponse.json(
      { error: "Pooler Pass checkout not configured. Owner: set COASTAL_GATEWAY_TOKEN." },
      { status: 503 },
    );
  }

  let body: Partial<CheckoutBody>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const zip = String(body.zip ?? "").trim();
  const tier = String(body.tier ?? "").trim().toLowerCase();
  const cadence = String(body.cadence ?? "9mo").trim().toLowerCase();
  const products = Array.isArray(body.products)
    ? body.products.map((p) => String(p).trim().toLowerCase()).filter(Boolean)
    : [];

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }
  if (!ZIP_RE.test(zip)) {
    return NextResponse.json({ error: "ZIP must be 5 digits" }, { status: 400 });
  }
  if (!VALID_TIERS.has(tier)) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }
  if (!VALID_CADENCES.has(cadence)) {
    return NextResponse.json({ error: "Invalid cadence" }, { status: 400 });
  }
  if (products.length === 0) {
    return NextResponse.json({ error: "Select at least one product" }, { status: 400 });
  }
  const invalid = products.filter((p) => !VALID_PRODUCTS.has(p));
  if (invalid.length) {
    return NextResponse.json({ error: `Invalid products: ${invalid.join(", ")}` }, { status: 400 });
  }

  let runnerRes: Response;
  try {
    runnerRes = await fetch(`${RUNNER_BASE}/api/membership/pooler-pass/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Coastal-Token": TOKEN },
      body: JSON.stringify({ email, zip, tier, cadence, products }),
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
    monthly_billing_cents?: number;
    cadence?: string;
    products?: string[];
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
      monthly_billing_cents: runnerJson.monthly_billing_cents,
      cadence: runnerJson.cadence,
      products: runnerJson.products,
    },
    { status: 200 },
  );
}
