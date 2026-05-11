import { NextRequest, NextResponse } from "next/server";

// Server-only. The X-Coastal-Token never reaches the browser.
const RUNNER_BASE = process.env.COASTAL_RUNNER_INTERNAL || "http://coastal-runner:8080";
const TOKEN = process.env.COASTAL_GATEWAY_TOKEN || "";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_TIERS = new Set(["standard", "reserve"]);

interface CheckoutBody {
  email: string;
  business_name: string;
  tier: string;
}

export async function POST(req: NextRequest) {
  if (!TOKEN) {
    return NextResponse.json(
      { error: "Wood Stork checkout is not configured. Owner: set COASTAL_GATEWAY_TOKEN on coastal-web." },
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

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }
  if (!businessName) {
    return NextResponse.json({ error: "Business name is required" }, { status: 400 });
  }
  if (!ALLOWED_TIERS.has(tier)) {
    return NextResponse.json({ error: "Tier must be 'standard' or 'reserve'" }, { status: 400 });
  }

  let runnerRes: Response;
  try {
    runnerRes = await fetch(`${RUNNER_BASE}/api/membership/wood-stork/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Coastal-Token": TOKEN },
      body: JSON.stringify({ email, business_name: businessName, tier }),
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
    { ok: true, redirect_url: runnerJson.redirect_url },
    { status: 200 },
  );
}
