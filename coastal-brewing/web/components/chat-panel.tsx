"use client";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ChevronDown, ChevronRight, Sparkles, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { api, type ChatMessage } from "@/lib/api";

type Agent = "sales" | "marketing";

const AGENT_LABEL: Record<Agent, string> = { sales: "ACHEEVY", marketing: "Melli" };
const AGENT_FULL: Record<Agent, string> = {
  sales: "ACHEEVY · Coastal Sales",
  marketing: "Melli · Marketing",
};

// Personality-driven reasoning steps per agent.
// These show in the thinking window while the LLM responds.
// Written in each agent's authentic voice register.
const REASONING_STEPS: Record<Agent, string[][]> = {
  sales: [
    // Each inner array is one "scenario" — randomly picked per message
    [
      "Kowltowk. Reading what you're really asking here...",
      "Cross-checking the catalog — milowda got plenty to work with...",
      "Policy gate, quick. Only saying what I can back up.",
    ],
    [
      "Alright now. Let Sal pull up the lot on that one...",
      "Bun's running the bundle math — hold a moment...",
      "Floor's locked. Finding what's fair for you.",
    ],
    [
      "Got your ask. Checking what's in season right now...",
      "LUC's running the numbers — nothing hidden, yeah?",
      "Sal says this one's right for you. Here's the pitch.",
    ],
    [
      "Single-origin ask. Sal's pulling the lot record...",
      "Farm's in Colombia — Fair Trade, lot ID on file...",
      "Every cup is what the label says. Here's yours.",
    ],
    [
      "Deal question. Running it past the floor first...",
      "Ceiling's here, not below it. Sal's got authority up to 10%...",
      "Here's what I can honestly do for you.",
    ],
  ],
  marketing: [
    [
      "Good question. Pulling the brand story on this...",
      "Checking the copy bank — want to get this right...",
      "Melli's got the context. Here it comes.",
    ],
    [
      "Brand question. Let me pull the sourcing docs on that...",
      "Fair Trade language — has to be exact. Checking...",
      "Here's the honest version.",
    ],
    [
      "Press inquiry. Melli's routing to the right context...",
      "Lowcountry angle. Finding the right framing...",
      "Here's the story.",
    ],
  ],
};

// Thinking line — streams in character by character
function ThinkingLine({ text, delay = 0, onDone }: { text: string; delay?: number; onDone?: () => void }) {
  const [displayed, setDisplayed] = React.useState("");
  const [started, setStarted] = React.useState(false);

  React.useEffect(() => {
    const startTimer = setTimeout(() => {
      setStarted(true);
    }, delay);
    return () => clearTimeout(startTimer);
  }, [delay]);

  React.useEffect(() => {
    if (!started) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        onDone?.();
      }
    }, 22);
    return () => clearInterval(interval);
  }, [started, text, onDone]);

  if (!started && !displayed) return null;
  return (
    <span className="block font-mono text-[11px] leading-relaxed text-muted-foreground/80">
      <span className="mr-2 text-accent/60">›</span>
      {displayed}
      {displayed.length < text.length && (
        <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-accent/60" />
      )}
    </span>
  );
}

// Perplexity-style reasoning window
function ThinkingWindow({ agent }: { agent: Agent }) {
  const [stepIdx, setStepIdx] = React.useState(0);
  const [visibleSteps, setVisibleSteps] = React.useState<string[]>([]);
  const [scenarioRef] = React.useState(() => {
    const pool = REASONING_STEPS[agent];
    return pool[Math.floor(Math.random() * pool.length)];
  });

  React.useEffect(() => {
    setVisibleSteps([scenarioRef[0]]);
    let i = 1;
    const advance = () => {
      if (i < scenarioRef.length) {
        setVisibleSteps((prev) => [...prev, scenarioRef[i]]);
        i++;
      }
    };
    const timer = setInterval(advance, 1100);
    return () => clearInterval(timer);
  }, [scenarioRef]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25 }}
      className="flex justify-start gap-3"
    >
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10">
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Zap className="h-3.5 w-3.5 text-accent" />
        </motion.div>
      </div>
      <div className="max-w-[80%] flex-1">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-accent/70">
          {AGENT_LABEL[agent]} · reasoning
        </p>
        <div className="space-y-1.5 rounded-lg border border-accent/15 bg-accent/[0.04] px-4 py-3">
          {visibleSteps.map((step, i) => (
            <ThinkingLine
              key={i}
              text={step}
              delay={i === 0 ? 0 : 0}
            />
          ))}
          {visibleSteps.length < scenarioRef.length && (
            <span className="block font-mono text-[11px] text-muted-foreground/40">
              <span className="mr-2">›</span>
              <span className="inline-flex gap-1">
                <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity }} className="h-1 w-1 rounded-full bg-muted-foreground/40 inline-block mt-1.5" />
                <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }} className="h-1 w-1 rounded-full bg-muted-foreground/40 inline-block mt-1.5" />
                <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }} className="h-1 w-1 rounded-full bg-muted-foreground/40 inline-block mt-1.5" />
              </span>
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function ChatPanel({
  initialAgent = "sales",
  contextSku,
}: {
  initialAgent?: Agent;
  contextSku?: string;
}) {
  const [agent, setAgent] = React.useState<Agent>(initialAgent);
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      role: "agent",
      agent: initialAgent,
      content:
        initialAgent === "sales"
          ? "Hey. I'm ACHEEVY — Coastal's front-of-house mind. Looking for a coffee, tea, or matcha worth drinking? Tell me what you're after. I can build a bundle, run a subscription, or just find the right cup."
          : "Hi — Melli here, Marketing. I can talk about our sourcing story, new drops, or what sets Coastal apart. What do you want to know?",
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = React.useState(contextSku ? `Tell me about ${contextSku}` : "");
  const [pending, setPending] = React.useState(false);
  const [sessionId, setSessionId] = React.useState<string | undefined>(undefined);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  async function send() {
    const content = input.trim();
    if (!content || pending) return;
    const userMsg: ChatMessage = { role: "user", content, ts: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setPending(true);
    try {
      const r = await api.chatSend({ content, agent, session_id: sessionId });
      setSessionId(r.session_id);
      if (r.reply.agent && r.reply.agent !== agent) setAgent(r.reply.agent as Agent);
      setMessages((m) => [...m, r.reply]);
    } catch (e: unknown) {
      setMessages((m) => [
        ...m,
        {
          role: "agent",
          agent,
          content: "I hit a snag reaching the team. Try again in a moment?",
          ts: Date.now(),
          toolTrace: [{ tool: "chat_send", status: "blocked", detail: String(e) }],
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2.5">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="h-4 w-4 text-accent" />
          </motion.div>
          <span className="font-display text-sm font-semibold">
            {AGENT_FULL[agent]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-[10px]">
            <ShieldCheck className="mr-1 h-3 w-3" /> Policy-gated
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-6">
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const showHandoff =
            m.role === "agent" &&
            prev?.role === "agent" &&
            prev.agent !== m.agent &&
            m.agent;
          return (
            <React.Fragment key={i}>
              {showHandoff && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="h-px flex-1 bg-border" />
                  <span className="font-mono text-[10px] uppercase tracking-widest">
                    Routing to {AGENT_LABEL[m.agent as Agent]}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              )}
              <Message msg={m} agentLabel={AGENT_LABEL} />
            </React.Fragment>
          );
        })}

        {/* Perplexity-style reasoning window */}
        <AnimatePresence>
          {pending && <ThinkingWindow agent={agent} />}
        </AnimatePresence>
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex gap-2 border-t border-border p-4"
      >
        <Input
          placeholder={
            agent === "sales"
              ? "Ask ACHEEVY — negotiate, haggle, find your cup…"
              : "Ask Melli about our story, sourcing, or brand…"
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={pending}
          className="font-sans text-sm"
        />
        <Button type="submit" variant="accent" disabled={pending || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>

      {/* Disclosure */}
      <p className="border-t border-border/60 px-5 py-2 text-center font-mono text-[9px] text-muted-foreground/60">
        AI-managed · owner-signed · every claim has a paper trail
      </p>
    </div>
  );
}

function Message({
  msg,
  agentLabel,
}: {
  msg: ChatMessage;
  agentLabel: Record<Agent, string>;
}) {
  const [open, setOpen] = React.useState(false);

  if (msg.role === "user") {
    return (
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[80%] rounded-lg bg-accent px-4 py-2.5 text-sm text-accent-foreground">
          {msg.content}
        </div>
      </motion.div>
    );
  }

  const label = agentLabel[(msg.agent as Agent) || "sales"] || "Agent";

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex justify-start gap-3"
    >
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 font-mono text-[10px] uppercase text-accent">
        {label.slice(0, 2)}
      </div>
      <div className="max-w-[80%] flex-1">
        <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <div className="rounded-lg bg-secondary px-4 py-2.5 text-sm leading-relaxed">
          {msg.content}
        </div>
        {msg.toolTrace && msg.toolTrace.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="mt-2 flex items-center gap-1 font-mono text-[10px] text-muted-foreground/60 hover:text-accent"
            >
              {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Reasoning trace ({msg.toolTrace.length})
            </button>
            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 overflow-hidden rounded-md border border-border bg-background/40 p-3"
                >
                  {msg.toolTrace.map((t, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 font-mono text-[10px] py-0.5"
                    >
                      <span className="text-muted-foreground">{t.tool}</span>
                      {t.detail && (
                        <span className="max-w-[60%] truncate text-muted-foreground/60 text-right">
                          {t.detail}
                        </span>
                      )}
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 uppercase shrink-0",
                          t.status === "ok" && "bg-accent/15 text-accent",
                          t.status === "blocked" && "bg-destructive/15 text-destructive",
                          t.status === "running" && "bg-secondary text-muted-foreground"
                        )}
                      >
                        {t.status}
                      </span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </motion.div>
  );
}
