"use client";

// Spinner activity overlay — live "Sal is shopping for you" surface.
// Subscribes to /api/v1/agent/spinner/{task_id}/events (SSE) and renders
// each tool call as a human-readable line. Closes when task ends.

import { useEffect, useRef, useState } from "react";
import { Loader2, ShoppingCart, X, CheckCircle2, AlertCircle, Search, History, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SpinnerEventPayload {
  task_id: string;
  seq: number;
  type: string;
  ts: string;
  payload?: any;
}

interface ActivityLine {
  id: number;
  icon: "search" | "history" | "cart" | "summary" | "done" | "error" | "info";
  text: string;
  detail?: string;
  ts: string;
}

interface Props {
  open: boolean;
  taskId: string | null;
  initialCommission?: string;
  onClose: () => void;
  onFinished?: (summary: string) => void;
}

const TOOL_ICONS: Record<string, ActivityLine["icon"]> = {
  "tool.search_catalog": "search",
  "tool.get_user_history": "history",
  "tool.get_cart": "cart",
  "tool.cart_add": "cart",
  "tool.summarize_selection": "summary",
  "spinner.started": "info",
  "spinner.finished": "done",
};

function humanize(ev: SpinnerEventPayload): ActivityLine {
  const baseId = ev.seq;
  const ts = ev.ts;
  const icon = TOOL_ICONS[ev.type] ?? "info";
  const args = ev.payload?.args || {};
  const result = ev.payload?.result || {};

  if (ev.type === "spinner.started") {
    return { id: baseId, icon: "info", text: "Spinner started — figuring out what to grab.", ts };
  }
  if (ev.type === "tool.get_user_history") {
    const purchases = (result?.purchases || []).length;
    return {
      id: baseId,
      icon: "history",
      text: purchases ? `Pulled history — ${purchases} prior purchase${purchases === 1 ? "" : "s"} to factor in.` : "No prior history yet — picking from the canon.",
      ts,
    };
  }
  if (ev.type === "tool.search_catalog") {
    const q = args.query || "the catalog";
    const count = result?.count ?? 0;
    return { id: baseId, icon: "search", text: `Searched for "${q}" — ${count} match${count === 1 ? "" : "es"}.`, ts };
  }
  if (ev.type === "tool.cart_add") {
    const sku = args.sku || "(unknown)";
    const qty = args.quantity || 1;
    const variant = args.variant ? ` · ${args.variant}` : "";
    return {
      id: baseId,
      icon: "cart",
      text: `Added ${qty}x ${sku}${variant}`,
      detail: result?.error,
      ts,
    };
  }
  if (ev.type === "tool.get_cart") {
    const lc = result?.line_items ?? 0;
    return { id: baseId, icon: "cart", text: `Checked the cart — ${lc} line${lc === 1 ? "" : "s"} in.`, ts };
  }
  if (ev.type === "tool.summarize_selection") {
    return { id: baseId, icon: "summary", text: result?.summary || "Wrapped up the selection.", ts };
  }
  if (ev.type === "spinner.finished") {
    return {
      id: baseId,
      icon: ev.payload?.error ? "error" : "done",
      text: ev.payload?.error ? `Spinner stopped: ${ev.payload.error}` : "Done.",
      ts,
    };
  }
  return { id: baseId, icon: "info", text: ev.type, ts };
}

function IconFor({ kind, spinning }: { kind: ActivityLine["icon"]; spinning?: boolean }) {
  const cls = "size-4";
  if (kind === "search") return <Search className={cls} />;
  if (kind === "history") return <History className={cls} />;
  if (kind === "cart") return <ShoppingCart className={cls} />;
  if (kind === "summary") return <Sparkles className={cls} />;
  if (kind === "done") return <CheckCircle2 className={cls} />;
  if (kind === "error") return <AlertCircle className={cls} />;
  return spinning ? <Loader2 className={`${cls} animate-spin`} /> : <Sparkles className={cls} />;
}

export function SpinnerActivityOverlay({ open, taskId, initialCommission, onClose, onFinished }: Props) {
  const [lines, setLines] = useState<ActivityLine[]>([]);
  const [done, setDone] = useState(false);
  const [errored, setErrored] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || !taskId) return;
    setLines([]);
    setDone(false);
    setErrored(null);

    const es = new EventSource(`/api/v1/agent/spinner/${encodeURIComponent(taskId)}/events`);
    esRef.current = es;

    const onAny = (ev: MessageEvent) => {
      try {
        const data: SpinnerEventPayload = JSON.parse(ev.data);
        const line = humanize(data);
        setLines((cur) => (cur.some((l) => l.id === line.id) ? cur : [...cur, line]));
        if (data.type === "spinner.finished") {
          setDone(true);
          if (data.payload?.error) setErrored(String(data.payload.error));
          onFinished?.(data.payload?.summary || "");
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
    es.addEventListener("timeout", () => { setDone(true); setErrored("Timed out waiting for activity."); es.close(); });
    es.onerror = () => { /* SSE retries automatically; ignore transient drops */ };

    return () => { es.close(); esRef.current = null; };
  }, [open, taskId, onFinished]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines.length]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="relative flex h-full w-full max-w-md flex-col border-l border-border bg-background shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-accent/15 text-accent">
                  {done ? <CheckCircle2 className="size-4" /> : <Loader2 className="size-4 animate-spin" />}
                </div>
                <div>
                  <h2 className="text-sm font-semibold tracking-tight">{done ? "Picked your basket" : "Shopping for you"}</h2>
                  {initialCommission && !done && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{initialCommission}</p>
                  )}
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

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
              <ol className="space-y-3">
                {lines.map((l) => (
                  <motion.li
                    key={l.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex items-start gap-3 text-sm"
                  >
                    <span
                      className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${
                        l.icon === "error" ? "bg-destructive/15 text-destructive" :
                        l.icon === "done" ? "bg-accent/20 text-accent" :
                        "bg-card text-muted-foreground"
                      }`}
                    >
                      <IconFor kind={l.icon} />
                    </span>
                    <span className="flex-1 leading-snug">
                      <span className="text-foreground">{l.text}</span>
                      {l.detail && <span className="block text-xs text-destructive/80">{l.detail}</span>}
                    </span>
                  </motion.li>
                ))}
                {!done && lines.length === 0 && (
                  <li className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Spinner is warming up…
                  </li>
                )}
              </ol>
            </div>

            <footer className="border-t border-border px-5 py-3">
              {errored ? (
                <p className="text-xs text-destructive">{errored}</p>
              ) : done ? (
                <div className="flex items-center justify-between gap-2">
                  <a
                    href="/cart"
                    className="rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background transition-colors hover:bg-foreground/90"
                  >
                    View cart
                  </a>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full border border-border px-4 py-2 text-xs text-foreground/80 transition-colors hover:bg-accent/10"
                  >
                    Keep chatting
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Spinner is the site-action runtime — it browses the catalog and stocks the cart.</p>
              )}
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
