"use client";
import * as React from "react";
import { startTranslationStream, type TranslationStreamHandle } from "@/lib/translationStream";

const LANG_OPTS = [
  { code: "auto", label: "Auto-detect" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "pt", label: "Português" },
  { code: "de", label: "Deutsch" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
];

export function TranslationTab() {
  const [src, setSrc] = React.useState("auto");
  const [tgt, setTgt] = React.useState("en");
  const [streaming, setStreaming] = React.useState<TranslationStreamHandle | null>(null);
  const [captions, setCaptions] = React.useState<string[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  async function onStart() {
    setErr(null);
    setCaptions([]);
    try {
      const h = await startTranslationStream({
        sourceLang: src, targetLang: tgt,
        onCaption: (t) => setCaptions((cs) => [...cs, t]),
        onError: (e) => setErr(e.message),
      });
      setStreaming(h);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  async function onStop() {
    if (!streaming) return;
    await streaming.stop();
    setStreaming(null);
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex gap-3 items-end flex-wrap">
        <div>
          <label className="block text-xs uppercase tracking-widest mb-1">Source</label>
          <select value={src} onChange={(e) => setSrc(e.target.value)}
            className="border bg-background px-2 py-1 text-sm" disabled={!!streaming}>
            {LANG_OPTS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest mb-1">Target</label>
          <select value={tgt} onChange={(e) => setTgt(e.target.value)}
            className="border bg-background px-2 py-1 text-sm" disabled={!!streaming}>
            {LANG_OPTS.filter((l) => l.code !== "auto").map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>
        {!streaming ? (
          <button onClick={onStart} className="px-4 py-2 bg-foreground text-background">
            Start translating
          </button>
        ) : (
          <button onClick={onStop} className="px-4 py-2 border">Stop</button>
        )}
      </div>

      {err && <p className="text-destructive text-sm">{err}</p>}

      <div className="border border-border bg-card p-4 min-h-[300px] max-h-[60vh] overflow-y-auto space-y-2">
        {captions.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {streaming ? "Listening…" : "Hit Start to begin a translation session."}
          </p>
        )}
        {captions.map((c, i) => (
          <p key={i} className="text-sm">{c}</p>
        ))}
      </div>

      {streaming && (
        <p className="text-xs text-muted-foreground">
          session: {streaming.sessionId} · started {new Date(streaming.startedAt).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
