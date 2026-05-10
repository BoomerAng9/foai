"""
analyze_voice.py — Acoustic-feature analyzer for voice samples.

Owner directive 2026-05-02: stop deferring voice-quality judgments to
manual ear-listening. Use librosa to programmatically measure pitch,
spectral, prosody, and voice-quality features so candidates can be
ranked against a target acoustic profile (e.g., "Nas-like NYC
Black-American baritone").

Inputs : one or more audio files (mp3 / wav / m4a / flac).
Outputs: JSON feature report per file + a ranked match table when
         a target profile is supplied.

Usage:
  # Analyze a single file
  python analyze_voice.py path/to/sample.mp3

  # Analyze a folder, output JSON
  python analyze_voice.py --dir "path/to/folder" --out features.json

  # Score against a built-in target profile
  python analyze_voice.py --dir "path/to/folder" --target acheevy_baritone

  # Score against a custom target profile (JSON file)
  python analyze_voice.py --dir "path/to/folder" --target-file target.json

The target-profile JSON shape:
  {
    "f0_hz_mean":   {"target": 105.0, "tolerance": 25.0, "weight": 3.0},
    "f0_hz_median": {"target": 100.0, "tolerance": 25.0, "weight": 2.0},
    "spectral_centroid_hz": {"target": 1800.0, "tolerance": 600.0, "weight": 2.0},
    "speech_rate_syllables_per_sec": {"target": 3.5, "tolerance": 1.0, "weight": 1.5},
    "hnr_db": {"target": 12.0, "tolerance": 4.0, "weight": 1.5},
    "voiced_fraction": {"target": 0.5, "tolerance": 0.2, "weight": 1.0}
  }
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np

try:
    import librosa
except ImportError as e:
    sys.stderr.write(
        f"ERROR: librosa import failed: {e}\nInstall with `pip install librosa`.\n"
    )
    raise SystemExit(1) from e


SUPPORTED_EXTS = {".mp3", ".wav", ".m4a", ".flac", ".aac", ".ogg", ".webm"}


# ---------------------------------------------------------------------------
# Built-in target profiles
# ---------------------------------------------------------------------------

TARGET_PROFILES: Dict[str, Dict[str, Dict[str, float]]] = {
    # ACHEEVY: Black-American adult-male baritone, Queensbridge / 5%-Nation
    # cadence inheritance. Slow, deliberate, chesty; not bass, not tenor.
    # Anchored to the documented acoustic range for adult-male speakers
    # in the AAVE-baritone register described in the URBANISM dialect
    # library (regional/east-coast-ny.md once written; until then
    # tracking literature on adult-male F0 ranges).
    "acheevy_baritone": {
        "f0_hz_mean":              {"target": 105.0, "tolerance": 25.0, "weight": 3.0},
        "f0_hz_median":            {"target": 100.0, "tolerance": 25.0, "weight": 2.0},
        "spectral_centroid_hz":    {"target": 1700.0, "tolerance": 700.0, "weight": 2.0},
        "spectral_rolloff_hz":     {"target": 3500.0, "tolerance": 1500.0, "weight": 1.0},
        "speech_rate_syllables_per_sec": {"target": 3.2, "tolerance": 1.0, "weight": 2.0},
        "hnr_db":                  {"target": 11.0, "tolerance": 5.0, "weight": 1.5},
        "voiced_fraction":         {"target": 0.55, "tolerance": 0.2, "weight": 1.0},
        "rms_db":                  {"target": -22.0, "tolerance": 8.0, "weight": 0.5},
    },
    # Reference profile: "any Black-American adult male" — wider tolerance,
    # used when seeking candidates without committing to a register.
    "black_american_adult_male": {
        "f0_hz_mean":              {"target": 115.0, "tolerance": 35.0, "weight": 2.0},
        "f0_hz_median":            {"target": 110.0, "tolerance": 35.0, "weight": 2.0},
        "spectral_centroid_hz":    {"target": 1900.0, "tolerance": 800.0, "weight": 1.0},
        "speech_rate_syllables_per_sec": {"target": 3.8, "tolerance": 1.5, "weight": 1.0},
        "hnr_db":                  {"target": 12.0, "tolerance": 5.0, "weight": 1.0},
        "voiced_fraction":         {"target": 0.55, "tolerance": 0.2, "weight": 1.0},
    },
    # Down South — Houston/Memphis/NOLA-shared adult-male baritone.
    # SLOWEST tempo of the four regional profiles (Houston Screw aesthetic
    # bleeds into conversational tempo). See
    # dialect-library/URBANISM/regional/down-south.md for the full register.
    "down_south_baritone": {
        "f0_hz_mean":              {"target": 100.0, "tolerance": 25.0, "weight": 3.0},
        "f0_hz_median":            {"target": 95.0, "tolerance": 25.0, "weight": 2.0},
        "spectral_centroid_hz":    {"target": 1500.0, "tolerance": 700.0, "weight": 2.0},
        "spectral_rolloff_hz":     {"target": 3200.0, "tolerance": 1500.0, "weight": 1.0},
        "speech_rate_syllables_per_sec": {"target": 2.6, "tolerance": 1.0, "weight": 2.5},
        "hnr_db":                  {"target": 11.0, "tolerance": 5.0, "weight": 1.5},
        "voiced_fraction":         {"target": 0.55, "tolerance": 0.2, "weight": 1.0},
    },
    # Midwest — Detroit + Chicago non-drill baritone. Sits between East
    # Coast NY (faster, brighter) and Down South (slower, warmer). See
    # dialect-library/URBANISM/regional/midwest.md for the full register.
    "midwest_baritone": {
        "f0_hz_mean":              {"target": 110.0, "tolerance": 25.0, "weight": 3.0},
        "f0_hz_median":            {"target": 105.0, "tolerance": 25.0, "weight": 2.0},
        "spectral_centroid_hz":    {"target": 1800.0, "tolerance": 700.0, "weight": 2.0},
        "spectral_rolloff_hz":     {"target": 3700.0, "tolerance": 1500.0, "weight": 1.0},
        "speech_rate_syllables_per_sec": {"target": 3.5, "tolerance": 1.2, "weight": 2.0},
        "hnr_db":                  {"target": 12.0, "tolerance": 5.0, "weight": 1.5},
        "voiced_fraction":         {"target": 0.55, "tolerance": 0.2, "weight": 1.0},
    },
    # West Coast LA / Compton / Long Beach baritone — slower tempo, slightly
    # lower F0 and centroid than the East-Coast NY profile. See
    # dialect-library/URBANISM/regional/west-coast.md for the full register.
    "west_coast_la_baritone": {
        "f0_hz_mean":              {"target": 100.0, "tolerance": 25.0, "weight": 3.0},
        "f0_hz_median":            {"target": 95.0, "tolerance": 25.0, "weight": 2.0},
        "spectral_centroid_hz":    {"target": 1600.0, "tolerance": 700.0, "weight": 2.0},
        "spectral_rolloff_hz":     {"target": 3300.0, "tolerance": 1500.0, "weight": 1.0},
        "speech_rate_syllables_per_sec": {"target": 2.8, "tolerance": 1.0, "weight": 2.0},
        "hnr_db":                  {"target": 11.0, "tolerance": 5.0, "weight": 1.5},
        "voiced_fraction":         {"target": 0.55, "tolerance": 0.2, "weight": 1.0},
        "rms_db":                  {"target": -22.0, "tolerance": 8.0, "weight": 0.5},
    },
    # Reference profile: warm-southern-coastal-female (Cou_Ang / Gre_Ang
    # zone). For sanity-checking the analyzer works across both genders.
    "coastal_georgia_female": {
        "f0_hz_mean":              {"target": 200.0, "tolerance": 35.0, "weight": 2.0},
        "f0_hz_median":            {"target": 195.0, "tolerance": 35.0, "weight": 2.0},
        "spectral_centroid_hz":    {"target": 2400.0, "tolerance": 700.0, "weight": 1.0},
        "speech_rate_syllables_per_sec": {"target": 4.0, "tolerance": 1.5, "weight": 1.0},
        "hnr_db":                  {"target": 14.0, "tolerance": 4.0, "weight": 1.0},
        "voiced_fraction":         {"target": 0.55, "tolerance": 0.2, "weight": 1.0},
    },
}


# ---------------------------------------------------------------------------
# Feature extraction
# ---------------------------------------------------------------------------


def _safe_float(value) -> Optional[float]:
    """Return a JSON-safe float, or None if NaN / inf."""
    try:
        f = float(value)
        if math.isnan(f) or math.isinf(f):
            return None
        return round(f, 4)
    except (TypeError, ValueError):
        return None


def extract_pitch(y: np.ndarray, sr: int) -> Dict[str, Optional[float]]:
    """Pitch (F0) via probabilistic YIN. Robust to noisy signals."""
    try:
        f0, voiced_flag, _ = librosa.pyin(
            y,
            fmin=float(librosa.note_to_hz("C2")),   # ~65 Hz
            fmax=float(librosa.note_to_hz("C6")),   # ~1047 Hz
            sr=sr,
        )
        voiced = f0[voiced_flag]
        voiced = voiced[~np.isnan(voiced)]
        if voiced.size == 0:
            return {
                "f0_hz_mean": None,
                "f0_hz_median": None,
                "f0_hz_std": None,
                "f0_hz_min": None,
                "f0_hz_max": None,
                "voiced_fraction": _safe_float(np.mean(voiced_flag)),
            }
        return {
            "f0_hz_mean":   _safe_float(np.mean(voiced)),
            "f0_hz_median": _safe_float(np.median(voiced)),
            "f0_hz_std":    _safe_float(np.std(voiced)),
            "f0_hz_min":    _safe_float(np.percentile(voiced, 5)),   # P5 to ignore outliers
            "f0_hz_max":    _safe_float(np.percentile(voiced, 95)),  # P95
            "voiced_fraction": _safe_float(np.mean(voiced_flag)),
        }
    except Exception as e:  # pragma: no cover
        return {"error": f"pitch_extraction_failed: {e}"}


def extract_spectral(y: np.ndarray, sr: int) -> Dict[str, Optional[float]]:
    centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
    rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr, roll_percent=0.85)
    bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr)
    zcr = librosa.feature.zero_crossing_rate(y)
    return {
        "spectral_centroid_hz":  _safe_float(np.mean(centroid)),
        "spectral_rolloff_hz":   _safe_float(np.mean(rolloff)),
        "spectral_bandwidth_hz": _safe_float(np.mean(bandwidth)),
        "zero_crossing_rate":    _safe_float(np.mean(zcr)),
    }


def extract_energy(y: np.ndarray) -> Dict[str, Optional[float]]:
    rms = librosa.feature.rms(y=y)
    rms_mean = float(np.mean(rms))
    rms_db = 20.0 * np.log10(rms_mean + 1e-12)
    return {
        "rms_mean":  _safe_float(rms_mean),
        "rms_db":    _safe_float(rms_db),
        "rms_std":   _safe_float(np.std(rms)),
    }


def extract_speech_rate(y: np.ndarray, sr: int) -> Dict[str, Optional[float]]:
    """Approximate syllable-rate via onset detection on the energy envelope.

    This is a proxy, not ground-truth syllable counting — but it scales
    monotonically with speech tempo and is good enough for ranking
    candidates against a target tempo band.
    """
    try:
        onsets = librosa.onset.onset_detect(
            y=y, sr=sr, units="time", backtrack=False, hop_length=512
        )
        duration = librosa.get_duration(y=y, sr=sr)
        if duration <= 0:
            return {"speech_rate_syllables_per_sec": None, "duration_sec": None}
        rate = len(onsets) / duration if len(onsets) > 0 else 0.0
        return {
            "speech_rate_syllables_per_sec": _safe_float(rate),
            "duration_sec": _safe_float(duration),
        }
    except Exception as e:
        return {"error": f"speech_rate_failed: {e}"}


def extract_hnr(y: np.ndarray, sr: int) -> Dict[str, Optional[float]]:
    """Harmonics-to-Noise Ratio (dB) — a voice-quality measure.

    High HNR = clean, harmonic, "smooth" voice.
    Low HNR = breathy / raspy / noisy voice.

    Implemented via librosa.effects.harmonic / percussive split.
    Approximate but tracks the real HNR well enough for ranking.
    """
    try:
        y_harm, y_perc = librosa.effects.hpss(y)
        e_harm = float(np.sum(y_harm ** 2)) + 1e-12
        e_perc = float(np.sum(y_perc ** 2)) + 1e-12
        hnr_db = 10.0 * np.log10(e_harm / e_perc)
        return {"hnr_db": _safe_float(hnr_db)}
    except Exception as e:
        return {"error": f"hnr_failed: {e}"}


def extract_mfcc_signature(y: np.ndarray, sr: int, n_mfcc: int = 13) -> Dict[str, list]:
    """13-dim MFCC mean vector — voice-timbre fingerprint."""
    try:
        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=n_mfcc)
        return {"mfcc_mean": [round(float(v), 3) for v in np.mean(mfcc, axis=1)]}
    except Exception as e:
        return {"error": f"mfcc_failed: {e}"}


def _features_for_segment(y: np.ndarray, sr: int) -> Dict:
    rec: Dict = {}
    rec.update(extract_pitch(y, sr))
    rec.update(extract_spectral(y, sr))
    rec.update(extract_energy(y))
    rec.update(extract_speech_rate(y, sr))
    rec.update(extract_hnr(y, sr))
    rec.update(extract_mfcc_signature(y, sr))
    return rec


def analyze_file(
    path: Path,
    max_seconds: float = 60.0,
    window_seconds: Optional[float] = None,
    target_profile: Optional[Dict[str, Dict[str, float]]] = None,
) -> Dict:
    """
    Run the full feature stack on one file.

    If `window_seconds` is provided AND `target_profile` is provided, the
    file is sliced into non-overlapping windows of `window_seconds` length,
    each window scored against the target, and the BEST-MATCHING window's
    features are returned (along with `best_window_start_sec` and a
    `windows_evaluated` count). This handles podcasts/multi-speaker
    content by automatically picking the segment most consistent with
    the target acoustic profile.

    `max_seconds` caps the *total* audio loaded from disk, regardless
    of mode.
    """
    try:
        y, sr = librosa.load(str(path), sr=None, mono=True, duration=max_seconds)
    except Exception as e:
        return {"file": str(path), "error": f"load_failed: {e}"}

    if y.size == 0:
        return {"file": str(path), "error": "empty_audio"}

    record = {
        "file": str(path),
        "filename": path.name,
        "sample_rate": int(sr),
        "samples": int(y.size),
        "loaded_duration_sec": _safe_float(y.size / sr),
    }

    use_windows = (
        window_seconds is not None
        and target_profile is not None
        and (y.size / sr) >= window_seconds * 1.5
    )

    if not use_windows:
        record.update(_features_for_segment(y, sr))
        return record

    # Sliding-window scan. Pick the window whose match score is highest;
    # return its features as the "representative" feature set for the file,
    # along with metadata describing what we did.
    win_samples = int(window_seconds * sr)
    n_windows = max(1, int((y.size - win_samples) / win_samples) + 1)
    best_score = -1.0
    best_features: Optional[Dict] = None
    best_start = 0
    window_summaries: List[Dict] = []
    for i in range(n_windows):
        start = i * win_samples
        seg = y[start:start + win_samples]
        if seg.size < win_samples * 0.6:
            continue
        feats = _features_for_segment(seg, sr)
        # Score this window
        full_record = {**feats}
        score_blob = score_against_target(full_record, target_profile)
        score = score_blob["overall_match_percent"]
        window_summaries.append({
            "start_sec": round(start / sr, 1),
            "match_percent": score,
            "f0_hz_mean": feats.get("f0_hz_mean"),
            "speech_rate_sps": feats.get("speech_rate_syllables_per_sec"),
            "hnr_db": feats.get("hnr_db"),
        })
        if score > best_score:
            best_score = score
            best_features = feats
            best_start = start

    if best_features is None:
        # fall back to whole-file analysis
        record.update(_features_for_segment(y, sr))
        return record

    record.update(best_features)
    record["best_window_start_sec"] = round(best_start / sr, 1)
    record["window_seconds"] = float(window_seconds)
    record["windows_evaluated"] = len(window_summaries)
    record["window_summaries"] = window_summaries
    return record


# ---------------------------------------------------------------------------
# Scoring against a target profile
# ---------------------------------------------------------------------------


def score_against_target(
    record: Dict, target: Dict[str, Dict[str, float]]
) -> Dict[str, float]:
    """
    Each measured feature gets a per-feature score in [0, 1] via a Gaussian
    decay around the target. The `tolerance` value is treated as the
    standard deviation σ — at distance σ the score is ~0.61, at 2σ ~0.14,
    at 3σ ~0.01. This avoids hard-zeroing values that are in the right
    ballpark and gives smoother gradients for ranking.
    """
    total_weight = 0.0
    weighted_score = 0.0
    feature_scores: Dict[str, float] = {}
    missing: List[str] = []

    for feature, spec in target.items():
        value = record.get(feature)
        if value is None:
            missing.append(feature)
            continue
        target_val = float(spec["target"])
        tol = max(float(spec.get("tolerance", 1.0)), 1e-9)
        weight = float(spec.get("weight", 1.0))
        # Gaussian scoring: smooth decay; never collapses to 0.
        diff = float(value) - target_val
        feat_score = math.exp(-(diff * diff) / (2.0 * tol * tol))
        feature_scores[feature] = round(feat_score, 3)
        weighted_score += feat_score * weight
        total_weight += weight

    overall = (weighted_score / total_weight * 100.0) if total_weight > 0 else 0.0
    return {
        "overall_match_percent": round(overall, 1),
        "feature_scores": feature_scores,
        "missing_features": missing,
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def discover_files(paths: List[str], directory: Optional[str]) -> List[Path]:
    files: List[Path] = []
    for p in paths:
        path = Path(p)
        if path.is_file():
            files.append(path)
    if directory:
        d = Path(directory)
        if d.is_dir():
            for root, _, names in os.walk(d):
                for n in names:
                    ext = os.path.splitext(n)[1].lower()
                    if ext in SUPPORTED_EXTS:
                        files.append(Path(root) / n)
    return sorted(files)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("files", nargs="*", help="Audio file paths to analyze.")
    ap.add_argument("--dir", help="Directory to scan recursively for audio files.")
    ap.add_argument("--out", help="Path to JSON output (defaults to stdout).")
    ap.add_argument("--target", choices=sorted(TARGET_PROFILES.keys()), help="Built-in target profile to score against.")
    ap.add_argument("--target-file", help="Path to JSON file describing a custom target profile.")
    ap.add_argument("--max-seconds", type=float, default=60.0, help="Cap audio loaded per file to first N seconds (default 60).")
    ap.add_argument("--window-seconds", type=float, default=None, help="If set with --target, slide non-overlapping windows of this length and report the best-matching window's features (handles multi-speaker/podcast content).")
    ap.add_argument("--quiet", action="store_true", help="Suppress per-file progress lines.")
    args = ap.parse_args()

    files = discover_files(args.files, args.dir)
    if not files:
        sys.stderr.write("No audio files found.\n")
        return 2

    target_profile: Optional[Dict] = None
    target_label: Optional[str] = None
    if args.target_file:
        target_profile = json.loads(Path(args.target_file).read_text())
        target_label = args.target_file
    elif args.target:
        target_profile = TARGET_PROFILES[args.target]
        target_label = args.target

    results: List[Dict] = []
    for i, f in enumerate(files, 1):
        if not args.quiet:
            sys.stderr.write(f"[{i}/{len(files)}] {f.name}\n")
        rec = analyze_file(
            f,
            max_seconds=args.max_seconds,
            window_seconds=args.window_seconds,
            target_profile=target_profile,
        )
        if target_profile and "error" not in rec:
            rec["match"] = score_against_target(rec, target_profile)
        results.append(rec)

    out = {
        "target_profile": target_label,
        "files_analyzed": len(results),
        "results": results,
    }
    if target_profile and any("match" in r for r in results):
        ranked = sorted(
            (r for r in results if "match" in r),
            key=lambda r: r["match"]["overall_match_percent"],
            reverse=True,
        )
        out["ranked"] = [
            {
                "rank": i + 1,
                "file": r["filename"],
                "match_percent": r["match"]["overall_match_percent"],
                "f0_hz_mean": r.get("f0_hz_mean"),
                "speech_rate_sps": r.get("speech_rate_syllables_per_sec"),
                "duration_sec": r.get("duration_sec"),
            }
            for i, r in enumerate(ranked)
        ]

    blob = json.dumps(out, indent=2)
    if args.out:
        Path(args.out).write_text(blob)
        sys.stderr.write(f"Wrote {args.out}\n")
    else:
        print(blob)

    if "ranked" in out and not args.quiet:
        sys.stderr.write("\n=== RANKED ===\n")
        for entry in out["ranked"]:
            sys.stderr.write(
                f"  {entry['rank']:>2}. {entry['match_percent']:>5.1f}%  "
                f"f0={entry['f0_hz_mean']}Hz  rate={entry['speech_rate_sps']} sps  "
                f"{entry['file']}\n"
            )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
