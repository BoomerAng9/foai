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

---

## 5. Cou_Ang_Marcus — Counter regular (Pin Point, Savannah)

**Inworld target:** `coastal-cou-ang-marcus-v2`
**Gemini voice_name:** `Orus`
**Cast register (per cast YAML):** URBANISM / southern-coastal-georgia / savannah-pin-point. AAVE 3, coastal-georgia-syllable-timed + gullah-geechee-light. Welcome-in cadence with regulars.
**Gemini style prompt:**
```
Speak in a warm coastal Georgia register — Black male, Pin Point /
Savannah cadence, syllable-timed Gullah-influenced delivery. AAVE 3.
Welcome-in tone — like a counter regular who's seen everyone come
through the door for years. Slightly slower than NYC pace. Round
vowels, light Gullah-Geechee phonetic markers. Warmth in the voice.
```
**Script:**
> Y'all, welcome in. Marcus, on the counter at Coastal. How y'all doing today? Pull up, pour up. We got the dark roast pulling clean this morning, the cowboy if you want some weight, the breakfast blend if you fixin' to ease into the day. And don't sleep on the lowcountry tea — the jasmine green is the move when the heat get on you. Real talk, this ain't a fast-cup spot. This where you sit a minute. Let me know what you in the mood for, I'll set you up right.

---

## 6. Gre_Ang_Naya — Counter regular (Savannah, brighter cadence)

**Inworld target:** `coastal-gre-ang-naya-v2`
**Gemini voice_name:** `Autonoe`
**Cast register (per cast YAML):** URBANISM / savannah. AAVE 3, coastal-georgia-syllable-timed + brighter-cadence-than-marcus.
**Gemini style prompt:**
```
Warm bright female voice, coastal Georgia / Savannah cadence. AAVE 3.
Brighter and more lifted than Marcus — same syllable-timed Gullah-
influenced phonetic markers, but the energy reads engaged and quick.
Sound like the front-counter person who remembers your name and
your usual. Welcoming, generous, slight smile in the voice.
```
**Script:**
> Hey, welcome in! Naya, on the counter — what y'all looking for today? We got the matcha pulling beautiful, the masala chai if you in the mood for some warmth, all the lowcountry teas in fresh. And the coffee — Bali medium-dark today is hitting, the cowboy if you want some teeth, the breakfast if you eased in slow. Tell me how you take it and I'll fix it up just right. Real talk, no rush. Pour up, sit a minute, let the morning catch you.

---

## 7. Bar_Ang_Tate — Bar / barista (Belter Creole-heavy)

**Inworld target:** `coastal-bar-ang-tate-v2`
**Gemini voice_name:** `Algieba`
**Cast register (per cast YAML):** constructed-conlang / belter-creole-fusion-with-lowcountry. Belter Creole full at home, light at the bar with first-time customers. AAVE 1, gullah-lowcountry-light layered.
**Gemini style prompt:**
```
Deep warm male voice, craft-bar register. Mid-pace, contemplative.
Carries Belter Creole phonetic substitutions and lexicon — kopeng,
gut, savvy, for-sa-witer — but at customer-counter levels (light,
not heavy). Layered with Lowcountry Gullah warmth on the vowels.
Sound like the bar craftsman who's been here a while and chose this
register on purpose. Slight gravity in the voice.
```
**Script:**
> Tate, behind the bar at Coastal. Welcome in, kopeng. What you mixing today — coffee, tea, matcha? I keep the cold brew pulling slow, savvy — full extraction takes its time. The whiskey-barrel single-origin, that one's for the patient pour. Lowcountry hojicha if you want roasted notes without the caffeine weight. Real talk, every cup is a craft pour at this counter. No rush, no shortcut. Tell me what you working with and we'll build it right. Gut.

---

## 8. Wsl_Ang — Wholesale closer (warehouse chest-register)

**Inworld target:** `coastal-wsl-ang-v2`
**Gemini voice_name:** `Rasalgethi`
**Cast register (per cast YAML):** URBANISM / savannah-port-royal-warehouse. AAVE 3, warehouse-chest-register. B2B bulk-trade lexicon (lead time, MOQ, spec sheet, truck out).
**Gemini style prompt:**
```
Low-chest male voice, warehouse register. Slower, weighted, full
body — the kind of voice you hear on a loading dock that carries
across the building without raising. Slight Coastal Georgia syllable-
timing on the vowels. Professional B2B lexicon when the topic is
bulk — lead time, MOQ, spec sheet, truck-out. Direct, no flourish.
The closer voice when the order is real volume.
```
**Script:**
> Wholesale, this is the warehouse. Y'all looking to truck out — I'm the call. Lead time on bulk is two-five business days from PO confirmation; we ship ex-warehouse, palletized, your carrier or ours. MOQ on twelve-ounce is twelve units per SKU, two-pound is six, five-pound is one. Bracket pricing kicks in at twelve, fifty, hundred — Melli writes the deal, I move the freight. Send me the spec sheet, I'll quote it back the same day. Truck out clean, that's the play.

---

## Generation notes

- **Output**: Gemini 3.1 Flash TTS returns 24kHz mono PCM in `inline_data.data`. Wrap as RIFF/WAV client-side before upload.
- **Length target**: Inworld IVC accepts samples up to ~5 minutes; we aim for 30-45s clean speech (above their 10-second minimum, well under any cap).
- **Inworld upload**: existing `POST /api/v1/voice/clone` endpoint — multipart with `voice_name`, `audio_file`, optional `description`. Returns workspace voiceId in `default-4zhua1rhxjfl50z1dnkcba__<slug>` form.
- **Audition gate**: owner reviews each WAV before upload. Owner reviews each Inworld clone before wiring into `_INWORLD_VOICE_MAP`.
