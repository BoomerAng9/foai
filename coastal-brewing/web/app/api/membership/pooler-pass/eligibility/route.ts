import { NextRequest, NextResponse } from "next/server";

// Server-only. The X-Coastal-Token never reaches the browser.
const RUNNER_BASE = process.env.COASTAL_RUNNER_INTERNAL || "http://coastal-runner:8080";
const TOKEN = process.env.COASTAL_GATEWAY_TOKEN || "";

const ZIP_RE = /^\d{5}$/;

interface EligibilityBody {
  zip: string;
}

export async function POST(req: NextRequest) {
  if (!TOKEN) {
    return NextResponse.json(
      { error: "Pooler Pass eligibility check is not configured. Owner: set COASTAL_GATEWAY_TOKEN on coastal-web." },
      { status: 503 },
    );
  }

  let body: Partial<EligibilityBody>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const zip = String(body.zip ?? "").trim();
  if (!ZIP_RE.test(zip)) {
    return NextResponse.json({ error: "ZIP must be a 5-digit code" }, { status: 400 });
  }

  let runnerRes: Response;
  try {
    runnerRes = await fetch(`${RUNNER_BASE}/api/membership/pooler-pass/eligibility`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Coastal-Token": TOKEN },
      body: JSON.stringify({ zip }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "Coastal runner unreachable. Try again in a moment." },
      { status: 502 },
    );
  }

  const runnerJson = await runnerRes.json().catch(() => ({}));

  if (!runnerRes.ok) {
    return NextResponse.json(
      { error: "Eligibility check failed", runner_status: runnerRes.status, detail: runnerJson },
      { status: runnerRes.status === 503 ? 503 : 502 },
    );
  }

  return NextResponse.json(runnerJson, { status: 200 });
}
