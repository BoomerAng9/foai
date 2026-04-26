"use client";
import * as React from "react";
import { Send, ChevronDown, ChevronRight, Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { api, type ChatMessage } from "@/lib/api";

type Agent = "sales" | "marketing";

const AGENT_LABEL: Record<Agent, string> = { sales: "Sales", marketing: "Marketing" };

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
          ? "Hey, I'm on the Sales team. Looking for a coffee, tea, or matcha to fall in love with? I can build a bundle or set up a subscription."
          : "Hi — Marketing here. I can talk about our story, new drops, or brand collaborations.",
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = React.useState(contextSku ? `Tell me about ${contextSku}` : "");
  const [pending, setPending] = React.useState(false);
  const [sessionId, setSessionId] = React.useState<string | undefined>(undefined);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

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
      if (r.reply.agent && r.reply.agent !== agent) setAgent(r.reply.agent);
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
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <span className="font-display text-sm font-semibold">Coastal Brewing — {AGENT_LABEL[agent]}</span>
        </div>
        <Badge variant="outline" className="font-mono text-[10px]"><ShieldCheck className="mr-1 h-3 w-3" /> Spinner</Badge>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-6">
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const showHandoff = m.role === "agent" && prev?.role === "agent" && prev.agent !== m.agent && m.agent;
          return (
            <React.Fragment key={i}>
              {showHandoff && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="h-px flex-1 bg-border" />
                  Handing off to {AGENT_LABEL[m.agent as Agent]}
                  <div className="h-px flex-1 bg-border" />
                </div>
              )}
              <Message msg={m} />
            </React.Fragment>
          );
        })}
        {pending && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            {AGENT_LABEL[agent]} is typing…
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex gap-2 border-t border-border p-4"
      >
        <Input
          placeholder={`Ask ${AGENT_LABEL[agent]} anything…`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={pending}
        />
        <Button type="submit" variant="accent" disabled={pending || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

function Message({ msg }: { msg: ChatMessage }) {
  const [open, setOpen] = React.useState(false);
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-lg bg-accent px-4 py-2 text-sm text-accent-foreground">{msg.content}</div>
      </div>
    );
  }
  return (
    <div className="flex justify-start gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 font-mono text-[10px] uppercase text-accent">
        {(msg.agent || "ag").slice(0, 2)}
      </div>
      <div className="max-w-[80%] flex-1">
        <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {AGENT_LABEL[(msg.agent as Agent) || "sales"]}
        </p>
        <div className="rounded-lg bg-secondary px-4 py-2 text-sm">{msg.content}</div>
        {msg.toolTrace && msg.toolTrace.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="mt-2 flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-accent"
          >
            {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Tool trace ({msg.toolTrace.length})
          </button>
        )}
        {open && msg.toolTrace && (
          <div className="mt-2 space-y-1 rounded-md border border-border bg-background/40 p-2">
            {msg.toolTrace.map((t, i) => (
              <div key={i} className="flex items-center justify-between gap-2 font-mono text-[10px]">
                <span>{t.tool}</span>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 uppercase",
                    t.status === "ok" && "bg-accent/15 text-accent",
                    t.status === "blocked" && "bg-destructive/15 text-destructive",
                    t.status === "running" && "bg-secondary text-muted-foreground"
                  )}
                >
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
