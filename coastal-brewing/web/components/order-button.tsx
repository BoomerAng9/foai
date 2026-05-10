"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ShieldCheck, AlertCircle, ArrowLeft, ArrowRight, CreditCard } from "lucide-react";

interface OrderButtonProps {
  sku: string;
  productName: string;
  unit: string;
  msrp: number;
}

type Step = "details" | "review";

interface IntakeForm {
  customer_email: string;
  customer_name: string;
  shipping_address: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  delivery_window_preference: string;
  gift_message: string;
  consent_to_receive_email: boolean;
}

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "ok-receipt"; taskId: string; telegramNotified: boolean }
  | { kind: "ok-redirecting"; checkoutUrl: string }
  | { kind: "error"; message: string };

const FIELD_BASE =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const EMPTY_FORM: IntakeForm = {
  customer_email: "",
  customer_name: "",
  shipping_address: "",
  shipping_city: "",
  shipping_state: "",
  shipping_postal_code: "",
  delivery_window_preference: "",
  gift_message: "",
  consent_to_receive_email: false,
};

function formValid(f: IntakeForm): { ok: true } | { ok: false; reason: string } {
  if (!f.customer_email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.customer_email)) {
    return { ok: false, reason: "Email looks off — double-check and try again." };
  }
  if (!f.customer_name.trim()) return { ok: false, reason: "Add your name." };
  if (!f.shipping_address.trim()) return { ok: false, reason: "Add a shipping street." };
  if (!f.shipping_city.trim()) return { ok: false, reason: "Add a city." };
  if (!f.shipping_state.trim()) return { ok: false, reason: "Add a state." };
  if (!f.shipping_postal_code.trim()) return { ok: false, reason: "Add a zip." };
  if (!f.consent_to_receive_email) {
    return { ok: false, reason: "We need your okay to email you about the order." };
  }
  return { ok: true };
}

export function OrderButton({ sku, productName, unit, msrp }: OrderButtonProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("details");
  const [quantity, setQuantity] = useState(1);
  const [form, setForm] = useState<IntakeForm>(EMPTY_FORM);
  const [state, setState] = useState<SubmitState>({ kind: "idle" });

  function reset() {
    setStep("details");
    setQuantity(1);
    setForm(EMPTY_FORM);
    setState({ kind: "idle" });
  }

  function handleNext(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const next: IntakeForm = {
      customer_email: String(fd.get("customer_email") || "").trim(),
      customer_name: String(fd.get("customer_name") || "").trim(),
      shipping_address: String(fd.get("shipping_address") || "").trim(),
      shipping_city: String(fd.get("shipping_city") || "").trim(),
      shipping_state: String(fd.get("shipping_state") || "").trim(),
      shipping_postal_code: String(fd.get("shipping_postal_code") || "").trim(),
      delivery_window_preference: String(fd.get("delivery_window_preference") || "").trim(),
      gift_message: String(fd.get("gift_message") || "").trim(),
      consent_to_receive_email: fd.get("consent_to_receive_email") === "on",
    };
    setForm(next);
    const v = formValid(next);
    if (!v.ok) {
      setState({ kind: "error", message: v.reason });
      return;
    }
    setState({ kind: "idle" });
    setStep("review");
  }

  async function submitOrder() {
    if (state.kind === "submitting") return;
    setState({ kind: "submitting" });
    try {
      const res = await fetch("/order/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku,
          product_name: productName,
          quantity,
          ...form,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState({ kind: "error", message: data?.error || `Order failed (${res.status}). Try again.` });
        return;
      }
      // Stripe path returns checkout_url; non-Stripe path returns task_id.
      if (data.checkout_url) {
        setState({ kind: "ok-redirecting", checkoutUrl: String(data.checkout_url) });
        // brief render of redirect notice, then navigate
        window.setTimeout(() => {
          window.location.href = String(data.checkout_url);
        }, 700);
        return;
      }
      setState({
        kind: "ok-receipt",
        taskId: String(data.task_id || ""),
        telegramNotified: Boolean(data.telegram_notified),
      });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "Couldn't reach Coastal Brewing. Try again.",
      });
    }
  }

  const subtotal = msrp * quantity;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="lg" variant="accent">
          Order — ${subtotal.toFixed(2)}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-1" aria-label="Order steps">
            <span className={step === "details" ? "text-foreground font-semibold" : ""}>1 · Your details</span>
            <span aria-hidden>›</span>
            <span className={step === "review" ? "text-foreground font-semibold" : ""}>2 · Review &amp; pay</span>
          </div>
          <DialogTitle>{productName}</DialogTitle>
          <DialogDescription>
            {state.kind === "ok-receipt"
              ? "Order placed. Owner approval is next."
              : state.kind === "ok-redirecting"
              ? "Redirecting to Stripe to complete payment…"
              : "Owner reviews every order before it transmits to the supplier."}
          </DialogDescription>
        </DialogHeader>

        {state.kind === "ok-receipt" ? (
          <div className="px-6 pb-6">
            <div className="flex items-start gap-3 rounded-md border border-accent/40 bg-accent/5 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <div>
                <p className="font-medium">Order received.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Owner is reviewing now{state.telegramNotified ? " (notified on Telegram)" : ""}. You&apos;ll get a confirmation email at {form.customer_email} within 24 hours.
                </p>
                {state.taskId ? (
                  <p className="mt-3 font-mono text-xs text-muted-foreground">Receipt: {state.taskId}</p>
                ) : null}
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
            </div>
          </div>
        ) : state.kind === "ok-redirecting" ? (
          <div className="px-6 pb-6">
            <div className="flex items-start gap-3 rounded-md border border-accent/40 bg-accent/5 p-4">
              <Loader2 className="mt-0.5 h-5 w-5 shrink-0 text-accent animate-spin" />
              <div>
                <p className="font-medium">Redirecting to secure checkout…</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  If your browser doesn&apos;t move automatically,{" "}
                  <a className="text-accent underline" href={state.checkoutUrl}>tap here</a>.
                </p>
              </div>
            </div>
          </div>
        ) : step === "details" ? (
          <form onSubmit={handleNext} className="space-y-4 px-6 pb-6">
            <fieldset className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="quantity" className="text-xs font-medium">Quantity</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="h-9 w-9 rounded-md border border-border text-base font-mono hover:border-accent"
                      aria-label="Decrease quantity"
                    >−</button>
                    <span className="w-10 text-center font-mono text-sm">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                      className="h-9 w-9 rounded-md border border-border text-base font-mono hover:border-accent"
                      aria-label="Increase quantity"
                    >+</button>
                    <span className="ml-2 text-xs text-muted-foreground">{unit}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Subtotal</label>
                  <p className="font-mono text-base font-semibold">${subtotal.toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="customer_name" className="text-xs font-medium">Your name *</label>
                  <Input id="customer_name" name="customer_name" required defaultValue={form.customer_name} autoComplete="name" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="customer_email" className="text-xs font-medium">Email *</label>
                  <Input id="customer_email" name="customer_email" type="email" required defaultValue={form.customer_email} autoComplete="email" />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="shipping_address" className="text-xs font-medium">Shipping address *</label>
                <Input id="shipping_address" name="shipping_address" required defaultValue={form.shipping_address} autoComplete="street-address" placeholder="Street, apt, unit" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label htmlFor="shipping_city" className="text-xs font-medium">City *</label>
                  <Input id="shipping_city" name="shipping_city" required defaultValue={form.shipping_city} autoComplete="address-level2" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="shipping_state" className="text-xs font-medium">State *</label>
                  <Input id="shipping_state" name="shipping_state" required defaultValue={form.shipping_state} autoComplete="address-level1" maxLength={2} placeholder="GA" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="shipping_postal_code" className="text-xs font-medium">Zip *</label>
                  <Input id="shipping_postal_code" name="shipping_postal_code" required defaultValue={form.shipping_postal_code} autoComplete="postal-code" maxLength={10} />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="delivery_window_preference" className="text-xs font-medium">Delivery preference (optional)</label>
                <Input id="delivery_window_preference" name="delivery_window_preference" defaultValue={form.delivery_window_preference} placeholder="weekdays / weekends / no preference" />
              </div>

              <div className="space-y-1">
                <label htmlFor="gift_message" className="text-xs font-medium">Gift message (optional, ≤ 280 chars)</label>
                <textarea id="gift_message" name="gift_message" maxLength={280} rows={2} defaultValue={form.gift_message} className={FIELD_BASE} />
              </div>

              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" name="consent_to_receive_email" required defaultChecked={form.consent_to_receive_email} className="mt-0.5 h-4 w-4 rounded border-border text-accent focus:ring-accent" />
                <span className="text-muted-foreground">I agree to receive order-related email from Coastal Brewing. *</span>
              </label>

              {state.kind === "error" ? (
                <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <span className="text-destructive">{state.message}</span>
                </div>
              ) : null}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" variant="accent">
                  Review order <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </fieldset>
          </form>
        ) : (
          <div className="space-y-4 px-6 pb-6">
            <section className="rounded-md border border-border bg-secondary/40 p-4 text-sm">
              <h3 className="font-semibold mb-2">Order</h3>
              <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-muted-foreground">
                <dt>Item</dt>
                <dd className="text-foreground font-medium">{productName}</dd>
                <dt>Qty</dt>
                <dd className="text-foreground">{quantity} × ${msrp.toFixed(2)} {unit}</dd>
                <dt>Subtotal</dt>
                <dd className="text-foreground font-mono font-semibold">${subtotal.toFixed(2)}</dd>
              </dl>
            </section>

            <section className="rounded-md border border-border bg-secondary/40 p-4 text-sm">
              <h3 className="font-semibold mb-2">Ship to</h3>
              <p className="text-foreground">{form.customer_name}</p>
              <p className="text-muted-foreground">{form.shipping_address}</p>
              <p className="text-muted-foreground">
                {form.shipping_city}, {form.shipping_state} {form.shipping_postal_code}
              </p>
              {form.delivery_window_preference ? (
                <p className="text-muted-foreground mt-2 text-xs">Preference: {form.delivery_window_preference}</p>
              ) : null}
              {form.gift_message ? (
                <p className="text-muted-foreground mt-2 text-xs italic">&ldquo;{form.gift_message}&rdquo;</p>
              ) : null}
            </section>

            <section className="rounded-md border border-border bg-secondary/40 p-4 text-sm">
              <h3 className="font-semibold mb-2">Contact</h3>
              <p className="text-muted-foreground">{form.customer_email}</p>
            </section>

            <p className="text-xs text-muted-foreground">
              You&apos;ll be redirected to a secure checkout to complete payment. Owner reviews every order before transmitting to the supplier.
            </p>

            {state.kind === "error" ? (
              <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <span className="text-destructive">{state.message}</span>
              </div>
            ) : null}

            <div className="flex justify-between gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => { setStep("details"); setState({ kind: "idle" }); }}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <Button type="button" variant="accent" onClick={submitOrder} disabled={state.kind === "submitting"}>
                {state.kind === "submitting" ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Placing order…</>
                ) : (
                  <><CreditCard className="mr-2 h-4 w-4" />Confirm &amp; pay — ${subtotal.toFixed(2)}</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
