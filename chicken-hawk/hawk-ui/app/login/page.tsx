'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { DotGridCanvas } from '@/components/dot-grid-canvas';

type Step = 'email' | 'code';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<Step>('email');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const codeRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (step === 'code') {
      const t = setTimeout(() => codeRefs.current[0]?.focus(), 350);
      return () => clearTimeout(t);
    }
  }, [step]);

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email || pending) return;
    setError(null);
    setPending(true);
    try {
      const res = await fetch('/api/gateway/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `email=${encodeURIComponent(email)}`,
      });
      if (!res.ok) {
        setError(`Couldn't send the code (${res.status}). Try again.`);
        return;
      }
      setStep('code');
    } catch {
      setError("Couldn't reach Chicken Hawk. Check your connection.");
    } finally {
      setPending(false);
    }
  }

  async function submitCode(fullCode: string) {
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      const res = await fetch('/api/gateway/login/verify-code', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: fullCode }),
      });
      if (res.status === 401) {
        setError("That code didn't match. Check Telegram and try again.");
        setCode(['', '', '', '', '', '']);
        codeRefs.current[0]?.focus();
        return;
      }
      if (!res.ok) {
        setError(`Couldn't verify (${res.status}). Try again.`);
        return;
      }
      router.push('/tools');
    } catch {
      setError("Couldn't reach Chicken Hawk. Check your connection.");
    } finally {
      setPending(false);
    }
  }

  function changeCode(i: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    if (!digit && value !== '') return;
    const next = [...code];
    next[i] = digit;
    setCode(next);
    if (digit && i < 5) codeRefs.current[i + 1]?.focus();
    if (i === 5 && digit) {
      const full = next.join('');
      if (full.length === 6) submitCode(full);
    }
  }

  function keyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      codeRefs.current[i - 1]?.focus();
    }
    if (e.key === 'Enter') {
      const full = code.join('');
      if (full.length === 6) submitCode(full);
    }
  }

  function pasteCode(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      e.preventDefault();
      const next = pasted.split('');
      setCode(next);
      submitCode(pasted);
    }
  }

  return (
    <div className="flex flex-col min-h-screen w-full bg-foai-bg relative">
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 1000px 700px at 50% 30%, rgba(217, 119, 6, 0.10) 0%, transparent 60%), radial-gradient(ellipse 800px 600px at 85% 100%, rgba(217, 119, 6, 0.06) 0%, transparent 55%)',
          }}
        />
        <div className="absolute inset-0 opacity-30">
          <DotGridCanvas reverse={false} speed={1.0} color={[217, 119, 6]} />
        </div>
      </div>

      <div className="relative z-10 flex flex-col flex-1">
        <header className="px-6 py-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-2xl text-foai-gold">
            <span>⌬</span>
            <span className="text-base font-semibold tracking-wide text-foai-text">Chicken Hawk</span>
          </Link>
          <Link href="/about" className="text-sm text-foai-muted hover:text-foai-text transition-colors">
            About
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-sm">
            <AnimatePresence mode="wait">
              {step === 'email' && (
                <motion.div
                  key="email"
                  initial={{ opacity: 0, x: -60 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -60 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="space-y-6 text-center"
                >
                  <div>
                    <h1 className="text-4xl font-bold leading-[1.1] tracking-tight">
                      <span className="text-foai-text">Owner </span>
                      <span className="italic glow-gold text-foai-gold">sign-in</span>
                    </h1>
                    <p className="text-base text-foai-muted mt-2">
                      Drop your email. We&apos;ll send a 6-digit code to your Telegram. Type it below. Session lasts 24 hours.
                    </p>
                  </div>

                  <form onSubmit={submitEmail} className="space-y-4">
                    <div className="relative">
                      <label htmlFor="email" className="sr-only">Email</label>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@achievemor.io"
                        required
                        autoComplete="email"
                        className="w-full text-center bg-foai-surface border border-foai-border rounded-full py-3 px-4 focus:outline-none focus:border-foai-gold focus:ring-2 focus:ring-foai-gold/30 transition-colors"
                      />
                    </div>
                    {error && <p role="alert" className="text-sm text-foai-err">{error}</p>}
                    <button
                      type="submit"
                      disabled={pending}
                      className="w-full rounded-full bg-foai-gold text-white font-semibold py-3 hover:bg-foai-gold-hover disabled:opacity-60 disabled:cursor-not-allowed shadow-amber-soft hover:shadow-amber-press transition-all"
                    >
                      {pending ? 'Sending…' : 'Send my code'}
                    </button>
                  </form>
                  <p className="text-xs text-foai-muted">
                    Owner-only. Visitors don&apos;t need to sign in to chat with Chicken Hawk on the home page.
                  </p>
                </motion.div>
              )}

              {step === 'code' && (
                <motion.div
                  key="code"
                  initial={{ opacity: 0, x: 60 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 60 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="space-y-6 text-center"
                >
                  <div className="size-14 mx-auto rounded-full bg-foai-gold-tint text-foai-gold flex items-center justify-center">
                    <MessageCircle className="size-6" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold leading-[1.1] tracking-tight text-foai-text">
                      Code sent. Drop the 6 digits.
                    </h1>
                    <p className="text-base text-foai-muted mt-3 leading-relaxed">
                      Check Telegram for a 6-digit code from Chicken Hawk. Type it below — your session lands in this browser.
                    </p>
                  </div>

                  <div className="rounded-full py-4 px-5 border border-foai-border bg-foai-surface backdrop-blur">
                    <div className="flex items-center justify-center gap-1">
                      {code.map((digit, i) => (
                        <div key={i} className="flex items-center">
                          <input
                            ref={(el) => {
                              codeRefs.current[i] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => changeCode(i, e.target.value)}
                            onKeyDown={(e) => keyDown(i, e)}
                            onPaste={pasteCode}
                            aria-label={`Digit ${i + 1} of 6`}
                            className="w-8 text-center text-xl bg-transparent border-none focus:outline-none text-foai-text font-mono"
                          />
                          {i < 5 && <span className="text-foai-muted/50 text-xl select-none">·</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {error && <p role="alert" className="text-sm text-foai-err">{error}</p>}

                  <div className="flex items-center justify-center gap-4 text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setStep('email');
                        setError(null);
                        setCode(['', '', '', '', '', '']);
                      }}
                      className="text-foai-muted hover:text-foai-text transition-colors"
                    >
                      Use a different email
                    </button>
                    <span className="text-foai-dim">·</span>
                    <span className="text-foai-muted">
                      {pending ? 'Verifying…' : 'Code expires in 15 min'}
                    </span>
                  </div>

                  <p className="text-xs text-foai-muted leading-relaxed">
                    Telegram also sent you a magic link as backup. Tap that and you&apos;ll land on <span className="font-mono">/me</span> in whichever browser opens it.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
