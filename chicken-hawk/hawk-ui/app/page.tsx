'use client';

// hawk.foai.cloud public landing — Track A simplification (2026-05-14)
//
// Owner verdict 2026-05-14: prior landing was too confusing for visitors —
// "Meet the Lil_Hawks", "Sqwaadrun", "the flock", FlockCards. Customer-facing
// surfaces never expose internal agent names (Sacred Separation canon). The
// simplified landing follows the Higgsfield Supercomputer pattern referenced
// in the Circuit Box v1 spec §3 — hero-center prompt + 3 suggestion chips +
// collapsed chrome.
//
// Operator routes (/tools/*, /lil-hawks, /sqwaadrun, /admin) remain reachable
// for owner-tier magic-link sessions; they just don't surface as nav from the
// public landing anymore. Phase 2 (Circuit Box) takes the Tool Chest over to
// cti.foai.cloud where it belongs.

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FoaiBackground } from '@/components/foai-background';
import { HawkChatInput, type Attachment } from '@/components/hawk-chat-input';
import { HawkFooter } from '@/components/hawk-footer';
import { HawkAvatar } from '@/components/hawk-avatar';
import { MarkdownReply } from '@/components/markdown-reply';
import { DispatchTrace } from '@/components/dispatch-trace';
import { findHawkInPrompt, type SqwaadrunHawk } from '@/lib/sqwaadrun-roster';

interface Msg {
  role: 'user' | 'ch' | 'error';
  text: string;
  id: string;
  hawk?: SqwaadrunHawk | null;
}

// Public-facing suggestion chips. These map to active customer verticals owner
// has chosen to promote. NOT internal agent names. Sacred Separation canon —
// the visitor sees businesses, not agent rosters.
const SUGGESTION_CHIPS = [
  { label: 'Try Coastal Brewing Co.', prompt: "I want to learn about Coastal Brewing Co. — what makes it different?" },
  { label: 'See Per|Form Sports', prompt: "Show me what Per|Form does." },
  { label: 'Get a quote for my business', prompt: "I run a small business and I want an agentic team that handles customer service, scheduling, and follow-up. What does that look like?" },
];

function HomePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [pending, setPending] = useState(false);
  const [pendingHawk, setPendingHawk] = useState<SqwaadrunHawk | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);
  const autoFiredRef = useRef(false);

  async function send(text: string, attachments: Attachment[]) {
    const hawk = findHawkInPrompt(text);
    setPendingHawk(hawk);

    const attachLabel =
      attachments.length === 0
        ? text
        : `${text || '(attached)'}${attachments.length ? `\n📎 ${attachments.map((a) => a.name).join(', ')}` : ''}`;
    const userMsg: Msg = { role: 'user', text: attachLabel, id: crypto.randomUUID() };
    const stub: Msg = { role: 'ch', text: '…', id: crypto.randomUUID(), hawk };
    setMessages((prev) => [...prev, userMsg, stub]);
    setPending(true);

    try {
      const res = await fetch('/api/public/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, attachments }),
      });
      if (res.status === 429) {
        setMessages((prev) =>
          prev.map((m) => (m.id === stub.id ? { ...m, role: 'error', text: 'Slow down a moment — try again in a minute.' } : m)),
        );
        return;
      }
      if (!res.ok) {
        const detail = await res.text();
        setMessages((prev) =>
          prev.map((m) => (m.id === stub.id ? { ...m, role: 'error', text: `Something went wrong (${res.status}). ${detail.slice(0, 200)}` } : m)),
        );
        return;
      }
      const data: { reply: string } = await res.json();
      setMessages((prev) => prev.map((m) => (m.id === stub.id ? { ...m, text: data.reply } : m)));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) =>
        prev.map((m) => (m.id === stub.id ? { ...m, role: 'error', text: `Connection error: ${msg}` } : m)),
      );
    } finally {
      setPending(false);
      setPendingHawk(null);
    }
  }

  function handleChipClick(prompt: string) {
    void send(prompt, []);
    chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  useEffect(() => {
    if (autoFiredRef.current) return;
    const incoming = searchParams.get('prompt');
    if (!incoming) return;
    autoFiredRef.current = true;
    setTimeout(() => chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    send(incoming, []);
    router.replace('/');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasMessages = messages.length > 0;

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      <FoaiBackground />

      {/* Minimal top bar — sign-in for owner-tier; nothing else surfaces */}
      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-6 pt-6">
        <Link href="/" className="flex items-center gap-2 text-foai-text font-semibold">
          <HawkAvatar size={28} />
          <span>Chicken Hawk</span>
        </Link>
        <Link
          href="/login"
          className="text-xs font-medium text-foai-muted hover:text-foai-text transition-colors"
        >
          Owner sign in
        </Link>
      </header>

      {/* Hero — single prompt, single headline, three chips */}
      <section
        ref={chatRef}
        className="relative z-10 mx-auto flex min-h-[80vh] max-w-3xl flex-col justify-center px-6 pb-16 pt-12"
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foai-text leading-[1.1]">
            How can <span className="text-foai-gold">Chicken Hawk</span> help your business?
          </h1>
          <p className="mt-4 text-base text-foai-muted">
            Ask anything. We&rsquo;ll show you what an agentic team looks like for your kind of work.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-2xl bg-foai-surface border border-foai-border p-5 sm:p-6 shadow-card-md"
        >
          {hasMessages ? (
            <div className="flex flex-col gap-3 mb-5 max-h-[55vh] overflow-y-auto">
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={
                    m.role === 'user'
                      ? 'self-end max-w-[85%] rounded-2xl px-4 py-3 bg-foai-gold text-white shadow-card text-sm'
                      : m.role === 'error'
                      ? 'self-start max-w-[95%] rounded-2xl px-4 py-3 bg-foai-gold/10 border border-foai-gold/40 text-foai-gold text-sm'
                      : 'self-start w-full max-w-[95%] flex items-start gap-2'
                  }
                >
                  {m.role === 'ch' && m.text === '…' ? (
                    <div className="flex-1">
                      <DispatchTrace hawk={m.hawk ?? pendingHawk ?? null} />
                    </div>
                  ) : m.role === 'ch' ? (
                    <>
                      <HawkAvatar size={26} className="mt-0.5" />
                      <div className="flex-1 rounded-2xl px-4 py-3 bg-foai-surface-2 border border-foai-border">
                        <MarkdownReply text={m.text} />
                      </div>
                    </>
                  ) : (
                    <div className="whitespace-pre-wrap text-[15px] leading-relaxed">{m.text}</div>
                  )}
                </motion.div>
              ))}
            </div>
          ) : null}

          <HawkChatInput onSend={send} disabled={pending} />

          {!hasMessages && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTION_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleChipClick(chip.prompt)}
                  className="rounded-full border border-foai-border bg-foai-surface-2 px-3 py-1.5 text-xs font-medium text-foai-text/80 hover:border-foai-gold/50 hover:text-foai-text transition-colors"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </section>

      <HawkFooter />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageInner />
    </Suspense>
  );
}
