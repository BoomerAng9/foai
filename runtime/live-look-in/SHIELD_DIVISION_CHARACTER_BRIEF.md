# Shield Division — Character Art Brief (Wave 1)

**Owner:** Iller_Ang (Creative Director, Office of the CDO)
**Consumer:** NVIDIA Omniverse + Cosmos scene at `foai/runtime/live-look-in/`
**Model routing:** Recraft V4 / V4 Pro (per Iller_Ang's standing directive for character art)
**Status:** DRAFT — awaiting Iller_Ang execution
**Date opened:** 2026-04-17

## Visual canon

Every prompt in this brief inherits the canonical Shield Division Hawk anatomy documented in memory at `project_shield_division_hawk_anatomy.md`. Summary:

- Anthropomorphic eagle/hawk with brown/white tiger-stripe plumage
- Olive-drab tactical combat helmet with 3-tube NVG mount (emerald-green lenses)
- Antenna + boom mic
- DEPLOY chevron patch on right shoulder (platinum-textured variant for Gold & Platinum Squad)
- Plate carrier base; A.I.M.S. silver chestplate optional per Hawk
- Tactical gloves, MOLLE webbing
- **Spinner** (weaponized boomerang) in holster/bandolier/chest-rig — NEVER a firearm or blade
- Default Hawk has both eyes visible and functional; eye patch is a persona-specific option, not a universal rule

Reference images: `iCloudPhotos/Photos/IMG_2563(1).JPG`, `IMG_2565.JPG`, `IMG_0787.JPG`. The rifles visible in those images are excluded from our recreations per the Spinner-is-armament rule.

## Wave 1 roster — 5 Hawks

Starting with the five Hawks that already have Semantic Constraint Profiles (`config/shield/hawks/*.yml`) so the visual canon and governance canon advance together.

---

### 1. Reaper — `Lil_Scope_Hawk` — Black Squad

**Role:** Kinetic Execution, AI/ML pen test
**Cognitive profile:** Aggressive, high-entropy, outcome-oriented

**Visual thesis:** The one who lines up the shot. Sniper-grade precision applied to offensive AI/ML testing.

**Persona elements on top of canon:**

- HUD-scope optical lens over right eye (an augmentation, not a patch) — reads as "sniper optic"
- Matte-black / gunmetal accents on plate carrier webbing and helmet rails
- A.I.M.S. chestplate present, darkened (black-anodized variant of the silver)
- Spinner mounted in quick-draw chest-rig across the A.I.M.S. plate
- Eye color: steel grey
- No armband (Black Squad goes austere — the ANG patch lives on the shoulder)
- DEPLOY chevron standard olive-green
- Mood: coiled, not yet striking. Wrong moment to be in front of.

**Recraft V4 prompt seed:** "Anthropomorphic eagle tactical operator, matte black and gunmetal accents over olive plate carrier, 3-tube NVG helmet, HUD-scope optical augmentation on right eye, A.I.M.S. silver chestplate with black anodized finish, weaponized boomerang in chest holster, DEPLOY chevron patch on right shoulder, industrial warehouse background with tactical smoke, cinematic lighting, Recraft V4 character portrait style"

---

### 2. Privacy — `Lil_Seal_Hawk` — White Squad

**Role:** Edge Redaction, Differential Privacy, SNR Throttling, ZKP generation
**Cognitive profile:** Deterministic
**Formally verified kernel member** — one of the 5 kernel components under Hex's verification ownership

**Visual thesis:** Quiet, absolute, at the boundary. The Hawk who lets nothing through that shouldn't pass.

**Persona elements on top of canon:**

- Polished chrome / clean-white accents — plate carrier webbing, helmet trim, boot panels
- A.I.M.S. chestplate present, mirror-polished chrome finish with faint etched redaction-rune overlay (subtle pattern, not flashy — legible up close, invisible at distance)
- ACHIEVEMOR checkmark seal emblem on chestplate center (play on the "Seal" kunya)
- Clean white armband replacing the standard brown ANG patch
- Spinner in side holster (low-key, because this Hawk doesn't brandish)
- Eye color: ice blue
- DEPLOY chevron standard olive
- Mood: composed, boundary-guardian, unflinching

**Recraft V4 prompt seed:** "Anthropomorphic eagle tactical operator, clean white and polished chrome accents, mirror-chrome A.I.M.S. chestplate with faint etched redaction-rune overlay, ACHIEVEMOR checkmark seal emblem on chest, white armband, 3-tube NVG helmet with chrome trim, weaponized boomerang in side holster, DEPLOY chevron on right shoulder, ice-blue eyes, clean laboratory-grade background with soft cool lighting, Recraft V4 character portrait style"

---

### 3. Halo — `Lil_Mast_Hawk` — Gold & Platinum Squad Lead

**Role:** Identity / MFA / SAT co-signer / platform-level SIGINT top-cover
**Cognitive profile:** Absolute / Gateway

**Visual thesis:** The gate. Nothing passes without their co-signature. Elevated, platinum, radiant-but-controlled.

**Persona elements on top of canon:**

- Platinum-textured helmet with a subtle luminous ring integrated along the top rim (the "halo" read — present, not garish)
- A.I.M.S. chestplate in platinum-chrome with gold highlight accents on the edge trim
- DEPLOY chevron patch in platinum texture (Gold & Platinum Squad variant)
- Co-signer glyph on right forearm — a small ed25519+ML-DSA cryptographic sigil
- ACHIEVEMOR checkmark crest on chestplate center, platinum-textured
- Spinner in bandolier across chest, also platinum-finished
- Eye color: gold
- Mood: composed sentinel. Has signed off, or has not signed off. There is no third state.

**Recraft V4 prompt seed:** "Anthropomorphic eagle tactical operator, platinum-textured helmet with subtle luminous halo ring along top rim, platinum-chrome A.I.M.S. chestplate with gold edge trim, ACHIEVEMOR checkmark crest in platinum, platinum DEPLOY chevron on right shoulder, cryptographic co-signer glyph on right forearm, platinum weaponized boomerang in chest bandolier, gold eyes, command-center architectural background with platinum column accents, Recraft V4 cinematic character portrait"

---

### 4. Paranoia — `Lil_Doubt_Hawk` — Gold & Platinum (independent auditor)

**Role:** Internal Auditor / Shield Division internal red team / reports to ACHEEVY directly (NOT Crypt_Ang)
**Cognitive profile:** Adversarial / Internal

**Visual thesis:** The one who watches the watchmen. Marked distinct from squad peers. The ACHEEVY-orange accent is the visible proof of the independent reporting line.

**Persona elements on top of canon:**

- Platinum base (standard Gold & Platinum palette) BUT with a single ACHEEVY-orange accent line (`#FF6B00`) running across the top of the chestplate — this is the signature. It encodes the reporting override to ACHEEVY
- A.I.M.S. chestplate in platinum with the orange accent stripe
- Secondary smaller badge near the main crest: a second ACHIEVEMOR checkmark in orange-over-platinum (the independent audit mark)
- Stance inverted from other Gold Hawks — mirror the standard pose axis, subtle but readable in a lineup
- Spinner carried in a less-flashy holster — this Hawk works under observation suspicion, doesn't advertise
- Eye color: amber
- Helmet has one small additional antenna — a covert channel back to ACHEEVY
- Mood: watchful of allies. Doesn't blink when peers do.

**Recraft V4 prompt seed:** "Anthropomorphic eagle tactical operator, platinum base palette with a single bright orange accent line across the top of the platinum-chrome A.I.M.S. chestplate, secondary small orange ACHIEVEMOR checkmark badge beside main crest, platinum DEPLOY chevron, extra small covert antenna on helmet, amber eyes, weaponized boomerang in discreet side holster, inverted stance compared to Gold Squad peers, shadowed independent-auditor-booth background, Recraft V4 cinematic character portrait"

---

### 5. Hex — `Lil_Peel_Hawk` — Gold & Platinum

**Role:** Formal Verifier / Malware RE / owns all 5 formally verified kernel components
**Cognitive profile:** Mathematical / Proof

**Visual thesis:** The mathematician-operator. Reverse-engineer, proof-obligation discharger, final verifier before ship.

**Persona elements on top of canon:**

- Multi-lens helmet augmentation beyond standard 3-tube NVG — additional lenses for reverse-engineering work (4 or 5 lenses total in a cluster, visibly specialized)
- A.I.M.S. chestplate in platinum with faintly etched proof-obligation glyphs — Kani/Prusti sigils, a small ∀ quantifier, subtle Rust crate mark — readable to the initiated, decorative to everyone else
- Tool-rig on belt (replacing the brown ANG armband) — visible reverse-engineering kit pouches
- Spinner in side holster; secondary utility tool on opposite hip
- Eye color: luminous cyan (reads as "analytical mode")
- Platinum DEPLOY chevron
- Mood: watching for the bug. Has already found three you didn't notice.

**Recraft V4 prompt seed:** "Anthropomorphic eagle tactical operator, specialized multi-lens helmet augmentation with 5-lens reverse-engineering cluster, platinum A.I.M.S. chestplate with faint etched mathematical proof-obligation glyphs and subtle Rust crate mark, belt tool-rig with reverse-engineering pouches, luminous cyan eyes, platinum DEPLOY chevron, weaponized boomerang in side holster, workshop-laboratory background with proof-chain visualizations, Recraft V4 cinematic character portrait"

---

## DMAIC gate (per Iller_Ang skill)

Every generated asset must pass:

- **Define** — Hawk identity clear (kunya + persona ID + squad + role + constraint file reference)
- **Measure** — ≥ 1080px short edge for Live Look In reference use; 4K for cinematic
- **Analyze** — Typography legible where present (A.I.M.S. wordmark, DEPLOY patch, crest emblems)
- **Improve** — Each Hawk is visually distinguishable at a glance from the other four — not variants of one portrait
- **Control** — No firearms/blades anywhere. Spinner is the only visible armament. ACHIEVEMOR wordmark never distorted.

## Next-wave expansion

After Wave 1 lands and the visual canon is confirmed, subsequent waves fill in the remaining 27 Hawks organized by squad:

- Wave 2 — rest of Gold & Platinum (Oracle, Vault, Ghost, Titan, Mirror) — 5 Hawks
- Wave 3 — rest of Black Squad (Captain, Specs, Tagger, Spider, Proof) — 5 Hawks
- Wave 4 — Blue Squad (Sentry, Sparks, Hound, Doc, Cipher, Latency) — 6 Hawks
- Wave 5 — Purple Squad (Bridge, Echo, Tuner, Scout) — 4 Hawks
- Wave 6 — rest of White Squad (Counsel, Compass, Frame, Warden, Ledger, Herald, Quarterback) — 7 Hawks

Total: 32 Hawks across 6 waves. Each wave passes DMAIC gate independently.
