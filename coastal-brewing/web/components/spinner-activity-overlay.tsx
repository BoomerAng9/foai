"use client";

// Spinner activity overlay — live "shopping for you" surface.
// Subscribes to /api/v1/agent/spinner/{task_id}/events (SSE) and
// renders product cards as items get picked. Closes when task ends.

import { useEffect, useRef, useState } from "react";
import { Loader2, ShoppingCart, X, CheckCircle2, AlertCircle, UserPlus, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SpinnerEventPayload {
  task_id: string;
  seq: number;
  type: string;
  ts: string;
  payload?: any;
}

interface PickedItem {
  sku: string;
  quantity: number;
  variant?: string | null;
  name?: string;
  category?: string;
  image?: string;
  msrp?: number;
  size?: string;
}

interface Props {
  open: boolean;
  taskId: string | null;
  initialCommission?: string;
  onClose: () => void;
  onFinished?: (summary: string) => void;
}

function formatMoney(n?: number): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "";
  return `$${n.toFixed(2)}`;
}

export function SpinnerActivityOverlay({ open, taskId, initialCommission, onClose, onFinished }: Props) {
  const [picked, setPicked] = useState<PickedItem[]>([]);
  const [statusLine, setStatusLine] = useState<string>("Spinner is warming up…");
  const [done, setDone] = useState(false);
  const [errored, setErrored] = useState<string | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const onFinishedRef = useRef(onFinished);
  const firedFinishedRef = useRef(false);
  useEffect(() => { onFinishedRef.current = onFinished; }, [onFinished]);

  useEffect(() => {
    if (!open || !taskId) return;
    setPicked([]);
    setStatusLine("Spinner is warming up…");
    setDone(false);
    setErrored(null);
    firedFinishedRef.current = false;

    const es = new EventSource(`/api/v1/agent/spinner/${encodeURIComponent(taskId)}/events`);
    esRef.current = es;

    const onAny = (ev: MessageEvent) => {
      try {
        const data: SpinnerEventPayload = JSON.parse(ev.data);
        const args = data.payload?.args || {};
        const result = data.payload?.result || {};

        if (data.type === "spinner.started") {
          setStatusLine("Reading your preferences and history…");
        } else if (data.type === "tool.get_user_history") {
          const purchases = (result?.purchases || []).length;
          setStatusLine(purchases ? `Pulled ${purchases} prior purchase${purchases === 1 ? "" : "s"}.` : "No prior history — picking from the canon.");
        } else if (data.type === "tool.search_catalog") {
          const q = args.query || "the catalog";
          const c = result?.count ?? 0;
          setStatusLine(`Searching for "${q}" — ${c} match${c === 1 ? "" : "es"}.`);
        } else if (data.type === "tool.cart_add" && result?.ok) {
          const added = result.added || {};
          const item: PickedItem = {
            sku: added.sku || args.sku || "",
            quantity: Number(added.quantity ?? args.quantity ?? 1),
            variant: added.variant ?? args.variant ?? null,
            name: added.name,
            category: added.category,
            image: added.image,
            msrp: typeof added.msrp === "number" ? added.msrp : undefined,
            size: added.size,
          };
          setPicked((cur) => {
            const idx = cur.findIndex((p) => p.sku === item.sku && (p.variant || null) === (item.variant || null));
            if (idx >= 0) {
              const next = [...cur];
              next[idx] = { ...next[idx], quantity: next[idx].quantity + item.quantity };
              return next;
            }
            return [...cur, item];
          });
          setStatusLine(`Added ${item.name || item.sku}.`);
        } else if (data.type === "tool.summarize_selection") {
          setStatusLine("Wrapping up the basket…");
        } else if (data.type === "spinner.finished" && !firedFinishedRef.current) {
          firedFinishedRef.current = true;
          setDone(true);
          if (data.payload?.error) {
            setErrored(String(data.payload.error));
            setStatusLine("Something went wrong.");
          } else {
            setStatusLine("Done.");
          }
          onFinishedRef.current?.(data.payload?.summary || "");
        }
      } catch {}
    };

    [
      "spinner.started",
      "tool.search_catalog",
      "tool.get_user_history",
      "tool.get_cart",
      "tool.cart_add",
      "tool.summarize_selection",
      "spinner.finished",
    ].forEach((t) => es.addEventListener(t, onAny as any));

    es.addEventListener("end", () => { setDone(true); es.close(); });
    es.addEventListener("timeout", () => { setDone(true); setErrored("Timed out."); es.close(); });

    return () => { es.close(); esRef.current = null; };
  }, [open, taskId]);

  // Pull auth state once on done so the CTA can branch (sign up vs view cart).
  useEffect(() => {
    if (!done || authed !== null) return;
    fetch("/api/v1/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setAuthed(Boolean(d?.authenticated)))
      .catch(() => setAuthed(false));
  }, [done, authed]);

  const lineCount = picked.length;
  const totalQty = picked.reduce((n, p) => n + p.quantity, 0);
  const subtotal = picked.reduce((n, p) => n + (p.msrp || 0) * p.quantity, 0);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-stretch justify-start bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="relative flex h-full w-full max-w-md flex-col border-r border-border bg-background shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-accent/15 text-accent">
                  {done ? <CheckCircle2 className="size-4" /> : <Loader2 className="size-4 animate-spin" />}
                </div>
                <div>
                  <h2 className="text-sm font-semibold tracking-tight">
                    {done ? "Picked your basket" : "Shopping for you"}
                  </h2>
                  <p className="text-xs text-muted-foreground line-clamp-1">{statusLine}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {picked.length === 0 && !errored && (
                <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
                  <ShoppingCart className="size-6 opacity-40 mb-3" />
                  <p>The basket fills up here as picks land.</p>
                </div>
              )}

              {errored && (
                <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                  <AlertCircle className="size-4 mt-0.5 shrink-0" />
                  <span>{errored}</span>
                </div>
              )}

              <ul className="space-y-3">
                <AnimatePresence initial={false}>
                  {picked.map((p) => (
                    <motion.li
                      key={`${p.sku}__${p.variant || "default"}`}
                      layout
                      initial={{ opacity: 0, y: 16, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ type: "spring", damping: 24, stiffness: 320 }}
                      className="flex items-stretch gap-3 rounded-xl border border-border bg-card/50 p-3 hover:border-accent/40 transition-colors"
                    >
                      <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-card">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name || p.sku}
                            className="size-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center text-muted-foreground">
                            <ShoppingCart className="size-5 opacity-40" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col justify-between min-w-0">
                        <div>
                          <p className="text-sm font-medium leading-snug line-clamp-2">{p.name || p.sku}</p>
                          {(p.size || p.variant) && (
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {[p.size, p.variant].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-accent font-medium">
                            ×{p.quantity}
                          </span>
                          {typeof p.msrp === "number" && (
                            <span className="font-mono text-muted-foreground">
                              {formatMoney(p.msrp)}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </div>

            {(picked.length > 0 || done) && (
              <div className="border-t border-border bg-card/30 px-5 py-4">
                {picked.length > 0 && (
                  <div className="mb-3 flex items-baseline justify-between text-xs">
                    <span className="text-muted-foreground">
                      {lineCount} line{lineCount === 1 ? "" : "s"} · {totalQty} item{totalQty === 1 ? "" : "s"}
                    </span>
                    {subtotal > 0 && (
                      <span className="font-mono font-medium text-foreground">{formatMoney(subtotal)}</span>
                    )}
                  </div>
                )}
                {done && !errored && (
                  <div className="flex flex-col gap-2">
                    {authed === false && (
                      <a
                        href="/auth/signup?next=/account"
                        className="flex items-center justify-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-xs font-medium text-background hover:bg-foreground/90 transition-colors"
                      >
                        <UserPlus className="size-3.5" />
                        Save this basket — create an account
                      </a>
                    )}
                    {authed === true && (
                      <a
                        href="/cart"
                        className="flex items-center justify-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-xs font-medium text-background hover:bg-foreground/90 transition-colors"
                      >
                        View cart <ArrowRight className="size-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-full border border-border px-4 py-2 text-xs text-foreground/80 hover:bg-accent/10 transition-colors"
                    >
                      Keep chatting
                    </button>
                  </div>
                )}
                {!done && (
                  <p className="text-[11px] text-muted-foreground text-center">
                    Picks stream in as they happen.
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
