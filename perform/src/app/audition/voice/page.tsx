'use client';

/**
 * Voice Audition Page — /audition/voice
 * ======================================
 * One-click audition runner for all 5 Per|Form analyst voices.
 * Generates all analysts in PARALLEL (not sequential) so total time
 * is ~max(single request) instead of sum(all). Each card also has
 * its own "Re-run" button so any single analyst can be tested in
 * isolation (useful for The Colonel when we're iterating on the
 * ElevenLabs voice ID swap).
 *
 * Routing (live 2026-04-09):
 *   Void-Caster    → Gemini 2.5 TTS (Charon)
 *   Astra Novatos  → Gemini 2.5 TTS (Orus)
 *   Bun-E          → Gemini 2.5 TTS (Aoede)          — audition flag
 *   The Haze       → Gemini 2.5 TTS multi-speaker    — audition flag
 *   The Colonel    → ElevenLabs v3 (scoped exception) — placeholder voices
 */

import { useState } from 'react';
import { BackHomeNav } from '@/components/layout/BackHomeNav';

interface AuditionResult {
  analystId: string;
  analystName: string;
  audioUrl: string | null;
  engine: string;
  error?: string;
  durationSeconds?: number;
  elapsedMs?: number;
  httpStatus?: number;
  loading: boolean;
}

const AUDITION_ROSTER = [
  { id: 'void-caster', name: 'The Void-Caster', expected: 'Gemini 2.5 TTS · Charon (deep baritone)' },
  { id: 'astra-novatos', name: 'Astra Novatos', expected: 'Gemini 2.5 TTS · Orus (refined tenor)' },
  { id: 'bun-e', name: 'Bun-E', expected: 'Gemini 2.5 TTS · Aoede (warm alto) — AUDITION for timbre match' },
  { id: 'the-haze', name: 'The Haze (Haze + Smoke)', expected: 'Gemini 2.5 TTS multi-speaker · Puck + Schedar — AUDITION for duo quality' },
  { id: 'the-colonel', name: 'The Colonel + Gino', expected: 'ElevenLabs v3 · Jersey accent (scoped exception) — placeholder voice until real IDs land' },
];

// 30-second per-request timeout. Gemini TTS is usually 5-15s, ElevenLabs
// ~3-8s. 30s is generous headroom before we call the request dead.
const REQUEST_TIMEOUT_MS = 30_000;

export default function VoiceAuditionPage() {
  const [results, setResults] = useState<Record<string, AuditionResult>>({});
  const [running, setRunning] = useState(false);

  async function runOne(analystId: string, analystName: string): Promise<AuditionResult> {
    const start = Date.now();
    const auditionText = getAuditionText(analystId);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(`/api/analysts/${analystId}/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: auditionText }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const elapsedMs = Date.now() - start;
      const json = await res.json().catch(() => ({ error: 'invalid JSON response' }));

      return {
        analystId,
        analystName,
        audioUrl: json.audioUrl ?? null,
        engine: json.engine || 'unknown',
        durationSeconds: json.durationSeconds,
        error: json.error,
        httpStatus: res.status,
        elapsedMs,
        loading: false,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      const elapsedMs = Date.now() - start;
      const isAbort = err instanceof Error && err.name === 'AbortError';
      return {
        analystId,
        analystName,
        audioUrl: null,
        engine: 'error',
        error: isAbort
          ? `timed out after ${REQUEST_TIMEOUT_MS / 1000}s`
          : err instanceof Error
            ? err.message
            : 'audition failed',
        elapsedMs,
        loading: false,
      };
    }
  }

  async function runAll() {
    setRunning(true);
    // Seed all 5 as loading simultaneously
    const initial: Record<string, AuditionResult> = {};
    for (const entry of AUDITION_ROSTER) {
      initial[entry.id] = {
        analystId: entry.id,
        analystName: entry.name,
        audioUrl: null,
        engine: 'pending',
        loading: true,
      };
    }
    setResults(initial);

    // Fire all requests in parallel. Each resolves independently
    // and updates its own card — no one analyst blocks the others.
    await Promise.allSettled(
      AUDITION_ROSTER.map(async entry => {
        const result = await runOne(entry.id, entry.name);
        setResults(prev => ({ ...prev, [entry.id]: result }));
      }),
    );
    setRunning(false);
  }

  async function runSingle(analystId: string, analystName: string) {
    setResults(prev => ({
      ...prev,
      [analystId]: {
        analystId,
        analystName,
        audioUrl: null,
        engine: 'pending',
        loading: true,
      },
    }));
    const result = await runOne(analystId, analystName);
    setResults(prev => ({ ...prev, [analystId]: result }));
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-6">
        <BackHomeNav />
      </div>
      <h1 className="mb-2 text-3xl font-bold text-white">Voice Audition</h1>
      <p className="mb-8 text-sm text-zinc-400">
        Parallel audition runner for all 5 Per|Form analyst voices.
        Click Run — all 5 generate simultaneously and each card updates
        as soon as its own request resolves. Each card also has a Re-run
        button for isolated testing (useful when swapping ElevenLabs
        voice IDs for The Colonel).
      </p>

      <div className="mb-10 flex gap-3">
        <button
          onClick={runAll}
          disabled={running}
          className="rounded bg-amber-500 px-6 py-3 font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
        >
          {running ? 'Running all 5 in parallel...' : 'Run Full Audition'}
        </button>
      </div>

      <div className="space-y-6">
        {AUDITION_ROSTER.map(entry => {
          const result = results[entry.id];
          return (
            <div
              key={entry.id}
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-5"
            >
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">{entry.name}</h2>
                <div className="flex items-center gap-3">
                  {result?.loading && (
                    <span className="text-xs text-amber-400">generating...</span>
                  )}
                  <button
                    onClick={() => runSingle(entry.id, entry.name)}
                    disabled={result?.loading}
                    className="rounded border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:border-amber-500 hover:text-amber-400 disabled:opacity-50"
                  >
                    {result && !result.loading ? 'Re-run' : 'Run'}
                  </button>
                </div>
              </div>
              <p className="mb-3 text-xs text-zinc-500">{entry.expected}</p>

              {result?.audioUrl && (
                <>
                  <audio controls src={result.audioUrl} className="w-full" />
                  <p className="mt-2 text-xs text-zinc-500">
                    engine: <span className="text-zinc-300">{result.engine}</span>
                    {result.elapsedMs && ` · ${(result.elapsedMs / 1000).toFixed(1)}s elapsed`}
                    {result.durationSeconds && ` · ~${result.durationSeconds}s audio`}
                  </p>
                </>
              )}
              {result?.error && (
                <p className="mt-1 break-words text-xs text-red-400">
                  {result.httpStatus && `HTTP ${result.httpStatus} · `}
                  error: {result.error}
                  {result.elapsedMs && ` · failed after ${(result.elapsedMs / 1000).toFixed(1)}s`}
                </p>
              )}
              {!result && (
                <p className="text-xs text-zinc-600">not yet run</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getAuditionText(analystId: string): string {
  // SHORT audition lines — one punchy line per solo, two short
  // turns per duo. Tuned to exercise each voice's defining
  // qualities in the minimum time. Long enough to judge timbre
  // + cadence, short enough to generate in under 10 seconds.
  switch (analystId) {
    case 'void-caster':
      return 'Ladies and gentlemen, the clock is at zero, and the future just walked through the door. This pick right here is the one they will be talking about in ten years.';
    case 'astra-novatos':
      return 'Before the injury took my game, I thought greatness lived on the field. Then I saw the ateliers of Paris and realized greatness lives in the details.';
    case 'bun-e':
      return 'They keep asking me where I learned the law. I tell them Black\'s Dictionary knows me better than my own reflection. When wisdom meets the system, the ones who built the rules sometimes forget whose rules they serve.';
    case 'the-haze':
      return `[HAZE] Yo, Jeremiyah Love at Running Back number one. The tape is crazy — this kid could be the face of a shoe line next spring.

[SMOKE] Facts, Haze. But before we talk shoe lines, we talk readiness. The Mastering the NIL playbook starts at AAU.`;
    case 'the-colonel':
      return `[COLONEL] Lemme tell ya somethin' — this kid's tape? Forget about it. Back at Union in eighty seven I had a teammate exactly like this.

[GINO] Colonel, I'm tryin' to run a pizzeria here. But yeah, the kid's got it.`;
    default:
      return 'Voice audition sample for the Per|Form analyst platform.';
  }
}
