'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ChevronRight, 
  ArrowRight,
  Sparkles,
  MessageCircle,
  Repeat2,
  Copy
} from 'lucide-react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.prefetch('/chat/librechat');
    router.prefetch('/pricing');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-slate-900 selection:bg-slate-200 selection:text-slate-900 font-sans overflow-x-hidden">
      <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6 lg:px-12">
          <Link href="/" className="inline-flex items-center" aria-label="GRAMMAR Home">
            <Image src="/grammar-logo.svg" alt="GRAMMAR" width={180} height={40} className="h-10 w-auto" priority />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="#benefits" className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-widest">Why GRAMMAR</Link>
            <Link href="#how-it-works" className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-widest">How It Works</Link>
            <Link href="/pricing" className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-widest">Pricing</Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/chat/librechat"
              className="px-5 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:text-slate-900"
            >
              Chat w/ ACHEEVY
            </Link>
            <Link
              href="/pricing"
              className="rounded-2xl bg-[#0F172A] px-6 py-3 text-sm font-bold text-white transition-all hover:scale-105 shadow-lg shadow-slate-900/20"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative">
        {/* ─── Hero ─────────────────────────────────────── */}
        <section className="relative overflow-hidden pt-20 pb-32">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5 }}
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_-20%,rgba(0,163,255,0.15),transparent_70%)]" 
          />
          
          <div className="mx-auto max-w-7xl px-6 lg:px-12 text-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/90 border border-slate-200 shadow-sm mb-14"
            >
              <span className="text-slate-400 text-xl leading-none">··</span>
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Plain language in, structured prompt out</span>
              <Sparkles className="w-4 h-4 text-[#00A3FF]" />
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mx-auto max-w-5xl text-balance text-[clamp(3.4rem,8vw,6.4rem)] font-black leading-[0.92] tracking-[-0.06em] text-[#0F172A] mb-8"
            >
              Say it in plain English.
              <br />
              <span className="text-[#00A3FF]">GRAMMAR</span> turns it into a technical prompt.
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mx-auto max-w-3xl text-pretty text-lg font-semibold leading-relaxed text-slate-500 sm:text-[1.32rem] mb-12"
            >
              Describe what you need in everyday language. GRAMMAR converts it into a structured prompt you can paste into ChatGPT, Claude, Gemini, or any AI tool.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                href="/chat/librechat"
                className="w-full sm:w-auto rounded-2xl bg-[#0F172A] px-10 py-5 text-base font-black text-white transition-all hover:scale-105 active:scale-95 shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3"
              >
                Chat w/ ACHEEVY
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="#how-it-works"
                className="w-full sm:w-auto rounded-2xl bg-white border border-slate-200 px-10 py-5 text-base font-black text-slate-900 transition-all hover:bg-slate-50 flex items-center justify-center gap-3"
              >
                See how it works
              </Link>
            </motion.div>

            {/* Value cards */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.75 }}
              className="mt-20 grid grid-cols-1 gap-4 rounded-[2rem] border border-slate-200 bg-white/80 p-5 text-left shadow-sm md:grid-cols-3"
            >
              {[
                { icon: MessageCircle, label: 'Speak naturally', value: 'Describe what you need in your own words — no jargon, no templates, no prompt engineering.' },
                { icon: Repeat2, label: 'GRAMMAR translates it', value: 'Your plain request is converted into a structured technical prompt with role, context, constraints, and format.' },
                { icon: Copy, label: 'Use the prompt anywhere', value: 'Copy the result and paste it into ChatGPT, Claude, Gemini, or any AI tool. Better prompts, better output.' },
              ].map((item) => (
                <div key={item.label} className="rounded-[1.5rem] bg-slate-50 px-5 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <item.icon className="w-4 h-4 text-[#00A3FF]" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
                  </div>
                  <p className="text-sm font-bold leading-relaxed text-slate-700">{item.value}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ─── Positioning ──────────────────────────────── */}
        <section id="benefits" className="py-24 bg-white border-y border-slate-100">
          <div className="mx-auto max-w-7xl px-6 lg:px-12">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl mb-4">Better prompts start with clearer instructions.</h2>
              <p className="text-slate-500 font-medium max-w-2xl mx-auto">Most people know what they want but don&apos;t know how to ask an AI for it. GRAMMAR bridges that gap.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-8 rounded-3xl bg-slate-50/50 border border-slate-100 hover:border-[#00A3FF33] transition-all group">
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-6 text-[#00A3FF]">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3 tracking-tight">No prompt engineering required</h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">
                  Type &ldquo;help me write a cold outreach email for a SaaS founder&rdquo; and GRAMMAR produces a structured prompt with role, context, tone, and format — ready to paste.
                </p>
              </div>

              <div className="p-8 rounded-3xl bg-slate-50/50 border border-slate-100 hover:border-[#00A3FF33] transition-all group">
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-6 text-[#00A3FF]">
                  <Repeat2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3 tracking-tight">Works with every AI tool</h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">
                  The prompts GRAMMAR creates aren&apos;t locked to one platform. Copy and paste into ChatGPT, Claude, Gemini, Copilot, or any LLM you already use.
                </p>
              </div>

              <div className="p-8 rounded-3xl bg-slate-50/50 border border-slate-100 hover:border-[#00A3FF33] transition-all group">
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-6 text-[#00A3FF]">
                  <Copy className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3 tracking-tight">One click to copy</h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">
                  Every structured prompt is displayed in its own block with a copy button. No scrolling, no selecting, no reformatting. Just click and paste.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── How it works ─────────────────────────────── */}
        <section id="how-it-works" className="py-24 bg-slate-50 overflow-hidden">
          <div className="mx-auto max-w-7xl px-6 lg:px-12">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#00A3FF1A] text-[#00A3FF] mb-6">
                  <Repeat2 className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-widest">How it works</span>
                </div>
                <h2 className="text-4xl font-black tracking-tight text-slate-900 mb-6 leading-[1.1]">Three steps. One better prompt.</h2>
                <div className="space-y-6">
                  {[
                    { step: '1', title: 'Describe what you need', desc: 'Type a plain-language description of the task, content, or question you want an AI to handle.' },
                    { step: '2', title: 'GRAMMAR structures it', desc: 'Your input is converted into a technical prompt with a clear role, objective, constraints, and output format.' },
                    { step: '3', title: 'Copy and use anywhere', desc: 'Click the copy button and paste the structured prompt into ChatGPT, Claude, Gemini, or any AI tool.' },
                  ].map((item) => (
                    <div key={item.step} className="flex gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                      <div className="w-10 h-10 rounded-xl bg-[#0F172A] flex items-center justify-center text-white font-black text-sm shrink-0">
                        {item.step}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{item.title}</h4>
                        <p className="text-sm text-slate-500 font-medium">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Before / After visual */}
              <div className="flex-1 w-full max-w-lg">
                <div className="relative bg-[#0F172A] rounded-[40px] shadow-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#00A3FF33] to-transparent opacity-50" />
                  <div className="relative inset-x-8 top-8 p-8 flex flex-col gap-6">
                    {/* Before */}
                    <div>
                      <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/50 mb-2">You type</p>
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                        <p className="text-lg font-bold text-white">&ldquo;Help me write a cold outreach email for a SaaS founder who sells to HR teams&rdquo;</p>
                      </div>
                    </div>
                    {/* After */}
                    <div>
                      <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/50 mb-2">GRAMMAR returns</p>
                      <div className="rounded-2xl border border-[#00A3FF44] bg-[#00A3FF0A] px-5 py-4 font-mono text-sm leading-relaxed text-[#7DD3FC]">
                        <p className="text-white/40 text-xs mb-2"># Structured Prompt</p>
                        <p><span className="text-[#00A3FF]">Role:</span> Expert B2B email copywriter</p>
                        <p><span className="text-[#00A3FF]">Task:</span> Write a cold outreach email</p>
                        <p><span className="text-[#00A3FF]">Audience:</span> SaaS founders selling to HR</p>
                        <p><span className="text-[#00A3FF]">Tone:</span> Professional, concise, no fluff</p>
                        <p><span className="text-[#00A3FF]">Format:</span> Subject line + 3-paragraph body</p>
                      </div>
                    </div>
                    {/* Tool badges */}
                    <div className="flex items-center gap-2 pb-4">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Paste into</span>
                      {['ChatGPT', 'Claude', 'Gemini'].map((tool) => (
                        <span key={tool} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-white/70">
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Bottom CTA ───────────────────────────────── */}
        <section className="py-24 bg-[#0F172A] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#00A3FF] blur-[150px] opacity-20 -mr-48 -mt-48" />
          <div className="mx-auto max-w-7xl px-6 lg:px-12 text-center relative z-10">
            <h2 className="text-4xl font-black text-white mb-6 tracking-tight">Start with plain language.</h2>
            <p className="mx-auto mb-8 max-w-2xl text-base font-medium leading-relaxed text-slate-300">
              Describe what you need. GRAMMAR converts it into a structured prompt you can use in any AI tool. No templates. No prompt engineering. Just results.
            </p>
            <Link
              href="/chat/librechat"
              className="inline-flex items-center gap-3 rounded-2xl bg-[#00A3FF] px-10 py-5 text-lg font-black text-white shadow-xl shadow-[#00A3FF44] transition-all hover:scale-105 active:scale-95"
            >
              Chat w/ ACHEEVY
              <ChevronRight className="w-6 h-6" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-white py-12 border-t border-slate-100">
        <div className="mx-auto max-w-7xl px-6 lg:px-12 flex flex-col md:flex-row justify-between items-center gap-8">
          <Image src="/grammar-logo.svg" alt="GRAMMAR" width={140} height={32} className="h-8 w-auto opacity-50 grayscale" />
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">&copy; 2026 ACHIEVEMOR // GRAMMAR</p>
        </div>
      </footer>
    </div>
  );
}
