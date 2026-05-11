import { NextRequest, NextResponse } from "next/server";

/**
 * Server-only proxy for Wood Stork checkout mint.
 *
 * Path lives OUTSIDE /api/* on purpose — host nginx routes every /api/*
 * directly to coastal-runner, bypassing Next.js. This handler at
 * /forms/membership/wood-stork/checkout falls through to the default
 * coastal-web rule so it actually runs and injects the gateway token.
 */
const RUNNER_BASE = process.env.COASTAL_RUNNER_INTERNAL || "http://coastal-runner:8080";
const TOKEN = process.env.COASTAL_GATEWAY_TOKEN || "";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_TIERS = new Set(["standard", "reserve"]);
const VALID_CADENCES = new Set(["monthly", "3mo", "6mo", "9mo"]);
const VALID_PRODUCTS = new Set(["bulk-coffee", "bulk-tea", "multi-location", "whitelabel"]);

interface CheckoutBody {
  email: string;
  business_name: string;
  tier: string;
  cadence?: string;
  products?: string[];
}

export async function POST(req: NextRequest) {
  if (!TOKEN) {
    return NextResponse.json(
      { error: "Wood Stork checkout not configured. Owner: set COASTAL_GATEWAY_TOKEN." },
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
  const businessName = String(body.business_name ?? "").trim();
  const tier = String(body.tier ?? "").trim().toLowerCase();
  const cadence = String(body.cadence ?? "9mo").trim().toLowerCase();
  const products = Array.isArray(body.products)
    ? body.products.map((p) => String(p).trim().toLowerCase()).filter(Boolean)
    : [];

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }
  if (!businessName) {
    return NextResponse.json({ error: "Business name required" }, { status: 400 });
  }
  if (!VALID_TIERS.has(tier)) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }
  if (!VALID_CADENCES.has(cadence)) {
    return NextResponse.json({ error: "Invalid cadence" }, { status: 400 });
  }
  const invalid = products.filter((p) => !VALID_PRODUCTS.has(p));
  if (invalid.length) {
    return NextResponse.json({ error: `Invalid products: ${invalid.join(", ")}` }, { status: 400 });
  }
  if (tier === "standard" && products.includes("whitelabel")) {
    return NextResponse.json(
      { error: "Whitelabel is Wood Stork Reserve only" },
      { status: 400 },
    );
  }

  let runnerRes: Response;
  try {
    runnerRes = await fetch(`${RUNNER_BASE}/api/membership/wood-stork/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Coastal-Token": TOKEN },
      body: JSON.stringify({ email, business_name: businessName, tier, cadence, products }),
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
      total_cents: runnerJson.total_cents,
      cadence: runnerJson.cadence,
      products: runnerJson.products,
    },
    { status: 200 },
  );
}
