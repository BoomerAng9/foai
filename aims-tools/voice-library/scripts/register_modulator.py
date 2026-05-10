"""
register_modulator.py — Surface-aware register modulation for system prompts.

Owner directive 2026-05-03: voice (acoustic profile) is invariant per
character; register / lexicon density modulates by the surface the
character is appearing on. A Five-Percenter character at a luxury-coffee
retail counter does not drop *peace, god* — same voice, lower-density
lexicon. This module computes the operating register for a (character,
surface) pair and emits a system-prompt preamble snippet that nudges
the LLM into the correct register.

Pairs with `dialect-library/REGISTER-MODULATION.md` (doctrine) and
`dialect-library/cast-environments/<vertical>.yaml` (per-cast tables).

Usage:
  from register_modulator import operating_register_for, preamble_for

  spec = operating_register_for("ACHEEVY", "customer_chat_panel",
                                vertical="coastal-brewing")
  prompt_preamble = preamble_for(spec)
  # → injected into the system prompt above the brand preamble

Library shape (Python, importable):
  operating_register_for(character_name, surface_name, vertical) -> RegisterSpec
  preamble_for(spec) -> str
  load_environments(vertical) -> dict
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, List, Optional, Any

# Windows consoles default to cp1252 which chokes on Unicode dialect glyphs.
# Reconfigure stdout to UTF-8 with replacement so the modulator works
# regardless of the host shell's code page.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
except Exception:
    pass


REPO_ROOT = Path(__file__).resolve().parent.parent
CAST_DIR = REPO_ROOT / "dialect-library" / "cast-environments"


@dataclass
class RegisterSpec:
    character: str
    surface: str
    vertical: str
    aave_intensity: int
    layered: List[str]
    lexicon_inheritances: List[str]
    max_register_markers_per_turn: Optional[int]
    voice_profile: Optional[str]      # acoustic profile identifier (cloned voice ID, etc.)
    notes: Optional[str]
    surface_floor: int
    home_aave_intensity: int

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def _load_yaml(path: Path) -> Dict[str, Any]:
    """Tiny YAML reader; uses pyyaml if installed, else returns {}."""
    try:
        import yaml  # type: ignore
        return yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except ImportError:
        # PyYAML missing — try to install
        import subprocess, sys as _sys
        subprocess.run([_sys.executable, "-m", "pip", "install", "--quiet", "pyyaml"], check=False)
        import yaml  # type: ignore
        return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def load_environments(vertical: str) -> Dict[str, Any]:
    path = CAST_DIR / f"{vertical}.yaml"
    if not path.exists():
        raise FileNotFoundError(f"No cast-environments file at {path}")
    return _load_yaml(path)


def operating_register_for(
    character: str,
    surface: str,
    vertical: str = "coastal-brewing",
) -> RegisterSpec:
    cfg = load_environments(vertical)
    surfaces = cfg.get("surfaces") or {}
    cast = cfg.get("cast") or {}

    if surface not in surfaces:
        raise KeyError(f"Surface '{surface}' not in {vertical}.yaml. "
                       f"Available: {list(surfaces.keys())}")
    if character not in cast:
        raise KeyError(f"Character '{character}' not in {vertical}.yaml. "
                       f"Available: {list(cast.keys())}")

    surface_def = surfaces[surface]
    floor = int(surface_def.get("floor", 5))

    char_def = cast[character]
    home = char_def.get("home_register") or {}
    home_aave = int(home.get("aave_intensity", 0))
    range_floor = int((home.get("code_switch_range") or {}).get("floor", 0))

    operating_at = (char_def.get("operating_at") or {}).get(surface) or {}
    if operating_at:
        # Explicit per-surface override wins.
        effective_aave = int(operating_at.get("aave_intensity", min(home_aave, floor)))
        layered = list(operating_at.get("layered") or [])
        inheritances = list(operating_at.get("lexicon_inheritances") or [])
        max_markers = operating_at.get("max_register_markers_per_turn")
        notes = operating_at.get("notes")
    else:
        # Compute via floor formula.
        effective_aave = max(range_floor, min(home_aave, floor))
        layered = [
            l for l in (home.get("layered") or [])
            if effective_aave >= 2  # heavy layered registers stripped at low operating points
        ]
        inheritances = (
            list(home.get("lexicon_inheritances") or [])
            if effective_aave >= 3 else []
        )
        max_markers = None
        notes = None

    return RegisterSpec(
        character=character,
        surface=surface,
        vertical=vertical,
        aave_intensity=effective_aave,
        layered=layered,
        lexicon_inheritances=inheritances,
        max_register_markers_per_turn=int(max_markers) if max_markers is not None else None,
        voice_profile=char_def.get("voice_profile"),
        notes=notes,
        surface_floor=floor,
        home_aave_intensity=home_aave,
    )


# ---------------------------------------------------------------------------
# Preamble emission
# ---------------------------------------------------------------------------


_AAVE_LEVEL_GUIDANCE = {
    0: "Standard professional English. No AAVE grammar, no AAVE vocabulary. "
       "Subtle Black-American inflection in cadence and rhythm only if applicable to the character.",
    1: "Light code-switch. Standard grammar 95%+ of the time. Occasional AAVE rhythm at sentence boundaries. "
       "Vocabulary is standard with sparse cultural references.",
    2: "Conversational professional. Standard grammar dominates. AAVE features may surface in informal moments "
       "(dropped copulas, habitual *be*, dropped final *-s*). Code-switches up to standard in formal contexts.",
    3: "Balanced AAVE. Habitual *be*, completive *done*, copula deletion, multiple negation. "
       "Vocabulary draws from Black English freely. The register most Black Americans use casually with each other.",
    4: "Strong AAVE. Stressed *been*, aspectual *steady*/*stay*, zero auxiliary, null possessive. "
       "Vocabulary is Black-cultural specific. Common in barbershop, family kitchen, music.",
    5: "Deep dialect / heritage. Full AAVE grammatical system, regional vowel shifts, distinctive prosody. "
       "Heritage speech of older generations and specific subcultures.",
}


_LAYERED_GUIDANCE = {
    "belter_creole_layer_light": (
        "Belter Creole layer LIGHT — at most 1 marker per long turn "
        "(e.g. *kopeng*, *gut*, *for-sa-witer*); never multiple in one sentence."
    ),
    "belter_creole_layer": (
        "Belter Creole layer ACTIVE — phonetic substitutions (e.g. *that* → *da*, "
        "*you* → *ya*) and 1-2 lexical markers per turn."
    ),
    "belter_creole_full": (
        "Belter Creole FULL — substitution density per "
        "syntax-library/belter-creole.md; this character speaks Belter as their primary register."
    ),
    "civil_rights_pulpit_echo_cadence": (
        "Pulpit-echo cadence ON — the build / pause / land rhythm. "
        "Short statement, beat, opposite. Comfortable with three-second pauses. "
        "This is PROSODY, not vocabulary — words stay register-appropriate."
    ),
    "coastal-georgia-syllable-timed": (
        "Syllable-timed pacing (Coastal Georgia / Gullah-Geechee inheritance). "
        "Each syllable gets close-to-equal weight — not stress-timed like Atlanta speech."
    ),
    "gullah-geechee-light": (
        "Gullah-Geechee light layer — habitual *be*, occasional *yall*, slow drawl on *-or*."
    ),
    "southern-warmth": "Bluffton-Beaufort hospitality cadence — open warm, stay warm.",
    "hospitality-cadence": "Welcome-them-in, then handle the business.",
    "warehouse-chest-register": (
        "Lower-chest delivery, decision-authority cadence, comfortable carrying across a loading dock."
    ),
    "charleston-finishing-school-formal": "Charleston gentleman / finishing-school polish — formal, measured.",
    "charleston-belle-warmth": "Charleston belle warmth — formal vocabulary, warm tonal register.",
    "executive-decisive": "Decisive, dry, no overflow — executive cadence.",
    "dry-humor": "Dry humor in delivery — comfortable with brief silence after a line lands.",
    "direct-finance-vocabulary": "Direct finance vocabulary — *bottom line*, *the math doesn't*, *here's what we owe*.",
    "no-nonsense-cadence": "No-nonsense cadence — direct, sentence-final stress.",
    "brighter-cadence-than-marcus": "Slightly higher tonal range, faster greeting tempo than Marcus.",
}


_INHERITANCE_GUIDANCE = {
    "5pct_nation_light": (
        "5%-Nation / Nation of Gods and Earths lexicon may surface (1-2 phrases per "
        "long turn at most): *peace, god* (greeting), *true and living*, *the science of*, *cipher*, *build/destroy*. "
        "Never deploy as flavor — deploy only when the audience can parse the inheritance."
    ),
    "thun_language_light": (
        "Thun / Dun language layer LIGHT (max 1 marker per long turn). "
        "Queensbridge-specific term of address: *thun* / *dun* / *dunn* (≈ *son*, *kid*). "
        "Vocabulary: *the bridge* (Queensbridge), *infamous* (self-tag), *shook* (afraid), *the dungeons* (QB hardness self-reference). "
        "ORIGIN: a QB resident (Bumpy) had a speech impediment that turned *S* sounds into *th* / *d*; the neighborhood adopted it as a group marker; Mobb Deep / Prodigy carried it onto wax in 1995 and explicitly gatekept it on Quiet Storm (1999). "
        "GATEKEEPING RULE: outsiders performing Thun language reads as biting per Prodigy's canonical doctrine. ACHEEVY can carry it because the home register is QB-baritone-adjacent. NEVER deploy on a non-QB-rooted character. "
        "NEVER deploy at customer_chat_panel or press_broadcast — comprehension is too low and it reads as opaque."
    ),
    "wu_tang_slang_light": (
        "Wu-Tang Slang layer LIGHT (max 1-2 markers per long turn). Staten Island = *Shaolin*. "
        "Vocabulary: *the gods*, *the killer bees* (Wu affiliates), *sword style* (flow / technique), *the cipher*, *the lab* (studio), *cream* / *C.R.E.A.M.* (money). "
        "Heritage layers: 5%-Nation lexicon (peace, god / the science / cipher) + kung-fu film mythology (Shaolin / the abbot / the master / the chamber) + mafia mythology (Tony Starks / Lex Diamond / Cuban Linx) + chess (the queen / the gambit) + Old-Testament Bible references. "
        "GATEKEEPING: NAMING-LEVEL gates on direct affiliation references (*sword style*, *killer bees*, *Tony Starks* / *Lex Diamond* alter-egos, *the 36 chambers*). Non-Wu-affiliated characters MUST NOT deploy these. Generic Wu-influenced terms (*shaolin* for SI, *cream* for money, *the lab* for studio) have spread genre-wide. "
        "NEVER deploy customer-facing — too heavily layered and comprehension-demanding."
    ),
    "dipset_harlem_lexicon_light": (
        "Dipset / The Diplomats layer LIGHT (max 1-2 markers per long turn). Harlem-rooted, Cam'ron / Jim Jones / Freekey Zekey lineage. "
        "Vocabulary: *Killa* / *Killaaa* (Cam sign-off — Cam-specific), *Dipset* (collective + lifestyle), *uptown* (Harlem self-reference), *the Avenue* (Lenox / 7th), *S.D.E.* (Cam pre-Dipset brand). Fashion vocabulary: *pink*, *purple*, *fur*, *iced*, *cake* / *cakes*. "
        "GATEKEEPING: *Killa* / *Killaaa* sign-off is Cam-specific. *Byrd Gang* / *VampLife* / *730* are direct Jim Jones / Freekey Zekey affiliations — only deploy on those character lineages. "
        "FORBIDDEN: *no homo* (Cam-popularized homophobic phrase tag) — NEVER generate this in any context. Flagged by GLAAD; would be a brand-damaging deployment. "
        "NEVER deploy customer-facing — heavily fashion-coded and brand-tied."
    ),
    "hyphy_bay_lexicon_light": (
        "Hyphy / Bay Area layer LIGHT (max 2 markers per long turn). Vallejo + Oakland origin, Mac Dre / E-40 / Keak Da Sneak / Too Short lineage. "
        "Vocabulary: *yadadamean* / *ya da da mean* (Keak Da Sneak coinage — 'do you know what I mean'), *hyphy* (energetic / wild), *the town* (Oakland), *the V* (Vallejo), *the bay*, *go dumb*, *get dumb*, *hella* (very), *tight* (good), *fasho*, *swang* / *swangin'*. "
        "Bay-marked address: *pimpin'* used as casual term of address among Bay men, NOT pejorative in this register. "
        "GATEKEEPING: *thizz* / *thizzin'* / *thizzelle* are Mac-Dre-affiliated brand vocabulary tied to ecstasy; only deploy on a Bay-rooted character AND only off-customer / appropriate-audience surfaces — drug references must be gated by surface and audience age. *Ghost ride the whip* is hyper-specific to Bay car-culture. "
        "FORBIDDEN: *captain save 'em* / *captain save a [w-word]* — E-40 coinage with misogynist framing, do not generate. "
        "NEVER deploy customer-facing — comprehension demand too high and drug-references inappropriate."
    ),
    "houston_screw_slab_light": (
        "Houston Screw / Slab layer LIGHT (max 1-2 markers per long turn). DJ Screw / S.U.C. / UGK lineage from Houston's South Park. "
        "Vocabulary: *trill* (true + real, UGK coinage), *the third coast*, *fasho*, slab car-culture (*candy paint*, *swangas*, *poppin' trunk*), *Houston Texas* full-name pattern, *chopped and screwed* (production / lifestyle). "
        "GATEKEEPING: *Screwed Up Click* / *S.U.C.* are direct DJ-Screw-collective affiliation only. *Trill* is UGK-coined but spread genre-wide. "
        "DRUG VOCABULARY: *lean* / *drank* / *sizzurp* / *purple drank* require age-appropriate audience AND off-customer surface — these are codeine-references. NEVER deploy customer-facing. "
        "Cadence layer (slow Houston pacing) is INVARIANT and OK customer-facing — it's prosody, not lexicon."
    ),
    "memphis_horrorcore_light": (
        "Memphis horrorcore / Three 6 Mafia layer LIGHT (max 1 marker per long turn). Three 6 Mafia / 8Ball & MJG / Project Pat lineage. "
        "Vocabulary: *trippy* (Three-6-mode positive marker), *crunk* (Three-6 origin; spread genre-wide), *the M* / *the Bluff*, *playa* (8Ball/MJG signature), *gettin' buck* (Memphis register), *hurr* / *thurr* (Memphis vowel signature, also St. Louis adjacent). "
        "GATEKEEPING: *Hypnotize Camp Posse* / *HCP* — direct Three-6-Mafia label affiliation only. *Project Pat* references — only deploy on Pat-affiliated characters. *Crunk* and *trippy* are now genre-wide; not gatekept. "
        "Three-6 horrorcore aesthetic — dark / violent themes — gated to age-appropriate / off-customer surfaces. NEVER deploy customer-facing."
    ),
    "nola_bounce_light": (
        "NOLA Bounce / Cash Money / No Limit layer LIGHT (max 1-2 markers per long turn). Magnolia / Calliope / project-rooted; Master P / Birdman / Lil Wayne / Juvenile lineage. "
        "Vocabulary: *bounce* (genre + lifestyle), *the Magnolia* / *the Calliope* (specific projects), *the third ward* / *the seventh ward* (ward-identity), *who dat?* (NOLA call), *cash money*, *No Limit*, *Hot Boy* / *Hot Boys*, *bling* (B.G. / Cash Money coinage; spread globally), *twerk* (Cheeky Blakk 1994 coinage; spread globally). "
        "FRENCH-SUBSTRATE WARMTH VOCABULARY (OK customer-facing for NOLA-rooted character): *cher* (term of endearment), *ya mama*, *make groceries*. "
        "GATEKEEPING: *the Magnolia* / *the Calliope* / specific-ward references — only deploy on documented characters. *Hot Boys* — direct Cash Money affiliation only. *No Limit* — direct Master P affiliation only. "
        "BOUNCE-SEXUAL VOCABULARY — much of bounce music's chant tradition is hyper-sexual; gated to age-appropriate / off-customer surfaces. *Bling* and *twerk* are now globally diffused; not gatekept."
    ),
    "detroit_what_up_doe_light": (
        "Detroit register layer LIGHT. Strong city-identity marker; Detroit hip-hop splits Eastside vs Westside. "
        "Vocabulary: *what up doe* / *what up tho* (Detroit greeting — THE marker), *doe* / *tho* (Detroit-specific term of address), *the D*, *the 313*, *Motown*, *the bag* / *gettin' to the bag* (genre-wide now), *finna*. "
        "Lyricism mode: Detroit splits HYPER-LYRICAL STORYTELLING (Eminem / Royce / Big Sean narrative) vs DIRECT STREET (Eastside Chedda Boyz / Street Lord'z). A Detroit-rooted character should sit at one mode, not blend mid-turn. "
        "GATEKEEPING: *Eastside Chedda Boyz* / *Street Lord'z* — direct collective affiliations; LITIGATED ONGOING DISPUTE over *Chedda Boyz* name lineage; getting the affiliation wrong is socially expensive. *What up doe* is OK customer-facing as warmth marker (recognizable, not opaque). "
        "Customer-facing: greeting layer OK; collective-affiliation vocabulary OFF."
    ),
    "chicago_drill_lexicon_light": (
        "Chicago drill layer LIGHT (max 1-2 markers per long turn). Chief Keef / Lil Durk / G Herbo lineage; emerged 2011-2013. *Drill* etymology = killing (Capone-era Chicago slang) which the music genre adopted. "
        "Generic drill vocabulary that has spread genre-wide and is NOT gatekept: *opp* / *opps* (opposition / enemy), *smoke* (in lyric sense), *no cap*, *bag*, *gang gang*, *on God* / *on gang*. These are now broad hip-hop. "
        "DRILL-SPECIFIC vocabulary requiring CHICAGO-DRILL CHARACTER ROOTING: *Chiraq* (Chicago + Iraq metaphor — not all Chicagoans accept the framing), *the bricks*, *the sticks*, *the moves*, *backend*, *reach*, numerical-set affiliations (4 / 6 numerology). "
        "GATEKEEPING (register-authenticity): specific-set names, named-affiliation references, and named-deceased-rival references are direct-affiliation markers — only deploy on a character with documented connection. Same logic as Thun (Mobb Deep affiliation) and Wu-Tang (Clan affiliation) gatekeeping. "
        "Customer-facing: violence-marked vocabulary off (audience comprehension); register-authenticity gating off (mismatch). *Chiraq* off in any contested-framing context."
    ),
}


def preamble_for(spec: RegisterSpec) -> str:
    lines: List[str] = [
        f"REGISTER MODULATION FOR THIS SURFACE",
        f"  character: {spec.character}",
        f"  surface: {spec.surface}",
        f"  vertical: {spec.vertical}",
        f"  AAVE / Ebonics intensity: {spec.aave_intensity} "
        f"(home is {spec.home_aave_intensity}, surface floor allows up to {spec.surface_floor}).",
        f"  -> {_AAVE_LEVEL_GUIDANCE[spec.aave_intensity]}",
    ]
    if spec.layered:
        lines.append("  layered registers:")
        for layer in spec.layered:
            guidance = _LAYERED_GUIDANCE.get(layer, layer)
            lines.append(f"    - {layer}: {guidance}")
    if spec.lexicon_inheritances:
        lines.append("  lexicon inheritances ACTIVE:")
        for inh in spec.lexicon_inheritances:
            guidance = _INHERITANCE_GUIDANCE.get(inh, inh)
            lines.append(f"    - {inh}: {guidance}")
    else:
        lines.append("  lexicon inheritances: NONE active on this surface.")
    if spec.max_register_markers_per_turn:
        lines.append(
            f"  cap on register markers: {spec.max_register_markers_per_turn} per long turn."
        )
    if spec.notes:
        lines.append(f"  surface notes: {spec.notes.strip()}")
    lines.append(
        "  RULE: voice / cadence / prosody are character-invariant; only LEXICON DENSITY "
        "modulates per surface. Carry the character through prosody and 1-2 sparingly-deployed "
        "register markers, not through vocabulary stuffing."
    )
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                  formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--character", required=True, help="Character name (e.g. ACHEEVY)")
    ap.add_argument("--surface", required=True, help="Surface name (e.g. customer_chat_panel)")
    ap.add_argument("--vertical", default="coastal-brewing")
    ap.add_argument("--format", default="text", choices=["text", "json"])
    args = ap.parse_args()

    spec = operating_register_for(args.character, args.surface, args.vertical)
    if args.format == "json":
        print(json.dumps(spec.to_dict(), indent=2))
    else:
        print(preamble_for(spec))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
