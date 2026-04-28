'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Wrench, Bird, FlaskConical, Shield } from 'lucide-react';
import { FoaiBackground } from '@/components/foai-background';
import { HawkChatInput, type Attachment } from '@/components/hawk-chat-input';
import { MenuNav } from '@/components/menu-nav';
import { HawkFooter } from '@/components/hawk-footer';
import { HeroChatDemo } from '@/components/hero-chat-demo';
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
      <MenuNav />

      <section className="relative z-10 mx-auto max-w-6xl px-6 pt-12 pb-16 lg:pt-20 lg:pb-24">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-6 space-y-7">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-foai-gold-tint border border-foai-gold/30 text-xs font-medium text-foai-gold"
            >
              <span className="size-1.5 rounded-full bg-foai-gold animate-pulse" />
              Now in beta
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foai-text leading-[1.05]"
            >
              Meet <span className="text-foai-gold italic">Chicken Hawk</span>
              <span className="block text-3xl sm:text-4xl lg:text-5xl font-semibold text-foai-muted mt-3">
                + the Lil_Hawks who get the work done.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="text-lg text-foai-muted leading-relaxed max-w-xl"
            >
              Direct, capable, good-humored. Chicken Hawk leads a flock of
              specialist Lil_Hawks — each one a senior-level helper for a
              specific kind of work. Drop a request in plain English and the
              right hawk gets to work. You stay in the loop on the calls that
              matter.
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="rounded-2xl border border-foai-border bg-foai-surface shadow-card overflow-hidden"
            >
              <Image
                src="/chicken-hawks-hero.png"
                alt="Chicken Hawk and two Lil_Hawks at the AIMS port"
                width={1024}
                height={1024}
                className="w-full h-auto"
                priority
                unoptimized
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.28 }}
              className="flex flex-wrap gap-3"
            >
              <Link
                href="/lil-hawks"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-foai-text text-white text-sm font-semibold hover:bg-foai-text/90 transition-colors"
              >
                Meet the Lil_Hawks <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/sqwaadrun"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-foai-border bg-foai-surface text-foai-text text-sm font-semibold hover:border-foai-gold/50 hover:shadow-card transition-all"
              >
                Sqwaadrun
              </Link>
            </motion.div>
          </div>

          <div className="lg:col-span-6">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              <HeroChatDemo />
            </motion.div>
          </div>
        </div>
      </section>

      <section ref={chatRef} className="relative z-10 mx-auto max-w-3xl px-6 pb-12">
        <div className="rounded-2xl bg-foai-surface border border-foai-border p-6 sm:p-8 shadow-card-md">
          <div className="flex items-center gap-3 mb-5">
            <HawkAvatar size={36} />
            <div>
              <div className="font-semibold text-foai-text">Chicken Hawk</div>
              <div className="text-xs text-foai-muted">Live · type below to start</div>
            </div>
          </div>

          {hasMessages ? (
            <div className="flex flex-col gap-3 mb-5 max-h-[600px] overflow-y-auto">
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
          ) : (
            <p className="text-sm text-foai-muted mb-5">
              Tell Chicken Hawk what you need. Direct answer. Real work output. No clarifying-question maze.
            </p>
          )}

          <HawkChatInput onSend={send} disabled={pending} />
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 py-16 lg:py-24">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <FlockCard icon={<Wrench className="size-5" />} title="Get to work" body="Drafts, plans, builds, research — Chicken Hawk produces output, not opinions about output." />
          <FlockCard icon={<Bird className="size-5" />} title="Specialist Lil_Hawks" body="A flock of senior-level workers, each tuned for one kind of job. Chicken Hawk routes you to the right one." />
          <FlockCard icon={<Shield className="size-5" />} title="Pause when it matters" body="Money, contracts, anything going public — those wait for your call. Routine work doesn't." />
          <FlockCard icon={<FlaskConical className="size-5" />} title="Sharpens itself" body="Off-hours, the flock tries variants of how it works. Keeps the wins. Rolls back the rest." />
        </div>
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

function FlockCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-foai-border bg-foai-surface p-5 shadow-card-sm hover:shadow-card transition-shadow">
      <div className="size-10 rounded-lg bg-foai-gold-tint text-foai-gold flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="font-semibold text-foai-text mb-1.5">{title}</h3>
      <p className="text-sm text-foai-muted leading-relaxed">{body}</p>
    </div>
  );
}
