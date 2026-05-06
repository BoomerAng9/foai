"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ChevronDown, ChevronRight, Sparkles, ShieldCheck, Zap, X, Volume2, VolumeX, Loader2, Mic, MicOff, Square, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AnimationRouter } from "@/components/animation/AnimationRouter";
import { detectTopic, topicToAnimationType } from "@/lib/topic-detect";
import { ChatMessageContent } from "@/components/chat-message-content";
import { SpinnerActivityOverlay } from "@/components/spinner-activity-overlay";
import {
  evaluateUserMessage,
  applyDecision,
  freshSession,
  hasIntent,
  type LPSession,
  type LPDecision,
} from "@/lib/loss-prevention";
import type { Product } from "@/lib/api";

// Session-scoped chat message storage so navigation between pages
// (Guide Me → /products, Direct to Marketplace → /products?mode=browse)
// preserves the customer's visible conversation. Server-side RAG
// continuity (last_summary, preferences) is handled separately by
// the user_profile layer.
const SS_MESSAGES = "coastal_chat_messages";
const SS_BUTTONS_DISMISSED = "coastal_chat_buttons_dismissed";
const SS_VOICE_AUTOPLAY = "coastal_chat_voice_autoplay";   // "0" = muted, default ON

type Agent = "sales" | "marketing";

// Customer-visible persona labels — per owner directive 2026-05-03 17:30
// (Sal as customer-facing lead) + 2026-05-05 (Melli surfaces by name on
// bulk / B2B intake; LUC + ACHEEVY surface by name when escalation
// triggers route to them). The escalation chain itself stays server-
// side; only the responding agent's label is shown.
const EMPLOYEE_LABEL: Record<string, string> = {
  sal_ang:       "Sal",
  luc_ang:       "LUC",
  melli_capensi: "Melli",
  acheevy:       "ACHEEVY",
  lp_ang:        "Marcus",
};
const EMPLOYEE_INITIALS: Record<string, string> = {
  sal_ang:       "S",
  luc_ang:       "L",
  melli_capensi: "M",
  acheevy:       "A",
  lp_ang:        "M",
};
const DEFAULT_EMPLOYEE_KEY = "sal_ang";
const labelFor = (e?: string) => EMPLOYEE_LABEL[e || DEFAULT_EMPLOYEE_KEY] || EMPLOYEE_LABEL[DEFAULT_EMPLOYEE_KEY];
const initialsFor = (e?: string) => EMPLOYEE_INITIALS[e || DEFAULT_EMPLOYEE_KEY] || EMPLOYEE_INITIALS[DEFAULT_EMPLOYEE_KEY];

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
interface LPAuditEntry {
  signal: string;
  reason: string;
  matchedPattern: string | null;
  userTextExcerpt: string;
  softClose: boolean;
  hardClose: boolean;
}

async function recordTeamHandoff(fromEmployee: string, toEmployee: string, reason: string): Promise<void> {
  // HR-PMO audit trail. Every agent transition writes a "team_handoff"
  // event so Betty Ann_Ang's effectiveness/efficiency dashboard can
  // assess each team member. Owner directive 2026-05-06.
  try {
    await fetch("/api/v1/team-handoff", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from_employee: fromEmployee,
        to_employee: toEmployee,
        reason,
        client_ts: new Date().toISOString(),
      }),
    });
  } catch {
    // Non-fatal — the visible transition already happened.
  }
}

async function recordLossPreventionEvent(ev: LPAuditEntry): Promise<void> {
  try {
    await fetch("/api/v1/loss-prevention/event", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        signal: ev.signal,
        reason: ev.reason,
        matched_pattern: ev.matchedPattern,
        user_text_excerpt: ev.userTextExcerpt,
        soft_close: ev.softClose,
        hard_close: ev.hardClose,
        client_ts: new Date().toISOString(),
      }),
    });
  } catch {
    // Non-fatal — the state transition already happened on the client.
  }
}

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
  const router = useRouter();
  // `employee` tracks the internal routing target so the per-cup AnimationRouter
  // can pick the right thinking animation. The value is NEVER displayed as text.
  const [employee, setEmployee] = React.useState("sal_ang");
  // Greeting state — populated from GET /api/v1/users/greeting on mount,
  // OR rehydrated from sessionStorage when the customer navigates between
  // pages (Guide Me → /products etc.) so the visible conversation persists
  // and feels seamless rather than a fresh re-introduction every page.
  const [messages, setMessages] = React.useState<ChatMessage[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const cached = window.sessionStorage.getItem(SS_MESSAGES);
      if (cached) {
        const parsed = JSON.parse(cached) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fall through to default greeting
    }
    return [{
      role: "agent" as const,
      employee: "sal_ang",
      content: "Welcome to Coastal Brewing Co. I'm Sal — Lead Barista. What you looking for today?",
      ts: Date.now(),
    }];
  });
  // Buttons follow the same rule: once dismissed in this session, stay
  // dismissed across navigation so the customer doesn't see Guide Me /
  // Shop For Me etc. re-appear after they've already picked a path.
  const [showPathButtons, setShowPathButtons] = React.useState(() => {
    if (typeof window === "undefined") return true;
    return window.sessionStorage.getItem(SS_BUTTONS_DISMISSED + "_path") !== "1";
  });
  const [showPreferenceButtons, setShowPreferenceButtons] = React.useState(() => {
    if (typeof window === "undefined") return true;
    return window.sessionStorage.getItem(SS_BUTTONS_DISMISSED + "_pref") !== "1";
  });
  const [greetingResolved, setGreetingResolved] = React.useState(() => {
    if (typeof window === "undefined") return false;
    // If we already have cached messages, the greeting effect should
    // skip — we're rehydrating an existing session.
    return Boolean(window.sessionStorage.getItem(SS_MESSAGES));
  });
  const [input, setInput] = React.useState(contextSku ? `Tell me about ${contextSku}` : "");
  const [anim, setAnim] = React.useState<AnimState | null>(null);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [wsError, setWsError] = React.useState<string | null>(null);
  const [escalationMsg, setEscalationMsg] = React.useState<string | null>(null);
  const [responseBuffer, setResponseBuffer] = React.useState("");

  // Catalog cache — fetched once on mount so [product:sku] markers in
  // ACHEEVY's text can be resolved to ProductCard renders without an
  // extra API call per message. Empty until first fetch resolves; the
  // marker parser silently drops markers for unknown SKUs (no broken
  // visuals during the brief fetch window).
  const [catalog, setCatalog] = React.useState<Product[]>([]);
  React.useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const r = await fetch("/api/catalog", { credentials: "include" });
        if (!r.ok) return;
        const data = await r.json();
        if (!aborted && Array.isArray(data?.products)) {
          setCatalog(data.products as Product[]);
        }
      } catch {
        // Catalog fetch failure → markers drop silently, message text shows
      }
    })();
    return () => { aborted = true; };
  }, []);

  // Voice auto-play — default OFF until owner audits + approves a
  // production-quality ACHEEVY voice (rolled back 2026-05-03 after a
  // bad IVC clone shipped). Customer can opt in via header toggle;
  // choice persists in sessionStorage.
  // Spinner activity overlay — opens when "Shop for me" is clicked or
  // when an agent commissions Spinner for the user. Holds the task_id
  // returned by /api/v1/agent/spinner so the overlay can subscribe to
  // /events/{task_id} via SSE.
  const [spinnerOpen, setSpinnerOpen] = React.useState(false);
  const [spinnerTaskId, setSpinnerTaskId] = React.useState<string | null>(null);
  const [spinnerCommission, setSpinnerCommission] = React.useState<string>("");
  // True when the user clicked "Shop for me" and we're now waiting on
  // them to pick a preference category. Set in pickPath, consumed in
  // pickPreference to commission Spinner with the chosen category.
  const armedForShopForMeRef = React.useRef<boolean>(false);

  // Magic-wand prompt enhancer is enhancing right now? Locks the input
  // + send button briefly so the user doesn't fire mid-rewrite.
  const [enhancing, setEnhancing] = React.useState(false);

  const [voiceAutoplay, setVoiceAutoplay] = React.useState<boolean>(() => {
    // Default-ON per owner directive 2026-05-06. Only respect an explicit
    // "0" (user clicked the volume button to mute). Empty / "1" → autoplay.
    // SS_VOICE_AUTOPLAY canon comment matched this; code path was inverted.
    if (typeof window === "undefined") return true;
    return window.sessionStorage.getItem(SS_VOICE_AUTOPLAY) !== "0";
  });

  // Loss-prevention state machine. Owner directive 2026-05-06 —
  // scripted interceptor (no LLM tokens during LP states): normal →
  // negotiating → looking → terse → lp_active (Marcus) →
  // acheevy_warning → exit. Each transition emits a scripted line
  // from the appropriate team member.
  const [lpSession, setLpSession] = React.useState<LPSession>(() => freshSession());
  const lpSessionRef = React.useRef<LPSession>(lpSession);
  React.useEffect(() => { lpSessionRef.current = lpSession; }, [lpSession]);
  const [, forceTick] = React.useReducer((x: number) => x + 1, 0);

  // Tick once a second when a cooldown is active so the UI re-evaluates.
  React.useEffect(() => {
    if (lpSession.state !== "acheevy_warning" && lpSession.state !== "exit") return;
    const t = window.setInterval(() => {
      if (lpSession.state === "exit") return;
      if (Date.now() >= lpSession.cooldownUntil) {
        setLpSession((s) => (s.state === "acheevy_warning" ? { ...s, state: "exit" } : s));
      } else {
        forceTick();
      }
    }, 1000);
    return () => window.clearInterval(t);
  }, [lpSession.state, lpSession.cooldownUntil]);

  // Count agent replies as they arrive so the chatty-cap can fire.
  const lastMessageKeyRef = React.useRef<string>("");
  React.useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last) return;
    const key = `${last.role}__${last.ts}__${(last.content || "").slice(0, 24)}`;
    if (key === lastMessageKeyRef.current) return;
    lastMessageKeyRef.current = key;
    if (last.role === "agent") {
      setLpSession((s) => ({ ...s, agentRepliesSoFar: s.agentRepliesSoFar + 1 }));
    }
  }, [messages]);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(SS_VOICE_AUTOPLAY, voiceAutoplay ? "1" : "0");
    } catch {}
  }, [voiceAutoplay]);

  const wsRef = React.useRef<WebSocket | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const transcriptRef = React.useRef<ChatMessage[]>([]);
  const pending = anim?.isThinking || (responseBuffer.length > 0);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    transcriptRef.current = messages;
    // Persist messages so navigation (Guide Me → /products) doesn't lose
    // the visible conversation. Cap to last 30 turns so sessionStorage
    // doesn't bloat over a long session.
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(
          SS_MESSAGES,
          JSON.stringify(messages.slice(-30)),
        );
      } catch {
        // sessionStorage may be disabled (private browsing); silent skip
      }
    }
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
            employee: "sal_ang",
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
  // Each click: (1) records the path/preference on the user_profile via
  // POST /api/v1/users/preferences (cookie-bound), (2) sends a synthetic
  // user message through the WS so ACHEEVY responds, (3) navigates to
  // the right surface per the CoT-research spec (line 996 — "Half-screen
  // collapsible chat panel" for Direct to Marketplace; Guide Me + Shop
  // For Me also route to /products with the chat alongside).
  // Button dismissal persists in sessionStorage so the customer doesn't
  // see the same picker re-appear after navigation.
  async function pickPath(choice: "guide_me" | "shop_for_me" | "direct_to_marketplace") {
    setShowPathButtons(false);
    if (typeof window !== "undefined") {
      try { window.sessionStorage.setItem(SS_BUTTONS_DISMISSED + "_path", "1"); } catch {}
    }
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

    // "Shop for me" — DON'T fire Spinner yet. Sal asks the preference
    // question first; the user picks coffee / tea / mushroom from the
    // existing preference chips, and THAT click commissions Spinner
    // with the chosen category baked into the brief. Owner directive
    // 2026-05-06 — never run Spinner without an answered preference.
    if (choice === "shop_for_me") {
      armedForShopForMeRef.current = true;
      setShowPreferenceButtons(true);
      // Sal's bridge line lands as a chat message (with brief delay so
      // it doesn't race the synthetic user message above).
      window.setTimeout(() => {
        setMessages((m) => [
          ...m,
          {
            role: "agent",
            employee: "sal_ang",
            content: "Real fine — what're we leaning toward, coffee, tea, or one of the mushroom blends? Pick one and I'll send Spinner to fill the basket.",
            ts: Date.now(),
          },
        ]);
      }, 700);
      return;
    }

    // Other paths still navigate to /products — Spinner only handles
    // shop_for_me for now. Guide Me + Direct to Marketplace use the
    // existing curated/browse layouts.
    const mode = choice === "guide_me" ? "guided" : "browse";
    window.setTimeout(() => {
      router.push(`/products?mode=${mode}`);
    }, 1200);
  }

  async function pickPreference(category: "coffee" | "tea" | "mushroom_functional") {
    setShowPreferenceButtons(false);
    if (typeof window !== "undefined") {
      try { window.sessionStorage.setItem(SS_BUTTONS_DISMISSED + "_pref", "1"); } catch {}
    }
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

    // If the user came from a "Shop for me" path-button, the
    // armedForShopForMeRef is set; consume it now and commission
    // Spinner with the chosen category baked into the brief.
    const armedForShopping = armedForShopForMeRef.current;
    armedForShopForMeRef.current = false;

    if (armedForShopping) {
      const human = category === "coffee" ? "coffee"
        : category === "tea" ? "tea or matcha"
        : "functional / mushroom blends";
      const commission = `Shop for me. The customer is into ${human}. Pick 2-4 items in that lane based on their history if any; default to flagship picks if history is empty. Avoid duplicates of items already in their cart.`;
      setSpinnerCommission(commission);
      try {
        const r = await fetch("/api/v1/agent/spinner", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            commission,
            commissioned_by: "user",
            metadata: { trigger: "shop_for_me_button", category },
          }),
        });
        if (r.ok) {
          const data = await r.json() as { task_id?: string };
          if (data.task_id) {
            setSpinnerTaskId(data.task_id);
            setSpinnerOpen(true);
          }
        }
      } catch {
        // Non-fatal — fall through to chat.
      }
      return;
    }

    // Default path — user is just declaring a preference outside of
    // shop-for-me, send the message to Sal for conversation.
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
    if (lpSessionRef.current.state === "exit") return;
    if (!fromButton) setInput("");
    setWsError(null);
    setEscalationMsg(null);

    // Loss-prevention state machine. Button-driven sends are exempt —
    // path/preference picks are intent signals by definition.
    if (!fromButton) {
      const decision = evaluateUserMessage(content, lpSessionRef.current);
      const next = applyDecision(lpSessionRef.current, decision);
      // Mark intent-detected when the message has it (used by future cycles).
      if (hasIntent(content)) next.intentEverDetected = true;
      setLpSession(next);

      if (decision.blockUpstream) {
        // Append the user's message + the scripted reply (if any) and
        // STOP — no LLM call this turn. Saves tokens during LP states.
        setMessages((m) => {
          const out = [...m, { role: "user" as const, content, ts: Date.now() }];
          if (decision.emit) {
            out.push({
              role: "agent" as const,
              employee: decision.emit.employee,
              content: decision.emit.content,
              ts: Date.now() + 1,
            });
          }
          return out;
        });
        if (decision.recordAuditSignal) {
          void recordLossPreventionEvent({
            signal: decision.recordAuditSignal,
            reason: `state ${lpSessionRef.current.state} → ${decision.nextState}`,
            matchedPattern: null,
            userTextExcerpt: content.slice(0, 240),
            softClose: decision.nextState === "negotiating" || decision.nextState === "looking" || decision.nextState === "terse",
            hardClose: decision.nextState === "lp_active" || decision.nextState === "acheevy_warning" || decision.nextState === "exit",
          });
        }
        return;
      }
    } else {
      // Button presses count as strong intent → reset state if we
      // were in any non-normal LP phase.
      setLpSession((s) =>
        s.state === "normal"
          ? { ...s, intentEverDetected: true }
          : { ...freshSession(), intentEverDetected: true },
      );
    }

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
          setEscalationMsg("Sal thinking...");
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
        employee: "sal_ang",
        content: reply.content || reply.reply?.content || "Hit a snag. Try again.",
        ts: Date.now(),
      }]);
    } catch {
      setMessages((m) => [...m, {
        role: "agent",
        employee: "sal_ang",
        content: "Connection issue. Try again in a moment.",
        ts: Date.now(),
      }]);
    }
  }

  // Header label tracks the currently-routed responding agent so the
  // customer always sees who they're talking to as escalation moves
  // through the chain (Sal → Melli for bulk, Sal → LUC for billing,
  // any → ACHEEVY on final approval, any → Marcus for LP). Each
  // transition is recorded for HR-PMO assessment (Betty Ann_Ang).
  const currentLabel = labelFor(employee);
  const prevEmployeeRef = React.useRef<string>(employee);
  const [handoffBanner, setHandoffBanner] = React.useState<{ from: string; to: string } | null>(null);
  React.useEffect(() => {
    const prev = prevEmployeeRef.current;
    if (prev && prev !== employee) {
      setHandoffBanner({ from: prev, to: employee });
      void recordTeamHandoff(prev, employee, "ws_routing_change");
      const timeout = window.setTimeout(() => setHandoffBanner(null), 4500);
      prevEmployeeRef.current = employee;
      return () => window.clearTimeout(timeout);
    }
    prevEmployeeRef.current = employee;
  }, [employee]);

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card">
      <SpinnerActivityOverlay
        open={spinnerOpen}
        taskId={spinnerTaskId}
        initialCommission={spinnerCommission}
        onClose={() => { setSpinnerOpen(false); setSpinnerTaskId(null); }}
        onFinished={() => {
          // Brief conversational acknowledgment in Sal's voice. Product
          // detail lives in the overlay cards — chat copy stays clean
          // for both the eye and the TTS read. Don't echo Spinner's raw
          // "Picked: 1x ... 1lb" summary into chat.
          setMessages((m) => [...m, {
            role: "agent",
            content: "Pulled a starter basket together for you — take a peek on the side panel and let me know what stays.",
            employee: "sal_ang",
            ts: Date.now(),
          }]);
        }}
      />
      {/* Header — agent label animates on handoff so the customer always
          sees who's at the counter; transition is logged for HR-PMO. */}
      <div className="relative flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2.5">
          <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
            <Sparkles className="h-4 w-4 text-accent" />
          </motion.div>
          <div className="relative flex items-center gap-2 overflow-hidden">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Chat w/</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={employee}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="font-display text-sm font-semibold"
              >
                {currentLabel}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>

        {/* Handoff banner — shows briefly when an escalation moves the
            conversation from one team member to another. */}
        <AnimatePresence>
          {handoffBanner && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="absolute left-1/2 top-full z-10 -translate-x-1/2 translate-y-1 rounded-full border border-accent/40 bg-accent/15 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-accent shadow-sm"
            >
              {labelFor(handoffBanner.from)} → {labelFor(handoffBanner.to)} took over
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVoiceAutoplay((v) => !v)}
            aria-label={voiceAutoplay ? `Mute ${currentLabel} voice` : `Unmute ${currentLabel} voice`}
            title={voiceAutoplay ? "Voice on — click to mute" : "Voice muted — click to unmute"}
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors",
              voiceAutoplay
                ? "text-accent hover:bg-accent/10"
                : "text-muted-foreground/50 hover:text-foreground hover:bg-secondary",
            )}
          >
            {voiceAutoplay ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>
          <Badge variant="outline" className="font-mono text-[10px]">
            <ShieldCheck className="mr-1 h-3 w-3" /> Policy-gated
          </Badge>
        </div>
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
                  {initialsFor(m.employee)}
                </div>
                <div className="max-w-[80%] flex-1">
                  <div className="mb-1.5 flex items-center gap-2">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {labelFor(m.employee)}
                    </p>
                    <PlayVoiceButton
                      text={m.content}
                      messageKey={`msg-${i}-${m.ts}`}
                      autoplay={voiceAutoplay && i === messages.length - 1}
                      employee={m.employee}
                    />
                  </div>
                  <ChatMessageContent text={m.content} catalog={catalog} />
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
                    {(() => {
                      const topicSnap = detectTopic(messages.map((m) => ({ role: m.role, content: m.content })));
                      const topicAnim = topicToAnimationType(topicSnap.topic, anim.type);
                      return (
                        <AnimationRouter
                          employee={anim.employee}
                          animationType={anim.type}
                          animationSize={anim.size}
                          progress={anim.progress}
                          isThinking={anim.isThinking}
                          isComplete={anim.isComplete}
                          topicAnimationType={topicAnim}
                        />
                      );
                    })()}
                  </div>
                )}
                {responseBuffer && (
                  <div className="space-y-3">
                    <ChatMessageContent text={responseBuffer} catalog={catalog} />
                    <motion.span
                      className="ml-1 inline-block h-3 w-0.5 bg-accent/60"
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

      {/* Input footer — varies by LP state. Most states keep the
          input enabled; only acheevy_warning and exit lock it. */}
      {lpSession.state === "exit" ? (
        <div className="border-t border-border bg-card/40 px-5 py-5 text-center">
          <p className="text-xs text-muted-foreground mb-2.5">
            Conversation closed.
          </p>
          <a
            href="/auth/signup?next=/account"
            className="inline-flex items-center justify-center rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background hover:bg-foreground/90 transition-colors"
          >
            Create an account to return
          </a>
        </div>
      ) : lpSession.state === "acheevy_warning" ? (
        <div className="border-t border-border bg-destructive/5 px-5 py-4 text-center">
          <p className="text-xs text-destructive/90">
            ACHEEVY paused this session.
            <span className="ml-1 font-mono text-foreground/80">
              {Math.max(0, Math.ceil((lpSession.cooldownUntil - Date.now()) / 1000))}s
            </span>
          </p>
          <a
            href="/auth/signup?next=/account"
            className="mt-2 inline-flex items-center justify-center rounded-full bg-foreground px-4 py-1.5 text-[11px] font-medium text-background hover:bg-foreground/90 transition-colors"
          >
            Create an account
          </a>
        </div>
      ) : (
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2 border-t border-border p-4">
        <MicButton
          onTranscribed={(text) => setInput((cur) => cur ? `${cur} ${text}` : text)}
          disabled={!!pending || isConnecting}
        />
        <Input
          placeholder={
            lpSession.state === "lp_active" ? "Talk to Marcus — quick, on the menu…"
            : lpSession.state === "terse" ? "Make it specific — what are you after?"
            : lpSession.state === "looking" ? "Ping Sal when you're ready…"
            : "Ask Sal — type or tap the mic…"
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!!pending || isConnecting || enhancing}
          className="font-sans text-sm"
        />
        <PromptEnhanceButton
          text={input}
          disabled={!!pending || isConnecting}
          onEnhanced={(t) => setInput(t)}
          onBusyChange={setEnhancing}
        />
        <Button type="submit" variant="accent" disabled={!!pending || !input.trim() || isConnecting || enhancing}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
      )}

      <p className="border-t border-border/60 px-5 py-2 text-center font-mono text-[9px] text-muted-foreground/60">
        AI-managed · owner-signed
      </p>
    </div>
  );
}

// ─── Inworld TTS playback per agent response ─────────────────────────
// Per-message opt-in. Customer clicks the speaker icon → backend calls
// Inworld TTS with the responding agent's character_id → we receive
// Magic-wand prompt enhancer button. Owner directive 2026-05-06 (Phase
// 1 of the II-Agent gap analysis). Click runs the customer's draft
// through /api/v1/prompt-enhance — gateway clarifies the message
// without changing intent, replaces the input. Saves token round-trips
// by reducing follow-up clarification turns from Sal.
function PromptEnhanceButton({
  text,
  disabled,
  onEnhanced,
  onBusyChange,
}: {
  text: string;
  disabled?: boolean;
  onEnhanced: (next: string) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const trimmed = (text || "").trim();
  const canEnhance = !disabled && !busy && trimmed.length >= 4;

  async function enhance() {
    if (!canEnhance) return;
    setBusy(true);
    onBusyChange(true);
    try {
      const r = await fetch("/api/v1/prompt-enhance", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      if (!r.ok) return;
      const data = await r.json() as { enhanced?: string; unchanged?: boolean };
      const next = (data.enhanced || "").trim();
      if (next && next !== trimmed) onEnhanced(next);
    } catch {
      // Silent — original text stays in input.
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }

  return (
    <button
      type="button"
      onClick={enhance}
      disabled={!canEnhance}
      aria-label="Tighten this for Sal"
      title="Tighten this for Sal"
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-all",
        canEnhance
          ? "text-accent hover:bg-accent/10 hover:scale-105 active:scale-95"
          : "text-muted-foreground/40 cursor-not-allowed",
      )}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Wand2 className="h-4 w-4" />
      )}
    </button>
  );
}


// base64 WAV → play via an in-browser Audio element. Caches the played
// blob URL so a second click doesn't refetch. The character_id comes
// from the message's `employee` field (set when the WS routes to
// sal_ang / melli_capensi / luc_ang / acheevy); without it the call
// falls back to sal_ang since Sal is the customer-facing default.
function PlayVoiceButton({
  text,
  messageKey,
  autoplay = false,
  employee,
}: {
  text: string;
  messageKey: string;
  autoplay?: boolean;
  employee?: string;
}) {
  const [state, setState] = React.useState<"idle" | "loading" | "playing" | "error">("idle");
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const autoplayedKeyRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, []);

  // Auto-play once per unique messageKey when the autoplay flag is on.
  // Browser autoplay policy may block the first audio without a prior
  // user gesture; in that case the customer can click the Hear button
  // manually. After the first interaction, subsequent agent messages
  // auto-play seamlessly.
  React.useEffect(() => {
    if (!autoplay) return;
    if (autoplayedKeyRef.current === messageKey) return;
    autoplayedKeyRef.current = messageKey;
    void play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplay, messageKey]);

  async function play() {
    if (state === "loading") return;
    if (state === "playing" && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setState("idle");
      return;
    }
    setState("loading");
    try {
      const params = new URLSearchParams({
        text,
        character_id: employee || "sal_ang",
      });
      const url = `/api/v1/voice/synthesize/stream?${params.toString()}`;
      // Reuse the existing <audio> element when the URL hasn't changed
      // (replays use browser HTTP cache; just rewind currentTime).
      let audio = audioRef.current;
      const sameSrc = audio?.src && audio.src.endsWith(url);
      if (!audio || !sameSrc) {
        audio?.pause();
        audio = new Audio();
        audio.preload = "auto";
        audio.src = url;
        audioRef.current = audio;
      } else {
        audio.currentTime = 0;
      }
      audio.onended = () => setState("idle");
      audio.onerror = () => {
        setState("error");
        window.setTimeout(() => setState("idle"), 2000);
      };
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
      aria-label={state === "playing" ? `Stop ${labelFor(employee)} audio` : `Play ${labelFor(employee)} audio`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest transition-colors",
        state === "idle" && "border-accent/40 bg-accent/5 text-accent hover:bg-accent/15",
        state === "loading" && "border-accent/40 bg-accent/10 text-accent",
        state === "playing" && "border-accent bg-accent/20 text-accent",
        state === "error" && "border-destructive/40 bg-destructive/10 text-destructive",
      )}
      title={state === "error" ? "Voice unavailable" : `Hear ${labelFor(employee)}`}
    >
      {state === "loading" ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Volume2 className="h-3 w-3" />
      )}
      {state === "playing" ? "Playing" : state === "loading" ? "Loading" : "Hear"}
    </button>
  );
}

// ─── Voice INPUT (microphone → STT → input field) ─────────────────────
// Uses browser MediaRecorder to capture mic audio (webm/opus default,
// 16kHz mono). Sends to backend /api/v1/voice/transcribe which forwards
// to Inworld STT (inworld-stt-1 model). Transcript drops into the input
// field — customer can edit before sending OR press the send button.
function MicButton({
  onTranscribed,
  disabled,
}: {
  onTranscribed: (text: string) => void;
  disabled?: boolean;
}) {
  const [state, setState] = React.useState<"idle" | "recording" | "transcribing" | "error">("idle");
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);

  React.useEffect(() => {
    return () => {
      stopStreamOnly();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopStreamOnly() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }

  async function startRecording() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setState("error");
      window.setTimeout(() => setState("idle"), 2000);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      recorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stopStreamOnly();
        if (blob.size === 0) {
          setState("idle");
          return;
        }
        setState("transcribing");
        try {
          const fd = new FormData();
          fd.append("audio", blob, "rec.webm");
          const r = await fetch("/api/v1/voice/transcribe", { method: "POST", body: fd });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const data = await r.json();
          const transcript: string = (data.transcript || "").trim();
          if (transcript) onTranscribed(transcript);
          setState("idle");
        } catch {
          setState("error");
          window.setTimeout(() => setState("idle"), 2000);
        }
      };
      mr.start();
      setState("recording");
    } catch {
      // Permission denied or no mic
      setState("error");
      window.setTimeout(() => setState("idle"), 2000);
    }
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
    } else {
      stopStreamOnly();
      setState("idle");
    }
  }

  const isActive = state === "recording";
  const Icon = state === "transcribing" ? Loader2
    : state === "error" ? MicOff
    : isActive ? Square
    : Mic;

  return (
    <button
      type="button"
      onClick={isActive ? stopRecording : startRecording}
      disabled={disabled || state === "transcribing"}
      aria-label={isActive ? "Stop recording" : "Start voice input"}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors",
        state === "idle" && "border-border bg-background text-muted-foreground hover:text-accent hover:border-accent/50",
        state === "recording" && "border-destructive bg-destructive/10 text-destructive animate-pulse",
        state === "transcribing" && "border-accent/40 bg-accent/10 text-accent",
        state === "error" && "border-destructive/40 bg-destructive/5 text-destructive",
        disabled && "opacity-40 cursor-not-allowed",
      )}
      title={isActive ? "Stop & transcribe" : state === "error" ? "Mic unavailable" : "Speak to Sal"}
    >
      <Icon className={cn("h-4 w-4", state === "transcribing" && "animate-spin")} />
    </button>
  );
}
