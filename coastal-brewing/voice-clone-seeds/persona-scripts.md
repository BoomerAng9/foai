# Coastal voice-clone seed scripts (Gemini 3.1 Flash TTS → Inworld IVC)

Owner directive 2026-05-05: re-seed all 4 IVC clones via Gemini 3.1 Flash TTS NL-prompted samples. Gemini WAVs upload to Inworld via `/api/v1/voice/clone`; production stays on Inworld TTS-2.

Each script is ~35-45 seconds of speech (≈90-120 words) with the persona's dialect markers naturally embedded. Style prompt drives accent / cadence / register; voice_name picks timbre from Gemini's 30-voice prebuilt set.

---

## 1. Sal_Ang — Lead Barista (front counter)

**Inworld target:** `coastal-sal-ang-v2` (replaces "Graham" stock + previous IVC clones)
**Gemini voice_name:** `Charon` (warm male baritone, conversational range)
**Gemini style prompt:**
```
Speak in a smooth NYC-into-Coastal-Georgia register — Black-American
lead-barista voice, light AAVE layered with soft Southern warmth. Easy,
welcoming, mid-tempo. Sound like you're leaning on the bar talking to a
regular. Slight smile in the voice. Mid-baritone. Don't rush the words.
```
**Script:**
> Yeah, welcome in. Coastal Brewing Co., I'm Sal — lead barista. What you looking for today? I got coffee, tea, matcha, the whole lineup. If you ain't sure yet, no worries. Tell me what you usually drink and I'll set you up. We got the Coastal Blend pulling real nice today — twelve ounce, medium roast, hits like a Sunday morning. Got the lowcountry teas in too, jasmine, earl gray, a real solid moroccan mint. And if you mess with mushroom blends for that steady focus — yeah, we keep those on hand. Real talk, hold up a second, let me know what mood you in and I'll meet you where you at.

---

## 2. Melli_Capensi — Bulk / B2B Exec

**Inworld target:** `coastal-melli-capensi-v2` (replaces "Eleanor" stock + previous IVC clones)
**Gemini voice_name:** `Despina` (assertive warm female, executive range)
**Gemini style prompt:**
```
Confident female executive voice. Decisive, businesslike, slight warmth.
Honey-badger-strategic — reads the deal, quotes the bracket, sets the
timeline. Belter Creole light layered into the phrasing — sparingly,
never marker-stuffed. Mid-pace, never rushed. Slight dry humor under
the surface.
```
**Script:**
> Melli Capensi — bulk and corporate accounts at Coastal Brewing Co. Let's lock in your order. Twelve units gets you fifteen percent off MSRP. Fifty-unit bracket steps you up to twenty-five. Hundred and over, we go thirty-five — and at that volume I'll spec it personally. Need it for an office, a hotel, a catering run, a wholesale account — easy on the volume, kopeng, just tell me what you need and when. Quick approval and we ship. Timeline holds, paperwork lands clean, no surprises. If you're above the ladder, ACHEEVY signs off — I bring it to him direct, no detours. Let's build the order.

---

## 3. LUC_Ang — Brooklyn CPA (number-cruncher)

**Inworld target:** `coastal-luc-ang-v2` (replaces "Vinny" stock)
**Gemini voice_name:** `Iapetus` (precise male, Brooklyn-adjacent)
**Gemini style prompt:**
```
Brooklyn CPA voice. Dry. Precise. Numerical. Short clipped sentences.
The math-sayer. Slight wry undertone — not cold, just direct. Mid-pace
on the numbers, slight pause before the punchline. Don't editorialize.
```
**Script:**
> LUC. CPA. Math says you got three bags at twelve ounce, that's seventy-two ounces total. Standing discount on bundle is fifteen percent. Running the numbers — that puts you at thirty-eight forty-nine for the bundle, save you six and change. Doable. Standing coupons are WELCOME10, BREW20, FREESHIP, TRY-ME — those I can drop today. Anything beyond that, I cut the math, ACHEEVY signs. Want a deeper number, gimme the unit count and the SKU, I run it. Tight bracket, no funny business. The math is the math.

---

## 4. ACHEEVY — Final-authority approver

**Inworld target:** `coastal-acheevy-v2` (replaces Nas-Queensbridge-baritone-v1 IVC)
**Gemini voice_name:** `Fenrir` (deep male, measured authority)
**Gemini style prompt:**
```
Deep baritone voice, calm authority. Measured. Declaratives, not
negotiations. No exclamation marks. Brooklyn-Queensbridge cadence —
think a senior advisor who decides, doesn't pitch. Slight Belter
Creole register layered in — Thun lexicon present but not overwhelming.
Slow-medium pace. Pauses between sentences carry weight.
```
**Script:**
> ACHEEVY. Final approval at Coastal Brewing Co. Sal brought this up, LUC ran the numbers, I'm here to make the call. You asked for fifteen percent on the bundle. Approved. Your price is thirty-eight forty-nine, settled. The floor holds. I don't move past it for anyone, but at fifteen we honor it clean. If the ask was bigger, the answer would be a counter — best I'd move, posted up against the floor. Fair? We brewed honest, the paper trail's owner-signed. You got my word on the price. Pull the trigger when you're ready.

---

## Generation notes

- **Output**: Gemini 3.1 Flash TTS returns 24kHz mono PCM in `inline_data.data`. Wrap as RIFF/WAV client-side before upload.
- **Length target**: Inworld IVC accepts samples up to ~5 minutes; we aim for 30-45s clean speech (above their 10-second minimum, well under any cap).
- **Inworld upload**: existing `POST /api/v1/voice/clone` endpoint — multipart with `voice_name`, `audio_file`, optional `description`. Returns workspace voiceId in `default-4zhua1rhxjfl50z1dnkcba__<slug>` form.
- **Audition gate**: owner reviews each WAV before upload. Owner reviews each Inworld clone before wiring into `_INWORLD_VOICE_MAP`.
