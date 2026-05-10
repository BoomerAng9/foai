import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

// Server-only. The X-Coastal-Token never reaches the browser.
const RUNNER_BASE = process.env.COASTAL_RUNNER_INTERNAL || "http://coastal-runner:8080";
const TOKEN = process.env.COASTAL_GATEWAY_TOKEN || "";
const PUBLIC_BASE = process.env.NEXT_PUBLIC_COASTAL_PUBLIC_URL || "https://brewing.foai.cloud";

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

async function isStripeConfigured(): Promise<boolean> {
  try {
    const res = await fetch(`${RUNNER_BASE}/healthz`, { cache: "no-store" });
    if (!res.ok) return false;
    const data = (await res.json()) as { stripe_configured?: boolean };
    return Boolean(data?.stripe_configured);
  } catch {
    return false;
  }
}

async function fetchProductPrice(sku: string): Promise<number | null> {
  try {
    const res = await fetch(`${RUNNER_BASE}/api/catalog/${encodeURIComponent(sku)}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { msrp?: number };
    return typeof data?.msrp === "number" ? data.msrp : null;
  } catch {
    return null;
  }
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

  // If Stripe is configured, route through the Stepper checkout flow:
  // intake details → Stripe Checkout (payment) → checkout.session.completed
  // webhook auto-fires /run on the runner. The customer doesn't bounce back
  // to coastal-web after Stripe — Stripe redirects to /checkout/success on
  // the runner.
  if (await isStripeConfigured()) {
    // Server-side authoritative price — never trust client. msrp from runner.
    const msrp = await fetchProductPrice(f.sku);
    if (msrp === null || msrp <= 0) {
      return NextResponse.json({ error: "Product price unavailable. Try again." }, { status: 502 });
    }
    const amountCents = Math.round(msrp * 100);
    const productName = f.product_name || f.sku;

    // Pull the customer's coastal_uid from the cookie if present. This is
    // what ties the eventual purchase webhook back to their user_profile
    // row in the coastal Neon schema, so the next greeting variant can
    // reference the actual SKU they bought ("How was that Coastal Blend?").
    // Anonymous-no-cookie buyers still pay; their purchase just won't be
    // tied to a profile until they identify themselves later.
    const coastalUidCookie = req.cookies.get("coastal_uid")?.value || "";

    // Stripe metadata is flat key→string. Prefix intake fields with `intake_`
    // so the webhook can rehydrate them into a TaskPacket. coastal_uid is
    // top-level so the webhook handler in api_server.py can pick it up
    // directly via session_meta.get("coastal_uid").
    const checkoutMetadata: Record<string, string> = {
      task_id: taskId,
      sku: f.sku,
      product: "coastal-brewing",
      sku_label: productName,
      customer_email: f.customer_email,
      intake_task_id: taskId,
      intake_product_name: productName,
      intake_customer_name: f.customer_name,
      intake_customer_email: f.customer_email,
      intake_quantity: String(f.quantity),
      intake_shipping_address: f.shipping_address,
      intake_shipping_city: f.shipping_city,
      intake_shipping_state: f.shipping_state,
      intake_shipping_postal_code: f.shipping_postal_code,
      intake_delivery_window_preference: f.delivery_window_preference || "",
      intake_gift_message: (f.gift_message || "").slice(0, 480),
    };
    if (coastalUidCookie) {
      checkoutMetadata.coastal_uid = coastalUidCookie;
    }

    const checkoutPayload = {
      sku: f.sku,
      product_name: productName,
      amount_cents: amountCents,
      quantity: f.quantity,
      customer_email: f.customer_email,
      success_url: `${PUBLIC_BASE}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${PUBLIC_BASE}/products/${encodeURIComponent(f.sku)}?canceled=1`,
      metadata: checkoutMetadata,
    };

    let runnerRes: Response;
    try {
      runnerRes = await fetch(`${RUNNER_BASE}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Coastal-Token": TOKEN },
        body: JSON.stringify(checkoutPayload),
        cache: "no-store",
      });
    } catch {
      return NextResponse.json({ error: "Coastal runner unreachable. Try again in a moment." }, { status: 502 });
    }
    const runnerJson = (await runnerRes.json().catch(() => ({}))) as {
      checkout_url?: string;
      session_id?: string;
      detail?: unknown;
    };
    if (!runnerRes.ok || !runnerJson.checkout_url) {
      return NextResponse.json(
        { error: "Could not start checkout", runner_status: runnerRes.status, detail: runnerJson?.detail ?? null },
        { status: 502 },
      );
    }
    return NextResponse.json(
      {
        ok: true,
        path: "stripe_checkout",
        task_id: taskId,
        checkout_url: runnerJson.checkout_url,
        session_id: runnerJson.session_id,
      },
      { status: 200 },
    );
  }

  // Fallback path: Stripe not configured → fire /run directly (no payment).
  // Owner handles payment out-of-band per the project brief
  // (invoice-after-approval until Hostinger Ecommerce or Stripe activate).
  const packet = {
    task_id: taskId,
    owner_goal: "Process new customer order",
    objective: `New order: ${f.product_name || f.sku} x${f.quantity} for ${f.customer_email}`,
    department: "boomer_ops",
    task_type: "draft_order_confirmation",
    risk_tags: ["money"],
    approval_required: true,
    desired_output: "draft confirmation email + supplier order draft + AuditLedger receipt",
    payload: {
      sku: f.sku,
      product_name: f.product_name,
      quantity: f.quantity,
      customer: { email: f.customer_email, name: f.customer_name },
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
      headers: { "Content-Type": "application/json", "X-Coastal-Token": TOKEN },
      body: JSON.stringify(packet),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Coastal runner unreachable. Try again in a moment." }, { status: 502 });
  }
  const runnerJson = (await runnerRes.json().catch(() => ({}))) as {
    receipt?: { task_id?: string };
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
      path: "direct_run",
      task_id: runnerJson?.receipt?.task_id || taskId,
      telegram_notified: !!runnerJson?.telegram_notified,
      next_action: runnerJson?.next_action || "owner_sign_off_required",
    },
    { status: 200 },
  );
}
