'use client';

import { useState, useRef } from 'react';
import { Send, Copy, Check, Languages, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function GrammarStandalone() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function handleConvert() {
    if (!input.trim() || loading) return;
    setLoading(true);
    setResult('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `[NTNTN INTENTION ENGINE — CONVERT]\n\nUser's raw intent: "${input.trim()}"\n\nConvert this into a structured technical objective using the NTNTN output format. Output the full structured spec.`,
        }),
      });

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let full = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content && !data.done) {
                full += data.content;
                setResult(full);
              }
            } catch {}
          }
        }
      } else {
        setResult('Failed to convert. Please sign in first.');
      }
    } catch {
      setResult('Connection error. Try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Nav */}
      <nav className="h-14 flex items-center justify-between px-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/grammar-logo-white.svg" alt="Grammar" className="h-6" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <span className="font-mono text-sm font-bold tracking-wider">GRAMMAR</span>
          <span className="font-mono text-[9px] text-white/40 ml-1">NTNTN</span>
        </div>
        <Link href="/chat" className="flex items-center gap-1.5 text-[11px] font-mono text-white/50 hover:text-white transition-colors">
          Open Full Platform <ArrowRight className="w-3 h-3" />
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Languages className="w-8 h-8 text-[#E8A020]" />
          </div>
          <h1 className="text-4xl font-black tracking-tight mb-3">
            The <span style={{ color: '#E8A020', fontFamily: "'Permanent Marker', cursive" }}>Intention</span> Engine
          </h1>
          <p className="text-lg text-white/50 max-w-xl mx-auto">
            Describe what you want in plain words. Grammar converts it into a precise technical prompt you can use anywhere.
          </p>
        </div>

        {/* Input */}
        <div className="mb-6">
          <label className="font-mono text-[10px] text-white/40 block mb-2 uppercase tracking-wider">Your Intent (plain language)</label>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleConvert(); } }}
            placeholder="I need a landing page for my SaaS that converts well and has a pricing section..."
            rows={4}
            className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#E8A020]/50 resize-none"
          />
        </div>

        <button
          onClick={handleConvert}
          disabled={!input.trim() || loading}
          className="w-full h-12 bg-[#E8A020] text-black text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-30 hover:bg-[#D4901A] transition-colors mb-8"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
          ) : (
            <><Send className="w-4 h-4" /> CONVERT TO TECHNICAL PROMPT</>
          )}
        </button>

        {/* Result */}
        {result && (
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <label className="font-mono text-[10px] text-white/40 uppercase tracking-wider">Structured Output</label>
              <button onClick={handleCopy} className="flex items-center gap-1.5 text-[10px] font-mono text-white/40 hover:text-white transition-colors">
                {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'COPIED' : 'COPY'}
              </button>
            </div>
            <div className="bg-white/5 border border-white/10 p-4 max-h-[60vh] overflow-y-auto">
              <pre className="text-sm text-white/80 whitespace-pre-wrap font-mono leading-relaxed">{result}</pre>
            </div>
          </div>
        )}

        {/* How it works */}
        {!result && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {[
              { step: '1', title: 'Describe', desc: 'Type what you want in your own words. Be as vague or specific as you like.' },
              { step: '2', title: 'Convert', desc: 'Grammar breaks it into OBJECTIVE, CONTEXT, CONSTRAINTS, STEPS, and SUCCESS CRITERIA.' },
              { step: '3', title: 'Use Anywhere', desc: 'Copy the structured prompt into Claude, ChatGPT, Cursor, or any AI tool.' },
            ].map(item => (
              <div key={item.step} className="border border-white/10 p-6">
                <span className="font-mono text-2xl font-black text-[#E8A020]">{item.step}</span>
                <h3 className="font-bold text-sm mt-2 mb-1">{item.title}</h3>
                <p className="text-xs text-white/40 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        )}

        <p className="text-center font-mono text-[9px] text-white/20 mt-12">
          GRAMMAR (NTNTN) · The Intention Engine · By ACHIEVEMOR
        </p>
      </div>
    </div>
  );
}
