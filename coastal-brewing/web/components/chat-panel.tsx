"use client";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ChevronDown, ChevronRight, Sparkles, ShieldCheck, Zap, X, Volume2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AnimationRouter } from "@/components/animation/AnimationRouter";

type Agent = "sales" | "marketing";

// Customer-surface persona — per ACHEEVY_BRAIN.md (lines 96, 138, 1656, 1802)
// and feedback_only_acheevy_speaks_to_users_on_coastal_chat.md, ONLY ACHEEVY
// speaks to users. Internal routing across lieutenants (Sal/LUC/Melli) still
// happens server-side via the chain-of-command, but the customer never sees
// any name except ACHEEVY. Do not surface employee names in this component.
const ACHEEVY_LABEL = "ACHEEVY";
const ACHEEVY_INITIALS = "AC";

interface ChatMessage {
  role: "user" | "agent";
  employee?: string;
  content: string;
  ts: number;
  toolTrace?: { tool: string; status: string; detail?: string }[];
}

interface AnimState {
  type: string;
  size: string;
  employee: string;
  progress: number;
  isThinking: boolean;
  isComplete: boolean;
  estimatedTokens: number;
  thinkingTokensReceived: number;
}

// Detect WebSocket URL from environment
function getWsUrl(): string {
  const base = typeof window !== "undefined"
    ? window.location.origin.replace(/^http/, "ws")
    : "wss://brewing.foai.cloud";
  return `${base}/api/v1/chat/stream`;
}

export function ChatPanel({
  initialAgent = "sales",
  contextSku,
}: {
  initialAgent?: Agent;
  contextSku?: string;
}) {
  // `employee` tracks the internal routing target so the per-cup AnimationRouter
  // can pick the right thinking animation. The value is NEVER displayed as text.
  const [employee, setEmployee] = React.useState("acheevy");
  // Greeting state — populated from GET /api/v1/users/greeting on mount.
  // Renders the canonical first-time / returning / within-24h variant from
  // `Chain of thought research.txt` lines 846-942 + path-selection /
  // preference-capture buttons when the variant calls for them.
  const [messages, setMessages] = React.useState<ChatMessage[]>([{
    role: "agent",
    employee: "acheevy",
    content:
      "Welcome to Coastal Brewing Co. I'm ACHEEVY. How can I help you today?",
    ts: Date.now(),
  }]);
  const [showPathButtons, setShowPathButtons] = React.useState(true);
  const [showPreferenceButtons, setShowPreferenceButtons] = React.useState(true);
  const [greetingResolved, setGreetingResolved] = React.useState(false);
  const [input, setInput] = React.useState(contextSku ? `Tell me about ${contextSku}` : "");
  const [anim, setAnim] = React.useState<AnimState | null>(null);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [wsError, setWsError] = React.useState<string | null>(null);
  const [escalationMsg, setEscalationMsg] = React.useState<string | null>(null);
  const [responseBuffer, setResponseBuffer] = React.useState("");

  const wsRef = React.useRef<WebSocket | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const transcriptRef = React.useRef<ChatMessage[]>([]);
  const pending = anim?.isThinking || (responseBuffer.length > 0);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    transcriptRef.current = messages;
  }, [messages, anim, responseBuffer]);

  // ── Server-driven greeting (replaces the hardcoded default above) ──
  // Calls GET /api/v1/users/greeting with credentials so the coastal_uid
  // cookie roundtrips. Renders the variant returned by the server. When
  // the customer is mid-session (returning within 60 minutes), variant
  // = "within_session" and we suppress the greeting message + buttons
  // entirely so ACHEEVY picks up seamlessly.
  React.useEffect(() => {
    if (greetingResolved) return;
    let aborted = false;
    (async () => {
      try {
        const r = await fetch("/api/v1/users/greeting", {
          method: "GET",
          credentials: "include",
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (aborted) return;
        if (data.variant === "within_session") {
          // No re-introduction — clear the canonical first-time greeting
          // and let the customer pick up where they left off.
          setMessages([]);
          setShowPathButtons(false);
          setShowPreferenceButtons(false);
        } else if (data.greeting) {
          setMessages([{
            role: "agent",
            employee: "acheevy",
            content: data.greeting,
            ts: Date.now(),
          }]);
          setShowPathButtons(Boolean(data.show_path_buttons));
          setShowPreferenceButtons(Boolean(data.show_preference_buttons));
        }
      } catch {
        // Silent fall back to the hardcoded canonical first-time greeting
        // already in initial state. Buttons stay shown by default.
      } finally {
        if (!aborted) setGreetingResolved(true);
      }
    })();
    return () => { aborted = true; };
  }, [greetingResolved]);

  // ── Session wrap on unmount or 30-min idle ──
  // Fires POST /api/v1/users/session-wrap with the conversation transcript
  // so the server (Gemini Flash + gemini-embedding-001) can summarize +
  // embed + persist for the next session's returning-user greeting.
  React.useEffect(() => {
    const wrap = () => {
      const t = transcriptRef.current;
      if (!t || t.length < 2) return; // greeting only — nothing useful
      try {
        const payload = JSON.stringify({
          transcript: t.map((m) => ({
            role: m.role === "user" ? "user" : "agent",
            content: m.content,
          })),
        });
        // Use sendBeacon when available so the request survives unmount.
        if (typeof navigator !== "undefined" && navigator.sendBeacon) {
          const blob = new Blob([payload], { type: "application/json" });
          navigator.sendBeacon("/api/v1/users/session-wrap", blob);
        } else {
          fetch("/api/v1/users/session-wrap", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: payload,
            keepalive: true,
          }).catch(() => undefined);
        }
      } catch {
        // best-effort — never block unmount
      }
    };
    window.addEventListener("beforeunload", wrap);
    return () => {
      window.removeEventListener("beforeunload", wrap);
      wrap();
    };
  }, []);

  // ── Button-click handlers (path + preference) ──
  // POST /api/v1/users/preferences with credentials so the cookie carries
  // the coastal_uid. Hides the matching button bank after a successful pick.
  // Then drives an explicit send through the WS so ACHEEVY actually
  // responds — no silent dead end after the customer clicks.
  async function pickPath(choice: "guide_me" | "shop_for_me" | "direct_to_marketplace") {
    setShowPathButtons(false);
    try {
      await fetch("/api/v1/users/preferences", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ likes: [], path_choice: choice }),
      });
    } catch {
      // Non-fatal — the path choice is a profile hint, not a hard gate.
    }
    const label = choice === "guide_me" ? "Give me a tour"
      : choice === "shop_for_me" ? "Shop for me"
      : "I'll browse on my own";
    setMessages((m) => [...m, { role: "user", content: label, ts: Date.now() }]);
    void send(label);
  }

  async function pickPreference(category: "coffee" | "tea" | "mushroom_functional") {
    setShowPreferenceButtons(false);
    try {
      await fetch("/api/v1/users/preferences", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ likes: [category] }),
      });
    } catch {
      // Non-fatal.
    }
    const label = category === "coffee" ? "I'm into coffee"
      : category === "tea" ? "I'm into tea"
      : "Mushroom-functional, please";
    setMessages((m) => [...m, { role: "user", content: label, ts: Date.now() }]);
    void send(label);
  }

  // Token from env for WS auth
  const wsToken = process.env.NEXT_PUBLIC_COASTAL_WS_TOKEN || "";

  function connect(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const url = `${getWsUrl()}${wsToken ? `?token=${wsToken}` : ""}`;
      const ws = new WebSocket(url);
      ws.onopen = () => resolve(ws);
      ws.onerror = () => reject(new Error("WebSocket connection failed"));
    });
  }

  async function send(explicit?: string) {
    // `explicit` is set when a button (path/preference) drives the send;
    // typed-input sends pass undefined and read from `input` state.
    const fromButton = typeof explicit === "string";
    const content = (fromButton ? explicit : input).trim();
    if (!content || pending) return;
    if (!fromButton) setInput("");
    setWsError(null);
    setEscalationMsg(null);

    // Add user message immediately (skip if a button already appended its
    // synthetic message — see pickPath / pickPreference).
    if (!fromButton) {
      setMessages((m) => [...m, { role: "user", content, ts: Date.now() }]);
    }

    // Connect (or reuse)
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setIsConnecting(true);
      try {
        wsRef.current = await connect();
        setIsConnecting(false);
      } catch (e) {
        setIsConnecting(false);
        setWsError("Could not connect. Falling back to standard chat.");
        // Fallback to HTTP chat
        await sendHttp(content);
        return;
      }

      wsRef.current.onclose = () => { wsRef.current = null; };
    }

    const ws = wsRef.current;
    let thinkingBuffer = "";
    let responseText = "";

    ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);

      switch (msg.type) {
        case "cup_metadata":
          setEmployee(msg.employee);
          setAnim({
            type: msg.animation_type,
            size: msg.animation_size,
            employee: msg.employee,
            progress: 0,
            isThinking: true,
            isComplete: false,
            estimatedTokens: msg.estimated_thinking_tokens,
            thinkingTokensReceived: 0,
          });
          break;

        case "thinking_token":
          thinkingBuffer += msg.content;
          setAnim((prev) => {
            if (!prev) return prev;
            const received = (prev.thinkingTokensReceived || 0) + 1;
            const progress = Math.min(received / Math.max(prev.estimatedTokens, 1), 0.98);
            return { ...prev, thinkingTokensReceived: received, progress };
          });
          break;

        case "thinking_complete":
          setAnim((prev) => prev ? { ...prev, progress: 1, isThinking: false, isComplete: false } : prev);
          break;

        case "response_token":
          responseText += msg.content;
          setResponseBuffer(responseText);
          break;

        case "escalation_event":
          // Internal routing still drives the AnimationRouter, but the customer
          // never sees lieutenant names or routing reasons. Surface a single
          // neutral signal so the user knows ACHEEVY is processing.
          setEmployee(msg.to_employee);
          setEscalationMsg("ACHEEVY thinking...");
          setTimeout(() => setEscalationMsg(null), 2500);
          break;

        case "response_complete":
          // Commit the buffered response as a real message
          setMessages((m) => [
            ...m,
            {
              role: "agent",
              employee: msg.employee,
              content: responseText,
              ts: Date.now(),
            },
          ]);
          setResponseBuffer("");
          setAnim((prev) => prev ? { ...prev, isComplete: true } : prev);
          setTimeout(() => setAnim(null), 1500);
          break;

        case "error":
          setWsError(msg.message);
          setAnim(null);
          setResponseBuffer("");
          break;
      }
    };

    // Send the message
    ws.send(JSON.stringify({ type: "user_message", content }));
  }

  // HTTP fallback when WS unavailable
  async function sendHttp(content: string) {
    try {
      const r = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, agent: initialAgent }),
      });
      const data = await r.json();
      const reply = data.reply || data;
      setMessages((m) => [...m, {
        role: "agent",
        employee: "acheevy",
        content: reply.content || reply.reply?.content || "Hit a snag. Try again.",
        ts: Date.now(),
      }]);
    } catch {
      setMessages((m) => [...m, {
        role: "agent",
        employee: "acheevy",
        content: "Connection issue. Try again in a moment.",
        ts: Date.now(),
      }]);
    }
  }

  // Customer surface is single-persona. ACHEEVY only.
  const currentLabel = ACHEEVY_LABEL;

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2.5">
          <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
            <Sparkles className="h-4 w-4 text-accent" />
          </motion.div>
          <span className="font-display text-sm font-semibold">{currentLabel}</span>
        </div>
        <Badge variant="outline" className="font-mono text-[10px]">
          <ShieldCheck className="mr-1 h-3 w-3" /> Policy-gated
        </Badge>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-6">
        {messages.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
            {m.role === "user" ? (
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-lg bg-accent px-4 py-2.5 text-sm text-accent-foreground">
                  {m.content}
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 font-mono text-[10px] uppercase text-accent">
                  {ACHEEVY_INITIALS}
                </div>
                <div className="max-w-[80%] flex-1">
                  <div className="mb-1.5 flex items-center gap-2">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {ACHEEVY_LABEL}
                    </p>
                    <PlayVoiceButton text={m.content} messageKey={`msg-${i}`} />
                  </div>
                  <div className="rounded-lg bg-secondary px-4 py-2.5 text-sm leading-relaxed">
                    {m.content}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        ))}

        {/* Path-selection buttons (Guide Me / Shop For Me / Direct to Marketplace).
            Per `Chain of thought research.txt` lines 931-942 — three retail
            paths owner canon (feedback_coastal_is_retail_sales_not_rfp.md). */}
        {showPathButtons && messages.length > 0 && (
          <div className="flex flex-wrap gap-2 pl-10">
            <button
              type="button"
              onClick={() => pickPath("guide_me")}
              className="rounded-full border border-border bg-card/50 px-3 py-1.5 text-xs text-foreground/80 transition-colors hover:bg-accent/10 hover:border-accent/40 hover:text-foreground"
            >
              Give me a tour
            </button>
            <button
              type="button"
              onClick={() => pickPath("shop_for_me")}
              className="rounded-full border border-border bg-card/50 px-3 py-1.5 text-xs text-foreground/80 transition-colors hover:bg-accent/10 hover:border-accent/40 hover:text-foreground"
            >
              Shop for me
            </button>
            <button
              type="button"
              onClick={() => pickPath("direct_to_marketplace")}
              className="rounded-full border border-border bg-card/50 px-3 py-1.5 text-xs text-foreground/80 transition-colors hover:bg-accent/10 hover:border-accent/40 hover:text-foreground"
            >
              I&apos;ll browse on my own
            </button>
          </div>
        )}

        {/* Preference-capture buttons (coffee / tea / mushroom-functional).
            First-time-greeting preference funnel per CoT research line 891. */}
        {showPreferenceButtons && messages.length > 0 && (
          <div className="flex flex-wrap gap-2 pl-10">
            <button
              type="button"
              onClick={() => pickPreference("coffee")}
              className="rounded-full border border-accent/30 bg-accent/5 px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-accent/15 hover:border-accent/60"
            >
              ☕ Coffee
            </button>
            <button
              type="button"
              onClick={() => pickPreference("tea")}
              className="rounded-full border border-accent/30 bg-accent/5 px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-accent/15 hover:border-accent/60"
            >
              🍵 Tea
            </button>
            <button
              type="button"
              onClick={() => pickPreference("mushroom_functional")}
              className="rounded-full border border-accent/30 bg-accent/5 px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-accent/15 hover:border-accent/60"
            >
              🍄 Mushroom-functional
            </button>
          </div>
        )}

        {/* Escalation banner */}
        <AnimatePresence>
          {escalationMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-xs text-muted-foreground py-1"
            >
              <div className="h-px flex-1 bg-border" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-accent">{escalationMsg}</span>
              <div className="h-px flex-1 bg-border" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Animation + streaming response */}
        <AnimatePresence>
          {(anim || responseBuffer) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-3"
            >
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10">
                <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>
                  <Zap className="h-3.5 w-3.5 text-accent" />
                </motion.div>
              </div>
              <div className="flex-1 max-w-[80%]">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-accent/70">
                  {currentLabel} · {anim?.isThinking ? "reasoning" : "responding"}
                </p>
                {anim && (
                  <div className="rounded-lg border border-accent/15 bg-accent/[0.04] px-3 py-2 mb-2">
                    <AnimationRouter
                      employee={anim.employee}
                      animationType={anim.type}
                      animationSize={anim.size}
                      progress={anim.progress}
                      isThinking={anim.isThinking}
                      isComplete={anim.isComplete}
                    />
                  </div>
                )}
                {responseBuffer && (
                  <div className="rounded-lg bg-secondary px-4 py-2.5 text-sm leading-relaxed">
                    {responseBuffer}
                    <motion.span
                      className="ml-0.5 inline-block h-3 w-0.5 bg-accent/60"
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Connecting indicator */}
        {isConnecting && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            Connecting...
          </div>
        )}

        {/* Error */}
        {wsError && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-2 text-sm text-destructive">
            {wsError}
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 border-t border-border p-4">
        <Input
          placeholder="Ask ACHEEVY — find your cup, ask anything…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!!pending || isConnecting}
          className="font-sans text-sm"
        />
        <Button type="submit" variant="accent" disabled={!!pending || !input.trim() || isConnecting}>
          <Send className="h-4 w-4" />
        </Button>
      </form>

      <p className="border-t border-border/60 px-5 py-2 text-center font-mono text-[9px] text-muted-foreground/60">
        AI-managed · owner-signed
      </p>
    </div>
  );
}

// ─── Inworld TTS playback for ACHEEVY responses ──────────────────────
// Per-message opt-in. Customer clicks the speaker icon → backend calls
// Inworld TTS (Tyler voice for ACHEEVY) → we receive base64 WAV → play
// via an in-browser Audio element. Caches the played blob URL so a
// second click doesn't refetch. Only ACHEEVY's voice surfaces here per
// the only-ACHEEVY-speaks-to-users canon — internal voice IDs (Sal /
// LUC / Melli) are mapped server-side but never exposed.
function PlayVoiceButton({ text, messageKey: _key }: { text: string; messageKey: string }) {
  const [state, setState] = React.useState<"idle" | "loading" | "playing" | "error">("idle");
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  async function play() {
    if (state === "loading") return;
    if (state === "playing" && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setState("idle");
      return;
    }
    if (blobUrlRef.current && audioRef.current) {
      audioRef.current.currentTime = 0;
      void audioRef.current.play();
      setState("playing");
      return;
    }
    setState("loading");
    try {
      const r = await fetch("/api/v1/voice/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, character_id: "acheevy" }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const audioB64: string = data.audioContent;
      const binary = atob(audioB64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: data.format || "audio/wav" });
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setState("idle");
      audio.onerror = () => setState("error");
      await audio.play();
      setState("playing");
    } catch {
      setState("error");
      window.setTimeout(() => setState("idle"), 2000);
    }
  }

  return (
    <button
      type="button"
      onClick={play}
      aria-label={state === "playing" ? "Stop ACHEEVY audio" : "Play ACHEEVY audio"}
      className={cn(
        "inline-flex h-5 w-5 items-center justify-center rounded-full transition-colors",
        "text-muted-foreground/60 hover:text-accent hover:bg-accent/10",
        state === "playing" && "text-accent bg-accent/15",
        state === "error" && "text-destructive",
      )}
      title={state === "error" ? "Voice unavailable" : "Hear ACHEEVY"}
    >
      {state === "loading" ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Volume2 className="h-3 w-3" />
      )}
    </button>
  );
}
