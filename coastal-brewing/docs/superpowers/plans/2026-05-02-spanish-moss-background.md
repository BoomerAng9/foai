# Spanish Moss Background Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Spanish moss to the existing typographic background of `brewing.foai.cloud` as one more whisper-quiet ambient layer (storks, palms, waves, +moss).

**Architecture:** Single-file extension to `web/components/coastal-ascii-bg.tsx`. Two new render layers (ASCII strands + SVG clusters) inserted before the existing storks layer in the JSX so storks paint OVER moss (canopy depth illusion). All values hardcoded at module scope to avoid Next.js SSR hydration mismatch. No new files, no new dependencies.

**Tech Stack:** Next.js 14 (standalone), React, TypeScript, Tailwind CSS, framer-motion (already installed).

**Spec:** `docs/superpowers/specs/2026-05-02-spanish-moss-background-design.md`

**No automated tests:** This codebase has no visual-regression infrastructure. The spec explicitly defers verification to a four-page prod smoke check (Task 7). Do not add tests.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `web/components/coastal-ascii-bg.tsx` | Modify | Add `mossStrands` const, `mossClusters` const, `MossCluster` sub-component, two new render layers in correct stacking position |

No other files are touched.

---

## Task 1: Add moss data constants + Braille char-set

**Files:**
- Modify: `web/components/coastal-ascii-bg.tsx` (top-of-file constants block)

- [ ] **Step 1: Open the file and locate the existing constants block**

The existing constants are at the top of the file: `STORK_R`, `STORK_L`, `PALM`, `W1/W2/W3`, `storks`, `palms`, `waves`. New moss constants go in this same block, after `waves` and before the `CoastalAsciiBackground` component.

- [ ] **Step 2: Add the strand-data interface and array**

Add this block after the existing `waves` const (just before `export function CoastalAsciiBackground`):

```typescript
// ─── Spanish moss — sitewide background layer (Phase 4) ───────────────────
// Per docs/superpowers/specs/2026-05-02-spanish-moss-background-design.md.
// All values are hardcoded const at module scope to avoid Next.js SSR
// hydration mismatch — do NOT replace any of these with Math.random().

interface MossStrand {
  left: string;        // viewport-relative horizontal anchor
  chars: string;       // multi-line braille glyph stack (rendered via whitespace-pre)
  fontSize: number;    // px
  duration: number;    // sway cycle, seconds
  delay: number;       // sway start delay, seconds
}

const mossStrands: MossStrand[] = [
  { left: "4%",  chars: "⠁\n⠂\n⠄\n⠁\n⠂\n⠄\n⠁",                   fontSize: 11, duration: 5.2, delay: 0.0 },
  { left: "13%", chars: "⠂\n⠁\n⠄\n⠈\n⠐\n⠂\n⠁\n⠄\n⠈",             fontSize: 12, duration: 4.4, delay: 1.2 },
  { left: "27%", chars: "⠄\n⠁\n⠂\n⠁\n⠄\n⠁",                       fontSize: 10, duration: 5.8, delay: 0.4 },
  { left: "39%", chars: "⠈\n⠐\n⠠\n⡀\n⢀\n⠁\n⠂\n⠄",                 fontSize: 13, duration: 4.0, delay: 2.1 },
  { left: "52%", chars: "⠁\n⠄\n⠈\n⠂\n⠁\n⠄\n⠈\n⠂\n⠁\n⠄",          fontSize: 11, duration: 5.5, delay: 0.7 },
  { left: "64%", chars: "⠂\n⠁\n⠄\n⠁\n⠂\n⠄",                       fontSize: 10, duration: 4.7, delay: 1.6 },
  { left: "78%", chars: "⠄\n⠈\n⠐\n⠠\n⡀\n⢀\n⠁\n⠂\n⠄\n⠁\n⠂",       fontSize: 12, duration: 4.2, delay: 2.5 },
  { left: "92%", chars: "⠁\n⠂\n⠄\n⠁\n⠂\n⠄\n⠈",                   fontSize: 11, duration: 5.0, delay: 0.3 },
];

interface MossClusterSpec {
  left: string;
  duration: number;
  delay: number;
}

const mossClusters: MossClusterSpec[] = [
  { left: "18%", duration: 6.2, delay: 0.5 },
  { left: "52%", duration: 5.5, delay: 1.8 },
  { left: "81%", duration: 6.8, delay: 0.0 },
];
```

- [ ] **Step 3: Verify the file still parses**

Run: `cd ~/foai/coastal-brewing/web && npx tsc --noEmit 2>&1 | grep coastal-ascii-bg`
Expected: no errors mentioning `coastal-ascii-bg.tsx`. (Other unrelated TS warnings are acceptable; only check this file.)

- [ ] **Step 4: Commit**

```bash
cd ~/foai/coastal-brewing
git add web/components/coastal-ascii-bg.tsx
git commit -m "feat(coastal/web): add moss strand + cluster data constants"
```

---

## Task 2: Add MossCluster SVG sub-component

**Files:**
- Modify: `web/components/coastal-ascii-bg.tsx` (after the constants block, before `CoastalAsciiBackground`)

- [ ] **Step 1: Add the MossCluster sub-component**

Add immediately after the `mossClusters` array, before `export function CoastalAsciiBackground`:

```typescript
// Reusable SVG tuft — three nested downward-tapering quadratic-bezier arcs.
// fill="none" + stroke="currentColor" inherits the parent's
// text-foreground/[0.085] color and opacity. ViewBox 80×60 logical units.
function MossCluster() {
  return (
    <svg
      viewBox="0 0 80 60"
      width="80"
      height="60"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      aria-hidden="true"
    >
      <path d="M 14 0 Q 22 28 18 56" />
      <path d="M 38 0 Q 46 32 40 58" />
      <path d="M 60 0 Q 68 30 64 54" />
    </svg>
  );
}
```

- [ ] **Step 2: Verify the file still parses**

Run: `cd ~/foai/coastal-brewing/web && npx tsc --noEmit 2>&1 | grep coastal-ascii-bg`
Expected: no errors mentioning `coastal-ascii-bg.tsx`.

- [ ] **Step 3: Commit**

```bash
cd ~/foai/coastal-brewing
git add web/components/coastal-ascii-bg.tsx
git commit -m "feat(coastal/web): add MossCluster SVG sub-component"
```

---

## Task 3: Add the two new render layers in correct stacking position

**Files:**
- Modify: `web/components/coastal-ascii-bg.tsx` (inside the `CoastalAsciiBackground` JSX return)

The two new layers go BEFORE the existing `{storks.map(...)}` block. Putting moss earlier in the DOM means it paints first; storks paint over it (canopy depth — storks fly above the moss, not under it). Palms and waves are at the bottom of the viewport and don't intersect with moss, so DOM order relative to them doesn't change visual outcome.

- [ ] **Step 1: Locate the existing render block**

Inside `CoastalAsciiBackground`, find the line with the comment `{/* Wood storks in flight */}` immediately followed by `{storks.map((s, i) => (`. The new moss layers go IMMEDIATELY BEFORE that comment.

- [ ] **Step 2: Insert the moss strands layer**

Insert this block immediately before the `{/* Wood storks in flight */}` comment:

```jsx
      {/* Spanish moss — ASCII fiber strands hanging from top edge */}
      {mossStrands.map((m, i) => (
        <motion.pre
          key={`moss-strand-${i}`}
          className="absolute whitespace-pre leading-[0.85] m-0"
          style={{
            top: 0,
            left: m.left,
            fontSize: `${m.fontSize}px`,
          }}
          animate={{ x: [-2, 2, -2] }}
          transition={{
            delay: m.delay,
            duration: m.duration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {m.chars}
        </motion.pre>
      ))}
```

- [ ] **Step 3: Insert the moss clusters layer immediately after the strands layer**

Insert this block immediately after the strands layer (still BEFORE the `{/* Wood storks in flight */}` comment):

```jsx
      {/* Spanish moss — SVG tuft accents */}
      {mossClusters.map((c, i) => (
        <motion.div
          key={`moss-cluster-${i}`}
          className="absolute"
          style={{
            top: 0,
            left: c.left,
          }}
          animate={{ x: [-2, 2, -2] }}
          transition={{
            delay: c.delay,
            duration: c.duration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <MossCluster />
        </motion.div>
      ))}
```

- [ ] **Step 4: Verify final file parses cleanly**

Run: `cd ~/foai/coastal-brewing/web && npx tsc --noEmit 2>&1 | grep coastal-ascii-bg`
Expected: no errors mentioning `coastal-ascii-bg.tsx`.

- [ ] **Step 5: Verify visually with the existing storks-over-moss stacking**

Confirm the JSX render order in `CoastalAsciiBackground` is now (top-to-bottom in source):
1. moss strands
2. moss clusters
3. storks (UNCHANGED)
4. palms (UNCHANGED)
5. waves wrapper (UNCHANGED)

If any of those are out of order, fix before committing.

- [ ] **Step 6: Commit**

```bash
cd ~/foai/coastal-brewing
git add web/components/coastal-ascii-bg.tsx
git commit -m "feat(coastal/web): wire moss layers into background, storks paint over moss"
```

---

## Task 4: Local visual check via pnpm dev

**Files:** none modified.

- [ ] **Step 1: Start the dev server**

```bash
cd ~/foai/coastal-brewing/web
npm run dev
```

Expected: Next.js starts on a port (usually 3000 or 3010). If port 3000 is taken, the next free port is used — note the actual URL printed.

- [ ] **Step 2: Open the homepage in a browser**

Open the URL printed by `npm run dev` (e.g. `http://localhost:3000`) in a browser.

- [ ] **Step 3: Visually confirm the moss is visible**

Confirm by eye:
- Moss strands hang from the top edge as small dotted vertical fibers.
- Moss SVG tufts visible at roughly 18% / 52% / 81% across the top.
- Strands sway gently (±2px) — motion is calm, not jarring.
- Moss is whisper-quiet — same opacity register as the storks/palms/waves (no contrast jump).
- Storks fly OVER the moss when they cross the top band.

- [ ] **Step 4: Visit /team and /partners in the browser**

Confirm moss appears on inner pages too (it should — the background is mounted in `app/layout.tsx`).

- [ ] **Step 5: Stop the dev server**

`Ctrl-C` in the terminal running `npm run dev`.

If the visual check failed (e.g. moss is too prominent, too sparse, sway is wrong, hydration warning in console), STOP and report the specific failure to the human reviewer. Do NOT proceed to deploy.

---

## Task 5: SCP the changed file to aims-vps

**Files:** none modified locally.

- [ ] **Step 1: Confirm the file is the version you want to ship**

```bash
ls -la ~/foai/coastal-brewing/web/components/coastal-ascii-bg.tsx
```

Note the size and modification time. The file should be larger than the pre-moss version (~3.8 KB became ~6 KB-ish after moss).

- [ ] **Step 2: SCP to aims-vps**

```bash
scp ~/foai/coastal-brewing/web/components/coastal-ascii-bg.tsx \
    aims-vps:/docker/coastal-brewing/web/components/coastal-ascii-bg.tsx
```

Expected: scp prints the filename + transfer size, no errors.

- [ ] **Step 3: Verify the file landed**

```bash
ssh aims-vps "ls -la /docker/coastal-brewing/web/components/coastal-ascii-bg.tsx"
```

Expected: same size as the local file. Mtime is now (roughly).

---

## Task 6: Rebuild + restart coastal-web on aims-vps

**Files:** none modified.

- [ ] **Step 1: Rebuild the coastal-web image**

```bash
ssh aims-vps "cd /docker/coastal-brewing && docker compose build coastal-web 2>&1 | tail -8"
```

Expected: `Image coastal-brewing-coastal-web Built`. If the build fails (TypeScript errors, missing file), STOP and report.

- [ ] **Step 2: Restart the coastal-web container**

```bash
ssh aims-vps "cd /docker/coastal-brewing && docker compose up -d coastal-web 2>&1 | tail -3"
```

Expected: `Container coastal-web Started`.

- [ ] **Step 3: Wait briefly for the container to become healthy**

```bash
sleep 5 && ssh aims-vps "docker ps --filter name=coastal-web --format '{{.Status}}'"
```

Expected: `Up X seconds (healthy)` or `Up X seconds`.

- [ ] **Step 4: Confirm the home page returns 200**

```bash
curl -s -o /dev/null -w "%{http_code}" "https://brewing.foai.cloud/"
```

Expected: `200`.

---

## Task 7: Four-page prod smoke check (canonical verification per spec)

**Files:** none modified.

- [ ] **Step 1: Open all four target pages in a browser**

Open each URL in a fresh browser tab (cmd-click is fine, just keep them open):
- `https://brewing.foai.cloud/`
- `https://brewing.foai.cloud/team`
- `https://brewing.foai.cloud/partners`
- `https://brewing.foai.cloud/products`

- [ ] **Step 2: For each page, confirm visually**

For every one of the four pages, confirm by eye:

(a) Moss is visible at the top edge as small dotted fibers + 3 small SVG tufts.
(b) Moss reads as ambient texture, not a callout — opacity is consistent with storks/palms/waves (no contrast jump).
(c) Sway is calm (±2px range, slow ease-in-out cycles), not jarring.
(d) Storks fly OVER moss when they cross the top band (canopy depth — moss does NOT overlap on top of storks).
(e) Page content (hero, cast grid, partners cards, product cards) is unaffected — no layout shift, no overlap with the page body.
(f) Browser console has no hydration warnings ("Text content does not match server-rendered HTML" etc).

If any of (a) through (f) fail on any page, STOP and report which page + which check failed. Do not declare ship.

- [ ] **Step 3: Mobile spot-check**

Open `https://brewing.foai.cloud/` in a mobile viewport (browser devtools → mobile emulation, or your phone). Confirm:
- Moss is visible (some outermost strands may clip — acceptable per spec).
- No layout breakage.
- Sway is still calm.

- [ ] **Step 4: Mark complete**

If all checks pass, the moss layer is shipped. Report back to the human with: pages checked, anything anomalous, and a brief comment on visual register.

---

## Self-review (verification this plan is complete)

**1. Spec coverage:**
- Spec § Architecture — covered by Task 3 (DOM stacking order locked: moss strands, moss clusters, then storks).
- Spec § Visual spec / ASCII strands — covered by Task 1 (hardcoded strand-data array with concrete Braille char content, font sizes, durations, delays).
- Spec § Visual spec / SVG cluster accents — covered by Task 2 (MossCluster sub-component with viewBox, fill, stroke, three quadratic beziers).
- Spec § Color — covered by `currentColor` on the SVG and inheritance through the parent's `text-foreground/[0.085]` (Task 1 + Task 3 — strands inherit via parent text color, clusters via `currentColor` stroke).
- Spec § Animation — covered by Task 3 (motion.pre / motion.div with `animate={{x:[-2,2,-2]}}`, per-entry duration + delay).
- Spec § Coverage — covered by Task 4 step 4 + Task 7 step 1 (four-page check confirms sitewide via existing layout mount).
- Spec § Mobile behavior — covered by Task 7 step 3.
- Spec § Performance — no task needed; the spec asserts no measurable impact and there are no perf gates.
- Spec § Accessibility — `aria-hidden="true"` is added on the MossCluster SVG (Task 2 — explicit) and inherited from the parent on the strands.
- Spec § Verification — exactly Task 7.

**2. Placeholder scan:** No "TBD" / "TODO" / "implement later" / "add appropriate error handling" / "similar to Task N" anywhere. Every code block is the actual code to paste.

**3. Type consistency:**
- `MossStrand` interface defined Task 1 → used in Task 1 + Task 3 ✓
- `MossClusterSpec` interface defined Task 1 → used in Task 1 + Task 3 ✓
- `MossCluster` sub-component defined Task 2 → used in Task 3 ✓
- `mossStrands` const defined Task 1 → used in Task 3 ✓
- `mossClusters` const defined Task 1 → used in Task 3 ✓
- All field names (`left`, `chars`, `fontSize`, `duration`, `delay`) consistent across interface and array ✓

**4. Stacking-order assertion:** Task 3 explicitly verifies the JSX order is moss-strands → moss-clusters → storks → palms → waves-wrapper. The stacking risk (storks must paint OVER moss) is explicitly checked in Task 3 step 5 AND in Task 7 step 2(d).

No issues found. Plan is complete.
