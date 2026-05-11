import { NextRequest, NextResponse } from "next/server";

const RUNNER_BASE = process.env.COASTAL_RUNNER_INTERNAL || "http://coastal-runner:8080";
const TOKEN = process.env.COASTAL_GATEWAY_TOKEN || "";

const ALLOWED_TIERS = new Set(["standard", "reserve"]);

export async function GET(req: NextRequest) {
  if (!TOKEN) {
    return NextResponse.json(
      { error: "Wood Stork cadence pricing not configured. Owner: set COASTAL_GATEWAY_TOKEN on coastal-web." },
      { status: 503 },
    );
  }

  const tier = (req.nextUrl.searchParams.get("tier") || "").trim().toLowerCase();
  if (!ALLOWED_TIERS.has(tier)) {
    return NextResponse.json({ error: "Tier must be 'standard' or 'reserve'" }, { status: 400 });
  }

  let runnerRes: Response;
  try {
    runnerRes = await fetch(
      `${RUNNER_BASE}/api/membership/wood-stork/cadence-pricing?tier=${encodeURIComponent(tier)}`,
      {
        method: "GET",
        headers: { "X-Coastal-Token": TOKEN },
        cache: "no-store",
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Coastal runner unreachable. Try again in a moment." },
      { status: 502 },
    );
  }

  const runnerJson = await runnerRes.json().catch(() => ({}));
  if (!runnerRes.ok) {
    return NextResponse.json(
      { error: "Cadence pricing fetch failed", runner_status: runnerRes.status, detail: runnerJson },
      { status: runnerRes.status === 503 ? 503 : 502 },
    );
  }
  return NextResponse.json(runnerJson, { status: 200 });
}
