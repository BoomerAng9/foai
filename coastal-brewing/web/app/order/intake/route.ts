import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

// Server-only. The X-Coastal-Token never reaches the browser.
const RUNNER_BASE = process.env.COASTAL_RUNNER_INTERNAL || "http://coastal-runner:8080";
const TOKEN = process.env.COASTAL_GATEWAY_TOKEN || "";

interface IntakeBody {
  sku: string;
  product_name?: string;
  customer_email: string;
  customer_name: string;
  shipping_address: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  quantity: number;
  delivery_window_preference?: string;
  gift_message?: string;
  consent_to_receive_email: boolean;
}

const REQUIRED: (keyof IntakeBody)[] = [
  "sku",
  "customer_email",
  "customer_name",
  "shipping_address",
  "shipping_city",
  "shipping_state",
  "shipping_postal_code",
  "quantity",
  "consent_to_receive_email",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(body: Partial<IntakeBody>): { ok: true; body: IntakeBody } | { ok: false; error: string } {
  for (const k of REQUIRED) {
    const v = body[k];
    if (v === undefined || v === null || v === "" || (k === "consent_to_receive_email" && v !== true)) {
      return { ok: false, error: `Missing or invalid required field: ${k}` };
    }
  }
  if (!EMAIL_RE.test(String(body.customer_email))) {
    return { ok: false, error: "Invalid email address" };
  }
  const qty = Number(body.quantity);
  if (!Number.isFinite(qty) || qty < 1 || qty > 99) {
    return { ok: false, error: "Quantity must be between 1 and 99" };
  }
  if (body.gift_message && String(body.gift_message).length > 280) {
    return { ok: false, error: "Gift message must be 280 characters or fewer" };
  }
  return { ok: true, body: { ...body, quantity: qty } as IntakeBody };
}

export async function POST(req: NextRequest) {
  if (!TOKEN) {
    return NextResponse.json(
      { error: "Order intake is not configured. Owner: set COASTAL_GATEWAY_TOKEN on coastal-web." },
      { status: 503 },
    );
  }

  let body: Partial<IntakeBody>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const v = validate(body);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  const f = v.body;

  const taskId = `order_${randomUUID()}`;
  const packet = {
    task_id: taskId,
    owner_goal: "Process new customer order",
    objective: `New order: ${f.product_name || f.sku} x${f.quantity} for ${f.customer_email}`,
    department: "boomer_ops",
    task_type: "draft_order_confirmation",
    risk_tags: ["money"],
    approval_required: true,
    desired_output:
      "draft confirmation email + supplier order draft + AuditLedger receipt",
    payload: {
      sku: f.sku,
      product_name: f.product_name,
      quantity: f.quantity,
      customer: {
        email: f.customer_email,
        name: f.customer_name,
      },
      shipping: {
        address: f.shipping_address,
        city: f.shipping_city,
        state: f.shipping_state,
        postal_code: f.shipping_postal_code,
      },
      delivery_window_preference: f.delivery_window_preference || null,
      gift_message: f.gift_message || null,
      consent_to_receive_email: f.consent_to_receive_email,
      submitted_at: new Date().toISOString(),
    },
  };

  let runnerRes: Response;
  try {
    runnerRes = await fetch(`${RUNNER_BASE}/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Coastal-Token": TOKEN,
      },
      body: JSON.stringify(packet),
      cache: "no-store",
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Coastal runner unreachable. Try again in a moment." },
      { status: 502 },
    );
  }

  const runnerJson = (await runnerRes.json().catch(() => ({}))) as {
    receipt?: { task_id?: string };
    receipt_path?: string;
    placeholder_path?: string;
    telegram_notified?: boolean;
    next_action?: string;
    detail?: unknown;
  };

  if (!runnerRes.ok) {
    return NextResponse.json(
      {
        error: "Order could not be placed",
        runner_status: runnerRes.status,
        detail: runnerJson?.detail ?? null,
      },
      { status: runnerRes.status === 403 ? 403 : 502 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      task_id: runnerJson?.receipt?.task_id || taskId,
      telegram_notified: !!runnerJson?.telegram_notified,
      next_action: runnerJson?.next_action || "owner_sign_off_required",
    },
    { status: 200 },
  );
}
