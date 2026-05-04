"""
pronunciation_engine.py — TTS pronunciation rule engine.

Loads YAML rule packs from `pronunciation-library/rules/` (priority-
ordered by filename prefix, e.g. 01-grammar, 10-brand-names, 20-cadence,
30-catalog-terms, 50-belter-creole, 60-urbanism-phonetics) and applies
them to text bound for TTS synthesis. Display text is NEVER altered.

Public API:
  rewrite_for_tts(text, character=None, surface=None, vertical=None) -> str

Per voice-library/pronunciation-library/README.md doctrine.
"""
from __future__ import annotations

import os
import pathlib
import re
from typing import Dict, List, Optional, Pattern, Tuple

try:
    import yaml  # type: ignore
except ImportError:
    yaml = None


_RULES_DIR = pathlib.Path(
    os.environ.get(
        "PRONUNCIATION_LIBRARY_DIR",
        str(pathlib.Path(__file__).resolve().parents[1] / "rules"),
    )
)


def _compile_pattern(rule: Dict) -> Optional[Pattern[str]]:
    raw = rule.get("pattern")
    if not raw:
        return None
    rtype = rule.get("type", "regex")
    flags = 0 if rule.get("case_sensitive", False) else re.IGNORECASE
    if rtype == "literal":
        return re.compile(re.escape(raw), flags)
    return re.compile(raw, flags)


_LOADED_RULES: List[Tuple[Dict, Pattern[str]]] = []
_LOADED_FROM: List[pathlib.Path] = []


def _load_rules(force: bool = False) -> None:
    """Load all rule packs from disk. Idempotent unless force=True."""
    global _LOADED_RULES, _LOADED_FROM
    if _LOADED_RULES and not force:
        return
    rules: List[Tuple[Dict, Pattern[str]]] = []
    files: List[pathlib.Path] = []
    if not _RULES_DIR.exists():
        _LOADED_RULES = rules
        return
    if yaml is None:
        # No PyYAML → engine becomes a no-op pass-through.
        _LOADED_RULES = rules
        return
    for path in sorted(_RULES_DIR.glob("*.yaml")):
        try:
            data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        except Exception:
            continue
        files.append(path)
        for rule in data.get("rules", []) or []:
            if not isinstance(rule, dict):
                continue
            if rule.get("enabled") is False:
                continue
            if rule.get("no_rewrite"):
                # Documentation-only entry — kept in the rule pack for
                # provenance / future activation, but doesn't rewrite.
                continue
            pat = _compile_pattern(rule)
            if pat is None:
                continue
            rules.append((rule, pat))
    _LOADED_RULES = rules
    _LOADED_FROM = files


def _rule_in_scope(rule: Dict,
                   character: Optional[str],
                   surface: Optional[str],
                   vertical: Optional[str]) -> bool:
    when = rule.get("when") or {}
    if when:
        char_filter = when.get("character") or []
        if char_filter and character and character not in char_filter:
            return False
        surface_filter = when.get("surface") or []
        if surface_filter and surface and surface not in surface_filter:
            return False
        vertical_filter = when.get("vertical") or []
        if vertical_filter and vertical and vertical not in vertical_filter:
            return False
    return True


def rewrite_for_tts(text: str,
                    *,
                    character: Optional[str] = None,
                    surface: Optional[str] = None,
                    vertical: Optional[str] = None) -> str:
    """Apply all loaded rules to `text` and return the rewritten string.

    Rules with `when:` filters only apply to matching contexts. Rules
    apply in priority order (filename-prefix-sorted). Display text is
    never altered — the caller passes the TTS-bound text only.
    """
    if not text:
        return text
    _load_rules()
    out = text
    for rule, pat in _LOADED_RULES:
        if not _rule_in_scope(rule, character, surface, vertical):
            continue
        replacement = rule.get("replacement", "")
        try:
            out = pat.sub(replacement, out)
        except re.error:
            continue
    return out


def rules_loaded_summary() -> Dict:
    """Diagnostic — returns count + filenames the engine loaded."""
    _load_rules()
    return {
        "rules_loaded": len(_LOADED_RULES),
        "rule_files": [p.name for p in _LOADED_FROM],
        "rules_dir": str(_RULES_DIR),
        "yaml_available": yaml is not None,
    }


if __name__ == "__main__":
    # CLI smoke test
    import sys
    print(rules_loaded_summary())
    if len(sys.argv) > 1:
        sample = " ".join(sys.argv[1:])
        print("INPUT :", sample)
        print("OUTPUT:", rewrite_for_tts(sample, character="acheevy"))
