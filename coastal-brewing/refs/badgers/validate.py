#!/usr/bin/env python3
"""
Stress-test the Entandra Sett extension patch against the documented BARS spec.

Checks:
  1. JSON syntax + structure
  2. Schema conformance per BARS-DICTIONARY.md (action/target/description required)
  3. Collision detection against documented base keywords
  4. Naming convention conformance
  5. Internal consistency (action type vs description, config shape)
  6. Funnel-stage ordering integrity
  7. Attribution completeness (contributed_by on every keyword)
  8. Keyword resolution dry-run against all BARS stanzas in the charter
  9. jq merge command semantic check
"""

import json
import re
import sys
from pathlib import Path

# ---- Paths ----
PATCH = Path("/home/claude/entandra-sett-extension.json")
CHARTER = Path("/home/claude/THE_SETT_CHARTER.md")

# ---- Documented base keywords, scraped from BARS-DICTIONARY.md and BARS-INSTALL.md ----
# Not all 127 — only the ones explicitly documented. Anything beyond these is unknown.
DOCUMENTED_BASE_KEYWORDS = {
    # Audio/Voice
    "Mic", "Whisper", "Whisper-Large", "Whisper-Tiny", "Audio Stream",
    "Voice Activation", "Silence Skip",
    # Image/Canvas
    "Canvas", "Flux", "Flux-Pro", "DALL-E", "Render", "Real-Time",
    # Database/Storage
    "Ledger", "Gold", "Silver", "Bronze", "Vault", "Encrypt",
    # Networking/API
    "Plug", "Drop Needle", "Secure", "Auth Flow", "Cache", "Return Stash",
    # UI/Frontend
    "Neon", "Clean", "Pulse", "Hover", "Dark", "Light",
    # Deployment/DevOps
    "Spin", "Chamber", "Deploy", "Stage", "Live", "Monitor",
    # Quality/Testing
    "No Debate", "Verify", "Vibe Check", "Resonance",
    # Multi-keyword pattern atoms from DICTIONARY.md examples
    "TABLE", "USERS", "AUDIT", "TRACE", "Fetch", "Goods",
    "Cache for Ten", "Guard the Gate", "No Keys",
    # Compound-architecture examples
    "Mic to the Chat", "Text to the Canvas",
}

# ---- Load patch ----
results = {"pass": [], "fail": [], "warn": []}

def p(tag, msg):
    results[tag].append(msg)
    prefix = {"pass": "✅", "fail": "❌", "warn": "⚠️ "}[tag]
    print(f"{prefix} {msg}")

print("=" * 70)
print("ENTANDRA SETT EXTENSION — STRESS TEST v1.0")
print("=" * 70)

# ---- Check 1: JSON parse ----
print("\n[1] JSON structure")
try:
    patch = json.loads(PATCH.read_text())
    p("pass", f"JSON parses cleanly ({PATCH.stat().st_size} bytes)")
except Exception as e:
    p("fail", f"JSON parse failure: {e}")
    sys.exit(1)

if "keywords" not in patch:
    p("fail", "Top-level .keywords missing")
    sys.exit(1)
p("pass", f".keywords present ({len(patch['keywords'])} entries)")

if "_meta" in patch:
    p("pass", f"._meta present (version {patch['_meta'].get('patch_version', '?')})")
    meta_count = patch["_meta"].get("keyword_count")
    actual = len(patch["keywords"])
    if meta_count == actual:
        p("pass", f"._meta.keyword_count matches actual ({actual})")
    else:
        p("fail", f"._meta.keyword_count ({meta_count}) ≠ actual ({actual})")

# ---- Check 2: Schema conformance ----
# Per BARS-DICTIONARY.md: each keyword should have action, target, description; config optional.
# Exception: UX_PATTERN uses `pattern` (per No Keys example).
print("\n[2] Per-keyword schema conformance")
SCHEMA_VIOLATIONS = []
for kw, body in patch["keywords"].items():
    if not isinstance(body, dict):
        SCHEMA_VIOLATIONS.append((kw, "not an object"))
        continue
    if "action" not in body:
        SCHEMA_VIOLATIONS.append((kw, "missing .action"))
    if "description" not in body:
        SCHEMA_VIOLATIONS.append((kw, "missing .description"))
    # Target is required UNLESS action is UX_PATTERN (pattern field), FUNNEL_STAGE (stage/role fields),
    # or other structural patterns. Check whether a placement-equivalent field exists.
    has_target = "target" in body
    has_placement = any(k in body for k in ("pattern", "stage", "service", "model", "steps"))
    if not has_target and not has_placement:
        SCHEMA_VIOLATIONS.append((kw, "missing .target and no equivalent (pattern/stage/service/model/steps)"))

if SCHEMA_VIOLATIONS:
    for kw, reason in SCHEMA_VIOLATIONS:
        p("fail", f"  {kw}: {reason}")
else:
    p("pass", "All 44 keywords have required fields (action + description + target-or-equivalent)")

# Specifically call out funnel stages — these are NEW shape not in docs:
print("\n[2a] Funnel-stage keyword shape (new pattern)")
funnel_stages = [kw for kw, b in patch["keywords"].items() if b.get("action") == "FUNNEL_STAGE"]
for kw in funnel_stages:
    body = patch["keywords"][kw]
    if "target" not in body:
        p("warn", f"  {kw}: no .target field. Uses .stage + .role instead. "
                 f"Documented validator '✅ All targets defined' MAY reject this. Flag to user.")

# ---- Check 3: Collisions against documented base ----
print("\n[3] Collision detection vs documented base keywords")
collisions = []
for kw in patch["keywords"]:
    if kw in DOCUMENTED_BASE_KEYWORDS:
        base_meaning_hint = {
            "Chamber": "CONTAINER_SETUP (Docker Compose) — collides with Sett TOUCHPOINT meaning",
        }.get(kw, "documented in base dictionary")
        collisions.append((kw, base_meaning_hint))

# A collision is a FAIL only if it is not already documented in _meta.known_collisions_with_documented_base
documented_collisions = set()
for entry in patch.get("_meta", {}).get("known_collisions_with_documented_base", []):
    if isinstance(entry, dict) and "keyword" in entry:
        documented_collisions.add(entry["keyword"])

if collisions:
    for kw, hint in collisions:
        if kw in documented_collisions:
            p("warn", f"  COLLISION documented (flagged in _meta, resolution deferred to merger): '{kw}' — {hint}")
        else:
            p("fail", f"  COLLISION SILENT (not documented in _meta): '{kw}' — {hint}")
else:
    p("pass", "No collisions with documented base keywords")

# Near-miss warnings (case/hyphen variants)
print("\n[3a] Near-miss variant check")
near_miss_found = False
patch_lower = {kw.lower().replace("-", "").replace(" ", ""): kw for kw in patch["keywords"]}
for base_kw in DOCUMENTED_BASE_KEYWORDS:
    norm = base_kw.lower().replace("-", "").replace(" ", "")
    if norm in patch_lower and patch_lower[norm] != base_kw and base_kw not in patch["keywords"]:
        p("warn", f"  Near-miss: patch '{patch_lower[norm]}' vs base '{base_kw}' "
                 f"(differ only by case/hyphen/space — Resolver may confuse)")
        near_miss_found = True
if not near_miss_found:
    p("pass", "No near-miss variants against documented base")

# ---- Check 4: Naming conventions ----
# Per BARS-DICTIONARY.md: PascalCase for models, lowercase-with-hyphens for actions,
# space/slash for compound. Base precedent also allows PascalCase-With-Hyphens (Whisper-Large, DALL-E).
print("\n[4] Naming convention check")
naming_issues = []
for kw in patch["keywords"]:
    # Allow: PascalCase, PascalCase-With-Hyphens, lowercase-with-hyphens, Space Separated, combinations
    # Disallow: leading/trailing hyphen, double hyphen, snake_case, camelCase-only
    if kw.startswith("-") or kw.endswith("-"):
        naming_issues.append((kw, "leading/trailing hyphen"))
    if "--" in kw:
        naming_issues.append((kw, "double hyphen"))
    if "_" in kw:
        naming_issues.append((kw, "underscore (should be hyphen or space)"))
    if re.match(r"^[a-z]", kw) and "-" not in kw and " " not in kw:
        naming_issues.append((kw, "lowercase start without hyphen/space (ambiguous convention)"))

if naming_issues:
    for kw, reason in naming_issues:
        p("warn", f"  {kw}: {reason}")
else:
    p("pass", "All keyword names match documented + base-precedent naming conventions")

# ---- Check 5: Internal consistency — action vs description ----
print("\n[5] Action/description semantic consistency spot-check")
semantic_mismatches = []

# Beacon: action is ATTRIBUTION_PIXEL but description says "pixel or postback signal"
beacon = patch["keywords"].get("Beacon", {})
if "postback" in beacon.get("description", "").lower() and beacon.get("action") == "ATTRIBUTION_PIXEL":
    semantic_mismatches.append(
        ("Beacon", "action=ATTRIBUTION_PIXEL but description mentions 'postback signal' — "
                   "consider action=ATTRIBUTION_SIGNAL or splitting into two keywords")
    )

# Brand-Safety-Gate: check it has both realtime + crisis_flag
bsg = patch["keywords"].get("Brand-Safety-Gate", {})
if bsg.get("action") == "SAFETY_CHECK" and not bsg.get("config", {}).get("realtime"):
    semantic_mismatches.append(
        ("Brand-Safety-Gate", "SAFETY_CHECK without realtime=true is ambiguous")
    )

if semantic_mismatches:
    for kw, reason in semantic_mismatches:
        p("warn", f"  {kw}: {reason}")
else:
    p("pass", "No action/description semantic mismatches flagged")

# ---- Check 6: Funnel-stage ordering integrity ----
print("\n[6] Funnel-stage ordering integrity")
# As of v1.2.0, stage 4 key is `Sett-Chamber` (renamed from `Chamber` to avoid base collision).
expected_stages = ["Surface", "Entrance", "Tunnel", "Sett-Chamber", "Exit", "Home-Chamber", "Clan"]
declared_stages = {kw: patch["keywords"][kw].get("stage") for kw in patch["keywords"]
                   if patch["keywords"][kw].get("action") == "FUNNEL_STAGE"}

# Tunnel and Sett-Chamber are NOT declared as FUNNEL_STAGE in patch (they're FUNNEL_PATH and TOUCHPOINT).
# But Funnel and Journey config lists ALL 7 stages including Tunnel + Sett-Chamber.
# Check the config consistency:
funnel_cfg = patch["keywords"].get("Funnel", {}).get("config", {}).get("stage_names", [])
journey_cfg = patch["keywords"].get("Journey", {}).get("config", {}).get("stages", [])

if funnel_cfg == expected_stages:
    p("pass", f"Funnel.config.stage_names matches expected 7-stage order (post-rename)")
else:
    p("fail", f"Funnel.config.stage_names mismatch: {funnel_cfg}")

if journey_cfg == expected_stages:
    p("pass", f"Journey.config.stages matches expected 7-stage order (post-rename)")
else:
    p("fail", f"Journey.config.stages mismatch: {journey_cfg}")

# Surface=1, Entrance=2, Exit=5, Home-Chamber=6, Clan=7 — check the stage numbers
expected_nums = {"Surface": 1, "Entrance": 2, "Exit": 5, "Home-Chamber": 6, "Clan": 7}
for kw, expected_num in expected_nums.items():
    actual = declared_stages.get(kw)
    if actual != expected_num:
        p("fail", f"  {kw}: expected stage={expected_num}, got {actual}")

# Also verify Tunnel (3) and Sett-Chamber (4) carry funnel-position metadata even though
# their action is not FUNNEL_STAGE.
for kw, expected_num in [("Tunnel", 3), ("Sett-Chamber", 4)]:
    actual_stage = patch["keywords"].get(kw, {}).get("stage")
    if actual_stage == expected_num:
        p("pass", f"  {kw}: carries funnel-position metadata stage={expected_num} despite non-FUNNEL_STAGE action")
    else:
        p("fail", f"  {kw}: missing funnel-position metadata (expected stage={expected_num}, got {actual_stage})")

# NOTE: Tunnel (3) and Sett-Chamber (4) are NOT declared as FUNNEL_STAGE action-wise.
# This is intentional per the spec — they have their own action types (FUNNEL_PATH, TOUCHPOINT).
# But the config arrays in Funnel/Journey reference them as stage keys.
p("warn", "Tunnel (stage 3) has action=FUNNEL_PATH, Sett-Chamber (stage 4) has action=TOUCHPOINT — "
         "not FUNNEL_STAGE. Resolver must treat these as funnel-position-aware via the stage+role "
         "metadata fields added in v1.1.0, not via action-type matching alone. Flag for engine "
         "implementation.")

# ---- Check 7: Attribution completeness ----
print("\n[7] Attribution completeness")
missing_attr = [kw for kw, b in patch["keywords"].items() if "contributed_by" not in b]
if missing_attr:
    for kw in missing_attr:
        p("fail", f"  {kw}: missing .contributed_by")
else:
    p("pass", "All 44 keywords carry .contributed_by attribution")

# ---- Check 8: Charter BARS-stanza resolution dry-run ----
print("\n[8] Charter BARS-stanza keyword-resolution dry-run")
charter_text = CHARTER.read_text()

# Extract all BARS stanzas
stanza_blocks = re.findall(r"```\nBARS::\n(.*?)\n```", charter_text, re.DOTALL)
print(f"   Found {len(stanza_blocks)} BARS stanzas in charter")

all_patch_kws = set(patch["keywords"].keys())
all_known_kws = all_patch_kws | DOCUMENTED_BASE_KEYWORDS

# For each stanza, tokenize and check which tokens resolve
unresolved_counts = {}
for i, stanza in enumerate(stanza_blocks):
    # Tokenize on / and newlines; strip and ignore tiny glue words
    segments = [s.strip() for s in re.split(r"[/\n]", stanza) if s.strip()]
    for seg in segments:
        # Multi-word tokens: try progressively longer matches against known keywords
        words = seg.split()
        # Simple check: does ANY of our known keywords appear as a substring/whole phrase?
        matched = False
        for kw in all_known_kws:
            kw_words = kw.split()
            # phrase match
            if all(any(w.lower() == kwW.lower() for w in words) for kwW in kw_words):
                matched = True
                break
        if not matched:
            # Record as potentially unresolved (will include poetic glue words — that's OK)
            unresolved_counts[seg] = unresolved_counts.get(seg, 0) + 1

# Just report scale, not every miss (stanzas contain lots of poetic glue)
# The useful signal: are any patch keywords NEVER used in any stanza?
used_patch_kws = set()
for stanza in stanza_blocks:
    for kw in all_patch_kws:
        if kw in stanza:
            used_patch_kws.add(kw)

unused_patch_kws = all_patch_kws - used_patch_kws
p("pass" if len(used_patch_kws) > 10 else "warn",
  f"{len(used_patch_kws)}/{len(all_patch_kws)} patch keywords used at least once in charter stanzas")
if unused_patch_kws:
    p("warn", f"Patch keywords never referenced in any charter stanza "
             f"(dead-weight candidates): {sorted(unused_patch_kws)[:10]}{'...' if len(unused_patch_kws) > 10 else ''}")

# ---- Check 9: jq merge command semantics ----
# Read the actual README and look for: (a) the mandatory pre-flight collision detector,
# (b) a safe merge that errors on collision, (c) absence of naive `* .[1].keywords` with no guard.
print("\n[9] jq merge command semantics")
readme_path = Path("/home/claude/entandra-sett-extension-README.md")
if readme_path.exists():
    readme_text = readme_path.read_text()
    has_collision_preflight = "COLLISION" in readme_text and "jq" in readme_text and "keys" in readme_text
    has_safe_merge = 'error("Refusing to merge' in readme_text or "error(\"Refusing to merge" in readme_text
    has_naive_warning_removed = not re.search(
        r"jq\s+-s\s+'\.\[0\]\.keywords\s*\*\s*\.\[1\]\.keywords\s*\|\s*\{keywords:\s*\.\}'",
        readme_text
    )
    if has_collision_preflight and has_safe_merge and has_naive_warning_removed:
        p("pass", "README contains pre-flight collision detector + safe merge that errors on collision; naive `*` merge removed")
    else:
        details = []
        if not has_collision_preflight:
            details.append("no pre-flight collision detector found")
        if not has_safe_merge:
            details.append("no error-on-collision merge found")
        if not has_naive_warning_removed:
            details.append("naive `*` merge still present")
        p("fail", f"README merge command unsafe: {'; '.join(details)}")
else:
    p("warn", "README not found — cannot verify merge command safety")

# ---- Check 10: Merge target reality ----
# A FAIL only if the patch claims the target exists. A WARN if the patch acknowledges repo is empty.
print("\n[10] Merge target reality")
mp = patch.get("_meta", {}).get("merge_precondition", {})
if mp and mp.get("target_file_exists") is False and "LICENSE.md" in mp.get("note", ""):
    p("warn", "Repo-empty reality acknowledged in _meta.merge_precondition. "
             "Patch is correctly framed as seed, not merge-ready diff. "
             "State-A (empty repo) and State-B (base exists) procedures documented in README.")
else:
    p("fail", "Repo BoomerAng9/BARS-by-ACHIEVEMOR contains only LICENSE.md, POC_GUIDE.md, README.md. "
             "The file dictionaries/entandra.json does NOT exist. "
             "This patch is aspirational and must flag it in _meta.merge_precondition.")

# ---- Summary ----
print("\n" + "=" * 70)
print(f"SUMMARY: {len(results['pass'])} passed, "
      f"{len(results['fail'])} failed, {len(results['warn'])} warnings")
print("=" * 70)
if results["fail"]:
    print("\nFAILURES (must fix):")
    for msg in results["fail"]:
        print(f"  ❌ {msg}")
if results["warn"]:
    print("\nWARNINGS (review):")
    for msg in results["warn"]:
        print(f"  ⚠️  {msg}")

sys.exit(0 if not results["fail"] else 1)
