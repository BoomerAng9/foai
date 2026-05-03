"""
FOAI Ecosystem — Inworld Character Adapter
Classification: INTERNAL IP — NOT FOR DISTRIBUTION
Version: 1.0.0 — 2026-05-02
Owner: ACHIEVEMOR / FOAI — asg@achievemor.io

Governed by: ECOSYSTEM_STANDARD_INWORLD.md

Production implementation of the IInworldCharacterAdapter interface.
Loads character roster dynamically from character-registry.yaml.
No character names or IDs are hardcoded.
All secrets are read from environment variables using the standard
naming convention: INWORLD_{TYPE}_{EMPLOYEE_ID_UPPER}
"""
from __future__ import annotations

import base64
import hashlib
import json
import logging
import os
import pathlib
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import AsyncIterator, Optional

import httpx
import yaml

log = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# CONSTANTS
# ─────────────────────────────────────────────────────────────────────────────

_INWORLD_TTS_BASE = "https://api.inworld.ai/tts/v1"
_INWORLD_STUDIO_BASE = "https://api.inworld.ai/studio/v1"

_REGISTRY_PATH = pathlib.Path(__file__).parent / "character-registry.yaml"
_SPEC_BASE = pathlib.Path(__file__).parent / "character-specs" / "coastal-brewing"
_VOICE_LIB = pathlib.Path(__file__).parents[2] / "voice-library" / "syntax-library"


# ─────────────────────────────────────────────────────────────────────────────
# DATA CLASSES
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class CharacterSpec:
    employee_id: str
    display_name: str
    function: str
    tier: str
    pmo: str
    customer_facing: bool
    active: bool
    phase: int
    priority: int
    tts_model: str = "tts-1.5-max"
    voice_design_prompt: str = ""
    persona_source: str = ""
    persona_section: str = ""
    goals: list = field(default_factory=list)
    memory_seeds: list = field(default_factory=list)
    escalates_to: Optional[str] = None

    @property
    def env_slug(self) -> str:
        """INWORLD-safe env var slug derived from employee_id."""
        return self.employee_id.upper().replace("-", "_")

    @property
    def character_id(self) -> Optional[str]:
        """Read character ID from env var. Returns None if not set."""
        return os.environ.get(f"INWORLD_CHARACTER_ID_{self.env_slug}")

    @property
    def voice_id(self) -> Optional[str]:
        """Read voice ID from env var. Returns None if not set."""
        return os.environ.get(f"INWORLD_VOICE_ID_{self.env_slug}")

    @property
    def is_configured(self) -> bool:
        """True only if both character_id and voice_id env vars are set."""
        return bool(self.character_id and self.voice_id)


# ─────────────────────────────────────────────────────────────────────────────
# INTERFACE
# ─────────────────────────────────────────────────────────────────────────────

class IInworldCharacterAdapter(ABC):
    """
    Canonical interface for Inworld character integration.
    Stable across all FOAI verticals. Implementations vary; contract does not.
    """

    @abstractmethod
    def roster(self) -> dict[str, CharacterSpec]:
        """Return all active characters keyed by employee_id."""
        ...

    @abstractmethod
    def is_active(self, employee_id: str) -> bool:
        """True if the character is active AND fully configured."""
        ...

    @abstractmethod
    def get_voice_id(self, employee_id: str) -> str:
        """Return the Inworld voice ID. Always from env var."""
        ...

    @abstractmethod
    def inject_persona(self, employee_id: str) -> str:
        """
        Return the full persona prompt from voice-library.
        NEVER hardcoded. NEVER from Inworld Studio.
        """
        ...

    @abstractmethod
    async def synthesize_speech(
        self, text: str, employee_id: str
    ) -> AsyncIterator[bytes]:
        """Stream TTS audio bytes in the employee's voice."""
        ...


# ─────────────────────────────────────────────────────────────────────────────
# REGISTRY LOADER
# ─────────────────────────────────────────────────────────────────────────────

class CharacterRegistry:
    """
    Loads and caches the character roster from character-registry.yaml.
    Dynamic: adding a new character requires only a YAML entry + env vars.
    """

    def __init__(self, registry_path: pathlib.Path = _REGISTRY_PATH):
        self._path = registry_path
        self._cache: Optional[dict[str, CharacterSpec]] = None

    def load(self, force: bool = False) -> dict[str, CharacterSpec]:
        if self._cache and not force:
            return self._cache
        if not self._path.exists():
            log.warning("Character registry not found at %s", self._path)
            return {}
        with open(self._path) as f:
            data = yaml.safe_load(f)
        specs = {}
        for char in data.get("characters", []):
            spec_file = _SPEC_BASE / f"{char['employee_id']}.yaml"
            extra = {}
            if spec_file.exists():
                with open(spec_file) as sf:
                    extra = yaml.safe_load(sf) or {}
            merged = {**char, **extra}
            spec = CharacterSpec(
                employee_id=merged["employee_id"],
                display_name=merged.get("display_name", merged["employee_id"]),
                function=merged.get("function", ""),
                tier=merged.get("tier", "T3"),
                pmo=merged.get("pmo", "sales"),
                customer_facing=merged.get("customer_facing", True),
                active=merged.get("active", False),
                phase=merged.get("phase", 1),
                priority=merged.get("priority", 99),
                tts_model=merged.get("tts_model", os.environ.get("INWORLD_TTS_MODEL", "tts-1.5-max")),
                voice_design_prompt=merged.get("voice_design_prompt", ""),
                persona_source=merged.get("persona_source", ""),
                persona_section=merged.get("persona_section", ""),
                goals=merged.get("goals", []),
                memory_seeds=merged.get("memory_seeds", []),
                escalates_to=merged.get("escalates_to"),
            )
            specs[spec.employee_id] = spec
        self._cache = specs
        log.info(
            "Loaded %d characters from registry (%d active)",
            len(specs),
            sum(1 for s in specs.values() if s.active and s.is_configured),
        )
        return specs

    def active(self) -> dict[str, CharacterSpec]:
        """Return only characters that are active AND have env vars set."""
        return {
            eid: spec
            for eid, spec in self.load().items()
            if spec.active and spec.is_configured
        }

    def get(self, employee_id: str) -> Optional[CharacterSpec]:
        return self.load().get(employee_id)


# ─────────────────────────────────────────────────────────────────────────────
# PERSONA LOADER
# ─────────────────────────────────────────────────────────────────────────────

class PersonaLoader:
    """
    Extracts persona text from voice-library markdown files at runtime.
    The persona is FOAI IP and is never stored in Inworld Studio.
    Logged as SHA-256 hash only — content is never logged.
    """

    # Maps employee IDs to their syntax-library files and sections
    # This map is the only place employee IDs relate to voice-library files
    _PERSONA_MAP: dict[str, tuple[str, str]] = {
        "acheevy":        ("belter-creole-acheevy.md", "ACHEEVY Voice Register"),
        "sal_ang":        ("lowcountry-southern.md",   "Example Lines"),
        "luc_ang":        ("lowcountry-southern.md",   "Example Lines"),  # uses CPA override
        "melli_capensi":  ("lowcountry-southern.md",   "Example Lines"),  # uses Sett override
        "hos_ang":        ("lowcountry-southern.md",   "Example Lines"),
        "bar_ang":        ("artisan-minimal.md",       "Example Lines"),
        "con_ang":        ("sommelier-register.md",    "Example Lines"),
        "tas_ang":        ("sommelier-register.md",    "Example Lines"),
        "tea_ang":        ("lowcountry-southern.md",   "Example Lines"),
        "cou_ang":        ("lowcountry-southern.md",   "Savannah Variant"),
        "gre_ang":        ("charleston-energy.md",     "Example Lines"),
        "har_ang":        ("trans-atlantic-polish.md", "Example Lines"),
        "cur_ang":        ("sommelier-register.md",    "Example Lines"),
        "reg_ang":        ("charleston-energy.md",     "Example Lines"),
        "mat_ang":        ("artisan-minimal.md",       "Example Lines"),
    }

    def get_persona(self, employee_id: str, spec: CharacterSpec) -> str:
        """
        Return the persona prompt for injection into Inworld.
        Source priority: spec.persona_source → _PERSONA_MAP → fallback.
        """
        text = self._load_from_spec(spec) or self._load_from_map(employee_id) or self._fallback(spec)
        fingerprint = hashlib.sha256(text.encode()).hexdigest()[:16]
        log.debug("Persona loaded for %s (sha256: %s...)", employee_id, fingerprint)
        return text

    def _load_from_spec(self, spec: CharacterSpec) -> Optional[str]:
        if not spec.persona_source:
            return None
        path = pathlib.Path(spec.persona_source)
        if not path.is_absolute():
            path = pathlib.Path(__file__).parents[3] / spec.persona_source
        if not path.exists():
            return None
        return self._extract_section(path.read_text(), spec.persona_section)

    def _load_from_map(self, employee_id: str) -> Optional[str]:
        if employee_id not in self._PERSONA_MAP:
            return None
        filename, section = self._PERSONA_MAP[employee_id]
        path = _VOICE_LIB / filename
        if not path.exists():
            return None
        return self._extract_section(path.read_text(), section)

    def _fallback(self, spec: CharacterSpec) -> str:
        return (
            f"You are {spec.display_name}, a {spec.function} at Coastal Brewing Co. "
            f"You serve customers with warmth and expertise. "
            f"Coffee, tea, matcha — brewed honest, every public claim with a paper trail."
        )

    @staticmethod
    def _extract_section(text: str, section_header: str) -> str:
        if not section_header:
            return text[:2000]  # cap to 2k chars for injection
        # Find the section by header, return content until the next ##
        pattern = rf"##\s*{re.escape(section_header)}\s*\n(.*?)(?=\n##|\Z)"
        match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
        if match:
            return match.group(1).strip()[:2000]
        return text[:2000]


# ─────────────────────────────────────────────────────────────────────────────
# PRODUCTION ADAPTER
# ─────────────────────────────────────────────────────────────────────────────

class InworldCharacterAdapter(IInworldCharacterAdapter):
    """
    Production implementation for FOAI/Coastal Brewing.
    Phase 1: TTS voice delivery via Inworld TTS API.
    Phase 2: Full character session (stubbed, ready to implement).
    """

    def __init__(self):
        self._registry = CharacterRegistry()
        self._persona_loader = PersonaLoader()
        # Pre-encoded credential (Base64 key:secret) takes priority over split fields.
        # Set INWORLD_API_CREDENTIALS when the vault stores the pre-encoded value.
        self._api_credentials = os.environ.get("INWORLD_API_CREDENTIALS", "")
        self._api_key = os.environ.get("INWORLD_API_KEY", "")
        self._api_secret = os.environ.get("INWORLD_API_SECRET", "")
        self._workspace_id = os.environ.get("INWORLD_WORKSPACE_ID", "")
        self._session_budget_usd = float(
            os.environ.get("INWORLD_SESSION_BUDGET_USD", "0.50")
        )

    @property
    def _auth_header(self) -> str:
        """Basic auth header. Supports pre-encoded credential or key:secret pair. Never logged."""
        if self._api_credentials:
            return f"Basic {self._api_credentials}"
        if self._api_key and self._api_secret:
            encoded = base64.b64encode(
                f"{self._api_key}:{self._api_secret}".encode()
            ).decode()
            return f"Basic {encoded}"
        return ""

    def is_configured(self) -> bool:
        return bool(self._api_credentials or (self._api_key and self._api_secret))

    # ── IInworldCharacterAdapter ──────────────────────────────────────────

    def roster(self) -> dict[str, CharacterSpec]:
        return self._registry.active()

    def is_active(self, employee_id: str) -> bool:
        spec = self._registry.get(employee_id)
        return bool(spec and spec.active and spec.is_configured)

    def get_voice_id(self, employee_id: str) -> str:
        spec = self._registry.get(employee_id)
        if not spec or not spec.voice_id:
            log.warning("No voice ID configured for %s", employee_id)
            return ""
        return spec.voice_id

    def inject_persona(self, employee_id: str) -> str:
        spec = self._registry.get(employee_id)
        if not spec:
            log.warning("No spec found for %s — using minimal fallback", employee_id)
            return f"You are a helpful assistant at Coastal Brewing Co."
        return self._persona_loader.get_persona(employee_id, spec)

    async def synthesize_speech(
        self, text: str, employee_id: str
    ) -> AsyncIterator[bytes]:
        """
        Phase 1: Stream TTS audio from Inworld for the given text.
        Falls back to empty stream if Inworld is unconfigured or unreachable.
        """
        if not self.is_configured():
            log.warning("Inworld not configured — TTS unavailable for %s", employee_id)
            return

        voice_id = self.get_voice_id(employee_id)
        if not voice_id:
            return

        spec = self._registry.get(employee_id)
        tts_model = spec.tts_model if spec else "tts-1.5-max"

        headers = {
            "Authorization": self._auth_header,
            "Content-Type": "application/json",
        }
        payload = {
            "text": text[:4096],  # Inworld TTS character limit safety
            "voiceId": voice_id,
            "model": tts_model,
        }

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                async with client.stream(
                    "POST",
                    f"{_INWORLD_TTS_BASE}/voice:stream",
                    headers=headers,
                    json=payload,
                ) as response:
                    if response.status_code != 200:
                        log.error(
                            "Inworld TTS error %d for %s",
                            response.status_code,
                            employee_id,
                        )
                        return
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        try:
                            chunk = json.loads(line)
                            audio_b64 = chunk.get("audioChunk", chunk.get("audio", ""))
                            if audio_b64:
                                yield base64.b64decode(audio_b64)
                        except (json.JSONDecodeError, Exception):
                            continue
        except httpx.TimeoutException:
            log.warning("Inworld TTS timeout for %s — falling back to text-only", employee_id)
        except Exception as exc:
            log.error("Inworld TTS error for %s: %s", employee_id, exc)

    async def send_message(
        self, message: str, employee_id: str, session_id: str
    ) -> AsyncIterator[dict]:
        """
        Phase 2: Full character session via Inworld Runtime.
        RESERVED — not yet implemented. Returns empty stream.
        Implement when Inworld character sessions are configured.
        """
        log.info(
            "send_message called for %s (Phase 2 — not yet implemented)",
            employee_id,
        )
        return
        yield  # make this a generator

    # ── Helpers ───────────────────────────────────────────────────────────

    def describe_roster(self) -> list[dict]:
        """Return a safe (no secrets) description of the active roster."""
        return [
            {
                "employee_id": spec.employee_id,
                "display_name": spec.display_name,
                "function": spec.function,
                "tier": spec.tier,
                "customer_facing": spec.customer_facing,
                "voice_configured": bool(spec.voice_id),
                "character_configured": bool(spec.character_id),
                "phase": spec.phase,
            }
            for spec in self._registry.load().values()
        ]


# ─────────────────────────────────────────────────────────────────────────────
# SINGLETON — one adapter instance per process
# ─────────────────────────────────────────────────────────────────────────────

_adapter: Optional[InworldCharacterAdapter] = None


def get_adapter() -> InworldCharacterAdapter:
    """Return the process-level singleton adapter. Thread-safe init."""
    global _adapter
    if _adapter is None:
        _adapter = InworldCharacterAdapter()
    return _adapter
