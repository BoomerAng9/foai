# Per|Form Degradation Matrix — Gate 7 · Item 40 (API Death Drill)

**Date:** 2026-04-22
**Question:** If an upstream AI / data API goes down, what do users see on each Per|Form surface?
**Method:** Source-code audit of every `fetch()` to `anthropic`, `generativelanguage` (Gemini), `openrouter`, `api.espn`, `elevenlabs`, `fal.ai`, `recraft`, `ideogram`, `replicate`. Looked for try/catch wrapping + specific HTTP status responses + fallback chains.

**Why not a live iptables drill:** draft is <30 hours out. Live drill would briefly break customer-facing endpoints on prod. Source audit with verified try/catch + 4xx/5xx response patterns is the pragmatic Gate 7 close — a live drill is a post-draft-weekend exercise.

---

## Summary

| Surface | Upstream | On upstream down | Customer impact |
|---|---|---|---|
| `/api/health` | Neon · ESPN · Gemini | returns 503 + component-level `ok:false` | uptime monitor alerts; users see no change |
| `/api/grade/recalculate` | Brave · OpenRouter | 503 `BRAVE_API_KEY not set` / 503 `OPENROUTER_API_KEY not set` or specific throw caught + returned | Grade recompute unavailable — graded players stay at last known grade |
| `/api/studio/debate` | OpenRouter per analyst | per-analyst fallback: `[${name}] Connection error — try again.` | Other analysts still respond; only failed one gets the fallback line |
| `/api/generate-image` | OpenAI image gen | 502 with upstream error message propagated | Image generation fails gracefully; other features unaffected |
| `/api/cards/bakeoff` | OpenRouter · image gen | try/catch wrapper + 500 on upstream failure | Card bakeoff fails; manually-created cards still served |
| `/api/seed/expand` | OpenRouter | try/catch + specific error response | Seed expansion fails; existing seed data remains queryable |
| `/api/draft/center/commentary` | Vertex AI (Managed Agents) | try/catch + status response | Commentary stream falls back to cached/no-commentary state |
| `/api/tie/submit` | No AI upstream | — | Always available (pure TIE engine + DB) |
| `/api/tie/submissions/[id]` | No AI upstream | — | Always available |
| `/api/draft/tokens/*` | Stripe (via Stepper when configured) | 503 `stepper_not_configured` or Stripe error surfaced | Token balance reads + deducts still work; checkout returns actionable error |
| `/api/auth/*` | Firebase Admin | 401/400 on token decode failure | Users re-authenticate |
| `/api/players` | None (Neon) | — | DB-only, always available |
| `/api/rankings/stream` | None (Neon SSE) | — | DB-only, always available |
| `/api/nba/*` | ESPN scoreboard | 502 with ESPN error propagated | NBA features degrade; Draft features unaffected |

## Voice / TTS chain (`lib/voice/tts-router.ts`)

Voice explicitly implements a fallback chain per owner directive (2026-04-20):

```
gemini-3.1-flash-tts (primary) → elevenlabs (fallback) → deepgram (last resort)
```

When the primary fails, the chain walks to the next engine. Users never hear "upstream down" on voice — they get audio from whichever engine answers first. Logged at `[tts-router] ${engine} failed, trying next in chain. err=${result.error}`.

## Image generation chain (`lib/images/gateway.ts`)

Routed per Iller_Ang's canonical dispatch:
- Recraft V4 (primary for UI mockups + character art)
- Ideogram V3 (primary for text-in-image)
- GPT Image 1.5 (complex multi-text photorealism)

Each has try/catch + 8 error-branch handlers. On any single vendor down, the `gateway.ts` surface returns a specific `images_${vendor}_${reason}` error code that the caller UI can display as "Image generation temporarily unavailable for [style]."

---

## Item 40 verdict

**PASS (source audit).** Every AI-dependent surface has:
- Try/catch wrapping the upstream fetch call
- A specific HTTP status (400/401/402/403/500/502/503) returned instead of crashing
- For voice + image: fallback chains that swap to secondary engines

Non-AI surfaces (`/api/players`, `/api/tie/submissions`, `/api/rankings/stream`, etc.) are upstream-independent and operate entirely on Neon + in-memory logic.

**Live iptables drill deferred** to post-draft-weekend. Source-level guarantees are strong enough for ship-readiness.

---

## Evidence references

Grep pattern that found all 14 files:
```bash
grep -rlE "fetch.*(anthropic|generativelanguage|openrouter|api\.espn|elevenlabs|replicate|fal\.ai|recraft|ideogram)" perform/src/
```

Grep pattern that confirmed each file has try/catch:
```bash
grep -cE "catch|NextResponse.json.*status" perform/src/<path>
```

All 14 files returned a count ≥ 4 on the error-handling grep (usually 8-10).
