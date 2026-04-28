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
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";

interface OrderButtonProps {
  sku: string;
  productName: string;
  unit: string;
  msrp: number;
}

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "ok"; taskId: string; telegramNotified: boolean }
  | { kind: "error"; message: string };

const FIELD_BASE =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export function OrderButton({ sku, productName, unit, msrp }: OrderButtonProps) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<SubmitState>({ kind: "idle" });
  const [quantity, setQuantity] = useState(1);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state.kind === "submitting") return;
    const form = new FormData(e.currentTarget);
    setState({ kind: "submitting" });

    const body = {
      sku,
      product_name: productName,
      customer_email: String(form.get("customer_email") || "").trim(),
      customer_name: String(form.get("customer_name") || "").trim(),
      shipping_address: String(form.get("shipping_address") || "").trim(),
      shipping_city: String(form.get("shipping_city") || "").trim(),
      shipping_state: String(form.get("shipping_state") || "").trim(),
      shipping_postal_code: String(form.get("shipping_postal_code") || "").trim(),
      quantity,
      delivery_window_preference: String(form.get("delivery_window_preference") || "").trim() || undefined,
      gift_message: String(form.get("gift_message") || "").trim() || undefined,
      consent_to_receive_email: form.get("consent_to_receive_email") === "on",
    };

    try {
      const res = await fetch("/order/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState({ kind: "error", message: data?.error || `Order failed (${res.status}). Try again.` });
        return;
      }
      setState({
        kind: "ok",
        taskId: String(data.task_id || ""),
        telegramNotified: Boolean(data.telegram_notified),
      });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "Could not reach Coastal Brewing. Try again.",
      });
    }
  }

  function reset() {
    setState({ kind: "idle" });
    setQuantity(1);
  }

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
          Order — ${(msrp * quantity).toFixed(2)}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{productName}</DialogTitle>
          <DialogDescription>
            Owner reviews every order before it transmits to the supplier. You&apos;ll hear back within 24 hours.
          </DialogDescription>
        </DialogHeader>

        {state.kind === "ok" ? (
          <div className="px-6 pb-6">
            <div className="flex items-start gap-3 rounded-md border border-accent/40 bg-accent/5 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <div>
                <p className="font-medium">Order received.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Owner is reviewing now{state.telegramNotified ? " (notified on Telegram)" : ""}. You&apos;ll get a confirmation email at the address you provided within 24 hours.
                </p>
                {state.taskId ? (
                  <p className="mt-3 font-mono text-xs text-muted-foreground">
                    Receipt: {state.taskId}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6">
            <fieldset disabled={state.kind === "submitting"} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="quantity" className="text-xs font-medium">Quantity</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="h-9 w-9 rounded-md border border-border text-base font-mono hover:border-accent"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="w-10 text-center font-mono text-sm">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                      className="h-9 w-9 rounded-md border border-border text-base font-mono hover:border-accent"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                    <span className="ml-2 text-xs text-muted-foreground">{unit}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Subtotal</label>
                  <p className="font-mono text-base font-semibold">${(msrp * quantity).toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="customer_name" className="text-xs font-medium">Your name *</label>
                  <Input id="customer_name" name="customer_name" required autoComplete="name" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="customer_email" className="text-xs font-medium">Email *</label>
                  <Input id="customer_email" name="customer_email" type="email" required autoComplete="email" />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="shipping_address" className="text-xs font-medium">Shipping address *</label>
                <Input id="shipping_address" name="shipping_address" required autoComplete="street-address" placeholder="Street, apt, unit" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label htmlFor="shipping_city" className="text-xs font-medium">City *</label>
                  <Input id="shipping_city" name="shipping_city" required autoComplete="address-level2" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="shipping_state" className="text-xs font-medium">State *</label>
                  <Input id="shipping_state" name="shipping_state" required autoComplete="address-level1" maxLength={2} placeholder="GA" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="shipping_postal_code" className="text-xs font-medium">Zip *</label>
                  <Input id="shipping_postal_code" name="shipping_postal_code" required autoComplete="postal-code" maxLength={10} />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="delivery_window_preference" className="text-xs font-medium">Delivery preference (optional)</label>
                <Input id="delivery_window_preference" name="delivery_window_preference" placeholder="weekdays / weekends / no preference" />
              </div>

              <div className="space-y-1">
                <label htmlFor="gift_message" className="text-xs font-medium">Gift message (optional, ≤ 280 chars)</label>
                <textarea
                  id="gift_message"
                  name="gift_message"
                  maxLength={280}
                  rows={2}
                  className={FIELD_BASE}
                />
              </div>

              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  name="consent_to_receive_email"
                  required
                  className="mt-0.5 h-4 w-4 rounded border-border text-accent focus:ring-accent"
                />
                <span className="text-muted-foreground">
                  I agree to receive order-related email from Coastal Brewing. *
                </span>
              </label>

              {state.kind === "error" ? (
                <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <span className="text-destructive">{state.message}</span>
                </div>
              ) : null}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" variant="accent" disabled={state.kind === "submitting"}>
                  {state.kind === "submitting" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Placing order…
                    </>
                  ) : (
                    `Place order — $${(msrp * quantity).toFixed(2)}`
                  )}
                </Button>
              </div>
            </fieldset>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
